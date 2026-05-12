import type { Metadata } from "next";
import { MatrixGoldClient } from "./MatrixGoldClient";

export const metadata: Metadata = {
  title: "MatrixGold Türkçe Eğitim Seti | Murat Kaynaroğlu",
  description:
    "Sıfırdan ileri seviyeye MatrixGold eğitimi. ~22 saat Türkçe video, kişisel destek, canlı bağlantı. Dünyanın her yerindeki Türk kuyumculara.",
  robots: { index: true, follow: true },
  alternates: { canonical: "https://trendmucevher.com/egitim/matrixgold/" },
  openGraph: {
    title: "MatrixGold Türkçe Eğitim Seti | Murat Kaynaroğlu",
    description:
      "Sıfırdan ileri seviyeye MatrixGold eğitimi. ~22 saat Türkçe video, kişisel destek, canlı bağlantı. Dünyanın her yerindeki Türk kuyumculara.",
    url: "https://trendmucevher.com/egitim/matrixgold/",
    type: "website",
  },
};

export default function MatrixGoldEgitimPage() {
  return <MatrixGoldClient />;
}
