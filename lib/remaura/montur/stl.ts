// MONTÜR MOTORU — İKİLİ STL YAZICI (bağımsız; kilit evinin kendi kopyası)
type Mesh = { positions: Float64Array | Float32Array; indices: Uint32Array };

export function toBinarySTL(meshes: Mesh[], name = "Remaura Montur"): ArrayBuffer {
  const triCount = meshes.reduce((s, m) => s + m.indices.length / 3, 0);
  const buf = new ArrayBuffer(84 + triCount * 50);
  const dv = new DataView(buf);
  const enc = new TextEncoder().encode(name.slice(0, 79));
  new Uint8Array(buf, 0, 80).set(enc);
  dv.setUint32(80, triCount, true);
  let off = 84;
  for (const m of meshes) {
    const p = m.positions, idx = m.indices;
    for (let k = 0; k < idx.length; k += 3) {
      const a = idx[k] * 3, b = idx[k + 1] * 3, c = idx[k + 2] * 3;
      const ux = p[b] - p[a], uy = p[b + 1] - p[a + 1], uz = p[b + 2] - p[a + 2];
      const vx = p[c] - p[a], vy = p[c + 1] - p[a + 1], vz = p[c + 2] - p[a + 2];
      let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
      const L = Math.hypot(nx, ny, nz) || 1;
      nx /= L; ny /= L; nz /= L;
      dv.setFloat32(off, nx, true); dv.setFloat32(off + 4, ny, true); dv.setFloat32(off + 8, nz, true);
      for (const vi of [a, b, c]) {
        off += 12;
        dv.setFloat32(off, p[vi], true);
        dv.setFloat32(off + 4, p[vi + 1], true);
        dv.setFloat32(off + 8, p[vi + 2], true);
      }
      off += 14;
    }
  }
  return buf;
}
