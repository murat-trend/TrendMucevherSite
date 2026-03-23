import fs from "fs";
import path from "path";

/** Proje kökündeki `Reports` klasörüne PDF yazar */
export function savePdfToReportsFolder(pdfBytes: Uint8Array, fileName: string): string {
  const dir = path.join(process.cwd(), "Reports");
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  const fullPath = path.join(dir, fileName);
  fs.writeFileSync(fullPath, pdfBytes);
  return fullPath;
}
