"use client";

import { useCallback, useState } from "react";
import { AdminTopbar } from "./AdminTopbar";
import { AdminSidebar } from "./AdminSidebar";

export function AdminShell({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const closeMobile = useCallback(() => setMobileOpen(false), []);

  const onHamburger = useCallback(() => {
    if (typeof window !== "undefined" && window.innerWidth >= 1024) {
      setCollapsed((v) => !v);
    } else {
      setMobileOpen((v) => !v);
    }
  }, []);

  return (
    <div className="flex min-h-screen flex-col bg-[#07080a] text-zinc-200">
      <AdminTopbar onHamburgerClick={onHamburger} />

      <div className="relative flex flex-1">
        <AdminSidebar
          collapsed={collapsed}
          onToggleCollapse={() => setCollapsed((v) => !v)}
          mobileOpen={mobileOpen}
          onNavigate={closeMobile}
        />

        <main
          className={[
            "min-h-[calc(100vh-3rem)] flex-1 overflow-auto bg-[#07080a] transition-[padding] duration-200",
            collapsed ? "lg:pl-[72px]" : "lg:pl-[240px]",
          ].join(" ")}
        >
          <div className="w-full max-w-none px-4 pt-4 pb-8 sm:px-6 lg:pl-8 lg:pr-10 xl:pr-12">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
