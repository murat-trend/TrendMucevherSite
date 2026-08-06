import "server-only";

import { GoogleGenAI } from "@google/genai";
import {
  arkaPlanKaldir,
  buyutSeffaf,
  r2yeYaz,
  toBuffer,
  type HazirlaSonuc,
  type HedefBoy,
} from "./pipeline";
import { turAdi } from "./turler";

/**
 * MÜŞTERİ ATÖLYESİ — SERİ ÜRETİMİ.
 *
 * Elimizde bir BAZ MODEL var (taşı kaldırılmış, şeffaf zeminli charm). Bundan
 * iki iş türetilir:
 *
 *   1) TÜR DEĞİŞTİR — duruş, çerçeve, mine + altın kontur işçiliği ve taşlı göz
 *      dili birebir korunur; yalnızca hayvan değişir. Seri kimliği burada.
 *   2) YENİ TASARIM — üç mod: aynı stille yeni poz · aynı türün poz varyantı ·
 *      tamamen serbest (baz modele bağlı değil).
 *
 * Çıktı yolu `hazirla` ile aynı: düz zemine üret → arka planı kaldır → hedef
 * boya büyüt (şeffaflık korunarak) → R2'ye yaz.
 */

const MODEL = "gemini-3.1-flash-image";

export type TasarimModu = "yeni-poz" | "poz-varyanti" | "serbest";

export type UretGirdi = {
  /** "tur" → tür değiştir, "tasarim" → yeni tasarım */
  mod: "tur" | "tasarim";
  /** Baz model görseli (R2 URL ya da data URI). "serbest" modunda gerekmez. */
  bazGorsel?: string;
  /** mod="tur" iken hedef tür (katalog id'si ya da serbest metin) */
  tur?: string;
  tasarimModu?: TasarimModu;
  /** Tasarımcının serbest talimatı */
  tarif?: string;
  hedefBoy: HedefBoy;
};

/* ─── Seri kimliği — her prompt'un omurgası ─────────────────────────────────── */

/**
 * Baz modelden TAŞINACAK olanlar. Poz tarifi metinle verilmiyor: model görseli
 * okuyup kendi çıkarsın diye "master'daki gibi" deniyor — metinle tarif etmek
 * pozu yeniden yorumlatıyor.
 */
const SERI_KIMLIGI = [
  "KEEP THE COLLECTION IDENTITY — these come from the master image and must not be reinvented:",
  "- the same camera angle, framing and centring, with the same even margin around the piece",
  "- the same degree of stylisation: cute, rounded, chibi-like character — never realistic wildlife",
  "- the same enamel craft: smooth glossy vitreous enamel with soft tonal shading, colour fields separated by raised polished gold cloisonné outlines of the same line weight",
  "- the same faceted gemstone eyes in the same bezel setting style",
  "- the same metal tone and polish as the master",
  "- the same overall size of the piece within the frame",
  "⚠ Identity means the CRAFT and the SHOT, never the animal's body. Head shape, ears, muzzle, limbs, tail and proportions all belong to the new species.",
].join("\n");

/**
 * Hedef kitle: genç kızlar (Murat, 2026-08-06). Parça sevimli olacak — ama tür
 * okunurluğunu bozmadan. Çözüm: hayvanın YAVRUSU. Yavru hem tür-sadık kalıyor
 * hem doğal olarak sevimli (büyük kafa, büyük göz, yuvarlak hat). Kartal/leopar
 * gibi yırtıcılar da böylece sert değil şirin çıkıyor.
 */
const SEVIMLILIK = [
  "MAKE IT SWEET — this charm is worn by young girls, so charm comes before realism:",
  "Depict the BABY of the species — a cub, kitten, pup, chick, calf or fry — never an adult. Baby proportions are what make it cute, and they keep the species readable.",
  "- an oversized, rounded head on a small plump body",
  "- large, wide-set gemstone eyes placed low on the face, with a soft innocent gaze",
  "- a small rounded muzzle or beak, chubby cheeks, no long snout",
  "- short, soft, rounded limbs; plump rounded silhouette with no thin, spiky or angular forms",
  "- a gentle, friendly expression with the hint of a smile",
  "Predators must read as adorable, never fierce: no bared teeth, no talons or claws presented as weapons, no aggressive stare, no menacing brow. An eagle or a leopard here is a fluffy baby, not a hunter.",
].join("\n");

/**
 * Murat'ın istediği iki iyileştirme (2026-08-06): kontur duvarları daha kabarık,
 * renkler daha canlı. Seri kimliğini BOZMAZ — aynı işçilik dilinin daha iyi
 * yapılmış hâli. ⚠ Yalnız üretimde uygulanır; taş kaldırmada (`hazirla`) DEĞİL,
 * orada müşterinin kendi ürünü olduğu gibi kalmalı.
 */
