"use client";

import { useCallback, useEffect, useState, type ElementType } from "react";
import { createClient } from "@/utils/supabase/client";
import {
  FileText,
  CheckCircle,
  Clock,
  XCircle,
  Search,
  Download,
  RefreshCw,
  Plus,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { AdminKpiCard } from "@/components/admin/ui/AdminKpiCard";
import { AdminDataScroll, ADMIN_TABLE_TH_STICKY } from "@/components/admin/ui/AdminDataScroll";
import { AdminEmptyState } from "@/components/admin/ui/AdminEmptyState";

type CommissionStatus = "pending" | "approved" | "paid" | "cancelled";

type Commission = {
  id: string;
  order_id: string | null;
  seller_id: string;
  seller_name: string;
  sale_amount: number;
  commission_rate: number;
  commission_amount: number;
  net_to_seller: number;
  invoice_number: string;
  invoice_date: string;
  due_date: string;
  status: CommissionStatus;
  pdf_url: string | null;
  notes: string | null;
  created_at: string;
};

const tryFmt = (n: number) =>
  new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY", maximumFractionDigits: 0 }).format(n);

const dateFmt = (iso: string) =>
  new Intl.DateTimeFormat("tr-TR", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(iso));

function generateInvoiceNumber(existingCount: number): string {
  const year = new Date().getFullYear();
  const seq = String(existingCount + 1).padStart(4, "0");
  return `KOM-${year}-${seq}`;
}

const STATUS_CONFIG: Record<CommissionStatus, { label: string; cls: string; icon: ElementType }> = {
  pending: { label: "Bekliyor", cls: "border-amber-500/35 bg-amber-500/10 text-amber-200", icon: Clock },
  approved: { label: "Onaylandı", cls: "border-sky-500/35 bg-sky-500/10 text-sky-200", icon: CheckCircle },
  paid: { label: "Ödendi", cls: "border-emerald-500/35 bg-emerald-500/10 text-emerald-200", icon: CheckCircle },
  cancelled: { label: "İptal", cls: "border-rose-500/35 bg-rose-500/10 text-rose-200", icon: XCircle },
};

function StatusBadge({ status }: { status: CommissionStatus }) {
  const cfg = STATUS_CONFIG[status];
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold ${cfg.cls}`}>
      <Icon className="h-3 w-3" strokeWidth={2} />
      {cfg.label}
    </span>
  );
}

type FormState = {
  seller_name: string;
  sale_amount: string;
  commission_rate: string;
  due_date: string;
  notes: string;
};

const EMPTY_FORM: FormState = {
  seller_name: "",
  sale_amount: "",
  commission_rate: "8.5",
  due_date: "",
  notes: "",
};

/** Manuel satıcı satırları için sabit yer tutucu (gerçek profiles.id ile değiştirilmeli). */
const MANUAL_COMMISSION_SELLER_ID = "00000000-0000-4000-8000-000000000001";

export function KomisyonYonetimiPage() {
  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | CommissionStatus>("all");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const loadCommissions = useCallback(async () => {
    setLoading(true);
    const supabase = createClient();
    const { data, error } = await supabase.from("commissions").select("*").order("created_at", { ascending: false });
    if (!error && data) setCommissions(data as Commission[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    void loadCommissions();
  }, [loadCommissions]);

  const updateStatus = useCallback(async (id: string, status: CommissionStatus) => {
    const supabase = createClient();
    const { error } = await supabase.from("commissions").update({ status }).eq("id", id);
    if (!error) setCommissions((prev) => prev.map((c) => (c.id === id ? { ...c, status } : c)));
  }, []);

  const handleSave = useCallback(async () => {
    setFormError(null);
    const saleAmount = Number(form.sale_amount);
    const commRate = Number(form.commission_rate);
    if (!form.seller_name.trim()) return setFormError("Satıcı adı zorunludur.");
    if (!saleAmount || saleAmount <= 0) return setFormError("Geçerli bir satış tutarı girin.");
    if (!commRate || commRate <= 0 || commRate > 100) return setFormError("Komisyon oranı 0-100 arasında olmalıdır.");
    if (!form.due_date) return setFormError("Vade tarihi zorunludur.");

    const commAmount = Math.round(saleAmount * commRate) / 100;
    const netToSeller = saleAmount - commAmount;
    const invoiceNumber = generateInvoiceNumber(commissions.length);

    setSaving(true);
    const supabase = createClient();
    const { error } = await supabase.from("commissions").insert({
      seller_name: form.seller_name.trim(),
      seller_id: MANUAL_COMMISSION_SELLER_ID,
      sale_amount: saleAmount,
      commission_rate: commRate,
      commission_amount: commAmount,
      net_to_seller: netToSeller,
      invoice_number: invoiceNumber,
      due_date: new Date(form.due_date).toISOString(),
      status: "pending",
      notes: form.notes.trim() || null,
    });

    setSaving(false);
    if (error) return setFormError("Kayıt hatası: " + error.message);
    setForm(EMPTY_FORM);
    setShowForm(false);
    void loadCommissions();
  }, [form, commissions.length, loadCommissions]);

  const filtered = commissions.filter((c) => {
    const q = search.toLowerCase();
    const matchSearch = !q || c.seller_name.toLowerCase().includes(q) || c.invoice_number.toLowerCase().includes(q);
    const matchStatus = statusFilter === "all" || c.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const totalCommission = commissions.reduce((a, c) => a + c.commission_amount, 0);
  const paidCommission = commissions.filter((c) => c.status === "paid").reduce((a, c) => a + c.commission_amount, 0);
  const pendingCommission = commissions.filter((c) => c.status === "pending").reduce((a, c) => a + c.commission_amount, 0);
  const totalNetToSellers = commissions
    .filter((c) => c.status === "pending" || c.status === "approved")
    .reduce((a, c) => a + c.net_to_seller, 0);

  return (
    <div className="space-y-6 pb-10 lg:space-y-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="font-display text-3xl font-semibold tracking-[-0.02em] text-zinc-50">Komisyon Yönetimi</h1>
          <p className="mt-1 text-sm text-zinc-500">Satıcı komisyonlarını takip et, onayla ve ödemeleri yönet</p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => void loadCommissions()}
            className="flex items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 py-2 text-sm text-zinc-300 hover:border-white/20"
          >
            <RefreshCw className="h-4 w-4" strokeWidth={1.5} />
            Yenile
          </button>
          <button
            type="button"
            onClick={() => {
              setShowForm(true);
              setFormError(null);
            }}
            className="flex items-center gap-2 rounded-xl border border-[#c69575]/40 bg-[#c69575]/15 px-4 py-2 text-sm font-medium text-[#f0dcc8] hover:bg-[#c69575]/22"
          >
            <Plus className="h-4 w-4" strokeWidth={2} />
            Komisyon Ekle
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <AdminKpiCard label="Toplam Komisyon" value={tryFmt(totalCommission)} icon={TrendingUp} tone="revenue" />
        <AdminKpiCard label="Tahsil Edildi" value={tryFmt(paidCommission)} icon={CheckCircle} tone="positive" />
        <AdminKpiCard label="Bekleyen Komisyon" value={tryFmt(pendingCommission)} icon={Clock} tone="neutral" />
        <AdminKpiCard label="Satıcılara Ödenecek" value={tryFmt(totalNetToSellers)} icon={Wallet} tone="info" />
      </div>

      <div className="rounded-2xl border border-white/[0.08] bg-gradient-to-br from-[#12141a]/90 via-[#0c0d11] to-[#08090c] p-4 sm:p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" strokeWidth={1.5} />
            <input
              type="search"
              placeholder="Satıcı adı veya fatura no..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-xl border border-white/[0.08] bg-[#07080a] py-2.5 pl-10 pr-4 text-sm text-zinc-200 placeholder:text-zinc-600 outline-none focus:border-[#c69575]/30 focus:ring-2 focus:ring-[#c69575]/20"
            />
          </div>
          <div className="sm:w-48">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
              className="w-full cursor-pointer rounded-xl border border-white/[0.08] bg-[#07080a] px-3 py-2.5 text-sm text-zinc-200 outline-none focus:border-[#c69575]/30"
            >
              <option value="all">Tüm Durumlar</option>
              <option value="pending">Bekliyor</option>
              <option value="approved">Onaylandı</option>
              <option value="paid">Ödendi</option>
              <option value="cancelled">İptal</option>
            </select>
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-white/[0.08] bg-gradient-to-br from-[#12141a]/90 via-[#0c0d11] to-[#08090c]">
        {loading ? (
          <div className="flex items-center justify-center py-20 text-sm text-zinc-500">Yükleniyor...</div>
        ) : filtered.length === 0 ? (
          <AdminEmptyState
            message="Komisyon kaydı bulunamadı"
            hint="Yeni komisyon eklemek için sağ üstteki butonu kullanın."
            variant="shield"
          />
        ) : (
          <AdminDataScroll bordered={false}>
            <table className="w-full min-w-[1000px] border-collapse text-left text-sm">
              <thead>
                <tr className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
                  {["Fatura No", "Satıcı", "Satış Tutarı", "Komisyon %", "Komisyon", "Net Satıcıya", "Vade", "Durum", "İşlemler"].map(
                    (h) => (
                      <th key={h} className={`px-4 py-3.5 font-medium ${ADMIN_TABLE_TH_STICKY}`}>
                        {h}
                      </th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.05]">
                {filtered.map((row) => (
                  <tr key={row.id} className="transition-colors hover:bg-white/[0.02]">
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-2">
                        <FileText className="h-3.5 w-3.5 shrink-0 text-zinc-600" strokeWidth={1.5} />
                        <span className="font-mono text-[12px] text-zinc-300">{row.invoice_number}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 font-medium text-zinc-100">{row.seller_name}</td>
                    <td className="px-4 py-3.5 tabular-nums text-zinc-300">{tryFmt(row.sale_amount)}</td>
                    <td className="px-4 py-3.5 tabular-nums text-zinc-400">%{row.commission_rate}</td>
                    <td className="px-4 py-3.5 tabular-nums font-medium text-[#c9a88a]">{tryFmt(row.commission_amount)}</td>
                    <td className="px-4 py-3.5 tabular-nums text-emerald-400">{tryFmt(row.net_to_seller)}</td>
                    <td className="px-4 py-3.5 text-zinc-400">{dateFmt(row.due_date)}</td>
                    <td className="px-4 py-3.5">
                      <StatusBadge status={row.status} />
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex flex-wrap gap-1.5">
                        {row.status === "pending" && (
                          <button
                            type="button"
                            onClick={() => void updateStatus(row.id, "approved")}
                            className="rounded-lg border border-sky-500/25 bg-sky-500/10 px-2 py-1 text-[11px] font-medium text-sky-200 hover:bg-sky-500/18"
                          >
                            Onayla
                          </button>
                        )}
                        {row.status === "approved" && (
                          <button
                            type="button"
                            onClick={() => void updateStatus(row.id, "paid")}
                            className="rounded-lg border border-emerald-500/25 bg-emerald-500/10 px-2 py-1 text-[11px] font-medium text-emerald-200 hover:bg-emerald-500/18"
                          >
                            Ödendi
                          </button>
                        )}
                        {(row.status === "pending" || row.status === "approved") && (
                          <button
                            type="button"
                            onClick={() => void updateStatus(row.id, "cancelled")}
                            className="rounded-lg border border-rose-500/25 bg-rose-500/10 px-2 py-1 text-[11px] font-medium text-rose-200 hover:bg-rose-500/18"
                          >
                            İptal
                          </button>
                        )}
                        <button
                          type="button"
                          className="rounded-lg border border-white/[0.08] bg-white/[0.04] px-2 py-1 text-[11px] font-medium text-zinc-300 hover:border-white/20"
                        >
                          <Download className="inline h-3 w-3" /> PDF
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </AdminDataScroll>
        )}
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/70 p-4 backdrop-blur-sm">
          <div className="mx-auto flex min-h-full max-w-lg items-start justify-center py-8">
            <div className="w-full overflow-hidden rounded-2xl border border-white/[0.12] bg-gradient-to-br from-[#12141a] via-[#0d0f15] to-[#08090c] shadow-2xl">
              <div className="flex items-center justify-between border-b border-white/[0.08] px-6 py-4">
                <h3 className="font-display text-lg font-semibold text-zinc-100">Manuel Komisyon Ekle</h3>
                <button type="button" onClick={() => setShowForm(false)} className="text-zinc-500 hover:text-zinc-300">
                  ✕
                </button>
              </div>

              <div className="space-y-4 p-6">
                {(
                  [
                    { label: "Satıcı Adı", key: "seller_name", type: "text", placeholder: "Atölye Mara" },
                    { label: "Satış Tutarı (₺)", key: "sale_amount", type: "number", placeholder: "1200" },
                    { label: "Komisyon Oranı (%)", key: "commission_rate", type: "number", placeholder: "8.5" },
                    { label: "Vade Tarihi", key: "due_date", type: "date", placeholder: "" },
                  ] as const
                ).map((field) => (
                  <div key={field.key}>
                    <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-wider text-zinc-500">
                      {field.label}
                    </label>
                    <input
                      type={field.type}
                      placeholder={field.placeholder}
                      value={form[field.key]}
                      onChange={(e) => setForm((p) => ({ ...p, [field.key]: e.target.value }))}
                      className="w-full rounded-xl border border-white/[0.08] bg-[#07080a] px-3 py-2.5 text-sm text-zinc-200 placeholder:text-zinc-600 outline-none focus:border-[#c69575]/30 focus:ring-2 focus:ring-[#c69575]/20"
                    />
                  </div>
                ))}

                {form.sale_amount && form.commission_rate && (
                  <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 text-sm">
                    <div className="flex justify-between text-zinc-400">
                      <span>Satış Tutarı</span>
                      <span className="tabular-nums">{tryFmt(Number(form.sale_amount))}</span>
                    </div>
                    <div className="mt-1.5 flex justify-between text-[#c9a88a]">
                      <span>Komisyon (%{form.commission_rate})</span>
                      <span className="tabular-nums">{tryFmt((Number(form.sale_amount) * Number(form.commission_rate)) / 100)}</span>
                    </div>
                    <div className="mt-1.5 flex justify-between border-t border-white/[0.06] pt-1.5 font-medium text-emerald-400">
                      <span>Satıcıya Net</span>
                      <span className="tabular-nums">
                        {tryFmt(Number(form.sale_amount) * (1 - Number(form.commission_rate) / 100))}
                      </span>
                    </div>
                  </div>
                )}

                <div>
                  <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-wider text-zinc-500">Not (opsiyonel)</label>
                  <textarea
                    rows={2}
                    value={form.notes}
                    onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
                    placeholder="Sipariş detayı vb..."
                    className="w-full resize-none rounded-xl border border-white/[0.08] bg-[#07080a] px-3 py-2.5 text-sm text-zinc-200 placeholder:text-zinc-600 outline-none focus:border-[#c69575]/30"
                  />
                </div>

                {formError && (
                  <p className="rounded-xl border border-rose-500/20 bg-rose-500/[0.06] px-4 py-3 text-[13px] text-rose-400">
                    {formError}
                  </p>
                )}
              </div>

              <div className="flex justify-end gap-2 border-t border-white/[0.08] px-6 py-4">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="rounded-xl border border-white/[0.12] px-4 py-2 text-sm text-zinc-400 hover:border-white/20"
                >
                  Vazgeç
                </button>
                <button
                  type="button"
                  onClick={() => void handleSave()}
                  disabled={saving}
                  className="rounded-xl border border-[#c69575]/40 bg-[#c69575]/15 px-5 py-2 text-sm font-medium text-[#f0dcc8] hover:bg-[#c69575]/22 disabled:opacity-50"
                >
                  {saving ? "Kaydediliyor..." : "Kaydet"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
