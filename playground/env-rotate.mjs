/**
 * Environment / API Key Rotate Yardımcısı
 * Kullanım: node playground/env-rotate.mjs [backup|restore|template]
 *
 * backup  – .env.local'ı yedekler (playground/env-backups/)
 * restore – son yedeği geri yükler
 * template – yeni anahtarlar için şablon oluşturur
 */

import { writeFileSync, existsSync, copyFileSync, mkdirSync, readdirSync } from "fs";
import { resolve } from "path";

const ENV_PATH = resolve(process.cwd(), ".env.local");
const BACKUP_DIR = resolve(process.cwd(), "playground", "env-backups");

function backup() {
  if (!existsSync(ENV_PATH)) {
    console.log("❌ .env.local bulunamadı.");
    return;
  }
  if (!existsSync(BACKUP_DIR)) mkdirSync(BACKUP_DIR, { recursive: true });
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const backupPath = resolve(BACKUP_DIR, `env.backup.${timestamp}`);
  copyFileSync(ENV_PATH, backupPath);
  console.log("✅ Yedek alındı:", backupPath);
}

function restore() {
  if (!existsSync(BACKUP_DIR)) {
    console.log("❌ Yedek klasörü yok.");
    return;
  }
  const backups = readdirSync(BACKUP_DIR)
    .filter((f) => f.startsWith("env.backup."))
    .sort()
    .reverse();
  if (backups.length === 0) {
    console.log("❌ Yedek dosyası yok.");
    return;
  }
  const latest = resolve(BACKUP_DIR, backups[0]);
  copyFileSync(latest, ENV_PATH);
  console.log("✅ Geri yüklendi:", latest, "→ .env.local");
}

function template() {
  const template = `# Rotate sonrası yeni anahtarlar
# Eski .env.local yedeklendi - aşağıdaki değerleri güncelleyin

OPENAI_API_KEY=sk-proj-YENİ_ANAHTAR_BURAYA

# Meshy AI - 3D model üretimi
MESHY_API_KEY=msy_YENİ_ANAHTAR_BURAYA

# Replicate - Derinlik haritası ve normal map
REPLICATE_API_TOKEN=YENİ_TOKEN_BURAYA
`;
  const outPath = resolve(process.cwd(), "playground", ".env.rotate.template");
  writeFileSync(outPath, template);
  console.log("✅ Şablon oluşturuldu:", outPath);
  console.log("   Yeni anahtarları bu dosyaya yazıp .env.local olarak kopyalayın.");
}

const cmd = process.argv[2] || "backup";
if (cmd === "backup") backup();
else if (cmd === "restore") restore();
else if (cmd === "template") template();
else console.log("Kullanım: node playground/env-rotate.mjs [backup|restore|template]");
