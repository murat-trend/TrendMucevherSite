"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Coins, Loader2, RefreshCw, Search } from "lucide-react";
import { ADMIN_PRIMARY_BUTTON_CLASS } from "@/components/admin/ui/adminPrimaryButton";
import { FinanceScrollTable, FINANCE_TH } from "@/components/admin/finance/FinanceScrollTable";

const numFmt = (n: number) => new Intl.NumberFormat("tr-TR", { maximumFractionDigits: 2 }).format(n);

type CreditUser = {
  id: string;
  displayName: string;
  email: string | null;
  storeName: string | null;
  credits: number;
  walletUpdatedAt: string | null;
};

type LedgerRow = {
  id: string;
  userId: string;
  userLabel: string;
  amount: number;
  type: string;
  description: string | null;
  createdAt: string;
};

type CreditsGetJson = {
  users?: CreditUser[];
  ledger?: LedgerRow[];
  error?: string;
};

const USER_COL = (
  <colgroup>
    <col className="w-[36%]" />
    <col className="w-[28%]" />
    <col className="w-[16%]" />
    <col className="w-[20%]" />
  </colgroup>
);

const LEDGER_COL = (
  <colgroup>
    <col className="w-[18%]" />
    <col className="w-[22%]" />
    <col className="w-[10%]" />
    <col className="w-[10%]" />
    <col className="w-[40%]" />
  </colgroup>
);

const SECONDARY_BTN =
  "inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border border-white/[0.14] bg-white/[0.04] px-4 py-2.5 text-sm font-medium text-zinc-200 transition-colors hover:border-white/[0.22] hover:bg-white/[0.07] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c69575]/40";

const DANGER_BTN =
  "inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border border-rose-500/35 bg-rose-500/12 px-4 py-2.5 text-sm font-semibold text-rose-100 transition-colors hover:border-rose-400/45 hover:bg-rose-500/18 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500/40";

function shortenDesc(s: string | null): string {
  if (!s) return "—";
  if (s.startsWith("{")) {
    try {
      const o = JSON.parse(s) as { reason?: string };
      if (o?.reason) return o.reason;
    } catch {
      /* ignore */
    }
  }
  return s.length > 80 ? `${s.slice(0, 80)}…` : s;
}

