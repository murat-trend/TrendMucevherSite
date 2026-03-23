import type { SellerStatus } from "./types";

const STATUS_LABEL: Record<SellerStatus, string> = {
  active: "Aktif",
  pending: "Bekleyen",
  suspended: "Askıda",
};

export function SellerStatusBadge({ status }: { status: SellerStatus }) {
  const styles: Record<SellerStatus, string> = {
    active: "border-emerald-500/35 bg-emerald-500/15 text-emerald-300",
    pending: "border-amber-500/40 bg-amber-500/12 text-amber-200",
    suspended: "border-rose-500/40 bg-rose-500/12 text-rose-200",
  };
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${styles[status]}`}
    >
      {STATUS_LABEL[status]}
    </span>
  );
}
