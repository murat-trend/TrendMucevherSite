import { createClient } from "@/utils/supabase/client";

export function useRemauraCreditsCheck() {
  const checkCredits = async (
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
      const res = await fetch(`/api/billing/wallet?userId=${encodeURIComponent(user.id)}`);
      const data = (await res.json()) as { wallet?: { balanceCredits?: number } };
      const credits = Number(data?.wallet?.balanceCredits ?? 0);
      if (!Number.isFinite(credits) || credits < requiredCredits) {
        onInsufficient();
        return false;
      }
    } catch {
      onInsufficient();
      return false;
    }

    return true;
  };

  return { checkCredits };
}
