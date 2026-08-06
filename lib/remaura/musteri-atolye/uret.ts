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
  "- the same head-to-body proportion and the same overall size of the piece in frame",
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
    "POSTURE: reproduce the master's posture and body attitude — the same curl of the body, the same turn and tilt of the head toward the viewer, the same limb placement and the same silhouette rhythm.",
    `Adapt it ONLY where the anatomy of a ${turEn} makes the master's pose impossible: if the animal has no front paws, use its closest natural equivalent (fin, wing, flipper, coiled tail) in the same position and reading the same way. Do not invent a different pose — the two pieces must look like a matched pair when placed side by side.`,
    "",
    `COLOURS: use the enamel colours that belong to a ${turEn}, but rendered with exactly the same enamel technique and the same gold outline treatment as the master. The palette changes; the craft does not.`,
    "",
    TEK_PARCA,
    "",
    SERI_KIMLIGI,
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
  ), "", CIKTI_KURALI);

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
