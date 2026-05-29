// scripts/test-isim-kolye.ts
// Lokal test: isim-kolye üretimini direkt Gemini ile dener
import { loadEnvConfig } from "@next/env";
import { GoogleGenAI } from "@google/genai";
import * as fs from "fs";

loadEnvConfig(process.cwd());

const ai = new GoogleGenAI({ apiKey: process.env.GOOGLE_API_KEY! });

const prompt = `Professional luxury e-commerce jewelry product photograph.

SUBJECT: A single-letter initial pendant necklace.
Letter: "C" — this exact letter, perfectly formed and clearly legible.
Font style: elegant thin cursive script with flowing hairline strokes, graceful swirls at terminals, thin-to-thick calligraphic contrast, luxury jewelry wire quality.
Metal: 18k polished yellow gold, warm golden hue, mirror-bright finish.
Surface decoration: plain polished metal surface, no stones, pure mirror finish, light reflections along curves.
Chain: delicate fine cable chain, same metal.

COMPOSITION: Front-facing view, pendant perfectly centered in frame. Full pendant visible, upper portion of chain extends to top edge.
BACKGROUND: Pure white (#FFFFFF), soft diffused studio lighting, subtle drop shadow beneath pendant only.

CRITICAL REQUIREMENT: The pendant must unmistakably show the letter "C". The letter form must be clean, complete, and instantly readable. Every stroke and curve must be correct.

No hands. No model. No props. No text overlays. No watermarks.
Photorealistic render quality, sharp focus throughout, luxury product photography standard.`;

async function test() {
  console.log("[1] başlıyor...");
  const t0 = Date.now();

  try {
    const result = await ai.models.generateContent({
      model: "gemini-3.1-flash-image-preview",
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      config: { responseModalities: ["IMAGE", "TEXT"] } as never,
    });

    const candidate = result.candidates?.[0];
    console.log("[2] finishReason:", candidate?.finishReason);
    const parts = candidate?.content?.parts ?? [];
    console.log("[3] parts count:", parts.length);

    for (const p of parts as Array<{ thought?: boolean; text?: string; inlineData?: { mimeType: string; data: string } }>) {
      if (p.thought) {
        console.log("[4] thought part (skipped)");
      } else if (p.text) {
        console.log("[4] text part:", p.text.slice(0, 200));
      } else if (p.inlineData) {
        console.log("[4] image part:", p.inlineData.mimeType, `${p.inlineData.data.length} chars`);
        fs.writeFileSync("isim-kolye-test.png", Buffer.from(p.inlineData.data, "base64"));
        console.log(`[5] ✅ kaydedildi: isim-kolye-test.png | ${Date.now()-t0}ms`);
      }
    }

    const hasImage = (parts as Array<{ inlineData?: { mimeType: string } }>)
      .some(p => p.inlineData?.mimeType?.startsWith("image/"));
    if (!hasImage) {
      console.log("[5] ❌ görsel gelmedi");
    }
  } catch (err) {
    console.error("[ERROR]", err instanceof Error ? err.message : err);
  }
}

test();
