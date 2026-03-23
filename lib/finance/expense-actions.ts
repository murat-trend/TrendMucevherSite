"use server";

import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";
import { normalizeExpenseRow, type ExpenseRow } from "@/lib/finance/expense-row";
import { getExpensesJsonPath } from "@/lib/finance/expense-data-path";

const MAX_ROWS = 5000;

export async function loadExpenseRowsFromServer(): Promise<ExpenseRow[] | null> {
  try {
    const raw = await readFile(getExpensesJsonPath(), "utf-8");
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return null;
    return parsed.map(normalizeExpenseRow);
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
    const p = getExpensesJsonPath();
    await mkdir(path.dirname(p), { recursive: true });
    await writeFile(p, JSON.stringify(normalized, null, 2), "utf-8");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}
