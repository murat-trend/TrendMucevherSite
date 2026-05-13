"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Check, Coins, Copy, Link2, Loader2, Plus, RefreshCw, Search, Trash2, X } from "lucide-react";
import { ADMIN_PRIMARY_BUTTON_CLASS } from "@/components/admin/ui/adminPrimaryButton";
import { FinanceScrollTable, FINANCE_TH } from "@/components/admin/finance/FinanceScrollTable";
import type { InviteTokenRow } from "@/app/api/admin/invite-tokens/route";

const numFmt = (n: number) => new Intl.NumberFormat("tr-TR", { maximumFractionDigits: 2 }).format(n);
const dateFmt = (iso: string) => new Date(iso).toLocaleDateString("tr-TR", { day: "2-digit", month: "short", year: "numeric" });
const dtFmt = (iso: string) => new Date(iso).toLocaleString("tr-TR", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });

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

const SECONDARY_BTN =
  "inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border border-white/[0.14] bg-white/[0.04] px-3 py-2 text-xs font-medium text-zinc-200 transition-colors hover:bg-white/[0.07]";

const DANGER_BTN =
  "inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border border-rose-500/35 bg-rose-500/12 px-3 py-2 text-xs font-semibold text-rose-100 transition-colors hover:bg-rose-500/18";

function shortenDesc(s: string | null): string {
  if (!s) return "—";
  if (s.startsWith("{")) {
    try { const o = JSON.parse(s) as { reason?: string }; if (o?.reason) return o.reason; } catch { /* */ }
  }
  return s.length > 80 ? `${s.slice(0, 80)}…` : s;
}

function siteOrigin() {
  if (typeof window !== "undefined") return window.location.origin;
  return process.env.NEXT_PUBLIC_SITE_URL ?? "";
}

