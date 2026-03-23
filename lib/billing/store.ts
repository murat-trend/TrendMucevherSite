import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import type { BillingStore, DebitResult, LedgerEntry, PaymentSession, Wallet } from "./types";

const BILLING_DIR = path.join(process.cwd(), "data", "billing");
const STORE_PATH = path.join(BILLING_DIR, "store.json");

function nowIso() {
  return new Date().toISOString();
}

function defaultStore(): BillingStore {
  return {
    wallets: {},
    ledger: [],
    sessions: {},
  };
}

async function ensureStoreFile(): Promise<void> {
  await mkdir(BILLING_DIR, { recursive: true });
  try {
    await readFile(STORE_PATH, "utf8");
  } catch {
    await writeFile(STORE_PATH, JSON.stringify(defaultStore(), null, 2), "utf8");
  }
}

async function readStore(): Promise<BillingStore> {
  await ensureStoreFile();
  const raw = await readFile(STORE_PATH, "utf8");
  try {
    const parsed = JSON.parse(raw) as BillingStore;
    return {
      wallets: parsed.wallets ?? {},
      ledger: Array.isArray(parsed.ledger) ? parsed.ledger : [],
      sessions: parsed.sessions ?? {},
    };
  } catch {
    return defaultStore();
  }
}

async function writeStore(store: BillingStore): Promise<void> {
  await ensureStoreFile();
  await writeFile(STORE_PATH, JSON.stringify(store, null, 2), "utf8");
}

function ensureWallet(store: BillingStore, userId: string): Wallet {
  const existing = store.wallets[userId];
  if (existing) return existing;
  const created: Wallet = {
    userId,
    balanceCredits: 0,
    updatedAt: nowIso(),
  };
  store.wallets[userId] = created;
  return created;
}

export async function getWallet(userId: string): Promise<Wallet> {
  const store = await readStore();
  const wallet = ensureWallet(store, userId);
  await writeStore(store);
  return wallet;
}

export async function debitCredits(userId: string, credits: number, reason: string, sessionId?: string): Promise<DebitResult> {
  const store = await readStore();
  const wallet = ensureWallet(store, userId);
  if (wallet.balanceCredits < credits) {
    await writeStore(store);
    return { ok: false, wallet };
  }

  wallet.balanceCredits -= credits;
  wallet.updatedAt = nowIso();
  const entryId = randomUUID();
  store.ledger.push({
    id: entryId,
    userId,
    type: "debit",
    credits,
    reason,
    sessionId,
    createdAt: nowIso(),
  });
  store.wallets[userId] = wallet;
  await writeStore(store);
  return { ok: true, wallet, ledgerEntryId: entryId };
}

export async function creditCredits(userId: string, credits: number, reason: string, sessionId?: string): Promise<Wallet> {
  const store = await readStore();
  const wallet = ensureWallet(store, userId);
  wallet.balanceCredits += credits;
  wallet.updatedAt = nowIso();
  store.ledger.push({
    id: randomUUID(),
    userId,
    type: "credit",
    credits,
    reason,
    sessionId,
    createdAt: nowIso(),
  });
  store.wallets[userId] = wallet;
  await writeStore(store);
  return wallet;
}

export async function createPaymentSession(userId: string, amountTry: number, credits: number): Promise<PaymentSession> {
  const store = await readStore();
  ensureWallet(store, userId);
  const session: PaymentSession = {
    id: randomUUID(),
    userId,
    status: "pending",
    amountTry,
    credits,
    createdAt: nowIso(),
  };
  store.sessions[session.id] = session;
  await writeStore(store);
  return session;
}

export async function setCheckoutInfo(sessionId: string, checkoutUrl: string, providerRef?: string): Promise<PaymentSession | null> {
  const store = await readStore();
  const session = store.sessions[sessionId];
  if (!session) return null;
  session.checkoutUrl = checkoutUrl;
  if (providerRef) session.providerRef = providerRef;
  store.sessions[sessionId] = session;
  await writeStore(store);
  return session;
}

export async function getPaymentSession(sessionId: string): Promise<PaymentSession | null> {
  const store = await readStore();
  return store.sessions[sessionId] ?? null;
}

export async function listWallets(): Promise<Wallet[]> {
  const store = await readStore();
  return Object.values(store.wallets).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export async function listLedger(limit = 200): Promise<LedgerEntry[]> {
  const store = await readStore();
  return [...store.ledger]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, Math.max(1, limit));
}

export async function listPaymentSessions(limit = 200): Promise<PaymentSession[]> {
  const store = await readStore();
  return Object.values(store.sessions)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, Math.max(1, limit));
}

export async function setWalletCredits(userId: string, nextCredits: number, reason = "admin_wallet_set"): Promise<Wallet> {
  const store = await readStore();
  const wallet = ensureWallet(store, userId);
  const safeCredits = Math.max(0, Math.floor(nextCredits));
  const delta = safeCredits - wallet.balanceCredits;
  wallet.balanceCredits = safeCredits;
  wallet.updatedAt = nowIso();
  store.wallets[userId] = wallet;
  if (delta !== 0) {
    store.ledger.push({
      id: randomUUID(),
      userId,
      type: delta > 0 ? "credit" : "debit",
      credits: Math.abs(delta),
      reason,
      createdAt: nowIso(),
    });
  }
  await writeStore(store);
  return wallet;
}

export async function markPaymentSessionPaid(sessionId: string, providerRef?: string): Promise<PaymentSession | null> {
  const store = await readStore();
  const session = store.sessions[sessionId];
  if (!session) return null;
  if (session.status === "paid") return session;
  session.status = "paid";
  session.paidAt = nowIso();
  if (providerRef) session.providerRef = providerRef;
  store.sessions[sessionId] = session;
  await writeStore(store);
  return session;
}
