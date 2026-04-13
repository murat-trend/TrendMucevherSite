import { redirect } from "next/navigation";

export default function AdminLoginRedirectPage() {
  redirect("/giris?tip=satici&redirect=/admin");
}