const YUZEY_VE_RENK = [
  "RAISED GOLD WALLS — push this further than the master:",
  "The gold cloisonné outlines must stand clearly PROUD of the enamel: real raised metal walls with a rounded, polished top edge that catches a bright specular highlight running along its length.",
  "The enamel sits recessed below the top of the wall, so every colour field reads as a filled cell with a visible depth step at its border, and the wall casts a soft shadow into the enamel beside it.",
  "Make the walls slightly thicker and noticeably taller than in the master. Never draw them as flat printed lines.",
  "Every colour field must be fully enclosed by a wall. Do NOT soften, blur or drop the cell borders in order to make the colours blend — the colour is bright AND the cells stay crisply separated.",
  "",
  "LIVELY COLOUR:",
  "Render the enamel rich, saturated and luminous — deep jewel-like colour with a glossy wet-look surface, bright clean highlights and vivid tonal transitions, as if lit in a jewellery showcase.",
  "No dull, washed-out, greyish or muddy tones anywhere.",
].join("\n");

const CIKTI_KURALI = [
  "OUTPUT: one photorealistic jewelry product image of a single finished enamel-and-gold charm,",
  "shot straight-on and centred, on a plain uniform light grey studio background —",
  "no shadow, no reflection, no props, no text, no packaging, no hand, no chain.",
  "Sharp focus across the whole piece.",
].join(" ");

const TEK_PARCA = [
  "The piece is a standalone body: no set stone, no empty setting, no bail, no jump ring and no chain.",
].join(" ");

/* ─── 1) Tür değiştir ────────────────────────────────────────────────────────── */

function turPrompt(turEn: string, tarif?: string): string {
  const parcalar = [
    "The attached image is the MASTER PIECE of an existing jewelry collection. You are making the NEXT piece in that same collection.",
    "",
    `CHANGE ONLY THE ANIMAL: the new charm depicts a ${turEn} instead of the animal in the master. Everything that defines the collection stays the same.`,
    "",
    `THE ANIMAL MUST BE A REAL ${turEn.toUpperCase()} — this comes first:`,
    `Build the creature from the true anatomy of a ${turEn}: its own head shape, its own ears / beak / horns / wings, its own muzzle, its own limbs, its own tail and its own body proportions.`,
    "NEVER carry over the master animal's body parts. Do not keep its ear shape, its muzzle, its paws or its tail on a creature that should not have them. The silhouette belongs to the new animal, not to the master.",
    "A viewer must name the species instantly, without being told.",
    "",
    "POSTURE — carry over the ATTITUDE, not the outline:",
    "Keep the same reclining, curled, relaxed body attitude, the same turn and tilt of the head toward the viewer, the same playful character and the same placement within the frame — the piece lies the same way and looks at you the same way.",
    `But express that attitude through a ${turEn}'s own body: a bird folds its wings and tucks its talons, a fish or dolphin curves its body and lays its fins, a bear rests on its haunches. The two pieces should feel like a matched pair because of their spirit and framing, not because they share an outline.`,
    "",
    `COLOURS: choose a rich, harmonious enamel palette that unmistakably reads as a ${turEn} — but pick JEWELLERY colours, not wildlife-photograph colours: deeper, cleaner and more luminous than nature, the way a fine enamelling house would interpret the animal. Never grey, dusty, washed-out or muddy. The palette changes with the species; the craft never does.`,
    "",
    TEK_PARCA,
    "",
    SERI_KIMLIGI,
    "",
    SEVIMLILIK,
    "",
    YUZEY_VE_RENK,
  ];

  if (tarif?.trim()) {
    parcalar.push(
      "",
      `DESIGNER'S NOTE (authoritative, applies on top of the rules above): ${tarif.trim()}`
    );
  }

  parcalar.push("", CIKTI_KURALI);
  return parcalar.join("\n");
}

/* ─── 2) Yeni tasarım ────────────────────────────────────────────────────────── */

