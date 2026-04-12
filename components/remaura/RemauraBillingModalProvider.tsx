"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import Link from "next/link";

type BillingModalKind = "401" | "402" | null;

export type RemauraBillingModalContextValue = {
  openUnauthorized: () => void;
  openInsufficientCredits: () => void;
};

const RemauraBillingModalContext = createContext<RemauraBillingModalContextValue | null>(null);

export function useRemauraBillingModal(): RemauraBillingModalContextValue {
  const v = useContext(RemauraBillingModalContext);
  if (!v) {
    throw new Error("useRemauraBillingModal must be used within RemauraBillingModalProvider");
  }
  return v;
}

export function useRemauraBillingModalOptional(): RemauraBillingModalContextValue | null {
  return useContext(RemauraBillingModalContext);
}

/** API yanıtı 401/402 ve bilinen code ise modal açar; true döner. Orijinal `res` gövdesi okunmaz (yalnızca clone). */
export async function remauraHandleBillingApiResponse(
  res: Response,
  ctx: RemauraBillingModalContextValue
): Promise<boolean> {
  if (res.ok) return false;

  const cloned = res.clone();
  let data: { code?: string };
  try {
    data = (await cloned.json()) as { code?: string };
  } catch {
    return false;
  }

  if (res.status === 401 && data?.code === "UNAUTHORIZED") {
    ctx.openUnauthorized();
    return true;
  }
  if (
    res.status === 402 &&
    (data?.code === "INSUFFICIENT_CREDITS" || data?.code === "INSUFFICIENT_CREDIT")
  ) {
    ctx.openInsufficientCredits();
    return true;
  }

  return false;
}

export function RemauraBillingModalProvider({ children }: { children: ReactNode }) {
  const [kind, setKind] = useState<BillingModalKind>(null);

  const openUnauthorized = useCallback(() => setKind("401"), []);
  const openInsufficientCredits = useCallback(() => setKind("402"), []);

  const value = useMemo(
    () => ({ openUnauthorized, openInsufficientCredits }),
    [openUnauthorized, openInsufficientCredits]
  );

  const modal =
    kind != null ? (
      <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 backdrop-blur-sm px-4">
        <div className="w-full max-w-md rounded-2xl border border-border/50 bg-card p-8 shadow-2xl">
          {kind === "401" ? (
            <>
              <h3 className="text-center font-display text-lg font-medium text-foreground">
                Bu özelliği kullanmak için giriş yapmanız gerekiyor
              </h3>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
                <Link
                  href="/giris"
                  className="flex h-11 items-center justify-center rounded-full bg-accent text-center text-sm font-medium text-accent-foreground transition-opacity hover:opacity-90"
                >
                  Giriş Yap
                </Link>
                <button
                  type="button"
                  onClick={() => setKind(null)}
                  className="flex h-11 items-center justify-center rounded-full border border-border/60 text-sm text-muted transition-colors hover:text-foreground"
                >
                  Kapat
                </button>
              </div>
            </>
          ) : (
            <>
              <h3 className="text-center font-display text-lg font-medium text-foreground">
                Krediniz yetersiz. Paket satın alarak devam edebilirsiniz.
              </h3>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
                <Link
                  href="/fiyatlandirma"
                  className="flex h-11 items-center justify-center rounded-full bg-accent text-center text-sm font-medium text-accent-foreground transition-opacity hover:opacity-90"
                >
                  Paket Satın Al
                </Link>
                <button
                  type="button"
                  onClick={() => setKind(null)}
                  className="flex h-11 items-center justify-center rounded-full border border-border/60 text-sm text-muted transition-colors hover:text-foreground"
                >
                  Kapat
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    ) : null;

  return (
    <RemauraBillingModalContext.Provider value={value}>
      {children}
      {typeof document !== "undefined" && modal != null
        ? createPortal(modal, document.body)
        : null}
    </RemauraBillingModalContext.Provider>
  );
}
