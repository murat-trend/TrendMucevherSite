"use client";

import type React from "react";
import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { Plus, Package, X, Upload, LogOut } from "lucide-react";

type JewelryType = "Yüzük" | "Kolye" | "Bilezik" | "Küpe" | "Pandant" | "Broş";

type ProductForm = {
  name: string;
  jewelryType: JewelryType;
  price: string;
  width: string;
  height: string;
  depth: string;
  weight: string;
  story: string;
  glbFile: File | null;
  stlFile: File | null;
  thumbnailOn: File | null;
  thumbnailArka: File | null;
  thumbnailKenar: File | null;
  thumbnailUst: File | null;
  licensePersonal: boolean;
  licensePersonalPrice: string;
  licenseCommercial: boolean;
  licenseCommercialPrice: string;
};

const EMPTY_FORM: ProductForm = {
  name: "", jewelryType: "Yüzük", price: "",
  width: "", height: "", depth: "", weight: "",
  story: "",
  glbFile: null, stlFile: null,
  thumbnailOn: null, thumbnailArka: null, thumbnailKenar: null, thumbnailUst: null,
  licensePersonal: true, licensePersonalPrice: "",
  licenseCommercial: false, licenseCommercialPrice: "",
};

// ── Input bileşeni ────────────────────────────────────────────────────────
function Field({ label, children, span2 = false }: { label: string; children: React.ReactNode; span2?: boolean }) {
  return (
    <div className={span2 ? "sm:col-span-2" : ""}>
      <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-[0.1em] text-muted">
        {label}
      </label>
      {children}
    </div>
  );
}

const inputCls = "w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-[14px] text-foreground placeholder:text-muted/50 outline-none transition-all focus:border-accent/50 focus:ring-2 focus:ring-accent/10";
const fileCls = "block w-full cursor-pointer rounded-xl border border-border bg-background px-3 py-2 text-sm text-muted file:mr-3 file:rounded-lg file:border-0 file:bg-surface-alt file:px-3 file:py-1 file:text-xs file:text-foreground";

