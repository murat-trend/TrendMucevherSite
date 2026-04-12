import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { normalizeExpenseRow, type ExpenseRow } from "@/lib/finance/expense-row";

function getSupabaseAdmin(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !key) return null;
  return createClient(url, key);
}

function requireAdmin(): SupabaseClient {
  const c = getSupabaseAdmin();
  if (!c) {
    throw new Error("Gider verisi için NEXT_PUBLIC_SUPABASE_URL ve SUPABASE_SERVICE_ROLE_KEY gerekli.");
  }
  return c;
}

type FinanceExpenseDbRow = {
  id: string;
  date_iso: string;
  description: string;
  category: string;
  amount_try: number | string;
  invoices: unknown;
  sort_index: number;
};

function dbRowToExpense(row: FinanceExpenseDbRow): ExpenseRow {
  return normalizeExpenseRow({
    id: row.id,
    dateIso: row.date_iso,
    description: row.description,
    category: row.category,
    amountTry: typeof row.amount_try === "number" ? row.amount_try : Number(row.amount_try),
    invoices: row.invoices,
  });
}

/** `finance_expenses` tablosundan sıralı gider satırları (boş / hata → []) */
export async function fetchFinanceExpenseRows(): Promise<ExpenseRow[]> {
  const sb = getSupabaseAdmin();
  if (!sb) return [];
  const { data, error } = await sb
    .from("finance_expenses")
    .select("id, date_iso, description, category, amount_try, invoices, sort_index")
    .order("sort_index", { ascending: true });
  if (error) throw new Error(error.message);
  return (data as FinanceExpenseDbRow[] | null)?.map(dbRowToExpense) ?? [];
}

const UPSERT_BATCH = 400;

/** Tüm satırları tablo ile senkronlar (eksik id’ler silinir, kalanlar upsert). */
export async function replaceFinanceExpenseRows(rows: ExpenseRow[]): Promise<void> {
  const sb = requireAdmin();
  const normalized = rows.map(normalizeExpenseRow);

  const { data: existing, error: selErr } = await sb.from("finance_expenses").select("id");
  if (selErr) throw selErr;
  const oldIds = new Set((existing ?? []).map((r: { id: string }) => r.id));
  const newIds = new Set(normalized.map((r) => r.id));
  const toDelete = [...oldIds].filter((id) => !newIds.has(id));

  const delChunk = 200;
  for (let i = 0; i < toDelete.length; i += delChunk) {
    const chunk = toDelete.slice(i, i + delChunk);
    const { error: delErr } = await sb.from("finance_expenses").delete().in("id", chunk);
    if (delErr) throw delErr;
  }

  const now = new Date().toISOString();
  const payloads = normalized.map((r, sort_index) => ({
    id: r.id,
    date_iso: r.dateIso,
    description: r.description,
    category: r.category,
    amount_try: r.amountTry,
    invoices: r.invoices,
    sort_index,
    updated_at: now,
  }));

  for (let i = 0; i < payloads.length; i += UPSERT_BATCH) {
    const chunk = payloads.slice(i, i + UPSERT_BATCH);
    const { error: upErr } = await sb.from("finance_expenses").upsert(chunk);
    if (upErr) throw upErr;
  }
}
