"use client";

// AI CREATIVE STUDIO — paylaşılan UI atomları.
// Remaura araç paleti: gül/pembe + derin siyah zemin (CLAUDE.md kuralı).

import type { ChangeEvent, ReactNode } from "react";
import { useRef } from "react";

export function Section({ title, desc, children }: { title: string; desc?: string; children: ReactNode }) {
  return (
    <section className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4">
      <h3 className="text-sm font-semibold text-[#c9a88a]">{title}</h3>
      {desc ? <p className="mt-0.5 text-xs text-white/40">{desc}</p> : null}
      <div className="mt-3">{children}</div>
    </section>
  );
}

export function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border px-3 py-1.5 text-xs transition ${
        active
          ? "border-[#b76e79] bg-[#b76e79]/15 text-[#e8c4ca]"
          : "border-white/[0.08] bg-white/[0.02] text-white/60 hover:border-[#b76e79]/40"
      }`}
    >
      {children}
    </button>
  );
}

export function PrimaryBtn({
  onClick,
  disabled,
  children,
}: {
  onClick: () => void;
  disabled?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="rounded-xl bg-gradient-to-r from-[#c4838b] to-[#a65f69] px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-[#a65f69]/20 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
    >
      {children}
    </button>
  );
}

export function GhostBtn({
  onClick,
  disabled,
  children,
  title,
}: {
  onClick: () => void;
  disabled?: boolean;
  children: ReactNode;
  title?: string;
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      disabled={disabled}
      className="rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-1.5 text-xs text-white/70 transition hover:border-[#c69575]/50 hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
    >
      {children}
    </button>
  );
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-white/40">{label}</span>
      {children}
    </label>
  );
}

export const inputCls =
  "w-full rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-sm text-white/90 outline-none placeholder:text-white/25 focus:border-[#b76e79]/60";

export function FilePick({
  accept,
  label,
  onFile,
  multiple,
}: {
  accept: string;
  label: string;
  onFile: (files: File[]) => void;
  multiple?: boolean;
}) {
  const ref = useRef<HTMLInputElement>(null);
  function onChange(e: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (files.length) onFile(files);
    e.target.value = "";
  }
  return (
    <>
      <button
        type="button"
        onClick={() => ref.current?.click()}
        className="flex w-full items-center justify-center rounded-xl border border-dashed border-[#c69575]/40 bg-[#c69575]/[0.04] px-4 py-6 text-sm text-[#c9a88a] transition hover:border-[#c69575]/70"
      >
        {label}
      </button>
      <input ref={ref} type="file" accept={accept} multiple={multiple} className="hidden" onChange={onChange} />
    </>
  );
}

export function ErrorNote({ msg }: { msg: string | null }) {
  if (!msg) return null;
  return (
    <p className="mt-2 rounded-lg border border-[#b85070]/30 bg-[#b85070]/10 px-3 py-2 text-xs text-[#e8a2b8]">
      {msg}
    </p>
  );
}

export function Spinner({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center gap-2 text-xs text-[#c9a88a]">
      <span className="h-3 w-3 animate-spin rounded-full border border-[#b76e79] border-t-transparent" />
      {label}
    </span>
  );
}
