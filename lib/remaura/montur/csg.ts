// MONTÜR MOTORU — CSG KÖPRÜSÜ (manifold-3d WASM; montür evinin kendi kopyası)
// WASM disiplini: her ara Manifold'a delete() (GC yok — sızıntı).

export type MonturMesh = { positions: Float64Array; indices: Uint32Array };

/* eslint-disable @typescript-eslint/no-explicit-any -- manifold-3d WASM tipleri dışarıdan */
let wasmPromise: Promise<any> | null = null;
export async function getWasm(): Promise<any> {
  if (!wasmPromise) {
    wasmPromise = import("manifold-3d").then(async (M) => {
      const w = await M.default();
      w.setup();
      return w;
    });
  }
  return wasmPromise;
}

export function meshToManifold(w: any, m: MonturMesh): any {
  const mesh = new w.Mesh({
    numProp: 3,
    vertProperties: Float32Array.from(m.positions),
    triVerts: Uint32Array.from(m.indices),
  });
  mesh.merge();
  return new w.Manifold(mesh);
}

export function manifoldToMesh(mf: any): MonturMesh {
  const out = mf.getMesh();
  return {
    positions: Float64Array.from(out.vertProperties as Float32Array),
    indices: Uint32Array.from(out.triVerts as Uint32Array),
  };
}

export function manifoldHacim(mf: any): number {
  if (typeof mf.volume === "function") return Math.abs(mf.volume());
  return Math.abs(mf.getProperties().volume);
}

/** a ∪ b (ikisini de tüketir) */
export function birlestir(a: any, b: any): any {
  const r = a.add(b);
  a.delete(); b.delete();
  return r;
}

/** a − b (ikisini de tüketir) */
export function cikar(a: any, b: any): any {
  const r = a.subtract(b);
  a.delete(); b.delete();
  return r;
}

/** İşaretli hacim (saf mesh; üretici birim testleri için). */
export function isaretliHacim(m: MonturMesh): number {
  const p = m.positions, ix = m.indices;
  let v6 = 0;
  for (let t = 0; t < ix.length; t += 3) {
    const a = ix[t] * 3, b = ix[t + 1] * 3, c = ix[t + 2] * 3;
    v6 +=
      p[a] * (p[b + 1] * p[c + 2] - p[b + 2] * p[c + 1]) -
      p[a + 1] * (p[b] * p[c + 2] - p[b + 2] * p[c]) +
      p[a + 2] * (p[b] * p[c + 1] - p[b + 1] * p[c]);
  }
  return v6 / 6;
}
