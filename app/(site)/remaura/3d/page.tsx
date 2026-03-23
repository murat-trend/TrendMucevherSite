import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Remaura AI 3D",
  description: "Remaura AI 3D kategorisi. 3D odakli araclar yakinda bu alanda yayinlanacak.",
  alternates: {
    canonical: "/remaura/3d",
  },
};

export default function Remaura3DPage() {
  return (
    <section className="mx-auto w-full max-w-4xl px-4 py-14 sm:px-6">
      <h1 className="text-2xl font-semibold text-foreground sm:text-3xl">Remaura AI 3D</h1>
      <p className="mt-3 text-sm text-muted sm:text-base">
        Bu kategori olusturuldu. 3D ozellikler bu sayfada yayina alinacak.
      </p>
      <div className="mt-6">
        <Link
          href="/remaura"
          className="inline-flex min-h-11 items-center rounded-lg border border-[#b76e79]/70 bg-[#b76e79]/15 px-4 py-2 text-sm font-semibold text-[#b76e79] transition-colors hover:bg-[#b76e79]/20"
        >
          Remaura AI Ana Sayfasina Don
        </Link>
      </div>
    </section>
  );
}

