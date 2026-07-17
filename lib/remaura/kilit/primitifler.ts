// KİLİT MOTORU — SAF MESH PRİMİTİFLERİ (torus, açık tüp)
// Kapalı üreticilerde hacim ≈ analitik testi ŞARTTIR (ZINCIR.md sarım dersi).
import { KilitMesh, isaretliHacim } from "./csg";

const TOL_MM = 0.02;

function nCFor(r: number): number {
  return Math.min(48, Math.max(16, Math.ceil(Math.PI / Math.acos(Math.max(-1, 1 - TOL_MM / r)))));
}

/** alan-koruyan çokgen yarıçapı (gram yansız — zincir motoru dersi) */
function rAlan(r: number, n: number): number {
  return r * Math.sqrt((2 * Math.PI / n) / Math.sin((2 * Math.PI) / n));
}

/** Torus: merkez `m`, halka düzlem normali `eksen` ("z": xy-düzleminde halka).
 *  Rc = halka merkez yarıçapı, rTel = tel yarıçapı. */
export function torusMesh(
  Rc: number, rTel: number, m: [number, number, number] = [0, 0, 0], eksen: "z" | "y" | "x" = "z",
): KilitMesh {
  const N = Math.max(48, Math.ceil((2 * Math.PI * Rc) / Math.sqrt(8 * Rc * TOL_MM)));
  const nC = nCFor(rTel);
  const rP = rAlan(rTel, nC);
  const positions = new Float64Array(N * nC * 3);
  for (let i = 0; i < N; i++) {
    const th = (i / N) * 2 * Math.PI;
    for (let j = 0; j < nC; j++) {
      const ph = (j / nC) * 2 * Math.PI;
      const rad = Rc + rP * Math.cos(ph);
      let X = rad * Math.cos(th), Y = rad * Math.sin(th), Z = rP * Math.sin(ph);
      // eksen dönüşümü
      if (eksen === "y") { const t = Y; Y = Z; Z = -t; }
      else if (eksen === "x") { const t = X; X = Z; Z = -t; }
      const k = (i * nC + j) * 3;
      positions[k] = X + m[0]; positions[k + 1] = Y + m[1]; positions[k + 2] = Z + m[2];
    }
  }
  const indices = new Uint32Array(N * nC * 6);
  let w = 0;
  for (let i = 0; i < N; i++) {
    const ip = (i + 1) % N;
    for (let j = 0; j < nC; j++) {
      const jp = (j + 1) % nC;
      const a = i * nC + j, b = ip * nC + j, c = ip * nC + jp, e = i * nC + jp;
      indices[w++] = a; indices[w++] = b; indices[w++] = c;
      indices[w++] = a; indices[w++] = c; indices[w++] = e;
    }
  }
  const mesh: KilitMesh = { positions, indices };
  if (isaretliHacim(mesh) < 0) tersCevir(indices);
  return mesh;
}

/** Kapalı silindir (eksen x/y/z, merkezli). Sarım tutarlılığı hacimle doğrulanır. */
export function silindirMesh(
  r: number, boy: number, eksen: "x" | "y" | "z", m: [number, number, number] = [0, 0, 0],
): KilitMesh {
  const nC = nCFor(r);
  const rP = rAlan(r, nC);
  const positions = new Float64Array((nC * 2 + 2) * 3);
  const yaz = (idx: number, a: number, b: number, c: number) => {
    // (a,b) kesit düzlemi, c eksen
    let X = 0, Y = 0, Z = 0;
    if (eksen === "z") { X = a; Y = b; Z = c; }
    else if (eksen === "y") { X = a; Y = c; Z = b; }
    else { X = c; Y = a; Z = b; }
    positions[idx * 3] = X + m[0]; positions[idx * 3 + 1] = Y + m[1]; positions[idx * 3 + 2] = Z + m[2];
  };
  for (let j = 0; j < nC; j++) {
    const ph = (j / nC) * 2 * Math.PI;
    yaz(j, rP * Math.cos(ph), rP * Math.sin(ph), -boy / 2);
    yaz(nC + j, rP * Math.cos(ph), rP * Math.sin(ph), boy / 2);
  }
  yaz(nC * 2, 0, 0, -boy / 2);
  yaz(nC * 2 + 1, 0, 0, boy / 2);
  const indices = new Uint32Array(nC * 12);
  let w = 0;
  for (let j = 0; j < nC; j++) {
    const jp = (j + 1) % nC;
    indices[w++] = j; indices[w++] = jp; indices[w++] = nC + jp;
    indices[w++] = j; indices[w++] = nC + jp; indices[w++] = nC + j;
    indices[w++] = nC * 2; indices[w++] = jp; indices[w++] = j;
    indices[w++] = nC * 2 + 1; indices[w++] = nC + j; indices[w++] = nC + jp;
  }
  const mesh: KilitMesh = { positions, indices };
  if (isaretliHacim(mesh) < 0) tersCevir(indices);
  return mesh;
}

