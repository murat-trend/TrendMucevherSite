import * as THREE from "three";

// OBJ (gruplu) dışa aktarım — STL grup taşıyamaz; OBJ'deki `g` grupları
// ZBrush'ta polygroup olarak gelir (Tool > Polygroups > Auto Groups da
// çalışır: parçalar ayrık kabuklar). Gövde + astar tek dosyada, ayrılabilir.

export function exportObjGrouped(parts: { name: string; geometry: THREE.BufferGeometry }[]): Blob {
  const lines: string[] = ["# Remaura Ajur — gruplu OBJ (govde/astar)"];
  let offset = 0;
  for (const part of parts) {
    const g = part.geometry;
    const pos = g.attributes.position;
    const idx = g.index!.array;
    lines.push("g " + part.name);
    for (let i = 0; i < pos.count; i += 1) {
      lines.push("v " + pos.getX(i).toFixed(5) + " " + pos.getY(i).toFixed(5) + " " + pos.getZ(i).toFixed(5));
    }
    for (let t = 0; t < idx.length; t += 3) {
      lines.push("f " + (idx[t] + 1 + offset) + " " + (idx[t + 1] + 1 + offset) + " " + (idx[t + 2] + 1 + offset));
    }
    offset += pos.count;
  }
  return new Blob([lines.join("\n")], { type: "model/obj" });
}
