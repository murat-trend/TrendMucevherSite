import { loadEnvConfig } from "@next/env";
import { GoogleGenAI } from "@google/genai";

loadEnvConfig(process.cwd());

const ai = new GoogleGenAI({ apiKey: process.env.GOOGLE_API_KEY! });

async function test() {
  const t0 = Date.now();
  const imgRes = await fetch("https://images.unsplash.com/photo-1605100804763-247f67b3557e?w=400");
  const raw = Buffer.from(await imgRes.arrayBuffer()).toString("base64");
  console.log(`[setup] görsel: ${Date.now()-t0}ms`);

  // Aynı route'daki Promise.all gibi 2 varyasyon paralel
  const results = await Promise.all([1, 2].map(async (n) => {
    const t1 = Date.now();
    const turn1 = await ai.models.generateContent({
      model: "gemini-3.1-flash-image",
      contents: [{ role: "user", parts: [
        { inlineData: { mimeType: "image/jpeg", data: raw } },
        { text: "Analyze ONLY the decorative style. Describe metal, technique, motifs, stones, mood. No jewelry type." }
      ]}],
      config: { responseModalities: ["TEXT"] } as any,
    });
    const style = turn1.candidates?.[0]?.content?.parts
      ?.filter((p: any) => !p.thought && p.text)?.map((p: any) => p.text)?.join("") ?? "";
    console.log(`[var${n}] turn1: ${Date.now()-t1}ms | toplam: ${Date.now()-t0}ms`);

    const turn3 = await ai.models.generateContent({
      model: "gemini-3.1-flash-image",
      contents: [
        { role: "user", parts: [{ inlineData: { mimeType: "image/jpeg", data: raw } }, { text: "Analyze ONLY decorative style. No jewelry type." }]},
        { role: "model", parts: [{ text: style }]},
        { role: "user", parts: [{ text: "Create a silver pair of earrings in this exact style. Front view, white background." }]}
      ],
      config: { responseModalities: ["IMAGE", "TEXT"] } as any,
    });
    console.log(`[var${n}] turn3: ${Date.now()-t1}ms | toplam: ${Date.now()-t0}ms`);

    const parts = (turn3.candidates?.[0]?.content?.parts ?? []) as any[];
    const img = parts.find(p => !p.thought && p.inlineData?.mimeType?.startsWith("image/"));
    return img ? "OK" : "NO_IMAGE";
  }));

  console.log(`\nSONUÇ: ${JSON.stringify(results)} | TOPLAM: ${Date.now()-t0}ms`);
}

test().catch(e => console.error("HATA:", e.message, e.status));
