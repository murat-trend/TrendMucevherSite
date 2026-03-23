import { redirect } from "next/navigation";

/** Eski /admin/login adresleri doğrudan panele gider; şifre kullanılmıyor. */
export default function AdminLoginRedirectPage() {
  redirect("/admin");
}
