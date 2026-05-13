"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BLOG_CATEGORIES } from "@/lib/blog/categories";
import type { PostRow } from "@/lib/blog/types";
import { ADMIN_PRIMARY_BUTTON_CLASS } from "@/components/admin/ui/adminPrimaryButton";
import { FinanceScrollTable, FINANCE_TH } from "@/components/admin/finance/FinanceScrollTable";
import { Loader2, Pencil, Plus, RefreshCw, Search, Sparkles, Trash2, Upload } from "lucide-react";
import { useEditor, EditorContent, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import TipTapLink from "@tiptap/extension-link";

const generateSlug = (title: string): string => {
  const s = title
    .toLowerCase()
    .replace(/ğ/g, "g")
    .replace(/ü/g, "u")
    .replace(/ş/g, "s")
    .replace(/ı/g, "i")
    .replace(/ö/g, "o")
    .replace(/ç/g, "c")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");
  return s || "yazi";
};

const SECONDARY_BTN =
  "inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border border-white/[0.14] bg-white/[0.04] px-3 py-2 text-xs font-medium text-zinc-200 transition-colors hover:bg-white/[0.07]";

const DANGER_BTN =
  "inline-flex items-center justify-center rounded-xl border border-rose-500/35 bg-rose-500/12 px-3 py-2 text-xs font-medium text-rose-100 hover:bg-rose-500/18";

function ToolbarBtn({
  active,
  onClick,
  children,
}: {
  active?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "rounded px-2 py-1 text-xs font-medium transition-colors select-none",
        active ? "bg-white/[0.14] text-zinc-100" : "text-zinc-400 hover:bg-white/[0.08] hover:text-zinc-200",
      ].join(" ")}
    >
      {children}
    </button>
  );
}

type BlogEditorProps = {
  initialContent: string;
  onChange: (html: string) => void;
  onEditorReady: (editor: Editor) => void;
};

function toHtml(raw: string): string {
  if (!raw) return "";
  if (raw.trimStart().startsWith("<")) return raw;
  return raw
    .split(/\n\n+/)
    .map((para) => `<p>${para.trim().replace(/\n/g, "<br>")}</p>`)
    .join("");
}

function BlogEditor({ initialContent, onChange, onEditorReady }: BlogEditorProps) {
  const editor = useEditor({
    extensions: [StarterKit, TipTapLink.configure({ openOnClick: false })],
    content: toHtml(initialContent),
    onUpdate({ editor: ed }) {
      onChange(ed.getHTML());
    },
    onCreate({ editor: ed }) {
      onEditorReady(ed);
    },
    editorProps: {
      attributes: {
        class: "min-h-[220px] px-3 py-3 text-sm leading-relaxed text-zinc-100 focus:outline-none prose prose-invert prose-sm max-w-none",
      },
    },
  });

  return (
    <div className="mt-1 overflow-hidden rounded-xl border border-white/[0.12] bg-[#0e1015]">
      <div className="flex flex-wrap items-center gap-0.5 border-b border-white/[0.1] px-2 py-1.5">
        <ToolbarBtn active={editor?.isActive("bold")} onClick={() => editor?.chain().focus().toggleBold().run()}>
          <strong>B</strong>
        </ToolbarBtn>
        <ToolbarBtn active={editor?.isActive("italic")} onClick={() => editor?.chain().focus().toggleItalic().run()}>
          <em>I</em>
        </ToolbarBtn>
        <ToolbarBtn active={editor?.isActive("strike")} onClick={() => editor?.chain().focus().toggleStrike().run()}>
          <s>S</s>
        </ToolbarBtn>
        <span className="mx-1 h-4 w-px bg-white/10" />
        <ToolbarBtn
          active={editor?.isActive("heading", { level: 2 })}
          onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}
        >
          H2
        </ToolbarBtn>
        <ToolbarBtn
          active={editor?.isActive("heading", { level: 3 })}
          onClick={() => editor?.chain().focus().toggleHeading({ level: 3 }).run()}
        >
          H3
        </ToolbarBtn>
        <span className="mx-1 h-4 w-px bg-white/10" />
        <ToolbarBtn
          active={editor?.isActive("bulletList")}
          onClick={() => editor?.chain().focus().toggleBulletList().run()}
        >
          •—
        </ToolbarBtn>
        <ToolbarBtn
          active={editor?.isActive("orderedList")}
          onClick={() => editor?.chain().focus().toggleOrderedList().run()}
        >
          1.
        </ToolbarBtn>
        <span className="mx-1 h-4 w-px bg-white/10" />
        <ToolbarBtn
          active={editor?.isActive("link")}
          onClick={() => {
            if (editor?.isActive("link")) {
              editor.chain().focus().unsetLink().run();
            } else {
              const url = prompt("URL girin:");
              if (url) editor?.chain().focus().setLink({ href: url }).run();
            }
          }}
        >
          🔗
        </ToolbarBtn>
      </div>
      <EditorContent editor={editor} />
    </div>
  );
}

