// SUYOLU MOTORU — TAŞ (yuvarlak parlak kesim, önizleme + yuva referansı)
// T1 oranlarıyla (HRD Excellent bantları) torna profili: tabla → taç konisi →
// girdle silindiri → pavyon konisi → culet. Taş üretim STL'ine girmez (taş
// dökülmez, mıhlanır) — görevi doğru ölçekli önizleme ve yuva boyutlandırması.
import { TAS_ORAN } from "./kurallar";

export type TasMesh = { positions: Float64Array; indices: Uint32Array };

export type TasOlculeri = {
  capMm: number;
  yukseklikMm: number;   // 0.61 × çap (T1)
  tacMm: number;         // girdle üstü
  girdleMm: number;
  pavyonMm: number;
  tablaCapMm: number;
};

export function tasOlc(capMm: number): TasOlculeri {
  return {
    capMm,
    yukseklikMm: TAS_ORAN.derinlik * capMm,
    tacMm: TAS_ORAN.tac * capMm,
    girdleMm: TAS_ORAN.girdle * capMm,
    pavyonMm: (TAS_ORAN.derinlik - TAS_ORAN.tac - TAS_ORAN.girdle) * capMm,
    tablaCapMm: TAS_ORAN.tabla * capMm,
  };
}

/** Torna gövdesi: z=0 tabla düzlemi, taş aşağı doğru (z eksi) iner.
 *  n radyal segment (16 = "faset" hissi + hafif mesh). */
export function tasMesh(capMm: number, n = 16): TasMesh {
  const o = tasOlc(capMm);
  const rTabla = o.tablaCapMm / 2;
  const rGirdle = capMm / 2;
  // profil (r, z): tabla merkezi → tabla kenarı → girdle üst → girdle alt → culet
  const profil: [number, number][] = [
    [0, 0],
    [rTabla, 0],
    [rGirdle, -o.tacMm],
    [rGirdle, -o.tacMm - o.girdleMm],
    [0, -o.yukseklikMm],
  ];
  const rings = profil.slice(1, -1); // uçlar kutup
  const positions = new Float64Array((rings.length * n + 2) * 3);
  positions.set([0, 0, profil[0][1]], 0);
  rings.forEach(([r, z], i) => {
    for (let j = 0; j < n; j++) {
      const a = (2 * Math.PI * j) / n;
      const k = (1 + i * n + j) * 3;
      positions[k] = r * Math.cos(a);
      positions[k + 1] = r * Math.sin(a);
      positions[k + 2] = z;
    }
  });
  const guney = rings.length * n + 1;
  positions.set([0, 0, profil[profil.length - 1][1]], guney * 3);

  const tris: number[] = [];
  const ring = (i: number, j: number) => 1 + i * n + (j % n);
  for (let j = 0; j < n; j++) tris.push(0, ring(0, j + 1), ring(0, j));
  for (let i = 0; i + 1 < rings.length; i++) {
    for (let j = 0; j < n; j++) {
      tris.push(ring(i, j), ring(i, j + 1), ring(i + 1, j + 1));
      tris.push(ring(i, j), ring(i + 1, j + 1), ring(i + 1, j));
    }
  }
  for (let j = 0; j < n; j++) tris.push(guney, ring(rings.length - 1, j), ring(rings.length - 1, j + 1));
  return { positions, indices: new Uint32Array(tris) };
}
