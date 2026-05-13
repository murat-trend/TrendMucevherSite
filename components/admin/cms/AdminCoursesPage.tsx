"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ADMIN_PRIMARY_BUTTON_CLASS } from "@/components/admin/ui/adminPrimaryButton";
import { FinanceScrollTable, FINANCE_TH } from "@/components/admin/finance/FinanceScrollTable";
import { Loader2, Pencil, Plus, RefreshCw, Trash2 } from "lucide-react";
import type { CourseRow } from "@/app/api/admin/courses/route";

const SECONDARY_BTN =
  "inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border border-white/[0.14] bg-white/[0.04] px-3 py-2 text-xs font-medium text-zinc-200 transition-colors hover:bg-white/[0.07]";

const DANGER_BTN =
  "inline-flex items-center justify-center rounded-xl border border-rose-500/35 bg-rose-500/12 px-3 py-2 text-xs font-medium text-rose-100 hover:bg-rose-500/18";

const INPUT_CLASS =
  "w-full rounded-xl border border-white/[0.1] bg-white/[0.04] px-3 py-2 text-sm text-zinc-100 placeholder-zinc-600 outline-none focus:border-[#c9a84c]/50 focus:ring-1 focus:ring-[#c9a84c]/20";

const LABEL_CLASS = "block text-xs font-medium text-zinc-400 mb-1";

const CATEGORIES = [
  "genel",
  "matrixgold",
  "zbrush",
  "rhinoceros",
  "photoshop",
  "diger",
];

type FormState = {
  title_tr: string;
  title_en: string;
  description_tr: string;
  description_en: string;
  price_try: string;
  thumbnail_url: string;
  category: string;
  whatsapp_message: string;
  modules: string;
  sort_order: string;
  is_published: boolean;
  slug: string;
};

const EMPTY_FORM: FormState = {
  title_tr: "",
  title_en: "",
  description_tr: "",
  description_en: "",
  price_try: "0",
  thumbnail_url: "",
  category: "genel",
  whatsapp_message: "",
  modules: "",
  sort_order: "0",
  is_published: false,
  slug: "",
};

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
        checked ? "bg-[#c9a84c]" : "bg-white/[0.12]"
      }`}
    >
      <span
        className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
          checked ? "translate-x-4" : "translate-x-0"
        }`}
      />
    </button>
  );
}

