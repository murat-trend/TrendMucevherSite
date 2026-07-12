import { redirect } from "next/navigation";
import { RAI_DEFAULT_LOCALE } from "../i18n";

// Eski dil-siz studio adresi → varsayılan dile yönlendirme.
export default function RaiStudioLegacyPage() {
  redirect(`/rai/${RAI_DEFAULT_LOCALE}/studio`);
}
