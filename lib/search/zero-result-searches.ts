/**
 * Mağaza aramasında sonuç dönmeyen sorgular — admin’de listelenir;
 * istemci tarafında localStorage ile birleştirilebilir (API yokken).
 */

export type ZeroResultSearchEntry = {
  query: string;
  /** Toplam kaç kez sonuçsuz arandı */
  count: number;
  /** ISO tarih — son görülme */
  lastSeenIso: string;
};

export const ZERO_RESULT_SEARCHES_STORAGE_KEY = "trendmucevher-zero-result-searches-v1";

/** Demo + seed — panel boş kalmasın */
export const DEMO_ZERO_RESULT_SEARCHES: ZeroResultSearchEntry[] = [
  { query: "lüks baget pırlanta choker", count: 42, lastSeenIso: "2025-03-14T11:20:00.000Z" },
  { query: "18 ayar rose minimal yüzük seti", count: 31, lastSeenIso: "2025-03-14T09:05:00.000Z" },
  { query: "vintage osmanlı broş altın", count: 24, lastSeenIso: "2025-03-13T16:40:00.000Z" },
  { query: "lab grown elmas 1ct", count: 19, lastSeenIso: "2025-03-13T14:22:00.000Z" },
  { query: "inci kolye uzun 90cm", count: 14, lastSeenIso: "2025-03-12T10:15:00.000Z" },
  { query: "antika yüzük osmanlı mühür", count: 11, lastSeenIso: "2025-03-11T18:00:00.000Z" },
  { query: "safir küpe damla 2ct", count: 9, lastSeenIso: "2025-03-11T12:30:00.000Z" },
  { query: "gümüş türk işi bilezik çift", count: 7, lastSeenIso: "2025-03-10T09:00:00.000Z" },
];

function normalizeQuery(q: string): string {
  return q.trim().replace(/\s+/g, " ").slice(0, 200);
}

/** Tarayıcıda: sonuçsuz aramayı kaydet (ürün arama sayfasından çağrılabilir) */
export function recordZeroResultSearch(query: string): void {
  if (typeof window === "undefined") return;
  const q = normalizeQuery(query);
  if (!q) return;

  const now = new Date().toISOString();
  let existing: ZeroResultSearchEntry[] = [];
  try {
    const raw = localStorage.getItem(ZERO_RESULT_SEARCHES_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as ZeroResultSearchEntry[];
      if (Array.isArray(parsed)) existing = parsed;
    }
  } catch {
    /* ignore */
  }

  const idx = existing.findIndex((e) => e.query.toLowerCase() === q.toLowerCase());
  if (idx >= 0) {
    existing[idx] = {
      ...existing[idx],
      count: existing[idx].count + 1,
      lastSeenIso: now,
    };
  } else {
    existing.push({ query: q, count: 1, lastSeenIso: now });
  }

  try {
    localStorage.setItem(ZERO_RESULT_SEARCHES_STORAGE_KEY, JSON.stringify(existing));
  } catch {
    /* quota */
  }
}

/** Demo + localStorage birleşimi; sorguya göre birleştirir, sayıları toplar */
export function mergeZeroResultSearches(
  fromStorage: ZeroResultSearchEntry[] | null,
  demo: readonly ZeroResultSearchEntry[] = DEMO_ZERO_RESULT_SEARCHES,
): ZeroResultSearchEntry[] {
  const map = new Map<string, ZeroResultSearchEntry>();

  for (const d of demo) {
    const key = d.query.toLowerCase();
    map.set(key, { ...d });
  }

  if (fromStorage) {
    for (const s of fromStorage) {
      const key = s.query.toLowerCase();
      const prev = map.get(key);
      if (prev) {
        map.set(key, {
          query: prev.query.length >= s.query.length ? prev.query : s.query,
          count: prev.count + s.count,
          lastSeenIso: prev.lastSeenIso > s.lastSeenIso ? prev.lastSeenIso : s.lastSeenIso,
        });
      } else {
        map.set(key, { ...s });
      }
    }
  }

  return [...map.values()].sort((a, b) => b.count - a.count || b.lastSeenIso.localeCompare(a.lastSeenIso));
}
