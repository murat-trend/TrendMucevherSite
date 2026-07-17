import { loadEnvConfig } from "@next/env";
import { NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/remaura/uretim-3d/auth";
import { clampRecete, SINIR, VARSAYILAN } from "@/lib/remaura/montur/recete";

loadEnvConfig(process.cwd());

export const runtime = "nodejs";
export const maxDuration = 60;

// MONTÜR — KOMUTLA REÇETE DÜZENLEME (MONTUR.md §7 sözleşmesi).
// AI şekil çizmez: yalnız reçete JSON'unu düzenler; motor clampRecete ile
// kurallara kıstırır. Servis adı UI'ya sızmaz (ticari sır).

function sanitizeKey(): string | undefined {
  const raw = process.env.GOOGLE_API_KEY ?? "";
  return (
    raw.split("").filter((ch) => ch.charCodeAt(0) > 31 && ch.charCodeAt(0) < 256).join("").trim() || undefined
  );
}

function sistemPrompt(): string {
  return [
    "Sen bir kuyumculuk MONTÜR reçetesi editörüsün. Kullanıcının Türkçe komutunu",
    "mevcut reçeteye uygular, YENİ reçeteyi döndürürsün.",
    "",
    "REÇETE ŞEMASI (tüm alanlar zorunlu):",
    JSON.stringify(VARSAYILAN, null, 1),
    "",
    "ALAN AÇIKLAMALARI ve SINIRLAR:",
    `- olcu.euSize: yüzük ölçüsü, İÇ ÇEVRE mm (EU sistemi), ${SINIR.euSize.min}-${SINIR.euSize.max}.`,
    `- sank.genislikMm: bant genişliği ${SINIR.sankGenislik.min}-${SINIR.sankGenislik.max}; sank.kalinlikMm: ${SINIR.sankKalinlik.min}-${SINIR.sankKalinlik.max}.`,
    '- sank.kesit: "yarimYuvarlak" (iç düz dış bombeli) | "dikdortgen".',
    `- sank.taperOran: omuz genişleme çarpanı ${SINIR.taper.min}-${SINIR.taper.max} ("omuzları genişlet" → artır).`,
    '- kafa.tip: "tirnak" | "bezel". kafa.tirnakSayisi: 4 | 6.',
    `- kafa.tirnakCapMm: null = kuraldan otomatik (taşın %15'i); sayı verilirse ${SINIR.tirnakCap.min}-${SINIR.tirnakCap.max}.`,
    `- kafa.bezelDuvarMm: ${SINIR.bezelDuvar.min}-${SINIR.bezelDuvar.max}.`,
    `- tas.capMm: yuvarlak taş çapı ${SINIR.tasCap.min}-${SINIR.tasCap.max}. Karat istenirse çevir: çap = (ct/0.003721)^(1/3). Örn 1 ct ≈ 6.45 mm, 0.5 ct ≈ 5.12 mm.`,
    '- maden: "au8"|"au14"|"au14r"|"au18"|"au22"|"ag925"|"pt950".',
    "",
    "KURALLAR:",
    "1. SADECE komutun istediği alanları değiştir, kalanını aynen koru.",
    "2. Sınır dışına çıkma — motor zaten kıstırır ama sen de sınır içinde kal.",
    '3. Komut reçeteyle ilgisizse veya anlaşılmıyorsa reçeteyi AYNEN döndür ve aciklama alanına "Komut anlaşılamadı: ..." yaz. TAHMİN ETME.',
    "4. ÇIKTI: yalnız şu JSON: {\"recete\": <tam reçete>, \"aciklama\": \"<tek cümle Türkçe: ne değişti>\"}",
  ].join("\n");
}

/** Metindeki ilk dengeli JSON nesnesini ayıkla (model çevresine metin sızdırabiliyor). */
function ilkJson(text: string): { recete?: unknown; aciklama?: string } | null {
  const bas = text.indexOf("{");
  if (bas < 0) return null;
  let derinlik = 0;
  for (let i = bas; i < text.length; i++) {
    if (text[i] === "{") derinlik++;
    else if (text[i] === "}") {
      derinlik--;
      if (derinlik === 0) {
        try {
          return JSON.parse(text.slice(bas, i + 1));
        } catch {
          return null;
        }
      }
    }
  }
  return null;
}

export async function POST(req: Request) {
  // lokal önizleme: dev modunda gate atlanır (production'da etkisiz —
  // sayfa gate'iyle aynı kanıtlı desen)
  if (process.env.NODE_ENV !== "development") {
    const gate = await requireSuperAdmin();
    if (!gate.ok) return gate.response;
  }

  const apiKey = sanitizeKey();
  if (!apiKey) {
    return NextResponse.json({ error: "Servis yapılandırılmamış. Yönetici ile iletişime geçin." }, { status: 500 });
  }

  let body: { recete?: unknown; komut?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Geçersiz istek" }, { status: 400 });
  }
  const komut = (body.komut ?? "").toString().trim().slice(0, 500);
  if (!komut) return NextResponse.json({ error: "Komut boş" }, { status: 400 });
  const { recete: mevcut } = clampRecete(body.recete);

  try {
    const res = await fetch(
      // gemini-2.0-flash kapatıldı (404, 2026-07-17) — "latest" takma adı güvenli
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: sistemPrompt() }] },
          contents: [
            {
              role: "user",
              parts: [
                { text: `MEVCUT REÇETE:\n${JSON.stringify(mevcut)}\n\nKOMUT: ${komut}` },
              ],
            },
          ],
          generationConfig: { responseMimeType: "application/json", temperature: 0.1 },
        }),
      },
    );
    if (!res.ok) {
      return NextResponse.json({ error: "Düzenleme servisi şu an yanıt veremiyor." }, { status: 502 });
    }
    const data = await res.json();
    const text: string = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
    // model bazen JSON'un çevresine metin sızdırıyor — ilk dengeli { } bloğunu al
    const parsed = ilkJson(text);
    if (!parsed) {
      return NextResponse.json({ error: "Düzenleme çözümlenemedi — komutu sadeleştirip tekrar dene." }, { status: 502 });
    }
    // MONTUR.md §7: motor kıskacı son sözdür; kısılanlar notlara düşer
    const { recete, notlar } = clampRecete(parsed.recete ?? mevcut);
    return NextResponse.json({
      recete,
      aciklama: (parsed.aciklama ?? "Reçete güncellendi.").toString().slice(0, 300),
      notlar,
    });
  } catch {
    return NextResponse.json({ error: "Düzenleme servisi şu an yanıt veremiyor." }, { status: 502 });
  }
}
