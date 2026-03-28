/**
 * Sunucu tarafında: bu `userId` değerleri için kredi düşülmez (Remaura yerel billing).
 * Tarayıcıdaki `localStorage` anahtarı `remaura-billing-user-id` ile aynı UUID'yi .env'e yazın.
 *
 * Örnek: REMAURA_SUPER_ADMIN_USER_IDS=c0d04b59-e946-4b9f-8d40-2ab44a912ff8
 */
export function getRemauraSuperAdminUserIds(): Set<string> {
  const raw =
    process.env.REMAURA_SUPER_ADMIN_USER_IDS?.trim() ||
    process.env.REMAURA_SUPER_ADMIN_USER_ID?.trim() ||
    "";
  if (!raw) return new Set();
  const ids = raw
    .split(/[\s,;]+/)
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  return new Set(ids);
}

export function isRemauraSuperAdminUserId(userId: string | undefined | null): boolean {
  const id = userId?.trim().toLowerCase();
  if (!id) return false;
  return getRemauraSuperAdminUserIds().has(id);
}
