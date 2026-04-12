import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { blogCategoryLabel } from "@/lib/blog/categories";
import { fetchOtherPublishedPosts, fetchPublishedPostBySlug } from "@/lib/blog/queries";
import type { PostRow } from "@/lib/blog/types";

type Props = { params: Promise<{ slug: string }> };

function formatDate(iso: string | null | undefined): string {
  if (!iso) return "";
  try {
    return new Intl.DateTimeFormat("tr-TR", { day: "numeric", month: "long", year: "numeric" }).format(new Date(iso));
  } catch {
    return iso.slice(0, 10);
  }
}

function absUrl(pathOrUrl: string | null | undefined): string | undefined {
  if (!pathOrUrl) return undefined;
  if (pathOrUrl.startsWith("http")) return pathOrUrl;
  const base = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") || "";
  if (!base) return undefined;
  return `${base}${pathOrUrl.startsWith("/") ? pathOrUrl : `/${pathOrUrl}`}`;
}

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const post = await fetchPublishedPostBySlug(slug);
  if (!post) {
    return { title: "Yazı bulunamadı" };
  }
  const title = post.seo_title?.trim() || post.title;
  const description = post.seo_description?.trim() || post.excerpt?.trim() || `${post.title} — Günlük`;
  const og = absUrl(post.cover_image_url);
  return {
    title: `${title} | Günlük`,
    description,
    openGraph: {
      title,
      description,
      type: "article",
      publishedTime: post.published_at ?? undefined,
      images: og ? [{ url: og }] : undefined,
    },
    twitter: {
      card: og ? "summary_large_image" : "summary",
      title,
      description,
      images: og ? [og] : undefined,
    },
  };
}

function RelatedCard({ p }: { p: PostRow }) {
  return (
    <Link
      href={`/gunluk/${p.slug}`}
      className="group block rounded-xl border border-white/[0.08] bg-[#0c0d11] p-4 transition-colors hover:border-[#c69575]/30"
    >
      <h3 className="font-medium text-zinc-100 group-hover:text-[#e4d0bf]">{p.title}</h3>
      {p.excerpt ? <p className="mt-1 line-clamp-2 text-xs text-zinc-500">{p.excerpt}</p> : null}
    </Link>
  );
}

export default async function GunlukSlugPage({ params }: Props) {
  const { slug } = await params;
  const post = await fetchPublishedPostBySlug(slug);
  if (!post) notFound();

  const related = await fetchOtherPublishedPosts(post.slug, post.category, 4);
  const date = post.published_at || post.created_at;
  const bodyText = post.content?.trim() ?? "";

  return (
    <main className="min-h-screen bg-[#07080a] px-4 py-10 text-zinc-200 sm:px-6 lg:px-8">
      <article className="mx-auto max-w-3xl">
        <nav className="text-sm text-zinc-500">
          <Link href="/gunluk" className="text-[#c9a88a] hover:text-[#e4d0bf]">
            ← Günlük
          </Link>
        </nav>

        <header className="mt-6 border-b border-white/[0.08] pb-10">
          <p className="text-xs font-semibold uppercase tracking-wider text-[#c9a88a]">{blogCategoryLabel(post.category)}</p>
          <h1 className="mt-3 font-display text-3xl font-semibold tracking-tight text-zinc-50 sm:text-4xl">{post.title}</h1>
          <div className="mt-4 flex flex-wrap gap-3 text-sm text-zinc-500">
            <time dateTime={date}>{formatDate(date)}</time>
            <span aria-hidden>·</span>
            <span className="tabular-nums">{post.read_time_minutes ?? 5} dk okuma</span>
          </div>
          {post.cover_image_url ? (
            <div className="relative mt-8 aspect-[2/1] w-full overflow-hidden rounded-2xl border border-white/[0.08] bg-black/40">
              {post.cover_image_url.startsWith("http") ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={post.cover_image_url} alt="" className="h-full w-full object-cover" />
              ) : (
                <Image src={post.cover_image_url} alt="" fill className="object-cover" priority sizes="(max-width:768px) 100vw, 768px" />
              )}
            </div>
          ) : null}
          {post.excerpt ? <p className="mt-8 text-lg leading-relaxed text-zinc-400">{post.excerpt}</p> : null}
        </header>

        <div className="py-10">
          {bodyText ? (
            <div className="whitespace-pre-wrap text-base leading-relaxed text-zinc-300">{bodyText}</div>
          ) : (
            <p className="text-sm text-zinc-500">Bu yazının metni henüz eklenmedi.</p>
          )}
        </div>

        {related.length > 0 ? (
          <section className="border-t border-white/[0.08] py-12">
            <h2 className="font-display text-lg font-semibold text-zinc-100">Diğer yazılar</h2>
            <ul className="mt-4 grid gap-3 sm:grid-cols-2">
              {related.map((p) => (
                <li key={p.id}>
                  <RelatedCard p={p} />
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </article>
    </main>
  );
}
