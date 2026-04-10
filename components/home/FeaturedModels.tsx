import { createClient } from "@/utils/supabase/server";
import { cookies } from "next/headers";
import Link from "next/link";

export async function FeaturedModels() {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const { data } = await supabase
    .from("products_3d")
    .select("id, name, slug, thumbnail_url, personal_price, jewelry_type")
    .eq("is_published", true)
    .order("created_at", { ascending: false })
    .limit(6);

  const models = data ?? [];

  return (
    <section className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6">
      <div className="mb-8 flex items-end justify-between">
        <div>
          <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-[#c9a84c]">Remaura Store</p>
          <h2 className="font-display text-3xl font-light tracking-wide text-foreground">Öne Çıkan Modeller</h2>
        </div>
        <Link href="/modeller" className="text-sm text-[#c9a84c] hover:underline">
          Tümünü Gör →
        </Link>
      </div>
      {models.length === 0 ? (
        <p className="text-sm text-muted">Henüz yayınlanmış model yok.</p>
      ) : (
        <div className="grid grid-cols-1 items-stretch gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {models.map((model) => (
            <Link
              key={model.id}
              href={`/modeller/${model.slug}`}
              className="group flex h-full min-h-0 min-w-0 flex-col overflow-hidden rounded-xl border border-border/40 bg-surface transition-colors hover:border-[#c9a84c]/40"
            >
              <div className="aspect-square shrink-0 overflow-hidden bg-black/20">
                {model.thumbnail_url ? (
                  <img
                    src={model.thumbnail_url}
                    alt={model.name}
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-xs text-muted/40">Görsel yok</div>
                )}
              </div>
              <div className="flex flex-1 flex-col p-4">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-muted">{model.jewelry_type}</p>
                <p className="mt-1 font-medium text-foreground">{model.name}</p>
                <p className="mt-auto pt-2 text-sm text-[#c9a84c]">₺{model.personal_price?.toLocaleString("tr-TR")}</p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
