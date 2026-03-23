import type { Metadata } from "next";
import { AdminShell } from "@/components/admin/AdminShell";

export const metadata: Metadata = {
  title: "Super Admin | Trend Mücevher",
  description: "Yönetim paneli",
  robots: { index: false, follow: false },
};

export default function AdminPrivateLayout({ children }: { children: React.ReactNode }) {
  return <AdminShell>{children}</AdminShell>;
}
