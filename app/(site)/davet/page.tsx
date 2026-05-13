"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";

function DavetInner() {
  const router = useRouter();
  const params = useSearchParams();

  useEffect(() => {
    const token = params.get("token")?.trim();
    if (token) {
      localStorage.setItem("pending_invite", token);
    }
    router.replace("/uye-giris?mode=kayit");
  }, [params, router]);

  return (
    <main className="flex min-h-[80vh] items-center justify-center px-4">
      <p className="text-sm text-muted">Yönlendiriliyorsunuz…</p>
    </main>
  );
}

export default function DavetPage() {
  return (
    <Suspense>
      <DavetInner />
    </Suspense>
  );
}
