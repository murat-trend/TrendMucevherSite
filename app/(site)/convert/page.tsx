"use client";

import { useMemo, useState } from "react";
import { useLanguage } from "@/components/i18n/LanguageProvider";
import { createClient } from "@/utils/supabase/client";
import {
  RemauraBillingModalProvider,
  remauraHandleBillingApiResponse,
  useRemauraBillingModal,
} from "@/components/remaura/RemauraBillingModalProvider";
import { useRemauraCreditsCheck } from "@/hooks/useRemauraCreditsCheck";

type ConvertResponse = {
  originalSize: number;
  outputs: {
    draco: { url: string; size: number; label: string } | null;
    stlZip: { url: string; size: number; label: string } | null;
  };
};

function bytesToMb(size: number): string {
  return `${(size / (1024 * 1024)).toFixed(2)} MB`;
}

export default function ConvertPage() {
  return (
    <RemauraBillingModalProvider>
      <ConvertPageInner />
    </RemauraBillingModalProvider>
  );
}

function ConvertPageInner() {
  const { t } = useLanguage();
  const c = t.convert;
  const billingUi = useRemauraBillingModal();
  const { checkCredits } = useRemauraCreditsCheck();
  const [file, setFile] = useState<File | null>(null);
  const [draco, setDraco] = useState(true);
  const [stlZip, setStlZip] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ConvertResponse | null>(null);
  const canSubmit = !!file && (draco || stlZip) && !loading;

  const rows = useMemo(() => {
    if (!result) return [];
    const list: { label: string; size: number; ratio: string }[] = [
      { label: c.originalGlb, size: result.originalSize, ratio: "-" },
    ];
    if (result.outputs.draco) {
      const ratio = ((result.outputs.draco.size / result.originalSize) * 100).toFixed(1);
      list.push({ label: result.outputs.draco.label, size: result.outputs.draco.size, ratio: `%${ratio}` });
    }
    if (result.outputs.stlZip) {
      const ratio = ((result.outputs.stlZip.size / result.originalSize) * 100).toFixed(1);
      list.push({ label: result.outputs.stlZip.label, size: result.outputs.stlZip.size, ratio: `%${ratio}` });
    }
    return list;
  }, [result, c.originalGlb]);

  const handleConvert = async () => {
    if (!file || (!draco && !stlZip)) return;
    if (!(await checkCredits(1, billingUi.openUnauthorized, billingUi.openInsufficientCredits))) return;
    const {
      data: { user },
    } = await createClient().auth.getUser();
    if (!user?.id) {
      billingUi.openUnauthorized();
      return;
    }
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const form = new FormData();
      form.set("file", file);
      form.set("draco", String(draco));
      form.set("stl", String(stlZip));
      form.set("userId", user.id);
      const res = await fetch("/api/convert", { method: "POST", body: form });
      if (await remauraHandleBillingApiResponse(res, billingUi)) return;
      const data = (await res.json()) as ConvertResponse & { error?: string };
      if (!res.ok) throw new Error(data.error || c.convertFailed);
      setResult(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : c.unexpectedError);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#0a0a0a] px-4 py-10 text-[#e8e0d0] sm:px-6">
      <div className="mx-auto max-w-3xl rounded-2xl border border-white/10 bg-[#101114] p-6">
        <h1 className="font-display text-2xl font-semibold">{c.title}</h1>
        <p className="mt-1 text-sm text-zinc-400">{c.subtitle}</p>

        <div className="mt-6 space-y-4">
          <label className="block">
            <span className="mb-1.5 block text-xs uppercase tracking-wider text-zinc-500">{c.uploadLabel}</span>
            <input
              type="file"
              accept=".glb,model/gltf-binary"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="block w-full cursor-pointer rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-zinc-200 file:mr-3 file:rounded-md file:border-0 file:bg-white/10 file:px-2.5 file:py-1 file:text-xs file:text-zinc-200"
            />
            {file ? <p className="mt-2 text-xs text-zinc-400">{file.name} · {bytesToMb(file.size)}</p> : null}
          </label>

          <div>
            <span className="mb-1.5 block text-xs uppercase tracking-wider text-zinc-500">{c.optionsTitle}</span>
            <div className="space-y-2 rounded-xl border border-white/10 bg-black/20 p-3">
              <label className="flex items-center gap-2 text-sm text-zinc-300">
                <input type="checkbox" checked={draco} onChange={(e) => setDraco(e.target.checked)} />
                {c.dracoOption}
              </label>
              <label className="flex items-center gap-2 text-sm text-zinc-300">
                <input type="checkbox" checked={stlZip} onChange={(e) => setStlZip(e.target.checked)} />
                {c.stlOption}
              </label>
            </div>
          </div>

          <button
            type="button"
            onClick={handleConvert}
            disabled={!canSubmit}
            className="rounded-xl border border-[#c9a84c]/60 bg-[#c9a84c]/10 px-4 py-2 text-sm font-medium text-[#f0dcc8] disabled:cursor-not-allowed disabled:opacity-40"
          >
            {loading ? c.processing : c.convertButton}
          </button>
          {loading ? <p className="text-xs text-zinc-400">{c.waitHint}</p> : null}
          {error ? <p className="text-sm text-rose-300">{error}</p> : null}
        </div>

        {result ? (
          <section className="mt-8 rounded-xl border border-white/10 bg-black/20 p-4">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-400">{c.resultTitle}</h2>
            <div className="mt-3 space-y-2">
              {rows.map((row) => (
                <div key={row.label} className="flex items-center justify-between rounded-lg border border-white/10 px-3 py-2 text-sm">
                  <span>{row.label}</span>
                  <span className="text-zinc-400">{bytesToMb(row.size)} {row.ratio !== "-" ? `(${row.ratio})` : ""}</span>
                </div>
              ))}
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {result.outputs.draco ? (
                <a
                  href={result.outputs.draco.url}
                  download
                  className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-3 py-1.5 text-xs font-medium text-emerald-200"
                >
                  {c.downloadDraco}
                </a>
              ) : null}
              {result.outputs.stlZip ? (
                <a
                  href={result.outputs.stlZip.url}
                  download
                  className="rounded-lg border border-sky-500/40 bg-sky-500/10 px-3 py-1.5 text-xs font-medium text-sky-200"
                >
                  {c.downloadStl}
                </a>
              ) : null}
            </div>
          </section>
        ) : null}
      </div>
    </main>
  );
}