export function AdminCreditsPage() {
  const [users, setUsers] = useState<CreditUser[]>([]);
  const [ledger, setLedger] = useState<LedgerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  const [modalUser, setModalUser] = useState<CreditUser | null>(null);
  const [amount, setAmount] = useState("1");
  const [description, setDescription] = useState("Manuel kredi tanımlaması");
  const [submitting, setSubmitting] = useState(false);
  const [modalErr, setModalErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      const res = await fetch("/api/admin/credits", { credentials: "include" });
      const j = (await res.json()) as CreditsGetJson;
      if (!res.ok) {
        setErr(j.error ?? "Liste alınamadı.");
        setUsers([]);
        setLedger([]);
        return;
      }
      setUsers(j.users ?? []);
      setLedger(j.ledger ?? []);
    } catch {
      setErr("Ağ hatası.");
      setUsers([]);
      setLedger([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return users;
    return users.filter(
      (u) =>
        u.displayName.toLowerCase().includes(q) ||
        u.id.toLowerCase().includes(q) ||
        (u.email && u.email.toLowerCase().includes(q)),
    );
  }, [users, query]);

  const closeModal = () => {
    setModalUser(null);
    setModalErr(null);
    setAmount("1");
    setDescription("Manuel kredi tanımlaması");
  };

  const submit = async (type: "credit" | "debit") => {
    if (!modalUser) return;
    const n = Math.floor(Number(amount));
    if (!Number.isFinite(n) || n <= 0) {
      setModalErr("Geçerli pozitif miktar girin.");
      return;
    }
    const desc = description.trim();
    if (!desc) {
      setModalErr("Açıklama gerekli.");
      return;
    }

    setSubmitting(true);
    setModalErr(null);
    try {
      const res = await fetch("/api/admin/credits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          userId: modalUser.id,
          amount: n,
          type,
          description: desc,
        }),
      });
      const j = (await res.json()) as { error?: string; ok?: boolean; balanceCredits?: number };
      if (!res.ok) {
        setModalErr(j.error ?? "İşlem başarısız.");
        return;
      }
      closeModal();
      await load();
    } catch {
      setModalErr("Ağ hatası.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-8 pb-10">
      <div className="rounded-2xl border border-white/[0.14] bg-gradient-to-br from-[#14161d] via-[#0e1015] to-[#08090c] p-6 shadow-[0_1px_0_rgba(255,255,255,0.06)_inset] sm:p-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="font-display text-2xl font-semibold tracking-tight text-zinc-50 sm:text-3xl">Kredi yönetimi</h1>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-zinc-400">
              Kullanıcı cüzdanları (<span className="text-zinc-500">billing_wallets</span>) ve son hareketler (
              <span className="text-zinc-500">billing_ledger</span>).
            </p>
          </div>
          <button type="button" className={ADMIN_PRIMARY_BUTTON_CLASS} onClick={() => void load()} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.5} /> : <RefreshCw className="h-4 w-4" strokeWidth={1.5} />}
            Yenile
          </button>
        </div>

        {err && (
          <div className="mt-6 rounded-xl border border-rose-500/25 bg-rose-500/[0.06] px-4 py-3 text-sm text-rose-200/90">{err}</div>
        )}

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <div className="relative min-w-[200px] flex-1 sm:max-w-md">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" strokeWidth={1.5} />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="İsim, e-posta veya kullanıcı ID ara…"
              className="w-full rounded-xl border border-white/[0.12] bg-[#0e1015] py-2.5 pl-10 pr-3 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-[#c69575]/50 focus:outline-none"
            />
          </div>
        </div>
      </div>

      <section className="rounded-2xl border border-white/[0.09] bg-gradient-to-br from-[#10121a]/95 via-[#0a0b0f] to-[#060708] p-5 shadow-[0_1px_0_rgba(255,255,255,0.04)_inset] sm:p-6">
        <div className="mb-4 flex items-center gap-2 border-b border-white/[0.06] pb-4">
          <Coins className="h-5 w-5 text-[#c9a88a]" strokeWidth={1.5} />
          <h2 className="font-display text-lg font-semibold tracking-tight text-zinc-100">Kullanıcılar</h2>
        </div>
        {loading && users.length === 0 ? (
          <div className="flex items-center gap-2 py-10 text-sm text-zinc-500">
            <Loader2 className="h-5 w-5 animate-spin text-[#b8956f]" strokeWidth={1.5} />
            Yükleniyor…
          </div>
        ) : (
          <FinanceScrollTable
            minWidthPx={640}
            colgroup={USER_COL}
            bodyMaxHeightClass="max-h-[420px]"
            headerCells={
              <>
                <th className={`${FINANCE_TH} text-left`}>Kullanıcı</th>
                <th className={`${FINANCE_TH} text-left`}>E-posta</th>
                <th className={`${FINANCE_TH} text-right tabular-nums`}>Kredi</th>
                <th className={`${FINANCE_TH} text-right`}>İşlem</th>
              </>
            }
            bodyRows={
              <>
                {filtered.map((u) => (
                  <tr key={u.id} className="text-zinc-200">
                    <td className="px-3.5 py-2.5">
                      <div className="text-sm font-medium text-zinc-100">{u.displayName}</div>
                      <div className="font-mono text-[11px] text-zinc-500">{u.id.slice(0, 13)}…</div>
                    </td>
                    <td className="px-3.5 py-2.5 text-sm text-zinc-400">{u.email ?? "—"}</td>
                    <td className="px-3.5 py-2.5 text-right text-sm tabular-nums text-emerald-200/90">{numFmt(u.credits)}</td>
                    <td className="px-3.5 py-2.5 text-right">
                      <button type="button" className={SECONDARY_BTN} onClick={() => setModalUser(u)}>
                        Kredi işlemi
                      </button>
                    </td>
                  </tr>
                ))}
              </>
            }
          />
        )}
      </section>

      <section className="rounded-2xl border border-white/[0.09] bg-gradient-to-br from-[#10121a]/95 via-[#0a0b0f] to-[#060708] p-5 shadow-[0_1px_0_rgba(255,255,255,0.04)_inset] sm:p-6">
        <h2 className="mb-4 border-b border-white/[0.06] pb-4 font-display text-lg font-semibold tracking-tight text-zinc-100">
          Son kredi işlemleri
        </h2>
        {!ledger.length ? (
          <p className="text-sm text-zinc-500">Kayıt yok.</p>
        ) : (
          <FinanceScrollTable
            minWidthPx={720}
            colgroup={LEDGER_COL}
            bodyMaxHeightClass="max-h-[320px]"
            headerCells={
              <>
                <th className={`${FINANCE_TH} text-left`}>Tarih</th>
                <th className={`${FINANCE_TH} text-left`}>Kullanıcı</th>
                <th className={`${FINANCE_TH} text-left`}>Tip</th>
                <th className={`${FINANCE_TH} text-right tabular-nums`}>Miktar</th>
                <th className={`${FINANCE_TH} text-left`}>Açıklama</th>
              </>
            }
            bodyRows={
              <>
                {ledger.map((r) => (
                  <tr key={r.id} className="text-zinc-200">
                    <td className="whitespace-nowrap px-3.5 py-2.5 text-xs text-zinc-500">
                      {r.createdAt.slice(0, 19).replace("T", " ")}
                    </td>
                    <td className="max-w-[160px] truncate px-3.5 py-2.5 text-sm text-zinc-300" title={r.userLabel}>
                      {r.userLabel}
                    </td>
                    <td className="px-3.5 py-2.5 text-sm text-zinc-400">{r.type}</td>
                    <td className="px-3.5 py-2.5 text-right text-sm tabular-nums text-zinc-100">{numFmt(r.amount)}</td>
                    <td className="max-w-[280px] truncate px-3.5 py-2.5 text-xs text-zinc-500" title={r.description ?? ""}>
                      {shortenDesc(r.description)}
                    </td>
                  </tr>
                ))}
              </>
            }
          />
        )}
      </section>

      {modalUser ? (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/65 p-4 backdrop-blur-[2px]"
          role="dialog"
          aria-modal="true"
          aria-labelledby="credits-modal-title"
        >
          <div className="w-full max-w-md rounded-2xl border border-white/[0.12] bg-gradient-to-br from-[#14161d] via-[#0e1015] to-[#08090c] p-6 shadow-[0_24px_64px_-24px_rgba(0,0,0,0.8)]">
            <h3 id="credits-modal-title" className="font-display text-lg font-semibold text-zinc-50">
              Kredi işlemi
            </h3>
            <p className="mt-1 text-sm text-zinc-400">{modalUser.displayName}</p>
            <p className="font-mono text-[11px] text-zinc-600">{modalUser.id}</p>
            <p className="mt-2 text-sm text-zinc-500">
              Mevcut bakiye: <span className="tabular-nums text-emerald-200/90">{numFmt(modalUser.credits)}</span>
            </p>

            <label className="mt-5 block text-xs font-medium text-zinc-500">
              Miktar (kredi)
              <input
                type="number"
                min={1}
                step={1}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-white/[0.12] bg-[#0e1015] px-3 py-2.5 text-sm text-zinc-100 focus:border-[#c69575]/50 focus:outline-none"
              />
            </label>

            <label className="mt-4 block text-xs font-medium text-zinc-500">
              Açıklama
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="mt-1.5 w-full resize-none rounded-xl border border-white/[0.12] bg-[#0e1015] px-3 py-2.5 text-sm text-zinc-100 focus:border-[#c69575]/50 focus:outline-none"
              />
            </label>

            {modalErr ? (
              <div className="mt-4 rounded-lg border border-rose-500/25 bg-rose-500/[0.06] px-3 py-2 text-sm text-rose-200/90">
                {modalErr}
              </div>
            ) : null}

            <div className="mt-6 flex flex-wrap gap-2">
              <button type="button" className={ADMIN_PRIMARY_BUTTON_CLASS} disabled={submitting} onClick={() => void submit("credit")}>
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Ekle
              </button>
              <button type="button" className={DANGER_BTN} disabled={submitting} onClick={() => void submit("debit")}>
                Çıkar
              </button>
              <button type="button" className={SECONDARY_BTN} disabled={submitting} onClick={closeModal}>
                İptal
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
