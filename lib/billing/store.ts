import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";
import type { DebitResult, LedgerEntry, PaymentSession, Wallet } from "./types";
import { isRemauraSuperAdminUserId } from "./super-admin";

function nowIso() {
  return new Date().toISOString();
}

function getSupabaseAdmin(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !key) return null;
  return createClient(url, key);
}

function requireSupabase(): SupabaseClient {
  const c = getSupabaseAdmin();
  if (!c) {
    throw new Error("Billing için NEXT_PUBLIC_SUPABASE_URL ve SUPABASE_SERVICE_ROLE_KEY gerekli.");
  }
  return c;
}

function rowToWallet(row: { user_id: string; credits: number | string | null; updated_at: string }): Wallet {
  const n = Number(row.credits);
  return {
    userId: row.user_id,
    balanceCredits: Number.isFinite(n) ? n : 0,
    updatedAt: row.updated_at,
  };
}

function ledgerDescription(reason: string, sessionId?: string): string {
  if (sessionId) return JSON.stringify({ reason, sessionId });
  return reason;
}

function parseLedgerDescription(s: string | null | undefined): { reason: string; sessionId?: string } {
  if (s == null || s === "") return { reason: "" };
  if (s.startsWith("{") && s.includes('"reason"')) {
    try {
      const o = JSON.parse(s) as { reason?: string; sessionId?: string };
      if (o && typeof o === "object" && typeof o.reason === "string") {
        return { reason: o.reason, sessionId: typeof o.sessionId === "string" ? o.sessionId : undefined };
      }
    } catch {
      return { reason: s };
    }
  }
  return { reason: s };
}

function rowToLedgerEntry(row: {
  id: string;
  user_id: string;
  amount: number | string;
  type: string;
  description: string | null;
  created_at: string;
}): LedgerEntry {
  const { reason, sessionId } = parseLedgerDescription(row.description);
  return {
    id: row.id,
    userId: row.user_id,
    type: row.type === "credit" ? "credit" : "debit",
    credits: Number(row.amount),
    reason,
    sessionId,
    createdAt: row.created_at,
  };
}

type PaymentSessionRow = {
  id: string;
  user_id: string;
  data: PaymentSession;
  paid: boolean;
  created_at: string;
};

function rowToPaymentSession(row: PaymentSessionRow): PaymentSession {
  const d = row.data as PaymentSession;
  const paid = row.paid === true || d.status === "paid";
  return {
    ...d,
    id: row.id,
    userId: row.user_id,
    status: paid ? "paid" : d.status,
    paidAt: d.paidAt,
  };
}

async function ensureWalletRow(supabase: SupabaseClient, userId: string): Promise<Wallet> {
  const { data: existing } = await supabase
    .from("billing_wallets")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
  if (existing) return rowToWallet(existing);

  const iso = nowIso();
  const { data: inserted, error } = await supabase
    .from("billing_wallets")
    .insert({ user_id: userId, credits: 0, updated_at: iso })
    .select("*")
    .maybeSingle();

  if (error?.code === "23505") {
    const { data: again } = await supabase.from("billing_wallets").select("*").eq("user_id", userId).maybeSingle();
    if (again) return rowToWallet(again);
  }

  if (inserted) return rowToWallet(inserted);
  if (error) throw new Error(error.message || "Cüzdan oluşturulamadı.");

  const { data: afterRace } = await supabase.from("billing_wallets").select("*").eq("user_id", userId).maybeSingle();
  if (afterRace) return rowToWallet(afterRace);
  throw new Error("Cüzdan oluşturulamadı.");
}

const OPTIMISTIC_RETRIES = 5;

export async function getWallet(userId: string): Promise<Wallet> {
  const supabase = requireSupabase();
  return ensureWalletRow(supabase, userId);
}