const COL = (
  <colgroup>
    <col className="w-[28%]" />
    <col className="w-[18%]" />
    <col className="w-[12%]" />
    <col className="w-[10%]" />
    <col className="w-[32%]" />
  </colgroup>
);

const emptyForm = {
  title: "",
  slug: "",
  content: "",
  excerpt: "",
  cover_image_url: "",
  content_image_url: "",
  category: "genel",
  seo_title: "",
  seo_description: "",
  keywords: "",
  read_time_minutes: 5,
};

export function AdminBlogPage() {
  const [posts, setPosts] = useState<PostRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [slugManual, setSlugManual] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [polishing, setPolishing] = useState(false);
  const [seoSuggesting, setSeoSuggesting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadingContent, setUploadingContent] = useState(false);
  const [modalErr, setModalErr] = useState<string | null>(null);
  const editorRef = useRef<Editor | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      const res = await fetch("/api/admin/blog", { credentials: "include" });
      const j = (await res.json()) as { posts?: PostRow[]; error?: string };
      if (!res.ok) {
        setErr(j.error ?? "Liste alınamadı");
        setPosts([]);
        return;
      }
      setPosts(j.posts ?? []);
    } catch {
      setErr("Ağ hatası");
      setPosts([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const openNew = () => {
    setEditingId(null);
    setForm(emptyForm);
    setSlugManual(false);
    setModalErr(null);
    setModalOpen(true);
  };

  const openEdit = (p: PostRow) => {
    setEditingId(p.id);
    setForm({
      title: p.title,
      slug: p.slug,
      content: p.content ?? "",
      excerpt: p.excerpt ?? "",
      cover_image_url: p.cover_image_url ?? "",
      content_image_url: (p as PostRow & { content_image_url?: string | null }).content_image_url ?? "",
      category: p.category || "genel",
      seo_title: p.seo_title ?? "",
      seo_description: p.seo_description ?? "",
      keywords: (p.tags ?? []).join(", "),
      read_time_minutes: p.read_time_minutes ?? 5,
    });
    setSlugManual(true);
    setModalErr(null);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setModalErr(null);
  };

  const onTitleChange = (title: string) => {
    setForm((f) => {
      const next = { ...f, title };
      if (!slugManual) {
        next.slug = generateSlug(title);
      }
      return next;
    });
  };

  const estimateRead = useMemo(() => {
    const text = form.content.replace(/<[^>]*>/g, " ");
    const words = text.trim().split(/\s+/).filter(Boolean).length;
    return Math.max(1, Math.min(120, Math.ceil(words / 200)));
  }, [form.content]);

  const buildPayload = (isPublished: boolean) => ({
    title: form.title.trim(),
    slug: form.slug.trim() || generateSlug(form.title),
    content: form.content,
    excerpt: form.excerpt.trim() || null,
    cover_image_url: form.cover_image_url.trim() || null,
    content_image_url: form.content_image_url.trim() || null,
    category: form.category,
    tags: form.keywords.trim() || null,
    is_published: isPublished,
    seo_title: form.seo_title.trim() || null,
    seo_description: form.seo_description.trim() || null,
    read_time_minutes: form.read_time_minutes || estimateRead,
  });

  const persist = async (isPublished: boolean) => {
    setSaving(true);
    setModalErr(null);
    try {
      const payload = buildPayload(isPublished);

      if (editingId) {
        const res = await fetch(`/api/admin/blog?id=${encodeURIComponent(editingId)}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ ...payload, id: editingId }),
        });
        const j = (await res.json()) as { error?: string };
        if (!res.ok) {
          setModalErr(j.error ?? "Kaydedilemedi");
          return;
        }
      } else {
        const res = await fetch("/api/admin/blog", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(payload),
        });
        const j = (await res.json()) as { error?: string };
        if (!res.ok) {
          setModalErr(j.error ?? "Oluşturulamadı");
          return;
        }
      }
      closeModal();
      await load();
    } catch {
      setModalErr("Ağ hatası");
    } finally {
      setSaving(false);
    }
  };

  const aiPolish = async () => {
    const raw = editorRef.current?.getText().trim() ?? form.content.replace(/<[^>]*>/g, " ").trim();
    if (!raw) {
      setModalErr("Önce bir metin yazın.");
      return;
    }
    setPolishing(true);
    setModalErr(null);
    try {
      const res = await fetch("/api/admin/blog/ai-polish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ text: raw }),
      });
      const j = (await res.json()) as { text?: string; error?: string };
      if (!res.ok) {
        setModalErr(j.error ?? "AI düzenleme başarısız");
        return;
      }
      if (j.text) {
        const html = j.text
          .split(/\n\n+/)
          .map((p: string) => `<p>${p.trim().replace(/\n/g, "<br>")}</p>`)
          .join("");
        setForm((f) => ({ ...f, content: html }));
        editorRef.current?.commands.setContent(html);
      }
    } catch {
      setModalErr("Ağ hatası");
    } finally {
      setPolishing(false);
    }
  };

  const aiSeo = async () => {
    const title = form.title.trim();
    if (!title) {
      setModalErr("Önce başlık yazın.");
      return;
    }
    setSeoSuggesting(true);
    setModalErr(null);
    try {
      const res = await fetch("/api/admin/blog/ai-seo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ title, content: form.content.replace(/<[^>]*>/g, " ") }),
      });
      const j = (await res.json()) as {
        seoTitle?: string;
        seoDescription?: string;
        keywords?: string;
        slug?: string;
        error?: string;
      };
      if (!res.ok) {
        setModalErr(j.error ?? "SEO önerisi alınamadı");
        return;
      }
      setForm((f) => ({
        ...f,
        seo_title: j.seoTitle ?? f.seo_title,
        seo_description: j.seoDescription ?? f.seo_description,
        keywords: j.keywords ?? f.keywords,
        slug: j.slug != null && j.slug !== "" ? j.slug : f.slug,
      }));
      setSlugManual(true);
    } catch {
      setModalErr("Ağ hatası");
    } finally {
      setSeoSuggesting(false);
    }
  };

  const remove = async (id: string) => {
    if (!confirm("Bu yazıyı silmek istediğinize emin misiniz?")) return;
    try {
      const res = await fetch(`/api/admin/blog?id=${encodeURIComponent(id)}`, { method: "DELETE", credentials: "include" });
      const j = (await res.json()) as { error?: string };
      if (!res.ok) {
        alert(j.error ?? "Silinemedi");
        return;
      }
      await load();
    } catch {
      alert("Ağ hatası");
    }
  };

  const uploadCover = async (file: File) => {
    setUploading(true);
    setModalErr(null);
    try {
      const fd = new FormData();
      fd.set("file", file);
      const res = await fetch("/api/admin/blog/upload-cover", { method: "POST", body: fd, credentials: "include" });
      const j = (await res.json()) as { url?: string; error?: string };
      if (!res.ok) {
        setModalErr(j.error ?? "Yükleme başarısız");
        return;
      }
      if (j.url) setForm((f) => ({ ...f, cover_image_url: j.url! }));
    } catch {
      setModalErr("Yükleme ağ hatası");
    } finally {
      setUploading(false);
    }
  };

  const uploadContentImage = async (file: File) => {
    setUploadingContent(true);
    setModalErr(null);
    try {
      const fd = new FormData();
      fd.set("file", file);
      const res = await fetch("/api/admin/blog/upload-cover", { method: "POST", body: fd, credentials: "include" });
      const j = (await res.json()) as { url?: string; error?: string };
      if (!res.ok) {
        setModalErr(j.error ?? "Yükleme başarısız");
        return;
      }
      if (j.url) {
        setForm((f) => ({ ...f, content_image_url: j.url! }));
        editorRef.current?.chain().focus().insertContent("[içerik-görseli]").run();
      }
    } catch {
      setModalErr("Yükleme ağ hatası");
    } finally {
      setUploadingContent(false);
    }
  };

  return (
    <div className="space-y-8 pb-10">
      <div className="rounded-2xl border border-white/[0.14] bg-gradient-to-br from-[#14161d] via-[#0e1015] to-[#08090c] p-6 shadow-[0_1px_0_rgba(255,255,255,0.06)_inset] sm:p-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="font-display text-2xl font-semibold tracking-tight text-zinc-50 sm:text-3xl">Blog / Günlük</h1>
            <p className="mt-2 max-w-2xl text-sm text-zinc-400">Yazıları yönetin; yayınlandığında /gunluk sayfasında görünür.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" className={ADMIN_PRIMARY_BUTTON_CLASS} onClick={() => void load()} disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              Yenile
            </button>
            <button type="button" className={ADMIN_PRIMARY_BUTTON_CLASS} onClick={openNew}>
              <Plus className="h-4 w-4" />
              Yeni yazı
            </button>
          </div>
        </div>
        {err ? <div className="mt-4 rounded-lg border border-rose-500/25 bg-rose-500/[0.06] px-3 py-2 text-sm text-rose-200">{err}</div> : null}
      </div>

      <section className="rounded-2xl border border-white/[0.09] bg-gradient-to-br from-[#10121a]/95 via-[#0a0b0f] to-[#060708] p-5 sm:p-6">
        {loading && posts.length === 0 ? (
          <div className="flex items-center gap-2 py-12 text-sm text-zinc-500">
            <Loader2 className="h-5 w-5 animate-spin text-[#b8956f]" />
            Yükleniyor…
          </div>
        ) : (
          <FinanceScrollTable
            minWidthPx={720}
            colgroup={COL}
            bodyMaxHeightClass="max-h-[520px]"
            headerCells={
              <>
                <th className={`${FINANCE_TH} text-left`}>Başlık</th>
                <th className={`${FINANCE_TH} text-left`}>Slug</th>
                <th className={`${FINANCE_TH} text-left`}>Kategori</th>
                <th className={`${FINANCE_TH} text-left`}>Durum</th>
                <th className={`${FINANCE_TH} text-right`}>İşlem</th>
              </>
            }
            bodyRows={
              <>
                {posts.map((p) => (
                  <tr key={p.id} className="text-zinc-200">
                    <td className="max-w-[220px] truncate px-3.5 py-2.5 text-sm font-medium text-zinc-100" title={p.title}>
                      {p.title}
                    </td>
                    <td className="max-w-[140px] truncate px-3.5 py-2.5 font-mono text-xs text-zinc-500">{p.slug}</td>
                    <td className="px-3.5 py-2.5 text-sm text-zinc-400">{p.category}</td>
                    <td className="px-3.5 py-2.5 text-sm">
                      {p.is_published ? (
                        <span className="rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-emerald-200">Yayında</span>
                      ) : (
                        <span className="rounded-md border border-zinc-600/40 bg-zinc-500/10 px-2 py-0.5 text-zinc-400">Taslak</span>
                      )}
                    </td>
                    <td className="px-3.5 py-2.5 text-right">
                      <div className="flex justify-end gap-2">
                        <button type="button" className={SECONDARY_BTN} onClick={() => openEdit(p)}>
                          <Pencil className="h-3.5 w-3.5" />
                          Düzenle
                        </button>
                        <button type="button" className={DANGER_BTN} onClick={() => void remove(p.id)}>
                          <Trash2 className="h-3.5 w-3.5" />
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

      {modalOpen ? (
        <div className="fixed inset-0 z-[100] flex items-start justify-center overflow-y-auto bg-black/70 p-4 backdrop-blur-sm" role="dialog" aria-modal="true">
          <div className="my-8 w-full max-w-2xl rounded-2xl border border-white/[0.12] bg-gradient-to-br from-[#14161d] via-[#0e1015] to-[#08090c] p-6 shadow-2xl">
            <h2 className="font-display text-lg font-semibold text-zinc-50">{editingId ? "Yazıyı düzenle" : "Yeni yazı"}</h2>

            <div className="mt-4 max-h-[min(70vh,640px)] space-y-4 overflow-y-auto pr-1">
              <label className="block text-xs font-medium text-zinc-500">
                Başlık *
                <input
                  value={form.title}
                  onChange={(e) => onTitleChange(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-white/[0.12] bg-[#0e1015] px-3 py-2.5 text-sm text-zinc-100"
                />
              </label>
              <label className="block text-xs font-medium text-zinc-500">
                Slug
                <input
                  value={form.slug}
                  onChange={(e) => {
                    setSlugManual(true);
                    setForm((f) => ({ ...f, slug: e.target.value }));
                  }}
                  className="mt-1 w-full rounded-xl border border-white/[0.12] bg-[#0e1015] px-3 py-2.5 font-mono text-sm text-zinc-100"
                />
                <button
                  type="button"
                  className="mt-1 text-[11px] text-[#c9a88a] hover:underline"
                  onClick={() => {
                    setSlugManual(false);
                    setForm((f) => ({ ...f, slug: generateSlug(f.title) }));
                  }}
                >
                  Başlıktan yeniden üret
                </button>
              </label>

              <div>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs font-medium text-zinc-500">İçerik</span>
                  <button
                    type="button"
                    className={SECONDARY_BTN}
                    disabled={polishing || saving}
                    onClick={() => void aiPolish()}
                  >
                    {polishing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                    AI ile Düzenle
                  </button>
                </div>
                <BlogEditor
                  key={editingId ?? "new-post"}
                  initialContent={form.content}
                  onChange={(html) => setForm((f) => ({ ...f, content: html }))}
                  onEditorReady={(ed) => { editorRef.current = ed; }}
                />
              </div>

              <label className="block text-xs font-medium text-zinc-500">
                Özet (liste ve SEO yedeği)
                <textarea
                  value={form.excerpt}
                  onChange={(e) => setForm((f) => ({ ...f, excerpt: e.target.value }))}
                  rows={2}
                  className="mt-1 w-full rounded-xl border border-white/[0.12] bg-[#0e1015] px-3 py-2.5 text-sm text-zinc-100"
                />
              </label>

              <div className="rounded-xl border border-white/[0.08] bg-black/20 p-3">
                <p className="text-xs font-medium text-zinc-500">Kapak görseli (R2)</p>
                <div className="mt-2 flex flex-wrap items-center gap-3">
                  <label className={SECONDARY_BTN + " cursor-pointer"}>
                    <Upload className="h-4 w-4" />
                    {uploading ? "Yükleniyor…" : "Yükle"}
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/gif"
                      className="hidden"
                      disabled={uploading}
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) void uploadCover(f);
                        e.target.value = "";
                      }}
                    />
                  </label>
                </div>
                <input
                  value={form.cover_image_url}
                  onChange={(e) => setForm((f) => ({ ...f, cover_image_url: e.target.value }))}
                  placeholder="https://..."
                  className="mt-2 w-full rounded-lg border border-white/[0.1] bg-[#0e1015] px-3 py-2 text-xs text-zinc-300"
                />
              </div>

              <div className="rounded-xl border border-white/[0.08] bg-black/20 p-3">
                <p className="text-xs font-medium text-zinc-500">İçerik görseli (R2)</p>
                <p className="mt-0.5 text-[10px] text-zinc-600">
                  Yükleme sonrası editördeki imleç pozisyonuna <span className="font-mono text-zinc-500">[içerik-görseli]</span> eklenir.
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-3">
                  <label className={SECONDARY_BTN + " cursor-pointer"}>
                    <Upload className="h-4 w-4" />
                    {uploadingContent ? "Yükleniyor…" : "Yükle"}
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/gif"
                      className="hidden"
                      disabled={uploadingContent}
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) void uploadContentImage(f);
                        e.target.value = "";
                      }}
                    />
                  </label>
                </div>
                <input
                  value={form.content_image_url}
                  onChange={(e) => setForm((f) => ({ ...f, content_image_url: e.target.value }))}
                  placeholder="https://..."
                  className="mt-2 w-full rounded-lg border border-white/[0.1] bg-[#0e1015] px-3 py-2 text-xs text-zinc-300"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block text-xs font-medium text-zinc-500">
                  Kategori
                  <select
                    value={form.category}
                    onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                    className="mt-1 w-full rounded-xl border border-white/[0.12] bg-[#0e1015] px-3 py-2.5 text-sm text-zinc-100"
                  >
                    <option value="genel">Genel</option>
                    {BLOG_CATEGORIES.map((c) => (
                      <option key={c.value} value={c.value}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block text-xs font-medium text-zinc-500">
                  Okuma süresi (dk)
                  <input
                    type="number"
                    min={1}
                    value={form.read_time_minutes}
                    onChange={(e) => setForm((f) => ({ ...f, read_time_minutes: Number(e.target.value) || 1 }))}
                    className="mt-1 w-full rounded-xl border border-white/[0.12] bg-[#0e1015] px-3 py-2.5 text-sm text-zinc-100"
                  />
                  <p className="mt-1 text-[10px] text-zinc-600">Tahmini (içerikten): {estimateRead} dk</p>
                </label>
              </div>

              <div className="rounded-xl border border-white/[0.08] bg-black/20 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs font-medium text-zinc-500">SEO</span>
                  <button
                    type="button"
                    className={SECONDARY_BTN}
                    disabled={seoSuggesting || saving || !form.title.trim()}
                    onClick={() => void aiSeo()}
                  >
                    {seoSuggesting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Search className="h-3.5 w-3.5" />}
                    SEO Öner
                  </button>
                </div>
                <p className="mt-1 text-[10px] text-zinc-600">Başlık ve içeriğe göre meta başlık, açıklama, anahtar kelime ve slug önerisi.</p>
              </div>

              <label className="block text-xs font-medium text-zinc-500">
                SEO başlık
                <input
                  value={form.seo_title}
                  onChange={(e) => setForm((f) => ({ ...f, seo_title: e.target.value }))}
                  className="mt-1 w-full rounded-xl border border-white/[0.12] bg-[#0e1015] px-3 py-2.5 text-sm text-zinc-100"
                />
              </label>
              <label className="block text-xs font-medium text-zinc-500">
                SEO açıklama
                <textarea
                  value={form.seo_description}
                  onChange={(e) => setForm((f) => ({ ...f, seo_description: e.target.value }))}
                  rows={2}
                  className="mt-1 w-full rounded-xl border border-white/[0.12] bg-[#0e1015] px-3 py-2.5 text-sm text-zinc-100"
                />
              </label>
              <label className="block text-xs font-medium text-zinc-500">
                Anahtar kelimeler (virgülle; kayıtta etiket olarak saklanır)
                <input
                  value={form.keywords}
                  onChange={(e) => setForm((f) => ({ ...f, keywords: e.target.value }))}
                  className="mt-1 w-full rounded-xl border border-white/[0.12] bg-[#0e1015] px-3 py-2.5 text-sm text-zinc-100"
                  placeholder="ör. mücevher tasarımı, vitrin, altın"
                />
              </label>
            </div>

            {modalErr ? <div className="mt-4 rounded-lg border border-rose-500/25 bg-rose-500/[0.06] px-3 py-2 text-sm text-rose-200">{modalErr}</div> : null}

            <div className="mt-6 flex flex-wrap gap-2">
              <button
                type="button"
                className={ADMIN_PRIMARY_BUTTON_CLASS}
                disabled={saving || !form.title.trim()}
                onClick={() => void persist(true)}
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Yayınla
              </button>
              <button
                type="button"
                className={SECONDARY_BTN}
                disabled={saving || !form.title.trim()}
                onClick={() => void persist(false)}
              >
                Taslak kaydet
              </button>
              <button type="button" className={SECONDARY_BTN} onClick={closeModal}>
                İptal
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
