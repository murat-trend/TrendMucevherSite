import * as THREE from "three";
import { mergeVertices } from "three/examples/jsm/utils/BufferGeometryUtils.js";

// ---------------------------------------------------------------------------
// Manifold WASM köprüsü — tek noktadan yükleme + geo↔manifold dönüşümleri.
// (ajurBoolean.ts'teki doğrulanmış desenin paylaşılabilir hali.)
// manifold-3d importu DİNAMİK olmalı; next.config'te turbopack/webpack
// alias + node: fallback ayarları bu modüle de geçerlidir.
// ---------------------------------------------------------------------------

export type ManifoldWasm = Awaited<ReturnType<(typeof import("manifold-3d/manifold"))["default"]>>;
export type ManifoldT = InstanceType<ManifoldWasm["Manifold"]>;

let _wasm: ManifoldWasm | null = null;
export async function loadManifold(): Promise<ManifoldWasm> {
  if (_wasm) return _wasm;
  const mod = await import("manifold-3d/manifold");
  const w = await mod.default();
  w.setup();
  _wasm = w;
  return w;
}

/** BufferGeometry → Manifold. Watertight değilse fırlatır ("Not manifold"). */
export function geoToManifold(w: ManifoldWasm, geometry: THREE.BufferGeometry): ManifoldT {
  const { Manifold, Mesh } = w;
  // normalleri sil → mergeVertices pozisyona göre kaynasın (per-face normal weld'i bozar)
  const src = geometry.clone();
  src.deleteAttribute("normal");
  src.deleteAttribute("uv");
  const indexed = mergeVertices(src);
  const pos = indexed.attributes.position.array as ArrayLike<number>;
  const idx = indexed.index!.array as ArrayLike<number>;
  const mesh = new Mesh({ numProp: 3, vertProperties: new Float32Array(pos), triVerts: new Uint32Array(idx) });
  mesh.merge();
  return new Manifold(mesh);
}

/** Manifold → İNDEKSLİ BufferGeometry (topoloji korunur). */
export function manifoldToGeo(result: ManifoldT): THREE.BufferGeometry {
  const out = result.getMesh();
  const np = out.numProp;
  const vp = out.vertProperties;
  const tv = out.triVerts;
  const nv = Math.floor(vp.length / np);
  const positions = new Float32Array(nv * 3);
  for (let i = 0; i < nv; i += 1) {
    positions[i * 3] = vp[i * np];
    positions[i * 3 + 1] = vp[i * np + 1];
    positions[i * 3 + 2] = vp[i * np + 2];
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geo.setIndex(new THREE.Uint32BufferAttribute(new Uint32Array(tv), 1));
  geo.computeVertexNormals();
  return geo;
}

/** Manifold hacmi (mm³). API sürümüne göre volume() ya da getProperties(). */
export function manifoldVolume(m: ManifoldT): number {
  const anyM = m as unknown as {
    volume?: () => number;
    getProperties?: () => { volume: number };
  };
  if (typeof anyM.volume === "function") return Math.abs(anyM.volume());
  if (typeof anyM.getProperties === "function") return Math.abs(anyM.getProperties().volume);
  return 0;
}
