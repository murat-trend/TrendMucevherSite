import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * MÜŞTERİ ATÖLYESİ — veri erişimi.
 *
 * Tablolarda permissive RLS policy YOK (remaura_warnings deseni): erişim yalnız
 * servis-rol anahtarıyla + route'taki süper-admin geçidiyle olur.
 */

export type Musteri = {
  id: string;
  created_at: string;
  ad: string;
  telefon: string | null;
  notlar: string | null;
};

export type Tasarim = {
  id: string;
  created_at: string;
  gorsel_url: string;
  koleksiyon_adi: string | null;
  tip: string | null;
  musteri_id: string | null;
};

export function getAdminClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

/** Migration uygulanmadıysa route'lar 500 yerine anlaşılır mesaj dönsün. */
export function isMissingTable(err: { code?: string; message?: string } | null): boolean {
  if (!err) return false;
  return err.code === "42P01" || /relation .* does not exist/i.test(err.message ?? "");
}

export const MIGRATION_MESAJI =
  "Müşteri tablosu bulunamadı — veritabanı güncellemesi (migration) henüz uygulanmamış.";
