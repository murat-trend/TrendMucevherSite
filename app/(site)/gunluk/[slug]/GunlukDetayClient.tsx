"use client";

import Image from "next/image";
import Link from "next/link";
import { Fragment } from "react";
import { useLanguage } from "@/components/i18n/LanguageProvider";
import { pickLocalizedPostText } from "@/lib/blog/post-translations-anthropic";
import type { PostRow } from "@/lib/blog/types";
import type { Locale } from "@/lib/i18n/translations";

const LOCALE_TAG: Record<Locale, string> = {
  tr: "tr-TR",
  en: "en-US",
  de: "de-DE",
  ru: "ru-RU",
};

function formatDate(iso: string | null | undefined, locale: Locale): string {
  if (!iso) return "";
  try {
    return new Intl.DateTimeFormat(LOCALE_TAG[locale], {
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(new Date(iso));
  } catch {
    return iso.slice(0, 10);
  }
}

const DETAIL_COPY: Record<Locale, { back: string; minRead: string; otherPosts: string }> = {
  tr: { back: "← Günlük",        minRead: "dk okuma",  otherPosts: "Diğer yazılar" },
  en: { back: "← Journal",       minRead: "min read",  otherPosts: "More posts"    },
  de: { back: "← Tagebuch",      minRead: "Min. Lesen",otherPosts: "Weitere Beiträge" },
  ru: { back: "← Журнал",        minRead: "мин чтения",otherPosts: "Другие записи" },
};

function RelatedCard({ post, locale }: { post: PostRow; locale: Locale }) {
  const { title, excerpt } = pickLocalizedPostText(locale, post.translations, post);
  return (
    <Link
      href={`/gunluk/${post.slug}`}
      className="group block rounded-xl border border-white/[0.08] bg-[#0c0d11] p-4 transition-colors hover:border-[#c69575]/30"
    >
      <h3 className="font-medium text-zinc-100 group-hover:text-[#e4d0bf]">{title}</h3>
      {excerpt ? <p className="mt-1 line-clamp-2 text-xs text-zinc-500">{excerpt}</p> : null}
    </Link>
  );
}

const CONTENT_PLACEHOLDER = "[içerik-görseli]";

function renderContent(content: string, contentImageUrl: string | null) {
  if (!content) return null;
  if (!contentImageUrl || !content.includes(CONTENT_PLACEHOLDER)) {
    return <div className="whitespace-pre-wrap text-base leading-relaxed text-zinc-300">{content}</div>;
  }
  const parts = content.split(CONTENT_PLACEHOLDER);
  return (
    <div className="space-y-6 text-base leading-relaxed text-zinc-300">
      {parts.map((part, i) => (
        <Fragment key={i}>
          {part ? <div className="whitespace-pre-wrap">{part}</div> : null}
          {i < parts.length - 1 ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={contentImageUrl}
              alt=""
              className="w-full rounded-lg"
            />
          ) : null}
        </Fragment>
      ))}
    </div>
  );
}

type Props = {
  post: PostRow;
  related: PostRow[];
  categoryLabel: string;
};

export function GunlukDetayClient({ post, related, categoryLabel }: Props) {
  const { locale } = useLanguage();
  const copy = DETAIL_COPY[locale as Locale] ?? DETAIL_COPY.tr;
  const { title, content, excerpt } = pickLocalizedPostText(locale, post.translations, post);
  const date = post.published_at || post.created_at;
  const contentImageUrl = (post as PostRow & { content_image_url?: string | null }).content_image_url ?? null;

  return (
    <main className="min-h-screen bg-[#07080a] px-4 py-10 text-zinc-200 sm:px-6 lg:px-8">
      <article className="mx-auto max-w-3xl">
        <nav className="text-sm text-zinc-500">
          <Link href="/gunluk" className="text-[#c9a88a] hover:text-[#e4d0bf]">
            {copy.back}
          </Link>
        </nav>

        <header className="mt-6 border-b border-white/[0.08] pb-10">
          <p className="text-xs font-semibold uppercase tracking-wider text-[#c9a88a]">{categoryLabel}</p>
          <h1 className="mt-3 font-display text-3xl font-semibold tracking-tight text-zinc-50 sm:text-4xl">
            {title}
          </h1>
          <div className="mt-4 flex flex-wrap gap-3 text-sm text-zinc-500">
            <time dateTime={date}>{formatDate(date, locale as Locale)}</time>
            <span aria-hidden>·</span>
            <span className="tabular-nums">
              {post.read_time_minutes ?? 5} {copy.minRead}
            </span>
          </div>
          {post.cover_image_url ? (
            <div className="relative mt-8 aspect-[2/1] w-full overflow-hidden rounded-2xl border border-white/[0.08] bg-black/40">
              {post.cover_image_url.startsWith("http") ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={post.cover_image_url} alt="" className="h-full w-full object-cover" />
              ) : (
                <Image
                  src={post.cover_image_url}
                  alt=""
                  fill
                  className="object-cover"
                  priority
                  sizes="(max-width:768px) 100vw, 768px"
                />
              )}
            </div>
          ) : null}
          {excerpt ? <p className="mt-8 text-lg leading-relaxed text-zinc-400">{excerpt}</p> : null}
        </header>

        <div className="py-10">
          {content ? (
            renderContent(content, contentImageUrl)
          ) : (
            <p className="text-sm text-zinc-500">
              {locale === "en" ? "No content yet." : locale === "de" ? "Noch kein Inhalt." : locale === "ru" ? "Содержимое пока не добавлено." : "Bu yazının metni henüz eklenmedi."}
            </p>
          )}
        </div>

        {related.length > 0 ? (
          <section className="border-t border-white/[0.08] py-12">
            <h2 className="font-display text-lg font-semibold text-zinc-100">{copy.otherPosts}</h2>
            <ul className="mt-4 grid gap-3 sm:grid-cols-2">
              {related.map((p) => (
                <li key={p.id}>
                  <RelatedCard post={p} locale={locale as Locale} />
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </article>
    </main>
  );
}
