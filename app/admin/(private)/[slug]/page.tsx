import { notFound } from "next/navigation";
import { ADMIN_NAV } from "@/components/admin/admin-nav";

const SLUGS = new Set(ADMIN_NAV.filter((i) => i.id !== "dashboard").map((i) => i.id));

type Props = { params: Promise<{ slug: string }> };

export default async function AdminSectionPage({ params }: Props) {
  const { slug } = await params;
  if (!SLUGS.has(slug)) notFound();

  const item = ADMIN_NAV.find((i) => i.id === slug);
  if (!item) notFound();

  return (
    <div className="rounded-2xl border border-white/[0.14] bg-gradient-to-br from-[#14161d] via-[#0e1015] to-[#08090c] p-10 shadow-[0_1px_0_rgba(255,255,255,0.06)_inset,0_24px_48px_-24px_rgba(0,0,0,0.55)] sm:p-12">
      <h1 className="font-display text-3xl font-semibold tracking-[-0.02em] text-zinc-50">{item.labelTr}</h1>
      <p className="mt-4 text-base leading-relaxed text-zinc-400">
        {item.labelEn} — içerik yakında.
      </p>
    </div>
  );
}
