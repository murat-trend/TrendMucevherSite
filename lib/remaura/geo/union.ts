// Geometri çekirdeği — TEK GÖVDE BİRLEŞİM (manifold-3d, Faz 1)
// İlke: düzenleme sırasında parçalar AYRI yaşar (undo/param bedava); union
// yalnız dışa aktarım / gerçek gramaj anında. bbox-sıralı ikili ağaç ile
// birleştirilir (ara mesh'ler küçük kalır); WASM nesnelerinde GC yok —
// her ara Manifold'a delete() ŞART (sızıntı disiplini).
// Temas kuralı (TELKARI.md §1.6): parçalar zaten %10-15 gömme ile üretilir —
// teğet-temas kum saati boynu union'da oluşmaz.

type GeoMesh = { positions: Float64Array | Float32Array; indices: Uint32Array };

/* eslint-disable @typescript-eslint/no-explicit-any -- manifold-3d WASM tipleri dışarıdan */
let wasmPromise: Promise<any> | null = null;
async function getWasm(): Promise<any> {
  if (!wasmPromise) {
    wasmPromise = import("manifold-3d").then(async (M) => {
      const w = await M.default();
      w.setup();
      return w;
    });
  }
  return wasmPromise;
}

export type UnionResult = {
  positions: Float64Array;
  indices: Uint32Array;
  volumeMm3: number;
  parcaSayisi: number;   // girdi parça sayısı
  atlanan: number;       // manifold'a çevrilemeyen parça (0 beklenir)
};

export async function unionMeshes(meshes: GeoMesh[]): Promise<UnionResult> {
  const w = await getWasm();
  const { Manifold, Mesh } = w;

  type Item = { man: any; cx: number; cy: number };
  let atlanan = 0;
  let items: Item[] = [];
  for (const m of meshes) {
    try {
      const mesh = new Mesh({
        numProp: 3,
        vertProperties: m.positions instanceof Float32Array ? m.positions : Float32Array.from(m.positions),
        triVerts: m.indices,
      });
      const man = new Manifold(mesh);
      let cx = 0, cy = 0;
      for (let i = 0; i < m.positions.length; i += 3) { cx += m.positions[i]; cy += m.positions[i + 1]; }
      const n = m.positions.length / 3;
      items.push({ man, cx: cx / n, cy: cy / n });
    } catch {
      atlanan++;
    }
  }
  if (!items.length) throw new Error("geo/union: birleştirilecek geçerli parça yok");

  // uzamsal sıralama (yakın parçalar önce birleşsin -> ara mesh küçük kalır)
  items.sort((a, b) => (a.cx - b.cx) || (a.cy - b.cy));
  while (items.length > 1) {
    const next: Item[] = [];
    for (let i = 0; i < items.length; i += 2) {
      if (i + 1 >= items.length) { next.push(items[i]); break; }
      const a = items[i], b = items[i + 1];
      const u = a.man.add(b.man);
      a.man.delete();
      b.man.delete();
      next.push({ man: u, cx: (a.cx + b.cx) / 2, cy: (a.cy + b.cy) / 2 });
    }
    items = next;
  }

  const finalMan = items[0].man;
  const out = finalMan.getMesh();
  const volumeMm3: number = typeof finalMan.volume === "function"
    ? finalMan.volume()
    : finalMan.getProperties().volume;
  const result: UnionResult = {
    positions: Float64Array.from(out.vertProperties as Float32Array),
    indices: Uint32Array.from(out.triVerts as Uint32Array),
    volumeMm3,
    parcaSayisi: meshes.length,
    atlanan,
  };
  finalMan.delete();
  return result;
}
