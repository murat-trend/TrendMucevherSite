import type { Metadata } from "next";
import { NextauraAdminPage } from "@/components/admin/nextaura/NextauraAdminPage";

export const metadata: Metadata = {
  title: "Nextaura Firmaları | Super Admin",
  robots: { index: false, follow: false },
};

export default function AdminNextauraPage() {
  return <NextauraAdminPage />;
}