export async function debitCredits(
  userId: string,
  credits: number,
  reason: string,
  sessionId?: string
): Promise<DebitResult> {
  const supabase = requireSupabase();

  if (isRemauraSuperAdminUserId(userId)) {
    const wallet = await ensureWalletRow(supabase, userId);
    return { ok: true, wallet, charged: false };
  }

  for (let attempt = 0; attempt < OPTIMISTIC_RETRIES; attempt++) {
    const wallet = await ensureWalletRow(supabase, userId);
    const balance = wallet.balanceCredits;

    if (!Number.isFinite(balance) || balance < credits) {
      return { ok: false, wallet };
    }

    const entryId = randomUUID();
    const iso = nowIso();

    const { data: updated, error: upErr } = await supabase
      .from("billing_wallets")
      .update({ credits: balance - credits, updated_at: iso })
      .eq("user_id", userId)
      .eq("credits", balance)
      .select("*")
      .maybeSingle();

    if (upErr) throw new Error(upErr.message);
    if (!updated) continue;

    const { error: ledErr } = await supabase.from("billing_ledger").insert({
      id: entryId,
      user_id: userId,
      amount: credits,
      type: "debit",
      description: ledgerDescription(reason, sessionId),
      created_at: iso,
    });

    if (ledErr) {
      console.error("[billing] ledger insert failed after debit; wallet already updated:", ledErr);
      throw new Error(ledErr.message || "Ledger yazılamadı.");
    }

    return { ok: true, wallet: rowToWallet(updated), ledgerEntryId: entryId, charged: true };
  }

  const wallet = await ensureWalletRow(supabase, userId);
  return { ok: false, wallet };
}

export async function creditCredits(
  userId: string,
  credits: number,
  reason: string,
  sessionId?: string
): Promise<Wallet> {
  const supabase = requireSupabase();

  for (let attempt = 0; attempt < OPTIMISTIC_RETRIES; attempt++) {
    const wallet = await ensureWalletRow(supabase, userId);
    const balance = wallet.balanceCredits;
    const next = balance + credits;
    const iso = nowIso();

    const { data: updated, error: upErr } = await supabase
      .from("billing_wallets")
      .update({ credits: next, updated_at: iso })
      .eq("user_id", userId)
      .eq("credits", balance)
      .select("*")
      .maybeSingle();

    if (upErr) throw new Error(upErr.message);
    if (!updated) continue;

    const { error: ledErr } = await supabase.from("billing_ledger").insert({
      id: randomUUID(),
      user_id: userId,
      amount: credits,
      type: "credit",
      description: ledgerDescription(reason, sessionId),
      created_at: iso,
    });

    if (ledErr) {
      console.error("[billing] ledger insert failed after credit:", ledErr);
      throw new Error(ledErr.message || "Ledger yazılamadı.");
    }

    return rowToWallet(updated);
  }

  throw new Error("Kredi eklenemedi (eşzamanlılık).");
}

export async function createPaymentSession(
  userId: string,
  amountTry: number,
  credits: number
): Promise<PaymentSession> {
  const supabase = requireSupabase();
  await ensureWalletRow(supabase, userId);

  const session: PaymentSession = {
    id: randomUUID(),
    userId,
    status: "pending",
    amountTry,
    credits,
    createdAt: nowIso(),
  };

  const { error } = await supabase.from("billing_payment_sessions").insert({
    id: session.id,
    user_id: userId,
    data: session,
    paid: false,
    created_at: session.createdAt,
  });

  if (error) throw new Error(error.message || "Ödeme oturumu oluşturulamadı.");
  return session;
}

export async function setCheckoutInfo(
  sessionId: string,
  checkoutUrl: string,
  providerRef?: string
): Promise<PaymentSession | null> {
  const supabase = requireSupabase();
  const { data: row, error } = await supabase
    .from("billing_payment_sessions")
    .select("*")
    .eq("id", sessionId)
    .maybeSingle();

  if (error || !row) return null;

  const d = row.data as PaymentSession;
  const next: PaymentSession = {
    ...d,
    checkoutUrl,
    providerRef: providerRef ?? d.providerRef,
  };

  const { error: upErr } = await supabase
    .from("billing_payment_sessions")
    .update({ data: next })
    .eq("id", sessionId);

  if (upErr) throw new Error(upErr.message);
  return rowToPaymentSession({ ...row, data: next });
}

