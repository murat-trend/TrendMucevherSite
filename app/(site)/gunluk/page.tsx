import { fetchPublishedPosts } from "@/lib/blog/queries";
import GunlukClient from "./GunlukClient";

export const metadata = {
  title: "Günlük | Trend Mücevher",
  description: "Tasarım, sektör ve haberler — günlük yazılar.",
};

type Search = { category?: string };

export default async function GunlukPage({ searchParams }: { searchParams: Promise<Search> }) {
  const sp = await searchParams;
  const cat = sp.category?.trim() || undefined;
  const posts = await fetchPublishedPosts(cat);
  return <GunlukClient posts={posts} activeCategory={cat} />;
}