export default function SaticiUrunlerimPage() {
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<ProductForm>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [products, setProducts] = useState<
    Array<{
      id: string;
      name: string;
      slug: string;
      thumbnail_url: string | null;
      is_published: boolean;
      personal_price: number;
      jewelry_type: string;
      story: string | null;
    }>
  >([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [profileLoading, setProfileLoading] = useState(true);
  const [hasSession, setHasSession] = useState(false);
  const [storeName, setStoreName] = useState<string | null>(null);
  const [savingStoreName, setSavingStoreName] = useState(false);
  const [profileSaveError, setProfileSaveError] = useState<string | null>(null);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [showMessages, setShowMessages] = useState(false);
  const [messages, setMessages] = useState<
    Array<{
      id: string;
      message: string;
      created_at: string;
      is_read: boolean;
      product_id: string | null;
      sender_id: string | null;
      sender_name: string | null;
    }>
  >([]);
  const [replyText, setReplyText] = useState<Record<string, string>>({});
  const [replySending, setReplySending] = useState<Record<string, boolean>>({});
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<{ name: string; story: string; personal_price: number } | null>(null);
  const [editSaving, setEditSaving] = useState(false);

  const handleLogout = useCallback(async () => {
    setLoggingOut(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }, [router]);

  const loadProfile = useCallback(async () => {
    setProfileLoading(true);
    setProfileSaveError(null);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setHasSession(false);
      setStoreName(null);
      setUnreadMessages(0);
      setProfileLoading(false);
      return;
    }
    setHasSession(true);
    const { data, error } = await supabase
      .from("profiles")
      .select("store_name")
      .eq("id", user.id)
      .maybeSingle();
    if (error) {
      setStoreName(null);
      const { count } = await supabase
        .from("messages")
        .select("*", { count: "exact", head: true })
        .eq("receiver_id", user.id)
        .eq("is_read", false);
      setUnreadMessages(count ?? 0);
      setProfileLoading(false);
      return;
    }
    const raw = typeof data?.store_name === "string" ? data.store_name.trim() : "";
    setStoreName(raw === "" ? null : raw);
    const { count } = await supabase
      .from("messages")
      .select("*", { count: "exact", head: true })
      .eq("receiver_id", user.id)
      .eq("is_read", false);
    setUnreadMessages(count ?? 0);
    setProfileLoading(false);
  }, []);

  const handleSaveStoreName = useCallback(async () => {
    setProfileSaveError(null);
    const el = document.getElementById("store-name-input") as HTMLInputElement | null;
    const v = el?.value?.trim() ?? "";
    if (!v) {
      setProfileSaveError("Mağaza adı gerekli.");
      return;
    }
    setSavingStoreName(true);
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setProfileSaveError("Oturum bulunamadı.");
        return;
      }
      const { error } = await supabase.from("profiles").upsert(
        { id: user.id, store_name: v, store_name_locked: true },
        { onConflict: "id" },
      );
      if (error) {
        setProfileSaveError(error.message);
        return;
      }
      await loadProfile();
    } finally {
      setSavingStoreName(false);
    }
  }, [loadProfile]);

  const handleOpenMessages = useCallback(async () => {
    setShowMessages(true);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase
      .from("messages")
      .select("id, message, created_at, is_read, product_id, sender_id")
      .eq("receiver_id", user.id)
      .order("created_at", { ascending: false });
    const enriched = await Promise.all(
      (data ?? []).map(async (msg) => {
        const row = msg as {
          id: string;
          message: string;
          created_at: string;
          is_read: boolean;
          product_id: string | null;
          sender_id: string | null;
        };
        if (!row.sender_id) return { ...row, sender_name: "Anonim" };
        const { data: profile } = await supabase
          .from("profiles")
          .select("store_name")
          .eq("id", row.sender_id)
          .maybeSingle();
        if (profile?.store_name) return { ...row, sender_name: profile.store_name };
        return { ...row, sender_name: row.sender_id === user.id ? "Sen" : "Kullanıcı" };
      }),
    );
    setMessages(enriched);
    await supabase
      .from("messages")
      .update({ is_read: true })
      .eq("receiver_id", user.id)
      .eq("is_read", false);
    setUnreadMessages(0);
  }, []);

  const handleReply = async (msg: (typeof messages)[number]) => {
    const text = replyText[msg.id]?.trim();
    if (!text) return;
    setReplySending((prev) => ({ ...prev, [msg.id]: true }));
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setReplySending((prev) => ({ ...prev, [msg.id]: false }));
      return;
    }
    await supabase.from("messages").insert({
      sender_id: user.id,
      receiver_id: msg.sender_id,
      product_id: msg.product_id,
      message: text,
    });
    setReplyText((prev) => ({ ...prev, [msg.id]: "" }));
    setReplySending((prev) => ({ ...prev, [msg.id]: false }));
  };

  const loadProducts = useCallback(async () => {
    setLoadingProducts(true);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setLoadingProducts(false);
      return;
    }
    const { data } = await supabase
      .from("products_3d")
      .select("id, name, slug, thumbnail_url, is_published, personal_price, jewelry_type, story")
      .eq("seller_id", user.id)
      .order("created_at", { ascending: false });
    setProducts(
      (data ?? []) as Array<{
        id: string;
        name: string;
        slug: string;
        thumbnail_url: string | null;
        is_published: boolean;
        personal_price: number;
        jewelry_type: string;
        story: string | null;
      }>,
    );
    setLoadingProducts(false);
  }, []);

  useEffect(() => {
    void loadProfile();
    void loadProducts();
  }, [loadProfile, loadProducts]);

  const set = (key: keyof ProductForm, value: unknown) =>
    setForm((p) => ({ ...p, [key]: value }));

  const slugify = (s: string) =>
    s.toLocaleLowerCase("tr-TR")
      .replace(/ğ/g, "g").replace(/ü/g, "u").replace(/ş/g, "s")
      .replace(/ı/g, "i").replace(/ö/g, "o").replace(/ç/g, "c")
      .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

  const handleUpdate = useCallback(async () => {
    if (!editingId || !editForm || editSaving) return;
    setEditSaving(true);
    try {
      let storyEn = "", storyDe = "", storyRu = "";
      let nameEn = "", nameDe = "", nameRu = "";
      try {
        const [storyRes, nameRes] = await Promise.all([
          fetch("/api/translate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ text: editForm.story, sourceLang: "tr" }),
          }),
          fetch("/api/translate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ text: editForm.name, sourceLang: "tr" }),
          }),
        ]);
        const storyData = await storyRes.json();
        const nameData = await nameRes.json();
        if (storyData.ok) {
          storyEn = storyData.translations.en;
          storyDe = storyData.translations.de;
          storyRu = storyData.translations.ru;
        }
        if (nameData.ok) {
          nameEn = nameData.translations.en;
          nameDe = nameData.translations.de;
          nameRu = nameData.translations.ru;
        }
      } catch {
        /* çeviri opsiyonel */
      }

      const supabase = createClient();
      const { error } = await supabase
        .from("products_3d")
        .update({
          name: editForm.name,
          story: editForm.story,
          personal_price: editForm.personal_price,
          story_en: storyEn || null,
          story_de: storyDe || null,
          story_ru: storyRu || null,
          name_en: nameEn || null,
          name_de: nameDe || null,
          name_ru: nameRu || null,
        })
        .eq("id", editingId);

      if (!error) {
        setEditingId(null);
        setEditForm(null);
        await loadProducts();
      } else {
        console.error(error);
      }
    } finally {
      setEditSaving(false);
    }
  }, [editingId, editForm, editSaving, loadProducts]);

  const handleSave = useCallback(async () => {
    setError(null);
    const name = form.name.trim();
    const price = Number(form.price);
    const width = Number(form.width);
    const height = Number(form.height);
    const depth = Number(form.depth);
    const weight = Number(form.weight);

    if (!name) return setError("Ürün adı zorunludur.");
    if (!price || price <= 0) return setError("Geçerli bir fiyat girin.");
    if (!width || !height || !depth || !weight) return setError("Tüm ölçü alanlarını doldurun.");
    if (!form.licensePersonal && !form.licenseCommercial) return setError("En az bir lisans türü seçin.");
    if (!form.glbFile && !form.stlFile) return setError("En az bir model dosyası (GLB veya STL) yükleyin.");

    setSaving(true);
    try {
      const slug = slugify(name) || `urun-${Date.now()}`;
      let glbUrl: string | null = null;
      let stlUrl: string | null = null;
      let thumbnailUrl: string | null = null;
      const thumbnailViews: Record<string, string | null> = { on: null, arka: null, kenar: null, ust: null };

      const fd = new FormData();
      fd.set("slug", slug);
      if (form.glbFile) fd.set("glb", form.glbFile);
      if (form.stlFile) fd.set("stl", form.stlFile);
      const res = await fetch("/api/upload-model", { method: "POST", body: fd });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? "Model dosyası yüklenemedi.");
      }
      const data = await res.json() as { glbUrl?: string; stlUrl?: string };
      glbUrl = data.glbUrl ?? null;
      stlUrl = data.stlUrl ?? null;

      // Thumbnail'lar
      const thumbFiles = [
        { key: "on", file: form.thumbnailOn },
        { key: "arka", file: form.thumbnailArka },
        { key: "kenar", file: form.thumbnailKenar },
        { key: "ust", file: form.thumbnailUst },
      ];
      for (const { key, file } of thumbFiles) {
        if (!file) continue;
        const fd = new FormData();
        fd.set("slug", slug);
        fd.set("view", key);
        fd.set("file", file);
        const res = await fetch("/api/upload-thumbnail", { method: "POST", body: fd });
        if (!res.ok) throw new Error(`${key} görseli yüklenemedi.`);
        const data = await res.json() as { url?: string };
        thumbnailViews[key] = data.url ?? null;
        if (key === "on") thumbnailUrl = data.url ?? null;
      }
      if (!thumbnailUrl) {
        thumbnailUrl = thumbnailViews.on ?? thumbnailViews.arka ?? thumbnailViews.kenar ?? thumbnailViews.ust ?? null;
      }

      // Supabase'e kaydet
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      // Hikaye ve ismi otomatik çevir
      let storyEn = "", storyDe = "", storyRu = "";
      let nameEn = "", nameDe = "", nameRu = "";
      try {
        const [storyRes, nameRes] = await Promise.all([
          fetch("/api/translate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ text: form.story.trim(), sourceLang: "tr" }),
          }),
          fetch("/api/translate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ text: name, sourceLang: "tr" }),
          }),
        ]);
        const storyData = await storyRes.json();
        const nameData = await nameRes.json();
        if (storyData.ok) {
          storyEn = storyData.translations.en;
          storyDe = storyData.translations.de;
          storyRu = storyData.translations.ru;
        }
        if (nameData.ok) {
          nameEn = nameData.translations.en;
          nameDe = nameData.translations.de;
          nameRu = nameData.translations.ru;
        }
      } catch {
        /* çeviri başarısız olsa da ürün kaydedilsin */
      }

      const { error: dbError } = await supabase.from("products_3d").insert({
        sku: `TM-3D-${Date.now()}`,
        name,
        slug,
        story: form.story.trim(),
        story_en: storyEn || null,
        story_de: storyDe || null,
        story_ru: storyRu || null,
        name_en: nameEn || null,
        name_de: nameDe || null,
        name_ru: nameRu || null,
        jewelry_type: form.jewelryType,
        personal_price: form.licensePersonal ? Number(form.licensePersonalPrice) || price : price,
        commercial_price: form.licenseCommercial ? Number(form.licenseCommercialPrice) || null : null,
        glb_url: glbUrl,
        stl_url: stlUrl,
        thumbnail_url: thumbnailUrl,
        images: thumbnailViews,
        dimensions: { width, height, depth, weight },
        is_published: false,
        show_on_home: false,
        show_on_modeller: true,
        seller_id: user?.id ?? null,
        seller_email: user?.email ?? null,
      });

      if (dbError) throw new Error("Ürün kaydedilemedi: " + dbError.message);

      setSuccess(true);
      void loadProducts();
      setForm(EMPTY_FORM);
      setTimeout(() => {
        setSuccess(false);
        setShowForm(false);
      }, 2000);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Bir hata oluştu.");
    } finally {
      setSaving(false);
    }
  }, [form, loadProducts]);

  return (
    <div className="min-h-screen bg-background">
      {/* Üst bar */}
      <div className="border-b border-border/60 bg-card">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-6">
          <div>
            <h1 className="font-display text-xl font-medium tracking-[-0.02em] text-foreground">Ürünlerim</h1>
            <p className="mt-0.5 text-[13px] text-muted">3D modellerinizi yönetin</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => void handleLogout()}
              disabled={loggingOut}
              className="flex items-center gap-2 rounded-full border border-border/80 bg-transparent px-4 py-2 text-[13px] font-medium text-muted transition-colors hover:border-red-500/30 hover:bg-red-500/[0.06] hover:text-red-400 disabled:opacity-50"
            >
              <LogOut size={14} strokeWidth={2} />
              {loggingOut ? "Çıkılıyor..." : "Çıkış Yap"}
            </button>
            <button
              type="button"
              onClick={() => {
                setShowForm(true);
                setError(null);
              }}
              className="flex items-center gap-2 rounded-full bg-accent px-4 py-2 text-[13px] font-medium text-accent-foreground hover:opacity-90"
            >
              <Plus size={15} strokeWidth={2} /> Ürün Ekle
            </button>
          </div>
        </div>
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <nav className="flex gap-6">
            {[
              { href: "/satici/dashboard", label: "Dashboard" },
              { href: "/satici/urunlerim", label: "Ürünlerim", active: true },
              { href: "/satici/siparislerim", label: "Siparişlerim" },
              { href: "/satici/hesabim", label: "Hesabım" },
            ].map((item) => (
              <a
                key={item.href}
                href={item.href}
                className={`border-b-2 pb-3 pt-1 text-[13px] font-medium transition-colors ${item.active ? "border-accent text-accent" : "border-transparent text-muted hover:text-foreground"}`}
              >
                {item.label}
              </a>
            ))}
          </nav>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">

        {hasSession && !profileLoading && (storeName === null || storeName === "") && (
          <div className="mb-4 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4">
            <div className="text-sm font-medium text-amber-300 flex flex-wrap items-center gap-2">
              Mağaza adınızı henüz belirlemediniz.
              {unreadMessages > 0 && (
                <button
                  type="button"
                  onClick={() => void handleOpenMessages()}
                  className="rounded-full bg-red-500 px-2 py-0.5 text-[10px] font-bold text-white hover:bg-red-600 transition-colors"
                >
                  {unreadMessages} yeni mesaj
                </button>
              )}
            </div>
            <p className="mt-1 text-xs text-amber-300/70">Ürün yüklemeden önce mağaza adınızı belirleyin — bu ad daha sonra değiştirilemez.</p>
            <input
              type="text"
              placeholder="Mağaza adınız..."
              className="mt-3 w-full rounded-lg border border-amber-500/30 bg-black/20 px-3 py-2 text-sm text-foreground outline-none"
              id="store-name-input"
            />
            {profileSaveError && (
              <p className="mt-2 text-xs text-red-400">{profileSaveError}</p>
            )}
            <button
              type="button"
              disabled={savingStoreName}
              className="mt-2 rounded-lg bg-amber-500/20 border border-amber-500/30 px-4 py-2 text-xs font-semibold text-amber-200 hover:bg-amber-500/30 transition-colors disabled:opacity-50"
              onClick={handleSaveStoreName}
            >
              Mağaza Adını Kaydet ve Kilitle
            </button>
          </div>
        )}

        {storeName && (
          <div className="mb-4 flex items-center gap-3 rounded-xl border border-border/40 bg-white/[0.03] px-4 py-3">
            <div className="h-8 w-8 rounded-full bg-amber-500/20 flex items-center justify-center text-sm font-bold text-amber-300">
              {storeName.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-foreground">{storeName}</p>
              <p className="text-[10px] text-muted">Mağaza adınız</p>
            </div>
            {unreadMessages > 0 && (
              <button
                type="button"
                onClick={() => void handleOpenMessages()}
                className="rounded-full bg-red-500 px-2 py-0.5 text-[10px] font-bold text-white hover:bg-red-600 transition-colors"
              >
                {unreadMessages} yeni mesaj
              </button>
            )}
          </div>
        )}

        {loadingProducts ? (
          <div className="py-20 text-center text-sm text-muted">Yükleniyor...</div>
        ) : products.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border/60 py-20 text-center">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-border/60 bg-surface-alt text-muted">
              <Package size={24} strokeWidth={1.5} />
            </div>
            <h3 className="font-display text-lg font-medium text-foreground">Henüz ürün yok</h3>
            <p className="mt-2 text-[13px] text-muted">İlk ürününüzü ekleyerek başlayın.</p>
            <button
              onClick={() => setShowForm(true)}
              className="mt-6 flex items-center gap-2 rounded-full bg-accent px-5 py-2.5 text-[13px] font-medium text-accent-foreground hover:opacity-90"
            >
              <Plus size={14} /> Ürün Ekle
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {products.map((p) => (
              <div key={p.id} className="rounded-xl border border-border bg-surface p-4">
                {p.thumbnail_url && (
                  <img src={p.thumbnail_url} alt={p.name} className="mb-3 h-40 w-full rounded-lg object-cover" />
                )}
                <p className="font-medium text-foreground">{p.name}</p>
                <p className="text-xs text-muted">
                  {p.jewelry_type} · ₺{p.personal_price}
                </p>
                <span
                  className={`mt-2 inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold ${p.is_published ? "bg-emerald-500/15 text-emerald-300" : "bg-amber-500/15 text-amber-300"}`}
                >
                  {p.is_published ? "Yayında" : "Onay Bekliyor"}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setEditingId(p.id);
                    setEditForm({
                      name: p.name,
                      story: p.story ?? "",
                      personal_price: p.personal_price ?? 0,
                    });
                  }}
                  className="mt-2 inline-flex items-center gap-1 rounded-md border border-amber-400/60 bg-amber-400 px-2 py-1 text-[11px] font-medium text-neutral-900 hover:bg-amber-300 hover:border-amber-300 transition-colors"
                >
                  Düzenle
                </button>
              </div>
            ))}
          </div>
        )}

      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-foreground/20 backdrop-blur-sm">
          <div className="mx-auto flex min-h-full max-w-2xl items-start justify-center p-4 py-8">
            <div className="w-full overflow-hidden rounded-2xl border border-border bg-card shadow-2xl">

              {/* Modal başlık */}
              <div className="flex items-center justify-between border-b border-border/60 px-6 py-4">
                <h2 className="font-display text-lg font-medium text-foreground">Yeni Ürün Ekle</h2>
                <button onClick={() => setShowForm(false)} className="flex h-8 w-8 items-center justify-center rounded-lg text-muted hover:bg-surface-alt hover:text-foreground">
                  <X size={16} />
                </button>
              </div>

              {/* Form */}
              <div className="grid grid-cols-1 gap-5 overflow-y-auto p-6 pb-4 sm:grid-cols-2" style={{ maxHeight: "75vh" }}>

                <Field label="Ürün Adı" span2>
                  <input type="text" className={inputCls} placeholder="Örn: Simurg Yüzük"
                    value={form.name} onChange={(e) => set("name", e.target.value)} />
                </Field>

                <Field label="Takı Tipi">
                  <select className={inputCls} value={form.jewelryType}
                    onChange={(e) => set("jewelryType", e.target.value as JewelryType)}>
                    {["Yüzük", "Kolye", "Bilezik", "Küpe", "Pandant", "Broş"].map((t) => (
                      <option key={t}>{t}</option>
                    ))}
                  </select>
                </Field>

                <Field label="Fiyat (₺)">
                  <input type="number" min={1} className={inputCls} placeholder="0"
                    value={form.price} onChange={(e) => set("price", e.target.value)} />
                </Field>

                <Field label="Genişlik (mm)">
                  <input type="number" min={0.1} step="0.1" className={inputCls} placeholder="0.0"
                    value={form.width} onChange={(e) => set("width", e.target.value)} />
                </Field>
                <Field label="Yükseklik (mm)">
                  <input type="number" min={0.1} step="0.1" className={inputCls} placeholder="0.0"
                    value={form.height} onChange={(e) => set("height", e.target.value)} />
                </Field>
                <Field label="Derinlik (mm)">
                  <input type="number" min={0.1} step="0.1" className={inputCls} placeholder="0.0"
                    value={form.depth} onChange={(e) => set("depth", e.target.value)} />
                </Field>
                <Field label="Ağırlık (gr)">
                  <input type="number" min={0.1} step="0.1" className={inputCls} placeholder="0.0"
                    value={form.weight} onChange={(e) => set("weight", e.target.value)} />
                </Field>

                <Field label="Ürün Hikayesi" span2>
                  <textarea rows={3} className={inputCls} placeholder="Ürününüzü kısaca anlatın..."
                    value={form.story} onChange={(e) => set("story", e.target.value)} />
                </Field>

                <Field label="GLB Dosyası">
                  <input type="file" accept=".glb" className={fileCls}
                    onChange={(e) => set("glbFile", e.target.files?.[0] ?? null)} />
                </Field>
                <Field label="STL Dosyası">
                  <input type="file" accept=".stl" className={fileCls}
                    onChange={(e) => set("stlFile", e.target.files?.[0] ?? null)} />
                </Field>

                <Field label="Ön Görsel" span2>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { key: "thumbnailOn", label: "Ön" },
                      { key: "thumbnailArka", label: "Arka" },
                      { key: "thumbnailKenar", label: "Kenar" },
                      { key: "thumbnailUst", label: "Üst" },
                    ].map(({ key, label }) => (
                      <div key={key}>
                        <p className="mb-1 text-[11px] text-muted">{label}</p>
                        <input type="file" accept="image/*" className={fileCls}
                          onChange={(e) => set(key as keyof ProductForm, e.target.files?.[0] ?? null)} />
                      </div>
                    ))}
                  </div>
                </Field>

                {/* Lisans */}
                <Field label="Lisans Türü" span2>
                  <div className="space-y-3 rounded-xl border border-border/60 bg-surface-alt p-4">
                    <div className="flex items-center justify-between">
                      <label className="flex items-center gap-2 text-[14px] text-foreground cursor-pointer">
                        <input type="checkbox" checked={form.licensePersonal}
                          onChange={(e) => set("licensePersonal", e.target.checked)}
                          className="h-4 w-4 accent-accent" />
                        Kişisel Kullanım
                      </label>
                      <input type="number" min={1} disabled={!form.licensePersonal}
                        className="w-32 rounded-xl border border-border bg-background px-3 py-2 text-[13px] text-foreground outline-none disabled:opacity-40"
                        placeholder="₺" value={form.licensePersonalPrice}
                        onChange={(e) => set("licensePersonalPrice", e.target.value)} />
                    </div>
                    <div className="flex items-center justify-between">
                      <label className="flex items-center gap-2 text-[14px] text-foreground cursor-pointer">
                        <input type="checkbox" checked={form.licenseCommercial}
                          onChange={(e) => set("licenseCommercial", e.target.checked)}
                          className="h-4 w-4 accent-accent" />
                        Ticari Kullanım
                      </label>
                      <input type="number" min={1} disabled={!form.licenseCommercial}
                        className="w-32 rounded-xl border border-border bg-background px-3 py-2 text-[13px] text-foreground outline-none disabled:opacity-40"
                        placeholder="₺" value={form.licenseCommercialPrice}
                        onChange={(e) => set("licenseCommercialPrice", e.target.value)} />
                    </div>
                  </div>
                </Field>

                {/* Hata */}
                {error && (
                  <div className="sm:col-span-2 flex items-center gap-2 rounded-xl border border-red-500/20 bg-red-500/[0.06] px-4 py-3 text-[13px] text-red-400">
                    <X size={14} /> {error}
                  </div>
                )}

                {/* Başarı */}
                {success && (
                  <div className="sm:col-span-2 rounded-xl border border-emerald-500/20 bg-emerald-500/[0.06] px-4 py-3 text-[13px] text-emerald-400">
                    ✓ Ürün başarıyla kaydedildi! Admin onayı bekleniyor.
                  </div>
                )}

              </div>

              {/* Alt butonlar */}
              <div className="flex justify-end gap-3 border-t border-border/60 px-6 py-4">
                <button onClick={() => setShowForm(false)}
                  className="rounded-xl border border-border px-5 py-2.5 text-[13px] font-medium text-muted hover:text-foreground">
                  Vazgeç
                </button>
                <button onClick={handleSave} disabled={saving}
                  className="flex items-center gap-2 rounded-xl bg-accent px-5 py-2.5 text-[13px] font-medium text-accent-foreground hover:opacity-90 disabled:opacity-50">
                  {saving ? (
                    <>
                      <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg> Kaydediliyor...
                    </>
                  ) : (
                    <>
                      <Upload size={14} /> Kaydet & Onaya Gönder
                    </>
                  )}
                </button>
              </div>

            </div>
          </div>
        </div>
      )}

      {showMessages && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
          <div className="w-full max-w-lg rounded-2xl border border-border/40 bg-[#0f1117] p-6">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-semibold text-foreground">Gelen Mesajlar</h3>
              <button type="button" onClick={() => setShowMessages(false)} className="text-muted hover:text-foreground">✕</button>
            </div>
            {messages.length === 0 ? (
              <p className="text-center text-sm text-muted py-8">Mesaj yok</p>
            ) : (
              <div className="flex flex-col gap-3 max-h-96 overflow-y-auto">
                {messages.map((msg) => (
                  <div key={msg.id} className="rounded-lg border border-border/40 bg-white/[0.03] p-3">
                    <p className="text-[10px] font-semibold text-amber-300 mb-1">{msg.sender_name ?? "Bilinmeyen"}</p>
                    <p className="text-sm text-foreground">{msg.message}</p>
                    <p className="mt-1 text-[10px] text-muted">{new Date(msg.created_at).toLocaleString("tr-TR")}</p>
                    <div className="mt-2 flex gap-2">
                      <input
                        type="text"
                        value={replyText[msg.id] ?? ""}
                        onChange={(e) => setReplyText((prev) => ({ ...prev, [msg.id]: e.target.value }))}
                        placeholder="Cevap yaz..."
                        className="flex-1 rounded-lg border border-border/40 bg-white/[0.04] px-2 py-1.5 text-xs text-foreground outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => void handleReply(msg)}
                        disabled={replySending[msg.id] || !replyText[msg.id]?.trim()}
                        className="rounded-lg bg-amber-500/20 border border-amber-500/30 px-3 py-1.5 text-xs font-semibold text-amber-200 hover:bg-amber-500/30 transition-colors disabled:opacity-50"
                      >
                        {replySending[msg.id] ? "..." : "Gönder"}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {editingId && editForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
          <div className="w-full max-w-md rounded-2xl border border-border/40 bg-[#0f1117] p-6">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-semibold text-foreground">Ürünü Düzenle</h3>
              <button type="button" onClick={() => { setEditingId(null); setEditForm(null); }} className="text-muted hover:text-foreground">✕</button>
            </div>
            <div className="flex flex-col gap-3">
              <label className="block">
                <span className="text-xs text-muted mb-1 block">Ürün Adı</span>
                <input type="text" value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} className="w-full rounded-lg border border-border/40 bg-black/20 px-3 py-2 text-sm text-foreground outline-none" />
              </label>
              <label className="block">
                <span className="text-xs text-muted mb-1 block">Hikaye</span>
                <textarea value={editForm.story} onChange={(e) => setEditForm({ ...editForm, story: e.target.value })} rows={4} className="w-full rounded-lg border border-border/40 bg-black/20 px-3 py-2 text-sm text-foreground outline-none resize-none" />
              </label>
              <label className="block">
                <span className="text-xs text-muted mb-1 block">Fiyat (₺)</span>
                <input type="number" value={editForm.personal_price} onChange={(e) => setEditForm({ ...editForm, personal_price: Number(e.target.value) })} className="w-full rounded-lg border border-border/40 bg-black/20 px-3 py-2 text-sm text-foreground outline-none" />
              </label>
            </div>
            <div className="mt-4 flex gap-2">
              <button type="button" onClick={() => { setEditingId(null); setEditForm(null); }} className="flex-1 rounded-lg border border-border/40 py-2 text-sm text-muted">İptal</button>
              <button type="button" onClick={() => void handleUpdate()} disabled={editSaving} className="flex-1 rounded-lg bg-[#c9a84c] py-2 text-sm font-semibold text-black disabled:opacity-50">
                {editSaving ? "Kaydediliyor..." : "Güncelle"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