export async function getPaymentSession(sessionId: string): Promise<PaymentSession | null> {
  const supabase = requireSupabase();
  const { data: row, error } = await supabase
    .from("billing_payment_sessions")
    .select("*")
    .eq("id", sessionId)
    .maybeSingle();

  if (error || !row) return null;
  return rowToPaymentSession(row as PaymentSessionRow);
}

export async function listWallets(): Promise<Wallet[]> {
  const supabase = requireSupabase();
  const { data, error } = await supabase
    .from("billing_wallets")
    .select("*")
    .order("updated_at", { ascending: false });

  if (error) {
    console.error("[billing] listWallets:", error);
    return [];
  }
  return (data ?? []).map((r) => rowToWallet(r as { user_id: string; credits: number | string; updated_at: string }));
}

export async function listLedger(limit = 200): Promise<LedgerEntry[]> {
  const supabase = requireSupabase();
  const lim = Math.max(1, limit);
  const { data, error } = await supabase
    .from("billing_ledger")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(lim);

  if (error) {
    console.error("[billing] listLedger:", error);
    return [];
  }
  return (data ?? []).map((r) =>
    rowToLedgerEntry(
      r as {
        id: string;
        user_id: string;
        amount: number | string;
        type: string;
        description: string | null;
        created_at: string;
      }
    )
  );
}

export async function listPaymentSessions(limit = 200): Promise<PaymentSession[]> {
  const supabase = requireSupabase();
  const lim = Math.max(1, limit);
  const { data, error } = await supabase
    .from("billing_payment_sessions")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(lim);

  if (error) {
    console.error("[billing] listPaymentSessions:", error);
    return [];
  }
  return (data ?? []).map((r) => rowToPaymentSession(r as PaymentSessionRow));
}

export async function setWalletCredits(
  userId: string,
  nextCredits: number,
  reason = "admin_wallet_set"
): Promise<Wallet> {
  const supabase = requireSupabase();
  const safeCredits = Math.max(0, Math.floor(nextCredits));

  for (let attempt = 0; attempt < OPTIMISTIC_RETRIES; attempt++) {
    const wallet = await ensureWalletRow(supabase, userId);
    const old = wallet.balanceCredits;
    const delta = safeCredits - old;
    if (delta === 0) return wallet;

    const iso = nowIso();
    const { data: updated, error: upErr } = await supabase
      .from("billing_wallets")
      .update({ credits: safeCredits, updated_at: iso })
      .eq("user_id", userId)
      .eq("credits", old)
      .select("*")
      .maybeSingle();

    if (upErr) throw new Error(upErr.message);
    if (!updated) continue;

    const { error: ledErr } = await supabase.from("billing_ledger").insert({
      id: randomUUID(),
      user_id: userId,
      amount: Math.abs(delta),
      type: delta > 0 ? "credit" : "debit",
      description: reason,
      created_at: iso,
    });

    if (ledErr) {
      console.error("[billing] ledger insert failed after setWalletCredits:", ledErr);
      throw new Error(ledErr.message || "Ledger yazılamadı.");
    }

    return rowToWallet(updated);
  }

  throw new Error("Cüzdan güncellenemedi (eşzamanlılık).");
}

export async function markPaymentSessionPaid(
  sessionId: string,
  providerRef?: string
): Promise<PaymentSession | null> {
  const supabase = requireSupabase();
  const { data: row, error } = await supabase
    .from("billing_payment_sessions")
    .select("*")
    .eq("id", sessionId)
    .maybeSingle();

  if (error || !row) return null;

  const d = row.data as PaymentSession;
  if (d.status === "paid") return rowToPaymentSession(row as PaymentSessionRow);

  const paidAt = nowIso();
  const next: PaymentSession = {
    ...d,
    status: "paid",
    paidAt,
    providerRef: providerRef ?? d.providerRef,
  };

  const { error: upErr } = await supabase
    .from("billing_payment_sessions")
    .update({ data: next, paid: true })
    .eq("id", sessionId);

  if (upErr) throw new Error(upErr.message);
  return next;
}