export function AdminCoursesPage() {
  const [courses, setCourses] = useState<CourseRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [formError, setFormError] = useState<string | null>(null);

  const titleRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/courses");
      const json = (await res.json()) as { courses?: CourseRow[]; error?: string };
      if (!res.ok) throw new Error(json.error ?? "Yüklenemedi");
      setCourses(json.courses ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Hata");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  function openCreate() {
    setEditId(null);
    setForm(EMPTY_FORM);
    setFormError(null);
    setModalOpen(true);
    setTimeout(() => titleRef.current?.focus(), 50);
  }

  function openEdit(c: CourseRow) {
    setEditId(c.id);
    setForm({
      title_tr: c.title_tr,
      title_en: c.title_en ?? "",
      description_tr: c.description_tr ?? "",
      description_en: c.description_en ?? "",
      price_try: String(c.price_try),
      thumbnail_url: c.thumbnail_url ?? "",
      category: c.category,
      whatsapp_message: c.whatsapp_message ?? "",
      modules: (c.modules ?? []).join("\n"),
      sort_order: String(c.sort_order),
      is_published: c.is_published,
      slug: c.slug,
    });
    setFormError(null);
    setModalOpen(true);
    setTimeout(() => titleRef.current?.focus(), 50);
  }

  function closeModal() {
    setModalOpen(false);
    setFormError(null);
  }

  function set(key: keyof FormState, value: string | boolean) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function save() {
    if (!form.title_tr.trim()) {
      setFormError("Türkçe başlık zorunludur.");
      return;
    }
    setSaving(true);
    setFormError(null);
    try {
      const body = {
        title_tr: form.title_tr.trim(),
        title_en: form.title_en.trim() || null,
        description_tr: form.description_tr.trim() || null,
        description_en: form.description_en.trim() || null,
        price_try: parseFloat(form.price_try) || 0,
        thumbnail_url: form.thumbnail_url.trim() || null,
        category: form.category || "genel",
        whatsapp_message: form.whatsapp_message.trim() || null,
        modules: form.modules,
        sort_order: parseInt(form.sort_order) || 0,
        is_published: form.is_published,
        ...(form.slug.trim() ? { slug: form.slug.trim() } : {}),
      };

      const url = editId ? `/api/admin/courses?id=${editId}` : "/api/admin/courses";
      const method = editId ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = (await res.json()) as { course?: CourseRow; error?: string };
      if (!res.ok) throw new Error(json.error ?? "Kaydedilemedi");

      if (editId) {
        setCourses((prev) => prev.map((c) => (c.id === editId ? (json.course ?? c) : c)));
        setSuccessMsg("Kurs güncellendi.");
      } else {
        setCourses((prev) => [json.course!, ...prev]);
        setSuccessMsg("Kurs oluşturuldu.");
      }
      closeModal();
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (e) {
      setFormError(e instanceof Error ? e.message : "Hata");
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: string, title: string) {
    if (!confirm(`"${title}" kursunu silmek istediğinize emin misiniz?`)) return;
    try {
      const res = await fetch(`/api/admin/courses?id=${id}`, { method: "DELETE" });
      if (!res.ok) {
        const j = (await res.json()) as { error?: string };
        throw new Error(j.error ?? "Silinemedi");
      }
      setCourses((prev) => prev.filter((c) => c.id !== id));
      setSuccessMsg("Kurs silindi.");
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Hata");
    }
  }

  return (
    <div className="space-y-6 pb-10">
      {/* Header */}
      <div className="flex flex-col gap-3 rounded-2xl border border-white/[0.14] bg-gradient-to-br from-[#14161d] via-[#0e1015] to-[#08090c] p-6 shadow-[0_1px_0_rgba(255,255,255,0.06)_inset] sm:flex-row sm:items-center sm:justify-between sm:p-8">
        <div>
          <p className="text-xs text-zinc-500 mb-1">
            <a href="/admin/cms" className="hover:text-zinc-300 transition-colors">İçerik</a>
            <span className="mx-1.5 text-zinc-700">/</span>
            <span className="text-zinc-400">Eğitimler & Kurslar</span>
          </p>
          <h1 className="font-display text-2xl font-semibold tracking-tight text-zinc-50 sm:text-3xl">
            Eğitimler & Kurslar
          </h1>
          <p className="mt-1 text-sm text-zinc-400">
            {courses.length} kurs · Sıralama, fiyat ve yayın durumunu buradan yönetin.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className={SECONDARY_BTN}
            onClick={() => void load()}
            disabled={loading}
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            Yenile
          </button>
          <button type="button" className={ADMIN_PRIMARY_BUTTON_CLASS} onClick={openCreate}>
            <Plus className="h-3.5 w-3.5" />
            Yeni Kurs
          </button>
        </div>
      </div>

      {/* Alerts */}
      {error && (
        <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
          {error}
        </div>
      )}
      {successMsg && (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">
          {successMsg}
        </div>
      )}

      {/* Table */}
      <FinanceScrollTable>
        <thead>
          <tr>
            <th className={FINANCE_TH}>Sıra</th>
            <th className={FINANCE_TH}>Başlık</th>
            <th className={FINANCE_TH}>Kategori</th>
            <th className={FINANCE_TH}>Fiyat (₺)</th>
            <th className={FINANCE_TH}>Durum</th>
            <th className={FINANCE_TH}>İşlemler</th>
          </tr>
        </thead>
        <tbody>
          {loading && (
            <tr>
              <td colSpan={6} className="py-10 text-center text-sm text-zinc-500">
                <Loader2 className="inline h-4 w-4 animate-spin mr-2" />
                Yükleniyor…
              </td>
            </tr>
          )}
          {!loading && courses.length === 0 && (
            <tr>
              <td colSpan={6} className="py-10 text-center text-sm text-zinc-500">
                Henüz kurs yok. Yeni kurs ekleyin.
              </td>
            </tr>
          )}
          {!loading &&
            courses.map((c) => (
              <tr key={c.id} className="border-t border-white/[0.04] hover:bg-white/[0.02]">
                <td className="px-4 py-3 text-center text-xs text-zinc-500">{c.sort_order}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    {c.thumbnail_url && (
                      <img
                        src={c.thumbnail_url}
                        alt=""
                        className="h-9 w-9 rounded-lg object-cover shrink-0 border border-white/[0.08]"
                      />
                    )}
                    <div>
                      <p className="text-sm font-medium text-zinc-100">{c.title_tr}</p>
                      {c.title_en && (
                        <p className="text-xs text-zinc-500">{c.title_en}</p>
                      )}
                      <p className="text-[11px] text-zinc-600 font-mono mt-0.5">{c.slug}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 text-xs text-zinc-400 capitalize">{c.category}</td>
                <td className="px-4 py-3 text-sm text-zinc-200">
                  {c.price_try.toLocaleString("tr-TR")} ₺
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium ${
                      c.is_published
                        ? "bg-emerald-500/15 text-emerald-400"
                        : "bg-zinc-700/40 text-zinc-400"
                    }`}
                  >
                    {c.is_published ? "Yayında" : "Taslak"}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      className={SECONDARY_BTN}
                      onClick={() => openEdit(c)}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                      Düzenle
                    </button>
                    <button
                      type="button"
                      className={DANGER_BTN}
                      onClick={() => void remove(c.id, c.title_tr)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
        </tbody>
      </FinanceScrollTable>

      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/60 backdrop-blur-sm p-4 pt-16">
          <div className="w-full max-w-2xl rounded-2xl border border-white/[0.12] bg-[#0e1015] shadow-2xl">
            {/* Modal header */}
            <div className="flex items-center justify-between border-b border-white/[0.08] px-6 py-4">
              <h2 className="font-display text-base font-semibold text-zinc-100">
                {editId ? "Kursu Düzenle" : "Yeni Kurs Oluştur"}
              </h2>
              <button
                type="button"
                onClick={closeModal}
                className="rounded-lg p-1.5 text-zinc-400 hover:bg-white/[0.06] hover:text-zinc-200"
              >
                ✕
              </button>
            </div>

            {/* Modal body */}
            <div className="space-y-5 px-6 py-5">
              {formError && (
                <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
                  {formError}
                </div>
              )}

              {/* Row: title_tr + title_en */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className={LABEL_CLASS}>Başlık (TR) *</label>
                  <input
                    ref={titleRef}
                    type="text"
                    className={INPUT_CLASS}
                    value={form.title_tr}
                    onChange={(e) => set("title_tr", e.target.value)}
                    placeholder="MatrixGold Temel Eğitim"
                  />
                </div>
                <div>
                  <label className={LABEL_CLASS}>Başlık (EN)</label>
                  <input
                    type="text"
                    className={INPUT_CLASS}
                    value={form.title_en}
                    onChange={(e) => set("title_en", e.target.value)}
                    placeholder="MatrixGold Basic Course"
                  />
                </div>
              </div>

              {/* Row: description_tr */}
              <div>
                <label className={LABEL_CLASS}>Açıklama (TR)</label>
                <textarea
                  rows={3}
                  className={INPUT_CLASS + " resize-none"}
                  value={form.description_tr}
                  onChange={(e) => set("description_tr", e.target.value)}
                  placeholder="Kursu kısaca açıklayın…"
                />
              </div>

              {/* Row: description_en */}
              <div>
                <label className={LABEL_CLASS}>Açıklama (EN)</label>
                <textarea
                  rows={2}
                  className={INPUT_CLASS + " resize-none"}
                  value={form.description_en}
                  onChange={(e) => set("description_en", e.target.value)}
                  placeholder="Briefly describe the course…"
                />
              </div>

              {/* Row: price + category + sort_order */}
              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <label className={LABEL_CLASS}>Fiyat (₺)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    className={INPUT_CLASS}
                    value={form.price_try}
                    onChange={(e) => set("price_try", e.target.value)}
                  />
                </div>
                <div>
                  <label className={LABEL_CLASS}>Kategori</label>
                  <select
                    className={INPUT_CLASS + " bg-[#0e1015]"}
                    value={form.category}
                    onChange={(e) => set("category", e.target.value)}
                  >
                    {CATEGORIES.map((cat) => (
                      <option key={cat} value={cat} className="bg-[#0e1015]">
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={LABEL_CLASS}>Sıralama</label>
                  <input
                    type="number"
                    min="0"
                    className={INPUT_CLASS}
                    value={form.sort_order}
                    onChange={(e) => set("sort_order", e.target.value)}
                  />
                </div>
              </div>

              {/* Row: slug */}
              <div>
                <label className={LABEL_CLASS}>Slug (boş bırakılırsa başlıktan üretilir)</label>
                <input
                  type="text"
                  className={INPUT_CLASS + " font-mono text-xs"}
                  value={form.slug}
                  onChange={(e) => set("slug", e.target.value)}
                  placeholder="matrixgold-temel-egitim"
                />
              </div>

              {/* Row: thumbnail_url */}
              <div>
                <label className={LABEL_CLASS}>Kapak Görseli URL</label>
                <input
                  type="url"
                  className={INPUT_CLASS}
                  value={form.thumbnail_url}
                  onChange={(e) => set("thumbnail_url", e.target.value)}
                  placeholder="https://…"
                />
                {form.thumbnail_url && (
                  <img
                    src={form.thumbnail_url}
                    alt=""
                    className="mt-2 h-24 w-40 rounded-xl object-cover border border-white/[0.08]"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                  />
                )}
              </div>

              {/* Row: whatsapp_message */}
              <div>
                <label className={LABEL_CLASS}>WhatsApp Mesajı (ön dolu)</label>
                <textarea
                  rows={2}
                  className={INPUT_CLASS + " resize-none"}
                  value={form.whatsapp_message}
                  onChange={(e) => set("whatsapp_message", e.target.value)}
                  placeholder="Merhaba, MatrixGold eğitimi hakkında bilgi almak istiyorum."
                />
              </div>

              {/* Row: modules */}
              <div>
                <label className={LABEL_CLASS}>Modüller (her satıra bir modül)</label>
                <textarea
                  rows={5}
                  className={INPUT_CLASS + " resize-y font-mono text-xs"}
                  value={form.modules}
                  onChange={(e) => set("modules", e.target.value)}
                  placeholder={"Modül 1: Giriş\nModül 2: Temel İşlemler\nModül 3: İleri Teknikler"}
                />
                {form.modules.trim() && (
                  <p className="mt-1 text-xs text-zinc-600">
                    {form.modules.split("\n").filter(Boolean).length} modül
                  </p>
                )}
              </div>

              {/* Row: is_published */}
              <div className="flex items-center justify-between rounded-xl border border-white/[0.08] bg-white/[0.02] px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-zinc-200">Yayınla</p>
                  <p className="text-xs text-zinc-500">Açık ise sitede görünür</p>
                </div>
                <Toggle checked={form.is_published} onChange={(v) => set("is_published", v)} />
              </div>
            </div>

            {/* Modal footer */}
            <div className="flex items-center justify-end gap-3 border-t border-white/[0.08] px-6 py-4">
              <button type="button" className={SECONDARY_BTN} onClick={closeModal}>
                İptal
              </button>
              <button
                type="button"
                className={ADMIN_PRIMARY_BUTTON_CLASS}
                onClick={() => void save()}
                disabled={saving}
              >
                {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                {editId ? "Güncelle" : "Oluştur"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
