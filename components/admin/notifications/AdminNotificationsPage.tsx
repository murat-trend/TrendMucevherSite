"use client";

import { useCallback, useEffect, useState } from "react";
import { Bell, Loader2, Mail, RefreshCw, ShoppingCart, UserPlus } from "lucide-react";
import type { NotificationItem, NotificationKind } from "@/app/api/admin/notifications/route";
import Link from "next/link";

const SECONDARY_BTN =
  "inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border border-white/[0.14] bg-white/[0.04] px-3 py-2 text-xs font-medium text-zinc-200 transition-colors hover:bg-white/[0.07]";

const KIND_CONFIG: Record<
  NotificationKind,
  { icon: React.ElementType; bg: string; text: string; label: string }
> = {
  order: {
    icon: ShoppingCart,
    bg: "bg-emerald-500/15",
    text: "text-emerald-400",
    label: "Sipariş",
  },
  member: {
    icon: UserPlus,
    bg: "bg-sky-500/15",
    text: "text-sky-400",
    label: "Üye",
  },
  message: {
    icon: Mail,
    bg: "bg-[#c9a84c]/15",
    text: "text-[#c9a84c]",
    label: "Mesaj",
  },
};

const FILTER_OPTIONS: { value: NotificationKind | "all"; label: string }[] = [
  { value: "all", label: "Tümü" },
  { value: "order", label: "Siparişler" },
  { value: "member", label: "Üyeler" },
  { value: "message", label: "Mesajlar" },
];

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60) return `${s} sn önce`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} dk önce`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} sa önce`;
  const d = Math.floor(h / 24);
  return `${d} gün önce`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString("tr-TR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const SEEN_KEY = "admin_notifications_seen_at";

export function AdminNotificationsPage() {
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<NotificationKind | "all">("all");
  const [seenAt, setSeenAt] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/notifications?limit=50");
      const json = (await res.json()) as { notifications?: NotificationItem[]; error?: string };
      if (!res.ok) throw new Error(json.error ?? "Yüklenemedi");
      setItems(json.notifications ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Hata");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const stored = localStorage.getItem(SEEN_KEY);
    setSeenAt(stored);
    void load();
  }, [load]);

  function markAllRead() {
    const now = new Date().toISOString();
    localStorage.setItem(SEEN_KEY, now);
    setSeenAt(now);
  }

  const filtered = filter === "all" ? items : items.filter((i) => i.kind === filter);
  const unreadCount = seenAt
    ? items.filter((i) => i.created_at > seenAt).length
    : items.length;

  const counts: Record<NotificationKind, number> = { order: 0, member: 0, message: 0 };
  for (const item of items) counts[item.kind]++;

  return (
    <div className="space-y-6 pb-10">
      {/* Header */}
      <div className="flex flex-col gap-3 rounded-2xl border border-white/[0.14] bg-gradient-to-br from-[#14161d] via-[#0e1015] to-[#08090c] p-6 shadow-[0_1px_0_rgba(255,255,255,0.06)_inset] sm:flex-row sm:items-center sm:justify-between sm:p-8">
        <div className="flex items-center gap-3">
          <div className="relative">
            <Bell className="h-6 w-6 text-zinc-300" />
            {unreadCount > 0 && (
              <span className="absolute -right-1.5 -top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-[#c9a84c] text-[9px] font-bold text-black">
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            )}
          </div>
          <div>
            <h1 className="font-display text-2xl font-semibold tracking-tight text-zinc-50 sm:text-3xl">
              Bildirimler
            </h1>
            <p className="mt-0.5 text-sm text-zinc-400">
              {unreadCount > 0 ? `${unreadCount} okunmamış · ` : ""}
              {items.length} bildirim
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <button type="button" className={SECONDARY_BTN} onClick={markAllRead}>
              Tümünü okundu işaretle
            </button>
          )}
          <button
            type="button"
            className={SECONDARY_BTN}
            onClick={() => void load()}
            disabled={loading}
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            Yenile
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {(["order", "member", "message"] as NotificationKind[]).map((kind) => {
          const cfg = KIND_CONFIG[kind];
          const Icon = cfg.icon;
          return (
            <button
              key={kind}
              type="button"
              onClick={() => setFilter((f) => (f === kind ? "all" : kind))}
              className={`flex items-center gap-3 rounded-2xl border p-4 text-left transition-colors ${
                filter === kind
                  ? "border-[#c9a84c]/40 bg-[#c9a84c]/5"
                  : "border-white/[0.08] bg-white/[0.02] hover:border-white/[0.14]"
              }`}
            >
              <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${cfg.bg}`}>
                <Icon className={`h-4 w-4 ${cfg.text}`} />
              </div>
              <div>
                <p className="text-lg font-semibold text-zinc-100">{counts[kind]}</p>
                <p className="text-xs text-zinc-500">{cfg.label}</p>
              </div>
            </button>
          );
        })}
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 rounded-xl border border-white/[0.08] bg-white/[0.02] p-1 w-fit">
        {FILTER_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => setFilter(opt.value)}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
              filter === opt.value
                ? "bg-white/[0.1] text-zinc-100"
                : "text-zinc-500 hover:text-zinc-300"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
          {error}
        </div>
      )}

      {/* Feed */}
      <div className="rounded-2xl border border-white/[0.08] bg-[#0a0b0e]/60 overflow-hidden">
        {loading && (
          <div className="py-14 text-center text-sm text-zinc-500">
            <Loader2 className="inline h-4 w-4 animate-spin mr-2" />
            Yükleniyor…
          </div>
        )}

        {!loading && filtered.length === 0 && (
          <div className="py-14 text-center text-sm text-zinc-500">
            Bildirim yok.
          </div>
        )}

        {!loading && filtered.length > 0 && (
          <ul className="divide-y divide-white/[0.04]">
            {filtered.map((item) => {
              const cfg = KIND_CONFIG[item.kind];
              const Icon = cfg.icon;
              const isUnread = seenAt ? item.created_at > seenAt : true;

              const inner = (
                <div className="flex items-start gap-4 px-5 py-4">
                  {/* Unread dot */}
                  <div className="mt-1 flex h-2 w-2 shrink-0 items-center justify-center">
                    {isUnread && (
                      <span className="h-2 w-2 rounded-full bg-[#c9a84c]" />
                    )}
                  </div>

                  {/* Icon */}
                  <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${cfg.bg}`}>
                    <Icon className={`h-4 w-4 ${cfg.text}`} />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className={`text-sm font-medium truncate ${isUnread ? "text-zinc-100" : "text-zinc-300"}`}>
                        {item.title}
                      </p>
                      <span
                        className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${cfg.bg} ${cfg.text}`}
                      >
                        {cfg.label}
                      </span>
                    </div>
                    {item.subtitle && (
                      <p className="mt-0.5 text-xs text-zinc-500 truncate">{item.subtitle}</p>
                    )}
                    <p className="mt-1 text-[11px] text-zinc-600" title={formatDate(item.created_at)}>
                      {timeAgo(item.created_at)}
                    </p>
                  </div>
                </div>
              );

              return (
                <li
                  key={item.id}
                  className={`transition-colors ${
                    item.href
                      ? "hover:bg-white/[0.03] cursor-pointer"
                      : isUnread
                      ? "bg-white/[0.015]"
                      : ""
                  }`}
                >
                  {item.href ? <Link href={item.href}>{inner}</Link> : inner}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