/** Açık omurga boyunca tüp (kanca): düzlemsel yol (xy), uçlar disk kapak. */
export function acikTupMesh(yol: [number, number][], rTel: number): KilitMesh {
  const nC = nCFor(rTel);
  const rP = rAlan(rTel, nC);
  const N = yol.length;
  const positions = new Float64Array((N * nC + 2) * 3);
  for (let i = 0; i < N; i++) {
    const im = Math.max(0, i - 1), ip = Math.min(N - 1, i + 1);
    let tx = yol[ip][0] - yol[im][0], ty = yol[ip][1] - yol[im][1];
    const tl = Math.hypot(tx, ty) || 1;
    tx /= tl; ty /= tl;
    const nx = ty, ny = -tx; // düzlem içi normal; binormal z
    for (let j = 0; j < nC; j++) {
      const ph = (j / nC) * 2 * Math.PI;
      const cu = Math.cos(ph) * rP, cv = Math.sin(ph) * rP;
      const k = (i * nC + j) * 3;
      positions[k] = yol[i][0] + nx * cu;
      positions[k + 1] = yol[i][1] + ny * cu;
      positions[k + 2] = cv;
    }
  }
  const c0 = N * nC, c1 = N * nC + 1;
  positions[c0 * 3] = yol[0][0]; positions[c0 * 3 + 1] = yol[0][1]; positions[c0 * 3 + 2] = 0;
  positions[c1 * 3] = yol[N - 1][0]; positions[c1 * 3 + 1] = yol[N - 1][1]; positions[c1 * 3 + 2] = 0;
  const indices = new Uint32Array((N - 1) * nC * 6 + 2 * nC * 3);
  let w = 0;
  for (let i = 0; i < N - 1; i++) {
    for (let j = 0; j < nC; j++) {
      const jp = (j + 1) % nC;
      const a = i * nC + j, b = (i + 1) * nC + j, c = (i + 1) * nC + jp, e = i * nC + jp;
      indices[w++] = a; indices[w++] = b; indices[w++] = c;
      indices[w++] = a; indices[w++] = c; indices[w++] = e;
    }
  }
  for (let j = 0; j < nC; j++) {
    const jp = (j + 1) % nC;
    // kapak sarımı duvarla ZIT (manifold şartı — ZINCIR.md dersi)
    indices[w++] = c0; indices[w++] = j; indices[w++] = jp;
    indices[w++] = c1; indices[w++] = (N - 1) * nC + jp; indices[w++] = (N - 1) * nC + j;
  }
  const mesh: KilitMesh = { positions, indices };
  if (isaretliHacim(mesh) < 0) tersCevir(indices);
  return mesh;
}

function tersCevir(indices: Uint32Array): void {
  for (let t = 0; t < indices.length; t += 3) {
    const tmp = indices[t + 1];
    indices[t + 1] = indices[t + 2];
    indices[t + 2] = tmp;
  }
}
