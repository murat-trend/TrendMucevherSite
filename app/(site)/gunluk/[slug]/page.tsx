import { notFound } from "next/navigation";
import { blogCategoryLabel } from "@/lib/blog/categories";
import { fetchOtherPublishedPosts, fetchPublishedPostBySlug } from "@/lib/blog/queries";
import { GunlukDetayClient } from "./GunlukDetayClient";

type Props = { params: Promise<{ slug: string }> };

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
  if (!post) return { title: "Yazı bulunamadı" };

  const title = post.seo_title?.trim() || post.title_en?.trim() || post.title;
  const description =
    post.seo_description?.trim() ||
    post.excerpt_en?.trim() ||
    post.excerpt?.trim() ||
    `${post.title} — Günlük`;
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

export default async function GunlukSlugPage({ params }: Props) {
  const { slug } = await params;
  const post = await fetchPublishedPostBySlug(slug);
  if (!post) notFound();

  const related = await fetchOtherPublishedPosts(post.slug, post.category, 4);
  const categoryLabel = blogCategoryLabel(post.category);

  return (
    <GunlukDetayClient
      post={post}
      related={related}
      categoryLabel={categoryLabel}
    />
  );
}
