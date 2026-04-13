import KampanyaYonetimi from "@/components/satici/KampanyaYonetimi";
import { SaticiNav } from "@/app/(site)/satici/dashboard/page";

export default function SaticiKampanyalarimPage() {
  return (
    <div className="min-h-screen bg-background">
      <SaticiNav active="campaigns" />
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <KampanyaYonetimi />
      </div>
    </div>
  );
}