function tasarimPrompt(modu: TasarimModu, turEn: string | null, tarif?: string): string {
  const not = tarif?.trim();

  if (modu === "serbest") {
    // Baz model gönderilmez — tasarımcının tarifi tek otoritedir.
    return [
      "Design a new luxury enamel-and-gold jewelry charm from scratch.",
      "",
      `DESIGNER'S BRIEF (authoritative): ${not ?? ""}`,
      "",
      "Craft it as a real manufacturable piece: glossy vitreous enamel colour fields separated by raised polished gold outlines, faceted gemstone accents where they belong.",
      TEK_PARCA,
      "",
      SEVIMLILIK,
      "",
      YUZEY_VE_RENK,
      "",
      CIKTI_KURALI,
    ].join("\n");
  }

  const parcalar = [
    "The attached image is the MASTER PIECE of an existing jewelry collection. You are designing a NEW piece for that same collection.",
    "",
  ];

  if (modu === "poz-varyanti") {
    parcalar.push(
      "SAME ANIMAL, NEW POSE: keep exactly the same creature as the master — same species, same character, same enamel colours and markings.",
      "Give it a different, equally charming posture: a fresh body attitude and limb arrangement that still reads as the same character from the same collection.",
      "Do NOT reproduce the master's pose."
    );
  } else {
    parcalar.push(
      `NEW POSE, SAME CRAFT: the new charm depicts ${turEn ? `a ${turEn}` : "the same kind of animal character as the master"}.`,
      "Build a NEW posture and composition — do not copy the master's pose. What carries over is the craftsmanship language, not the arrangement."
    );
  }

  if (not) {
    parcalar.push("", `DESIGNER'S NOTE (authoritative): ${not}`);
  }

  parcalar.push("", TEK_PARCA, "", SERI_KIMLIGI.replace(
    "- the same camera angle, framing and centring, with the same even margin around the piece",
    "- the same camera angle, framing and centring, with the same even margin around the piece (the pose changes, the shot does not)"
  ), "", SEVIMLILIK, "", YUZEY_VE_RENK, "", CIKTI_KURALI);

  return parcalar.join("\n");
}

/* ─── Gemini çağrısı ─────────────────────────────────────────────────────────── */

type GeminiResult = {
  candidates?: Array<{ finishReason?: string; content?: { parts?: unknown[] } | null }> | null;
};

function extractImage(result: GeminiResult): Buffer {
  const candidate = result.candidates?.[0];
  const parts = candidate?.content?.parts ?? [];
  const imgPart = (parts as Array<{ thought?: boolean; inlineData?: { mimeType: string; data: string } }>)
    .find((p) => !p.thought && p.inlineData?.mimeType?.startsWith("image/"));
  if (!imgPart?.inlineData) {
    const text = (parts as Array<{ text?: string; thought?: boolean }>)
      .filter((p) => !p.thought && p.text)
      .map((p) => p.text)
      .join(" ");
    throw new Error(`no_image | finishReason=${candidate?.finishReason} | text=${text.slice(0, 160)}`);
  }
  return Buffer.from(imgPart.inlineData.data, "base64");
}

async function geminiUret(prompt: string, baz: string | undefined, apiKey: string): Promise<Buffer> {
  const ai = new GoogleGenAI({ apiKey });

  const parts: Array<Record<string, unknown>> = [];
  if (baz) {
    const { buf, mime } = await toBuffer(baz);
    const mimeType = (mime.startsWith("image/") ? mime : "image/png") as
      | "image/jpeg"
      | "image/png"
      | "image/webp";
    parts.push({ inlineData: { mimeType, data: buf.toString("base64") } });
  }
  parts.push({ text: prompt });

  const timeout = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error("timeout_240s — üretim çok uzun sürdü")), 240_000)
  );

  const result = await Promise.race([
    ai.models.generateContent({
      model: MODEL,
      contents: [{ role: "user", parts }],
      config: { responseModalities: ["IMAGE", "TEXT"], thinkingConfig: { thinkingBudget: 0 } } as never,
    }),
    timeout,
  ]);

  return extractImage(result as GeminiResult);
}

/* ─── Boru hattı ─────────────────────────────────────────────────────────────── */

export async function uret(
  girdi: UretGirdi,
  keys: { google: string; stability: string }
): Promise<HazirlaSonuc & { etiket: string }> {
  let prompt: string;
  let baz: string | undefined = girdi.bazGorsel;
  let etiket: string;

  if (girdi.mod === "tur") {
    const { tr, en } = turAdi(girdi.tur ?? "");
    prompt = turPrompt(en, girdi.tarif);
    etiket = tr;
  } else {
    const modu: TasarimModu = girdi.tasarimModu ?? "yeni-poz";
    const tur = girdi.tur ? turAdi(girdi.tur) : null;
    prompt = tasarimPrompt(modu, tur?.en ?? null, girdi.tarif);
    // Serbest modda baz model bilinçli olarak gönderilmez.
    if (modu === "serbest") baz = undefined;
    etiket = tur?.tr ?? (modu === "serbest" ? "Serbest tasarım" : "Yeni tasarım");
  }

  const ham = await geminiUret(prompt, baz, keys.google);
  const seffaf = await arkaPlanKaldir(ham, keys.stability);
  const buyuk = await buyutSeffaf(seffaf, girdi.hedefBoy);

  const sharp = (await import("sharp")).default;
  const meta = await sharp(buyuk).metadata();
  const url = await r2yeYaz(buyuk, "musteri-atolye/seri");

  return { url, width: meta.width ?? 0, height: meta.height ?? 0, etiket };
}
