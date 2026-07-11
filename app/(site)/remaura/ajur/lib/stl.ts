import * as THREE from "three";
import { STLLoader } from "three/examples/jsm/loaders/STLLoader.js";
import { STLExporter } from "three/examples/jsm/exporters/STLExporter.js";
import { mergeVertices } from "three/examples/jsm/utils/BufferGeometryUtils.js";

// STL dosya yardımcıları — yükleme (indeksli, weld'li) + binary export.

export async function loadStl(fileOrBlob: Blob): Promise<THREE.BufferGeometry> {
  const buf = await fileOrBlob.arrayBuffer();
  const raw = new STLLoader().parse(buf);
  // pozisyona göre weld → indeksli geometri (maske/BVH/manifold hepsi bunu ister)
  raw.deleteAttribute("normal");
  raw.deleteAttribute("uv");
  const indexed = mergeVertices(raw);
  indexed.computeVertexNormals();
  indexed.computeBoundingBox();
  return indexed;
}

export function exportStlBlob(geometry: THREE.BufferGeometry): Blob {
  const mesh = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial());
  const data = new STLExporter().parse(mesh, { binary: true }) as unknown as DataView;
  return new Blob([data.buffer as ArrayBuffer], { type: "model/stl" });
}
