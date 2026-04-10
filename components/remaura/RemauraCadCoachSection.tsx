import dynamic from "next/dynamic";

export const RemauraCadCoachSection = dynamic(
  () => import("@/lib/remaura/cad/CadCoach").then((mod) => mod.CadCoach),
  {
    ssr: true,
    loading: () => (
      <div className="flex min-h-[50vh] items-center justify-center rounded-2xl border border-white/10 bg-[#090b10] text-sm text-zinc-400">
        Yükleniyor…
      </div>
    ),
  }
);
