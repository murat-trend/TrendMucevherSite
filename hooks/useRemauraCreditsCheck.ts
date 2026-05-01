import { useCallback } from "react";
import { createClient } from "@/utils/supabase/client";

export function useRemauraCreditsCheck() {
  const checkCredits = useCallback(async (
    requiredCredits: number = 1,
    onUnauthorized: () => void,
    onInsufficient: () => void
  ): Promise<boolean> => {
    const {
      data: { user },
    } = await createClient().auth.getUser();

    if (!user?.id) {
      onUnauthorized();
      return false;
    }

    try {
      const res = await fetch(`/api/billing/wallet?userId=${encodeURIComponent(user.id)}`, {
        cache: "no-store",
      });
      if (!res.ok) {
        onInsufficient();
        return false;
      }
      const data = (await res.json()) as { wallet?: { balanceCredits?: number } };
      const parsed = Number(data?.wallet?.balanceCredits ?? 0);
      const credits = Number.isFinite(parsed) ? parsed : 0;
      if (credits < requiredCredits) {
        onInsufficient();
        return false;
      }
    } catch {
      onInsufficient();
      return false;
    }

    return true;
  }, []);

  return { checkCredits };
}
