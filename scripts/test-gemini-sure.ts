// test-gemini-sure.ts
import { loadEnvConfig } from "@next/env";
import { GoogleGenAI } from "@google/genai";

loadEnvConfig(process.cwd());

const ai = new GoogleGenAI({ apiKey: process.env.GOOGLE_API_KEY! });

async function test() {
  const t0 = Date.now();
  console.log("[1] başlıyor...");

  // Küçük test görseli
  const imgRes = await fetch("https://images.unsplash.com/photo-1605100804763-247f67b3557e?w=400");
  const raw = Buffer.from(await imgRes.arrayBuffer()).toString("base64");
  console.log(`[2] görsel indirildi: ${Date.now()-t0}ms`);

  // TURN 1
  const turn1 = await ai.models.generateContent({
    model: "gemini-3.1-flash-image-preview",
    contents: [{
      role: "user",
      parts: [
        { inlineData: { mimeType: "image/jpeg", data: raw } },
        { text: "Analyze ONLY the decorative style. Describe metal, technique, motifs, stones, mood. Do NOT mention jewelry type." }
      ]
    }],
    config: { responseModalities: ["TEXT"] } as any,
  });

  const style = turn1.candidates?.[0]?.content?.parts
    ?.filter((p: any) => !p.thought && p.text)
    ?.map((p: any) => p.text)?.join("") ?? "";

  console.log(`[3] turn1 bitti: ${Date.now()-t0}ms`);
  console.log(`[4] stil: ${style.slice(0,100)}...`);

  // TURN 3
  const turn3 = await ai.models.generateContent({
    model: "gemini-3.1-flash-image-preview",
    contents: [
      { role: "user", parts: [
        { inlineData: { mimeType: "image/jpeg", data: raw } },
        { text: "Analyze ONLY decorative style. No jewelry type." }
      ]},
      { role: "model", parts: [{ text: style }]},
      { role: "user", parts: [{ text: "Create a silver pair of earrings in this exact style. Front view, white background, no hands, no model." }]}
    ],
    config: { responseModalities: ["IMAGE", "TEXT"] } as any,
  });

  console.log(`[5] turn3 bitti: ${Date.now()-t0}ms`);

  const parts = turn3.candidates?.[0]?.content?.parts ?? [];
  const img = (parts as any[]).find(p => !p.thought && p.inlineData?.mimeType?.startsWith("image/"));
  if (img) {
    require("fs").writeFileSync("test-out.png", Buffer.from(img.inlineData.data, "base64"));
    console.log(`[6] görsel kaydedildi ✅ toplam: ${Date.now()-t0}ms`);
  } else {
    console.log(`[6] görsel gelmedi ❌ toplam: ${Date.now()-t0}ms`);
    console.log("parts:", JSON.stringify(parts, null, 2).slice(0, 500));
  }
}

test().catch(e => console.error("HATA:", e.message));
