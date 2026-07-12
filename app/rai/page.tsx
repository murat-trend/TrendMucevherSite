import { redirect } from "next/navigation";
import { RAI_DEFAULT_LOCALE } from "./i18n";

// Dil segmenti olmayan giriş → varsayılan dil (İngilizce).
export default function RaiIndexPage() {
  redirect(`/rai/${RAI_DEFAULT_LOCALE}`);
}
