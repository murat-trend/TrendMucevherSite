/**
 * Tek seferlik: products_3d.content_source_locale migration.
 * Kullanım (PowerShell):
 *   $env:DATABASE_URL="postgresql://postgres.[ref]:[şifre]@...pooler.supabase.com:6543/postgres"
 *   node scripts/apply-content-source-locale.mjs
 *
 * URI: Supabase Dashboard → Settings → Database → Connection string (Transaction veya Session pooler).
 */
import { readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import pg from "pg";

const { Client } = pg;
const __dirname = dirname(fileURLToPath(import.meta.url));

const connectionString = process.env.DATABASE_URL?.trim();
if (!connectionString) {
  console.error("DATABASE_URL ortam değişkeni gerekli (Supabase Postgres URI).");
  process.exit(1);
}

const sqlPath = join(__dirname, "../supabase/migrations/20260413204500_products_3d_content_source_locale.sql");
const sql = readFileSync(sqlPath, "utf8");

const client = new Client({
  connectionString,
  ssl: /localhost|127\.0\.0\.1/i.test(connectionString) ? undefined : { rejectUnauthorized: false },
});

try {
  await client.connect();
  await client.query(sql);
  console.log("OK: content_source_locale migration uygulandı.");
} catch (e) {
  console.error(e);
  process.exit(1);
} finally {
  await client.end().catch(() => {});
}
