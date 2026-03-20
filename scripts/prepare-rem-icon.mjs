/**
 * REM AI ikonunu temizleyip public klasörüne hazırlar.
 * Beyaz arka planı şeffaf yapar, ikon boyutlarına resize eder.
 */
import sharp from "sharp";
import { readFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

const projectRoot = dirname(__dirname);
const DEFAULT_INPUT = join(
  projectRoot,
  "../../.cursor/projects/c-Users-Murat-Desktop-trendmucevher-site/assets/c__Users_Murat_AppData_Roaming_Cursor_User_workspaceStorage_0f2ae90884a5ab66d5356985ef36986d_images_rem_ai_ikon-289788d6-b956-46c8-bd26-7ba41fdb013e.png"
);
const INPUT = process.argv[2] || DEFAULT_INPUT;

const OUTPUT_DIR = join(__dirname, "../public");
const SIZES = [32, 64, 128, 256, 512];

async function main() {
  if (!existsSync(INPUT)) {
    console.error("Görsel bulunamadı:", INPUT);
    console.error("Kullanım: node scripts/prepare-rem-icon.mjs [görsel_yolu]");
    process.exit(1);
  }

  const buffer = readFileSync(INPUT);
  const image = sharp(buffer);

  // Beyaz arka planı şeffaf yap (threshold ~250)
  const { data, info } = await image
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const pixels = new Uint8Array(data);
  const threshold = 250;

  for (let i = 0; i < pixels.length; i += 4) {
    const r = pixels[i];
    const g = pixels[i + 1];
    const b = pixels[i + 2];

    // Beyaza yakın pikselleri şeffaf yap
    if (r >= threshold && g >= threshold && b >= threshold) {
      pixels[i + 3] = 0;
    }
  }

  const transparent = sharp(pixels, {
    raw: {
      width: info.width,
      height: info.height,
      channels: 4,
    },
  });

  // Orijinal boyutta şeffaf PNG
  const fullPath = join(OUTPUT_DIR, "rem-icon.png");
  await transparent.png().toFile(fullPath);
  console.log("✓ rem-icon.png (orijinal boyut)");

  // İkon boyutları
  for (const size of SIZES) {
    const path = join(OUTPUT_DIR, `rem-icon-${size}.png`);
    await transparent
      .resize(size, size)
      .png()
      .toFile(path);
    console.log(`✓ rem-icon-${size}.png`);
  }

  // Favicon için 32x32
  await transparent
    .resize(32, 32)
    .png()
    .toFile(join(OUTPUT_DIR, "favicon-rem.png"));
  console.log("✓ favicon-rem.png");

  console.log("\nİkonlar public/ klasörüne kaydedildi.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
