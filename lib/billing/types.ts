export type Wallet = {
  userId: string;
  balanceCredits: number;
  updatedAt: string;
};

export type LedgerEntry = {
  id: string;
  userId: string;
  type: "credit" | "debit";
  credits: number;
  reason: string;
  sessionId?: string;
  createdAt: string;
};

export type PaymentSessionStatus = "pending" | "paid" | "expired";

export type PaymentSession = {
  id: string;
  userId: string;
  status: PaymentSessionStatus;
  amountTry: number;
  credits: number;
  checkoutUrl?: string;
  providerRef?: string;
  createdAt: string;
  paidAt?: string;
};

export type BillingStore = {
  wallets: Record<string, Wallet>;
  ledger: LedgerEntry[];
  sessions: Record<string, PaymentSession>;
};

export type DebitResult =
  | { ok: true; wallet: Wallet; ledgerEntryId: string; charged: true }
  | { ok: true; wallet: Wallet; charged: false }
  | { ok: false; wallet: Wallet };