export function AdminCreditsPage() {
  // ── Users ────────────────────────────────────────────────
  const [users, setUsers] = useState<CreditUser[]>([]);
  const [ledger, setLedger] = useState<LedgerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [sortBy, setSortBy] = useState<"name" | "credits">("credits");
  const [ledgerUserId, setLedgerUserId] = useState<string | null>(null);
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null);

  // ── Credit modal ─────────────────────────────────────────
  const [modalUser, setModalUser] = useState<CreditUser | null>(null);
  const [amount, setAmount] = useState("1");
  const [description, setDescription] = useState("Manuel kredi tanımlaması");
  const [submitting, setSubmitting] = useState(false);
  const [modalErr, setModalErr] = useState<string | null>(null);

  // ── Invite tokens ────────────────────────────────────────
  const [tokens, setTokens] = useState<InviteTokenRow[]>([]);
  const [tokensLoading, setTokensLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [newTokenNote, setNewTokenNote] = useState("");
  const [newTokenCredits, setNewTokenCredits] = useState("1");
  const [newTokenDays, setNewTokenDays] = useState("30");
  const [creatingToken, setCreatingToken] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [deletingTokenId, setDeletingTokenId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      const res = await fetch("/api/admin/credits", { credentials: "include" });
      const j = (await res.json()) as { users?: CreditUser[]; ledger?: LedgerRow[]; error?: string };
      if (!res.ok) { setErr(j.error ?? "Liste alınamadı."); return; }
      setUsers(j.users ?? []);
      setLedger(j.ledger ?? []);
    } catch { setErr("Ağ hatası."); }
    finally { setLoading(false); }
  }, []);

  const loadTokens = useCallback(async () => {
    setTokensLoading(true);
    try {
      const res = await fetch("/api/admin/invite-tokens", { credentials: "include" });
      const j = (await res.json()) as { tokens?: InviteTokenRow[]; error?: string };
      if (res.ok) setTokens(j.tokens ?? []);
    } finally { setTokensLoading(false); }
  }, []);

  useEffect(() => { void load(); void loadTokens(); }, [load, loadTokens]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = q
      ? users.filter((u) => u.displayName.toLowerCase().includes(q) || u.id.toLowerCase().includes(q) || (u.email?.toLowerCase().includes(q)))
      : [...users];
    if (sortBy === "credits") list.sort((a, b) => b.credits - a.credits);
    else list.sort((a, b) => a.displayName.localeCompare(b.displayName, "tr"));
    return list;
  }, [users, query, sortBy]);

  const totalCredits = useMemo(() => users.reduce((s, u) => s + u.credits, 0), [users]);

  const visibleLedger = useMemo(() =>
    ledgerUserId ? ledger.filter((r) => r.userId === ledgerUserId) : ledger,
    [ledger, ledgerUserId]
  );

  const closeModal = () => { setModalUser(null); setModalErr(null); setAmount("1"); setDescription("Manuel kredi tanımlaması"); };

  const submit = async (type: "credit" | "debit") => {
    if (!modalUser) return;
    const n = Math.floor(Number(amount));
    if (!Number.isFinite(n) || n <= 0) { setModalErr("Geçerli pozitif miktar girin."); return; }
    const desc = description.trim();
    if (!desc) { setModalErr("Açıklama gerekli."); return; }
    setSubmitting(true);
    setModalErr(null);
    try {
      const res = await fetch("/api/admin/credits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ userId: modalUser.id, amount: n, type, description: desc }),
      });
      const j = (await res.json()) as { error?: string; ok?: boolean; balanceCredits?: number };
      if (!res.ok) { setModalErr(j.error ?? "İşlem başarısız."); return; }
      closeModal();
      await load();
    } catch { setModalErr("Ağ hatası."); }
    finally { setSubmitting(false); }
  };

  async function deleteUser(id: string, name: string) {
    if (!confirm(`"${name}" kullanıcısını kalıcı olarak silmek istediğinize emin misiniz?`)) return;
    setDeletingUserId(id);
    try {
      await fetch(`/api/admin/customers?id=${id}`, { method: "DELETE", credentials: "include" });
      setUsers((prev) => prev.filter((u) => u.id !== id));
    } finally { setDeletingUserId(null); }
  }

  async function createToken() {
    const credits = Math.floor(Number(newTokenCredits));
    if (!Number.isFinite(credits) || credits < 1) return;
    setCreatingToken(true);
    try {
      const res = await fetch("/api/admin/invite-tokens", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ credits, note: newTokenNote.trim() || null, days: parseInt(newTokenDays) || 30 }),
      });
      const j = (await res.json()) as { token?: InviteTokenRow; error?: string };
      if (res.ok && j.token) {
        setTokens((prev) => [j.token!, ...prev]);
        setNewTokenNote("");
        setNewTokenCredits("1");
        setNewTokenDays("30");
        setShowCreateForm(false);
      }
    } finally { setCreatingToken(false); }
  }

  async function revokeToken(id: string) {
    if (!confirm("Bu davet linkini iptal etmek istediğinize emin misiniz?")) return;
    setDeletingTokenId(id);
    try {
      await fetch(`/api/admin/invite-tokens?id=${id}`, { method: "DELETE", credentials: "include" });
      setTokens((prev) => prev.filter((t) => t.id !== id));
    } finally { setDeletingTokenId(null); }
  }

  function copyLink(token: InviteTokenRow) {
    const link = `${siteOrigin()}/davet?token=${token.token}`;
    void navigator.clipboard.writeText(link).then(() => {
      setCopiedId(token.id);
      setTimeout(() => setCopiedId(null), 2000);
    });
  }

  return (
    <div className="space-y-8 pb-10">
      {/* Header */}
      <div className="rounded-2xl border border-white/[0.14] bg-gradient-to-br from-[#14161d] via-[#0e1015] to-[#08090c] p-6 shadow-[0_1px_0_rgba(255,255,255,0.06)_inset] sm:p-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="font-display text-2xl font-semibold tracking-tight text-zinc-50 sm:text-3xl">Kredi yönetimi</h1>
            <p className="mt-1 text-sm text-zinc-500">
              Sistemdeki toplam kredi:{" "}
              <span className="font-semibold tabular-nums text-[#c9a84c]">{numFmt(totalCredits)}</span>
              {" · "}
              <span className="text-zinc-600">billing_wallets · billing_ledger</span>
            </p>
          </div>
          <button type="button" className={SECONDARY_BTN + " text-sm px-4 py-2.5"} onClick={() => void load()} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            Yenile
          </button>
        </div>

        {err && (
          <div className="mt-4 rounded-xl border border-rose-500/25 bg-rose-500/[0.06] px-4 py-3 text-sm text-rose-200/90">{err}</div>
        )}

        <div className="mt-5 flex flex-wrap items-center gap-3">
          <div className="relative min-w-[200px] flex-1 sm:max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" strokeWidth={1.5} />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="İsim, e-posta veya ID ara…"
              className="w-full rounded-xl border border-white/[0.12] bg-[#0e1015] py-2.5 pl-10 pr-3 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-[#c69575]/50 focus:outline-none"
            />
          </div>
          <div className="flex gap-1 rounded-xl border border-white/[0.08] bg-white/[0.02] p-1">
            {(["credits", "name"] as const).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setSortBy(s)}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${sortBy === s ? "bg-white/[0.1] text-zinc-100" : "text-zinc-500 hover:text-zinc-300"}`}
              >
                {s === "credits" ? "Krediye göre" : "İsme göre"}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Users table */}
      <section className="rounded-2xl border border-white/[0.09] bg-gradient-to-br from-[#10121a]/95 via-[#0a0b0f] to-[#060708] p-5 sm:p-6">
        <div className="mb-4 flex items-center gap-2 border-b border-white/[0.06] pb-4">
          <Coins className="h-5 w-5 text-[#c9a88a]" strokeWidth={1.5} />
          <h2 className="font-display text-lg font-semibold tracking-tight text-zinc-100">Kullanıcılar</h2>
          {filtered.length > 0 && <span className="text-sm text-zinc-600">({filtered.length})</span>}
        </div>
        {loading && users.length === 0 ? (
          <div className="flex items-center gap-2 py-10 text-sm text-zinc-500">
            <Loader2 className="h-5 w-5 animate-spin text-[#b8956f]" /> Yükleniyor…
          </div>
        ) : (
          <FinanceScrollTable
            minWidthPx={700}
            bodyMaxHeightClass="max-h-[440px]"
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
                {filtered.length === 0 && (
                  <tr><td colSpan={4} className="py-8 text-center text-sm text-zinc-500">Kayıt yok.</td></tr>
                )}
                {filtered.map((u) => (
                  <tr
                    key={u.id}
                    className={`text-zinc-200 cursor-pointer hover:bg-white/[0.02] transition-colors ${ledgerUserId === u.id ? "bg-[#c9a84c]/5" : ""}`}
                    onClick={() => setLedgerUserId((prev) => prev === u.id ? null : u.id)}
                    title="Hareketleri filtrele"
                  >
                    <td className="px-3.5 py-2.5">
                      <div className="text-sm font-medium text-zinc-100">{u.displayName}</div>
                      <div className="font-mono text-[11px] text-zinc-600">{u.id.slice(0, 13)}…</div>
                    </td>
                    <td className="px-3.5 py-2.5">
                      {u.email ? (
                        <a href={`mailto:${u.email}`} onClick={(e) => e.stopPropagation()} className="text-xs text-[#c9a84c] hover:underline">
                          {u.email}
                        </a>
                      ) : <span className="text-xs text-zinc-600">—</span>}
                    </td>
                    <td className={`px-3.5 py-2.5 text-right text-sm tabular-nums font-semibold ${u.credits > 0 ? "text-emerald-300" : "text-zinc-500"}`}>
                      {numFmt(u.credits)}
                    </td>
                    <td className="px-3.5 py-2.5 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-2">
                        <button type="button" className={SECONDARY_BTN} onClick={() => setModalUser(u)}>
                          Kredi işlemi
                        </button>
                        <button
                          type="button"
                          title="Kullanıcıyı sil"
                          disabled={deletingUserId === u.id}
                          onClick={() => void deleteUser(u.id, u.displayName)}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-rose-500/30 bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 disabled:opacity-40"
                        >
                          {deletingUserId === u.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </>
            }
          />
        )}
      </section>

      {/* Ledger */}
      <section className="rounded-2xl border border-white/[0.09] bg-gradient-to-br from-[#10121a]/95 via-[#0a0b0f] to-[#060708] p-5 sm:p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2 border-b border-white/[0.06] pb-4">
          <h2 className="font-display text-lg font-semibold tracking-tight text-zinc-100">
            {ledgerUserId
              ? `Hareketler — ${users.find((u) => u.id === ledgerUserId)?.displayName ?? ledgerUserId.slice(0, 8)}`
              : "Son kredi hareketleri"}
          </h2>
          {ledgerUserId && (
            <button type="button" className={SECONDARY_BTN} onClick={() => setLedgerUserId(null)}>
              <X className="h-3.5 w-3.5" /> Filtreyi kaldır
            </button>
          )}
        </div>
        {!visibleLedger.length ? (
          <p className="text-sm text-zinc-500">Kayıt yok.</p>
        ) : (
          <FinanceScrollTable
            minWidthPx={720}
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
                {visibleLedger.map((r) => (
                  <tr key={r.id} className="text-zinc-200">
                    <td className="whitespace-nowrap px-3.5 py-2.5 text-xs text-zinc-500">{r.createdAt.slice(0, 19).replace("T", " ")}</td>
                    <td className="max-w-[160px] truncate px-3.5 py-2.5 text-sm text-zinc-300" title={r.userLabel}>{r.userLabel}</td>
                    <td className="px-3.5 py-2.5">
                      <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${r.type === "credit" ? "bg-emerald-500/15 text-emerald-400" : "bg-rose-500/15 text-rose-400"}`}>
                        {r.type === "credit" ? "Eklendi" : "Çıkarıldı"}
                      </span>
                    </td>
                    <td className="px-3.5 py-2.5 text-right text-sm tabular-nums font-semibold text-zinc-100">{numFmt(r.amount)}</td>
                    <td className="max-w-[280px] truncate px-3.5 py-2.5 text-xs text-zinc-500" title={r.description ?? ""}>{shortenDesc(r.description)}</td>
                  </tr>
                ))}
              </>
            }
          />
        )}
      </section>

      {/* Invite tokens */}
      <section className="rounded-2xl border border-[#c9a84c]/20 bg-gradient-to-br from-[#14120a]/60 via-[#0a0b0f] to-[#060708] p-5 sm:p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.06] pb-4">
          <div className="flex items-center gap-2">
            <Link2 className="h-5 w-5 text-[#c9a84c]" strokeWidth={1.5} />
            <h2 className="font-display text-lg font-semibold tracking-tight text-zinc-100">B2B Davet Linkleri</h2>
            <span className="rounded-full border border-[#c9a84c]/25 bg-[#c9a84c]/10 px-2 py-0.5 text-[11px] text-[#c9a84c]">
              {tokens.filter((t) => !t.used_at && new Date(t.expires_at) > new Date()).length} aktif
            </span>
          </div>
          <button
            type="button"
            className={ADMIN_PRIMARY_BUTTON_CLASS}
            onClick={() => setShowCreateForm((v) => !v)}
          >
            <Plus className="h-3.5 w-3.5" />
            Davet oluştur
          </button>
        </div>

        <p className="mb-4 text-xs text-zinc-500">
          Her link tek kullanımlık · 30 gün geçerli · Firmaya özel not ekleyin · Linki B2B e-postanıza yapıştırın
        </p>

        {/* Create form */}
        {showCreateForm && (
          <div className="mb-5 rounded-xl border border-[#c9a84c]/25 bg-[#c9a84c]/5 p-4">
            <p className="mb-3 text-sm font-medium text-zinc-200">Yeni davet linki</p>
            <div className="grid gap-3 sm:grid-cols-3">
              <div>
                <label className="mb-1 block text-xs text-zinc-500">Not (firma adı)</label>
                <input
                  type="text"
                  value={newTokenNote}
                  onChange={(e) => setNewTokenNote(e.target.value)}
                  placeholder="Örn: Ata Kuyumculuk"
                  className="w-full rounded-xl border border-white/[0.1] bg-[#0e1015] px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-[#c9a84c]/50 focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-zinc-500">Kredi miktarı</label>
                <input
                  type="number"
                  min={1}
                  value={newTokenCredits}
                  onChange={(e) => setNewTokenCredits(e.target.value)}
                  className="w-full rounded-xl border border-white/[0.1] bg-[#0e1015] px-3 py-2 text-sm text-zinc-100 focus:border-[#c9a84c]/50 focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-zinc-500">Geçerlilik (gün)</label>
                <input
                  type="number"
                  min={1}
                  max={365}
                  value={newTokenDays}
                  onChange={(e) => setNewTokenDays(e.target.value)}
                  className="w-full rounded-xl border border-white/[0.1] bg-[#0e1015] px-3 py-2 text-sm text-zinc-100 focus:border-[#c9a84c]/50 focus:outline-none"
                />
              </div>
            </div>
            <div className="mt-3 flex gap-2">
              <button type="button" className={ADMIN_PRIMARY_BUTTON_CLASS} onClick={() => void createToken()} disabled={creatingToken}>
                {creatingToken ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
                Oluştur
              </button>
              <button type="button" className={SECONDARY_BTN} onClick={() => setShowCreateForm(false)}>İptal</button>
            </div>
          </div>
        )}

        {tokensLoading ? (
          <div className="flex items-center gap-2 py-8 text-sm text-zinc-500">
            <Loader2 className="h-4 w-4 animate-spin" /> Yükleniyor…
          </div>
        ) : tokens.length === 0 ? (
          <p className="py-6 text-center text-sm text-zinc-500">Henüz davet linki yok. Yukarıdan oluşturun.</p>
        ) : (
          <FinanceScrollTable
            minWidthPx={720}
            bodyMaxHeightClass="max-h-[380px]"
            headerCells={
              <>
                <th className={`${FINANCE_TH} text-left`}>Not</th>
                <th className={`${FINANCE_TH} text-right`}>Kredi</th>
                <th className={`${FINANCE_TH} text-left`}>Oluşturuldu</th>
                <th className={`${FINANCE_TH} text-left`}>Son kullanma</th>
                <th className={`${FINANCE_TH} text-left`}>Durum</th>
                <th className={`${FINANCE_TH} text-right`}>İşlem</th>
              </>
            }
            bodyRows={
              <>
                {tokens.map((t) => {
                  const expired = new Date(t.expires_at) < new Date();
                  const used = !!t.used_at;
                  const active = !used && !expired;
                  return (
                    <tr key={t.id} className="text-zinc-200">
                      <td className="px-3.5 py-2.5">
                        <p className="text-sm text-zinc-200">{t.note ?? <span className="text-zinc-600">—</span>}</p>
                        <p className="font-mono text-[10px] text-zinc-600">{t.token.slice(0, 16)}…</p>
                      </td>
                      <td className="px-3.5 py-2.5 text-right text-sm font-semibold tabular-nums text-[#c9a84c]">{t.credits}</td>
                      <td className="whitespace-nowrap px-3.5 py-2.5 text-xs text-zinc-500">{dateFmt(t.created_at)}</td>
                      <td className={`whitespace-nowrap px-3.5 py-2.5 text-xs ${expired ? "text-rose-400" : "text-zinc-400"}`}>{dateFmt(t.expires_at)}</td>
                      <td className="px-3.5 py-2.5">
                        {used ? (
                          <span className="rounded-full bg-zinc-700/50 px-2 py-0.5 text-[11px] text-zinc-400">
                            Kullanıldı · {t.used_at ? dtFmt(t.used_at) : ""}
                          </span>
                        ) : expired ? (
                          <span className="rounded-full bg-rose-500/15 px-2 py-0.5 text-[11px] text-rose-400">Süresi doldu</span>
                        ) : (
                          <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[11px] text-emerald-400">Aktif</span>
                        )}
                      </td>
                      <td className="px-3.5 py-2.5 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {active && (
                            <button
                              type="button"
                              onClick={() => copyLink(t)}
                              className="inline-flex h-7 items-center gap-1 rounded-lg border border-white/[0.1] bg-white/[0.04] px-2 text-[11px] font-medium text-zinc-300 hover:bg-white/[0.08] transition-colors"
                            >
                              {copiedId === t.id ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                              {copiedId === t.id ? "Kopyalandı" : "Linki kopyala"}
                            </button>
                          )}
                          {!used && (
                            <button
                              type="button"
                              title="İptal et"
                              disabled={deletingTokenId === t.id}
                              onClick={() => void revokeToken(t.id)}
                              className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-rose-500/30 bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 disabled:opacity-40"
                            >
                              {deletingTokenId === t.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </>
            }
          />
        )}
      </section>

      {/* Credit modal */}
      {modalUser && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/65 p-4 backdrop-blur-[2px]">
          <div className="w-full max-w-md rounded-2xl border border-white/[0.12] bg-gradient-to-br from-[#14161d] via-[#0e1015] to-[#08090c] p-6 shadow-[0_24px_64px_-24px_rgba(0,0,0,0.8)]">
            <h3 className="font-display text-lg font-semibold text-zinc-50">Kredi işlemi</h3>
            <p className="mt-1 text-sm text-zinc-400">{modalUser.displayName}</p>
            {modalUser.email && <p className="text-xs text-[#c9a84c]">{modalUser.email}</p>}
            <p className="mt-2 text-sm text-zinc-500">
              Mevcut bakiye: <span className="tabular-nums text-emerald-300 font-semibold">{numFmt(modalUser.credits)}</span>
            </p>

            <label className="mt-5 block text-xs font-medium text-zinc-500">
              Miktar (kredi)
              <input
                type="number" min={1} step={1} value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-white/[0.12] bg-[#0e1015] px-3 py-2.5 text-sm text-zinc-100 focus:border-[#c69575]/50 focus:outline-none"
              />
            </label>

            <label className="mt-4 block text-xs font-medium text-zinc-500">
              Açıklama
              <textarea
                value={description} onChange={(e) => setDescription(e.target.value)} rows={3}
                className="mt-1.5 w-full resize-none rounded-xl border border-white/[0.12] bg-[#0e1015] px-3 py-2.5 text-sm text-zinc-100 focus:border-[#c69575]/50 focus:outline-none"
              />
            </label>

            {modalErr && (
              <div className="mt-4 rounded-lg border border-rose-500/25 bg-rose-500/[0.06] px-3 py-2 text-sm text-rose-200/90">{modalErr}</div>
            )}

            <div className="mt-6 flex flex-wrap gap-2">
              <button type="button" className={ADMIN_PRIMARY_BUTTON_CLASS} disabled={submitting} onClick={() => void submit("credit")}>
                {submitting && <Loader2 className="h-4 w-4 animate-spin" />} Ekle
              </button>
              <button type="button" className={DANGER_BTN} disabled={submitting} onClick={() => void submit("debit")}>Çıkar</button>
              <button type="button" className={SECONDARY_BTN + " text-sm px-4 py-2.5"} disabled={submitting} onClick={closeModal}>İptal</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
