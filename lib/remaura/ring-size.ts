/**
 * İsviçre (EU) yüzük numarası → iç çap (mm) tablosu
 * Formül: iç_çap = (numara + 40) / π
 * Aralık: 8–40 (33 numara)
 */
export const RING_SIZE_SWISS: Record<number, number> = Object.fromEntries(
  Array.from({ length: 33 }, (_, i) => {
    const size = i + 8;
    const innerDiameter = parseFloat(((size + 40) / Math.PI).toFixed(2));
    return [size, innerDiameter];
  })
);

export function getRingSizeTargetMm(ringSize: number): number {
  return parseFloat((RING_SIZE_SWISS[ringSize] ?? 30).toFixed(2));
}

export function getTargetDiameter(ringSize: number, system: "swiss" | "eu"): number {
  if (system === "swiss") {
    return (ringSize + 40) / Math.PI;
  }
  return ringSize / Math.PI;
}
