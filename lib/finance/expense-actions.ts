"use server";

import { normalizeExpenseRow, type ExpenseRow } from "@/lib/finance/expense-row";
import { fetchFinanceExpenseRows, replaceFinanceExpenseRows } from "@/lib/finance/expense-data-path";

const MAX_ROWS = 5000;

export async function loadExpenseRowsFromServer(): Promise<ExpenseRow[] | null> {
  try {
    return await fetchFinanceExpenseRows();
  } catch {
    return null;
  }
}

export async function saveExpenseRowsToServer(rows: ExpenseRow[]): Promise<{ ok: boolean; error?: string }> {
  try {
    if (!Array.isArray(rows) || rows.length > MAX_ROWS) {
      return { ok: false, error: "Geçersiz veya çok fazla satır." };
    }
    const normalized = rows.map(normalizeExpenseRow);
    await replaceFinanceExpenseRows(normalized);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}
