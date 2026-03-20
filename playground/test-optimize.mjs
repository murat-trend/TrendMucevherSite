/**
 * Optimize API testi – dev server çalışıyor olmalı (npm run dev)
 * Kullanım: node playground/test-optimize.mjs
 */

const BASE = "http://localhost:3000";

async function testOptimize(prompt) {
  const res = await fetch(`${BASE}/api/remaura/optimize`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt, locale: "tr", mode3DExport: false }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Hata");
  return data;
}

async function main() {
  console.log("--- Optimize API Test ---\n");

  const prompts = [
    "gümüş madalyon, minimalist",
    "14 ayar altın kolye, kalp formu",
    "oksitlenmiş gümüş madalyon, tanrıların savaşını ifade eden, yüksek detay",
  ];

  for (const p of prompts) {
    console.log("Girdi:", p);
    try {
      const result = await testOptimize(p);
      console.log("optimizedPrompt:", result.optimizedPrompt?.slice(0, 120) + "...");
      console.log("---");
    } catch (e) {
      console.error("Hata:", e.message);
    }
  }
}

main().catch(console.error);
