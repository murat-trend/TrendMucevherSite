// test-font-uret.ts
import { loadEnvConfig } from "@next/env";
import { GoogleGenAI } from "@google/genai";
import * as fs from "fs";

loadEnvConfig(process.cwd());

const ai = new GoogleGenAI({ apiKey: process.env.GOOGLE_API_KEY! });

async function testFont() {
  const response = await ai.models.generateContent({
    model: "gemini-3.1-flash-image-preview",
    contents: [{
      role: "user",
      parts: [{ text: `Design a luxury jewelry script font alphabet.
Show all 26 letters A through Z in uppercase, arranged in a clean grid (5 columns x 6 rows, last row partial).
Font style: elegant cursive script, flowing strokes, thin and thick contrast, suitable for name necklace engraving.
Each letter clearly separated, same size, centered in its cell.
Pure white background. Black ink. No decorations around letters, only the letters themselves.
High contrast, clean lines, suitable for use as engraving template.` }]
    }],
    config: { responseModalities: ["IMAGE"] } as any,
  });

  const parts = response.candidates?.[0]?.content?.parts ?? [];
  for (const part of parts as any[]) {
    if (!part.thought && part.inlineData?.mimeType?.startsWith("image/")) {
      fs.writeFileSync("font-test.png", Buffer.from(part.inlineData.data, "base64"));
      console.log("✅ font-test.png kaydedildi");
      break;
    }
  }
}

testFont().catch(console.error);
