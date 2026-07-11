import * as THREE from "three";
import { mergeVertices } from "three/examples/jsm/utils/BufferGeometryUtils.js";

// Tarayıcıda QEM sadeleştirme (meshoptimizer) — poligon sınırını aşan modeli
// KULLANICI ONAYIYLA sınır altına indirir. ajurPipeline'daki doğrulanmış kod.
// KRİTİK: weld'den ÖNCE normalleri sil — yoksa mergeVertices pozisyon aynı
// olsa bile birleştirmez ve meshopt 0 üçgen döndürür (Boudica dersi).

export async function decimateGeometry(
  geometry: THREE.BufferGeometry,
  targetTris: number,
): Promise<THREE.BufferGeometry> {
  const src = geometry.clone();
  src.deleteAttribute("normal");
  src.deleteAttribute("uv");
  const indexed = mergeVertices(src);
  const idx = indexed.index!.array as ArrayLike<number>;
  const pos = indexed.attributes.position.array as Float32Array;
  const curTris = idx.length / 3;
  if (curTris <= targetTris) return indexed;

  const { MeshoptSimplifier } = await import("meshoptimizer");
  await MeshoptSimplifier.ready;
  const indexU32 = idx instanceof Uint32Array ? idx : new Uint32Array(idx);
  const posF32 = pos instanceof Float32Array ? pos : new Float32Array(pos);
  const [newIdx] = MeshoptSimplifier.simplify(indexU32, posF32, 3, targetTris * 3, 1.0, ["Prune"]);

  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(posF32, 3));
  geo.setIndex(new THREE.Uint32BufferAttribute(new Uint32Array(newIdx), 1));
  geo.computeVertexNormals();
  geo.computeBoundingBox();
  return geo;
}
