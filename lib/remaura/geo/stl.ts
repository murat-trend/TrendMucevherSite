// Geometri çekirdeği — ikili STL yazıcı (tarayıcı + node ortak)
// Not: STL float32 tutar — takı zarfında kayıp < 0.05 µm (units.ts sözleşmesi,
// geo_units_test.ts kanıtı). Birim: mm (dosyada birimsiz, sektör kabulü mm).

type MeshLike = { positions: Float64Array; indices: Uint32Array };

/** Birden çok mesh'i tek ikili STL'ye yazar (paylaşılan vertex gerekmez). */
export function toBinarySTL(meshes: MeshLike[], header = "Remaura Geo"): ArrayBuffer {
  const triCount = meshes.reduce((s, m) => s + m.indices.length / 3, 0);
  const buf = new ArrayBuffer(84 + triCount * 50);
  const dv = new DataView(buf);
  new Uint8Array(buf, 0, 80).set(new TextEncoder().encode(header).slice(0, 80));
  dv.setUint32(80, triCount, true);
  let off = 84;
  for (const { positions: P, indices: I } of meshes) {
    for (let k = 0; k < I.length; k += 3) {
      const a = I[k] * 3, b = I[k + 1] * 3, c = I[k + 2] * 3;
      const ux = P[b] - P[a], uy = P[b + 1] - P[a + 1], uz = P[b + 2] - P[a + 2];
      const vx = P[c] - P[a], vy = P[c + 1] - P[a + 1], vz = P[c + 2] - P[a + 2];
      let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
      const l = Math.hypot(nx, ny, nz) || 1;
      nx /= l; ny /= l; nz /= l;
      dv.setFloat32(off, nx, true); dv.setFloat32(off + 4, ny, true); dv.setFloat32(off + 8, nz, true);
      for (const [i, base] of [[a, 12], [b, 24], [c, 36]] as const) {
        dv.setFloat32(off + base, P[i], true);
        dv.setFloat32(off + base + 4, P[i + 1], true);
        dv.setFloat32(off + base + 8, P[i + 2], true);
      }
      dv.setUint16(off + 48, 0, true);
      off += 50;
    }
  }
  return buf;
}
