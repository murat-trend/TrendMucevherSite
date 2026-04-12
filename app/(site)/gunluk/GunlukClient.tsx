"use client";

import Image from "next/image";
import Link from "next/link";
import { useLanguage } from "@/components/i18n/LanguageProvider";
import { BLOG_CATEGORIES } from "@/lib/blog/categories";
import type { PostRow } from "@/lib/blog/types";
import type { Locale } from "@/lib/i18n/translations";

const LOCALE_TAG: Record<Locale, string> = {
  tr: "tr-TR",
  en: "en-US",
  de: "de-DE",
  ru: "ru-RU",
};

const CATEGORY_VALUE_TO_KEY = {
  tasarim: "design",
  sektor: "sector",
  kisisel: "personal",
  haberler: "news",
} as const;

type CategoryKey = (typeof CATEGORY_VALUE_TO_KEY)[keyof typeof CATEGORY_VALUE_TO_KEY];

function formatDate(iso: string | null | undefined, locale: Locale): string {
  if (!iso) return "";
  try {
    return new Intl.DateTimeFormat(LOCALE_TAG[locale], { day: "numeric", month: "long", year: "numeric" }).format(new Date(iso));
  } catch {
    return iso.slice(0, 10);
  }
}

function postCategoryLabel(
  category: string | null | undefined,
  cats: {
    design: string;
    sector: string;
    personal: string;
    news: string;
    general: string;
  },
): string {
  if (!category) return cats.general;
  const key = CATEGORY_VALUE_TO_KEY[category as keyof typeof CATEGORY_VALUE_TO_KEY];
  if (key) return cats[key as CategoryKey];
  return category.charAt(0).toUpperCase() + category.slice(1);
}

function PostCard({ post }: { post: PostRow }) {
  const { t, locale } = useLanguage();
  const g = t.gunluk;
  const href = `/gunluk/${post.slug}`;
  const date = post.published_at || post.created_at;
  return (
    <article className="group flex flex-col overflow-hidden rounded-2xl border border-white/[0.1] bg-gradient-to-br from-[#12141a]/95 via-[#0c0d11] to-[#08090c] shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] transition-colors hover:border-[#c69575]/35">
      <Link href={href} className="relative aspect-[16/9] w-full overflow-hidden bg-black/40">
        {post.cover_image_url ? (
          post.cover_image_url.startsWith("http") ? (
            // eslint-disable-next-line @next/next/no-img-element -- harici R2 URL
            <img
              src={post.cover_image_url}
              alt=""
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
            />
          ) : (
            <Image src={post.cover_image_url} alt="" fill className="object-cover transition-transform duration-300 group-hover:scale-[1.02]" sizes="(max-width:768px) 100vw, 33vw" />
          )
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[#1a1510] to-[#0a0a0a] text-sm text-zinc-600">{g.noCover}</div>
        )}
      </Link>
      <div className="flex flex-1 flex-col p-5">
        <div className="flex flex-wrap items-center gap-2 text-[11px] font-medium uppercase tracking-wider text-zinc-500">
          <span className="rounded-md border border-white/[0.08] bg-white/[0.04] px-2 py-0.5 text-[#c9a88a]">
            {postCategoryLabel(post.category, g.categories)}
          </span>
          <span>{formatDate(date, locale)}</span>
          <span className="tabular-nums text-zinc-600">
            {post.read_time_minutes ?? 5} {g.minRead}
          </span>
        </div>
        <Link href={href} className="mt-3 block">
          <h2 className="font-display text-lg font-semibold tracking-tight text-zinc-50 transition-colors group-hover:text-[#e4d0bf]">{post.title}</h2>
        </Link>
        {post.excerpt ? <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-zinc-400">{post.excerpt}</p> : null}
        <Link href={href} className="mt-4 inline-flex text-sm font-medium text-[#c9a88a] hover:text-[#e4d0bf]">
          {g.readMore} →
        </Link>
      </div>
    </article>
  );
}

export default function GunlukClient({ posts, activeCategory }: { posts: PostRow[]; activeCategory?: string }) {
  const { t } = useLanguage();
  const g = t.gunluk;
  const cat = activeCategory;

  return (
    <main className="min-h-screen bg-[#07080a] px-4 py-12 text-zinc-200 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <header className="border-b border-white/[0.08] pb-10">
          <h1 className="font-display text-3xl font-semibold tracking-tight text-zinc-50 sm:text-4xl">{g.title}</h1>
          <p className="mt-3 max-w-2xl text-base leading-relaxed text-zinc-400">{g.subtitle}</p>
          <nav className="mt-8 flex flex-wrap gap-2" aria-label={g.categoriesLabel}>
            <Link
              href="/gunluk"
              className={`rounded-full border px-4 py-2 text-sm font-medium transition-colors ${
                !cat ? "border-[#c69575]/45 bg-[#c69575]/12 text-[#f0dcc8]" : "border-white/[0.1] text-zinc-400 hover:border-white/[0.18] hover:text-zinc-200"
              }`}
            >
              {g.categories.all}
            </Link>
            {BLOG_CATEGORIES.map((c) => {
              const key = CATEGORY_VALUE_TO_KEY[c.value];
              const label = g.categories[key];
              return (
                <Link
                  key={c.value}
                  href={`/gunluk?category=${c.value}`}
                  className={`rounded-full border px-4 py-2 text-sm font-medium transition-colors ${
                    cat === c.value
                      ? "border-[#c69575]/45 bg-[#c69575]/12 text-[#f0dcc8]"
                      : "border-white/[0.1] text-zinc-400 hover:border-white/[0.18] hover:text-zinc-200"
                  }`}
                >
                  {label}
                </Link>
              );
            })}
          </nav>
        </header>

        {posts.length === 0 ? (
          <div className="mx-auto mt-16 max-w-lg rounded-2xl border border-dashed border-white/[0.14] bg-gradient-to-b from-white/[0.04] via-[#0a0b0f] to-[#060708] px-8 py-14 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
            <p className="font-display text-xl font-medium text-zinc-100">{g.empty}</p>
            <p className="mt-4 text-sm leading-relaxed text-zinc-500">{g.emptySubtext}</p>
          </div>
        ) : (
          <ul className="mt-12 grid gap-8 sm:grid-cols-2 xl:grid-cols-3">
            {posts.map((post) => (
              <li key={post.id}>
                <PostCard post={post} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}
