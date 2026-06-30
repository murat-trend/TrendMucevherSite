// Geometri yardımcıları — geometri-bağımsız (THREE yok). İndeksli üçgen mesh.
// Sıvının ürettiği katıları doğrulamak (watertight?) ve dışa aktarmak (STL) için.

export type IndexedMesh = {
  positions: Float32Array; // [x,y,z, x,y,z, ...]
  indices: Uint32Array; // üçgen köşe indeksleri (3'er)
};

export type MeshStats = {
  vertexCount: number;
  triangleCount: number;
  watertight: boolean;
  openEdges: number;
  nonManifoldEdges: number;
  bbox: { min: [number, number, number]; max: [number, number, number] };
};

const edgeKey = (a: number, b: number) => (a < b ? `${a}|${b}` : `${b}|${a}`);

/** Her kenar tam 2 üçgen tarafından paylaşılıyorsa watertight (kapalı manifold). */
export function analyzeMesh(mesh: IndexedMesh): MeshStats {
  const { positions, indices } = mesh;
  const counts = new Map<string, number>();
  for (let t = 0; t < indices.length; t += 3) {
    const a = indices[t], b = indices[t + 1], c = indices[t + 2];
    for (const [u, v] of [[a, b], [b, c], [c, a]] as const) {
      const k = edgeKey(u, v);
      counts.set(k, (counts.get(k) ?? 0) + 1);
    }
  }
  let openEdges = 0, nonManifoldEdges = 0;
  counts.forEach((n) => {
    if (n === 1) openEdges += 1;
    else if (n > 2) nonManifoldEdges += 1;
  });

  const min: [number, number, number] = [Infinity, Infinity, Infinity];
  const max: [number, number, number] = [-Infinity, -Infinity, -Infinity];
  for (let i = 0; i < positions.length; i += 3) {
    for (let d = 0; d < 3; d += 1) {
      const val = positions[i + d];
      if (val < min[d]) min[d] = val;
      if (val > max[d]) max[d] = val;
    }
  }

  return {
    vertexCount: positions.length / 3,
    triangleCount: indices.length / 3,
    watertight: openEdges === 0 && nonManifoldEdges === 0,
    openEdges,
    nonManifoldEdges,
    bbox: { min, max },
  };
}

/** İndeksli mesh → binary STL (görüntüleme/baskı için). */
export function meshToBinaryStl(mesh: IndexedMesh): Uint8Array {
  const { positions, indices } = mesh;
  const triCount = indices.length / 3;
  const buf = new ArrayBuffer(84 + triCount * 50);
  const view = new DataView(buf);
  const bytes = new Uint8Array(buf);
  // 80 bayt başlık (nötr — servis adı yok)
  bytes.set(new TextEncoder().encode("Remaura Sivi relief"), 0);
  view.setUint32(80, triCount, true);

  const nrm = (ax: number, ay: number, az: number, bx: number, by: number, bz: number, cx: number, cy: number, cz: number) => {
    const ux = bx - ax, uy = by - ay, uz = bz - az;
    const vx = cx - ax, vy = cy - ay, vz = cz - az;
    const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
    const len = Math.hypot(nx, ny, nz) || 1;
    return [nx / len, ny / len, nz / len] as const;
  };

  let o = 84;
  for (let t = 0; t < indices.length; t += 3) {
    const i0 = indices[t] * 3, i1 = indices[t + 1] * 3, i2 = indices[t + 2] * 3;
    const ax = positions[i0], ay = positions[i0 + 1], az = positions[i0 + 2];
    const bx = positions[i1], by = positions[i1 + 1], bz = positions[i1 + 2];
    const cx = positions[i2], cy = positions[i2 + 1], cz = positions[i2 + 2];
    const [nx, ny, nz] = nrm(ax, ay, az, bx, by, bz, cx, cy, cz);
    view.setFloat32(o, nx, true); view.setFloat32(o + 4, ny, true); view.setFloat32(o + 8, nz, true);
    view.setFloat32(o + 12, ax, true); view.setFloat32(o + 16, ay, true); view.setFloat32(o + 20, az, true);
    view.setFloat32(o + 24, bx, true); view.setFloat32(o + 28, by, true); view.setFloat32(o + 32, bz, true);
    view.setFloat32(o + 36, cx, true); view.setFloat32(o + 40, cy, true); view.setFloat32(o + 44, cz, true);
    view.setUint16(o + 48, 0, true);
    o += 50;
  }
  return bytes;
}
