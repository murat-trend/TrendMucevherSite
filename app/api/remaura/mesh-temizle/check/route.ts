import { NextRequest, NextResponse } from "next/server";

/**
 * Check Mesh — kuyumculuk döküm standartları kontrolü.
 * Tarayıcı geometri ölçümlerini (topoloji + duvar kalınlığı + boyut) POST eder;
 * endpoint kuyumculuk eşiklerine göre değerlendirip pass/warn/fail raporu döner.
 *
 * Mimari notu: ağır geometri işi TARAYICIDA yapılır (BVH). Bu endpoint sadece
 * standart/kural değerlendirmesi yapar — hızlı, Vercel-uyumlu, sunucu yükü yok.
 */

type Metal = "ag925" | "au14" | "au18" | "au22" | "pt";

// Metale göre güvenli minimum duvar (mm) — döküm dolum payı
const MIN_WALL: Record<Metal, number> = {
  ag925: 0.8, // gümüş daha akışkan değil → kalın duvar
  au14: 0.6,
  au18: 0.6,
  au22: 0.7,
  pt: 0.7,
};
const METAL_LABEL: Record<Metal, string> = {
  ag925: "925 gümüş", au14: "14k altın", au18: "18k altın", au22: "22k altın", pt: "platin",
};

// Kuyumcu için makul ölçü aralığı (mm)
const DIM_MIN = 2;
const DIM_MAX = 120;

type CheckStatus = "pass" | "warn" | "fail";
type CheckItem = { id: string; label: string; status: CheckStatus; detail: string };

type Body = {
  watertight?: boolean;
  windingConsistent?: boolean;
  shellCount?: number;
  boundaryEdges?: number;
  nonManifoldEdges?: number;
  flippedEdges?: number;
  intersectingTriangles?: number; // tarayıcı tespit ederse
  dimensionsMm?: [number, number, number];
  volumeMm3?: number;
  hollow?: { wallMm: number; minWallMm?: number }; // minWallMm = ölçülen en ince duvar
  metal?: Metal;
};

export async function POST(req: NextRequest) {
  let b: Body;
  try {
    b = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Geçersiz istek." }, { status: 400 });
  }

  const checks: CheckItem[] = [];
  const metal: Metal = b.metal ?? "ag925";
  const isHollow = !!b.hollow;

  // 1) Kapalı yüzey (watertight)
  checks.push(
    b.watertight
      ? { id: "watertight", label: "Kapalı yüzey", status: "pass", detail: "Su geçirmez, döküme uygun." }
      : { id: "watertight", label: "Kapalı yüzey", status: "fail", detail: `Açık kenar: ${b.boundaryEdges ?? "?"} · non-manifold: ${b.nonManifoldEdges ?? "?"}. Önce temizle.` }
  );

  // 2) Normaller tutarlı (winding)
  checks.push(
    b.windingConsistent
      ? { id: "winding", label: "Normaller tutarlı", status: "pass", detail: "Yön tutarlı." }
      : { id: "winding", label: "Normaller tutarlı", status: "fail", detail: `Ters normal: ${b.flippedEdges ?? "?"}. «Normalleri düzelt».` }
  );

  // 3) Parça / shell — dolu=1, boş=2 (dış+iç) beklenir
  const sc = b.shellCount ?? 1;
  if (isHollow) {
    checks.push(
      sc <= 2
        ? { id: "shells", label: "Parça sayısı", status: "pass", detail: `${sc} parça (boşaltılmış: dış+iç kabuk = normal).` }
        : { id: "shells", label: "Parça sayısı", status: "warn", detail: `${sc} parça — boşaltılmışta 2 beklenir, fazlası artık olabilir.` }
    );
  } else {
    checks.push(
      sc === 1
        ? { id: "shells", label: "Parça sayısı", status: "pass", detail: "Tek gövde." }
        : { id: "shells", label: "Parça sayısı", status: "warn", detail: `${sc} parça — izole çöp ya da kasıtlı parça olabilir.` }
    );
  }

  // 4) Boyut makul mu (kuyumculuk aralığı)
  if (b.dimensionsMm) {
    const mx = Math.max(...b.dimensionsMm);
    const mn = Math.min(...b.dimensionsMm);
    if (mx > DIM_MAX || mn < DIM_MIN) {
      checks.push({ id: "size", label: "Boyut", status: "warn", detail: `${b.dimensionsMm.map((d) => d.toFixed(1)).join("×")} mm — kuyumcu için olağandışı, ölçeği kontrol et.` });
    } else {
      checks.push({ id: "size", label: "Boyut", status: "pass", detail: `${b.dimensionsMm.map((d) => d.toFixed(1)).join("×")} mm.` });
    }
  }

  // 5) Minimum duvar kalınlığı (boşaltılmışsa kritik)
  if (isHollow && b.hollow) {
    const need = MIN_WALL[metal];
    const measured = b.hollow.minWallMm ?? b.hollow.wallMm;
    if (measured < need) {
      checks.push({ id: "wall", label: "Duvar kalınlığı", status: "fail", detail: `En ince duvar ${measured.toFixed(2)} mm < ${METAL_LABEL[metal]} için min ${need} mm. Döküm dolmayabilir.` });
    } else {
      checks.push({ id: "wall", label: "Duvar kalınlığı", status: "pass", detail: `${measured.toFixed(2)} mm ≥ ${METAL_LABEL[metal]} min ${need} mm.` });
    }
  }

  // 6) Kesişen üçgen (tarayıcı verirse)
  if (typeof b.intersectingTriangles === "number") {
    checks.push(
      b.intersectingTriangles === 0
        ? { id: "selfint", label: "Kesişen yüzey", status: "pass", detail: "Yok." }
        : { id: "selfint", label: "Kesişen yüzey", status: b.intersectingTriangles > 200 ? "fail" : "warn", detail: `${b.intersectingTriangles} kesişen üçgen. Az ise döküm tolere eder.` }
    );
  }

  // 7) Hacim / gramaj var mı
  if (b.volumeMm3 && b.volumeMm3 > 0) {
    checks.push({ id: "volume", label: "Hacim", status: "pass", detail: `${b.volumeMm3.toFixed(1)} mm³ — gramaj hesaplanabilir.` });
  }

  const hasFail = checks.some((c) => c.status === "fail");
  const hasWarn = checks.some((c) => c.status === "warn");
  const verdict: CheckStatus = hasFail ? "fail" : hasWarn ? "warn" : "pass";
  const summary =
    verdict === "pass" ? "Döküme hazır — kuyumculuk standartlarını karşılıyor."
    : verdict === "warn" ? "Döküme gidebilir ama uyarılar var — kontrol et."
    : "Döküme uygun değil — önce sorunları gider.";

  return NextResponse.json({
    ready: verdict === "pass",
    verdict,
    summary,
    metal: METAL_LABEL[metal],
    hollow: isHollow,
    checks,
  });
}
