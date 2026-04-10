"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { useLanguage } from "@/components/i18n/LanguageProvider";
import { ADMIN_NAV_ENTRIES, isAdminNavGroup } from "./admin-nav";

type Props = {
  collapsed: boolean;
  onToggleCollapse: () => void;
  mobileOpen: boolean;
  onNavigate: () => void;
};

function childLinkActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AdminSidebar({ collapsed, onToggleCollapse, mobileOpen, onNavigate }: Props) {
  const pathname = usePathname();
  const { locale } = useLanguage();

  const isActive = (href: string) => {
    if (href === "/admin") return pathname === "/admin";
    /** Finans ana sayfası — alt muhasebe yolları ayrı menü öğeleri */
    if (href === "/admin/finance") return pathname === "/admin/finance";
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  return (
    <>
      {mobileOpen && (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
          aria-label="Kapat"
          onClick={onNavigate}
        />
      )}

      <aside
        className={[
          "fixed left-0 top-12 z-50 flex h-[calc(100vh-3rem)] flex-col border-r border-white/[0.08] bg-[#0a0b0e] transition-[transform,width] duration-200 ease-out lg:translate-x-0",
          collapsed ? "w-[72px]" : "w-[240px]",
          mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
        ].join(" ")}
      >
        <div className="flex flex-1 flex-col overflow-y-auto overflow-x-hidden py-3">
          <nav className="flex flex-col gap-0.5 px-2">
            {ADMIN_NAV_ENTRIES.map((entry) => {
              if (isAdminNavGroup(entry)) {
                const GroupIcon = entry.icon;
                const title = locale !== "tr" ? entry.titleEn : entry.titleTr;
                return (
                  <div key={entry.id} className="mt-2 border-t border-white/[0.06] pt-2 first:mt-0 first:border-0 first:pt-0">
                    {!collapsed && (
                      <div className="mb-1 flex items-center gap-2 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
                        <GroupIcon className="h-3.5 w-3.5 shrink-0 text-[#b8956f]" strokeWidth={1.5} aria-hidden />
                        <span className="truncate">{title}</span>
                      </div>
                    )}
                    {collapsed && (
                      <div className="flex justify-center py-1" title={title}>
                        <GroupIcon className="h-4 w-4 text-zinc-600" strokeWidth={1.5} aria-hidden />
                      </div>
                    )}
                    <ul className="flex flex-col gap-0.5">
                      {entry.children.map((child) => {
                        const active = childLinkActive(pathname, child.href);
                        const SubIcon = child.icon;
                        const label = locale !== "tr" ? child.labelEn : child.labelTr;
                        return (
                          <li key={child.id}>
                            <Link
                              href={child.href}
                              onClick={onNavigate}
                              title={collapsed ? `${title} — ${label}` : label}
                              className={[
                                "group relative flex items-center gap-3 rounded-r-lg rounded-l-md py-2 pl-3 pr-2.5 text-sm transition-colors duration-150",
                                collapsed ? "justify-center py-2.5 pl-2 pr-2" : "pl-6",
                                active
                                  ? "bg-gradient-to-r from-[#c69575]/28 via-[#c69575]/14 to-transparent text-[#fdf6f1] shadow-[inset_3px_0_0_0_#d4a574,inset_0_0_0_1px_rgba(212,165,116,0.22)]"
                                  : "text-zinc-400 hover:bg-white/[0.08] hover:text-zinc-50",
                              ].join(" ")}
                            >
                              <SubIcon
                                className={`h-[17px] w-[17px] shrink-0 ${active ? "text-[#f0d4c4]" : "text-zinc-500 group-hover:text-zinc-200"}`}
                                strokeWidth={1.5}
                              />
                              {!collapsed && <span className="truncate font-medium">{label}</span>}
                            </Link>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                );
              }

              const item = entry;
              const active = isActive(item.href);
              const Icon = item.icon;
              const label = locale !== "tr" ? item.labelEn : item.labelTr;
              return (
                <Link
                  key={item.id}
                  href={item.href}
                  onClick={onNavigate}
                  title={collapsed ? label : undefined}
                  className={[
                    "group relative flex items-center gap-3 rounded-r-lg rounded-l-md py-2.5 pl-3 pr-2.5 text-sm transition-colors duration-150",
                    active
                      ? "bg-gradient-to-r from-[#c69575]/28 via-[#c69575]/14 to-transparent text-[#fdf6f1] shadow-[inset_3px_0_0_0_#d4a574,inset_0_0_0_1px_rgba(212,165,116,0.22)]"
                      : "text-zinc-400 hover:bg-white/[0.08] hover:text-zinc-50",
                  ].join(" ")}
                >
                  <Icon
                    className={`h-[18px] w-[18px] shrink-0 ${active ? "text-[#f0d4c4]" : "text-zinc-500 group-hover:text-zinc-200"}`}
                    strokeWidth={1.5}
                  />
                  {!collapsed && <span className="truncate font-medium">{label}</span>}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="hidden border-t border-white/[0.06] p-2 lg:block">
          <button
            type="button"
            onClick={onToggleCollapse}
            className="flex w-full items-center justify-center gap-2 rounded-lg py-2 text-zinc-500 transition-colors hover:bg-white/[0.08] hover:text-zinc-200"
            aria-label={collapsed ? "Genişlet" : "Daralt"}
          >
            <ChevronLeft
              className={`h-4 w-4 transition-transform ${collapsed ? "rotate-180" : ""}`}
              strokeWidth={1.5}
            />
            {!collapsed && <span className="text-xs">{locale !== "tr" ? "Collapse" : "Daralt"}</span>}
          </button>
        </div>
      </aside>
    </>
  );
}
