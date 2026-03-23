import { UrunlerSearchWithAnalytics } from "@/components/site/UrunlerSearchWithAnalytics";

export default function UrunlerPage() {
  return (
    <main className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <h1 className="font-display text-3xl font-semibold tracking-tight text-[var(--foreground)]">Ürünler</h1>
      <p className="mt-2 text-sm text-[var(--muted)]">Arama yaptığınızda eşleşme yoksa sorgu analitik için kaydedilir.</p>
      <div className="mt-8">
        <UrunlerSearchWithAnalytics />
      </div>
    </main>
  );
}