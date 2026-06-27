// SDF hollow doğrulama (ray-parity işaret) — deploy öncesi.
// node scripts/test_sdf.mjs "C:\\path\\model.stl" [wall]
import fs from "fs";
import { createRequire } from "module";
import * as THREE from "three";
import { MeshBVH } from "three-mesh-bvh";
const require = createRequire(import.meta.url);
const { surfaceNets } = require("isosurface");

const path = process.argv[2] || "C:\\Users\\Murat\\Downloads\\EfeBal__kesir_temiz.stl";
const wall = parseFloat(process.argv[3] || "0.8");

// --- STL binary parse ---
const raw = fs.readFileSync(path);
const dv = new DataView(raw.buffer, raw.byteOffset, raw.byteLength);
const n = dv.getUint32(80, true);
const pos = new Float32Array(n * 9);
let o = 84, p = 0;
for (let i = 0; i < n; i++) {
  o += 12; // normal atla
  for (let k = 0; k < 9; k++) { pos[p++] = dv.getFloat32(o, true); o += 4; }
  o += 2; // attr
}
console.log(`Üçgen: ${n.toLocaleString()}`);

const geo = new THREE.BufferGeometry();
geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
const bvh = new MeshBVH(geo);

// solid hacim (divergence)
let v6 = 0;
for (let i = 0; i < pos.length; i += 9) {
  const ax=pos[i],ay=pos[i+1],az=pos[i+2], bx=pos[i+3],by=pos[i+4],bz=pos[i+5], cx=pos[i+6],cy=pos[i+7],cz=pos[i+8];
  v6 += ax*(by*cz-bz*cy) - ay*(bx*cz-bz*cx) + az*(bx*cy-by*cx);
}
const solidCm3 = Math.abs(v6)/6/1000;
console.log(`Dolu hacim: ${solidCm3.toFixed(4)} cm³`);

// grid
geo.computeBoundingBox();
const bb = geo.boundingBox;
const ext = new THREE.Vector3().subVectors(bb.max, bb.min);
const maxGrid = 80;
const pitch = Math.max(ext.x,ext.y,ext.z)/(maxGrid-6);
const pad = wall + pitch*3;
const minB=[bb.min.x-pad,bb.min.y-pad,bb.min.z-pad], maxB=[bb.max.x+pad,bb.max.y+pad,bb.max.z+pad];
const M=[Math.ceil((maxB[0]-minB[0])/pitch),Math.ceil((maxB[1]-minB[1])/pitch),Math.ceil((maxB[2]-minB[2])/pitch)];
const scale=[(maxB[0]-minB[0])/M[0],(maxB[1]-minB[1])/M[1],(maxB[2]-minB[2])/M[2]];
console.log(`Grid: ${M[0]}x${M[1]}x${M[2]} (${(M[0]*M[1]*M[2]).toLocaleString()} nokta), pitch ~${pitch.toFixed(2)}mm`);

const t0 = Date.now();
const sdf = new Float32Array(M[0]*M[1]*M[2]);
const q = new THREE.Vector3(); const tgt = { point: new THREE.Vector3(), distance: 0 };
const ray = new THREE.Ray(); const dir = new THREE.Vector3(1,0.1234,0.0717).normalize();
let idx=0, insideCount=0;
for (let kz=0;kz<M[2];kz++) for (let ky=0;ky<M[1];ky++) for (let kx=0;kx<M[0];kx++,idx++){
  q.set(minB[0]+kx*scale[0],minB[1]+ky*scale[1],minB[2]+kz*scale[2]);
  bvh.closestPointToPoint(q,tgt);
  ray.origin.copy(q); ray.direction.copy(dir);
  const hits = bvh.raycast(ray, THREE.DoubleSide);
  const inside = (hits.length & 1)===1;
  if (inside) insideCount++;
  sdf[idx] = inside ? -tgt.distance : tgt.distance;
}
console.log(`SDF süre: ${((Date.now()-t0)/1000).toFixed(1)}s · içeride nokta: ${(insideCount/idx*100).toFixed(1)}%`);

// iç yüzey
const lookup=(wx,wy,wz)=>{
  let ix=Math.round((wx-minB[0])/scale[0]); if(ix<0)ix=0; else if(ix>=M[0])ix=M[0]-1;
  let iy=Math.round((wy-minB[1])/scale[1]); if(iy<0)iy=0; else if(iy>=M[1])iy=M[1]-1;
  let iz=Math.round((wz-minB[2])/scale[2]); if(iz<0)iz=0; else if(iz>=M[2])iz=M[2]-1;
  return sdf[ix+iy*M[0]+iz*M[0]*M[1]]+wall;
};
const res = surfaceNets(M, lookup, [minB,maxB]);
let c6=0;
for (const t of res.cells){ const a=res.positions[t[0]],b=res.positions[t[1]],c=res.positions[t[2]];
  c6 += a[0]*(b[1]*c[2]-b[2]*c[1]) - a[1]*(b[0]*c[2]-b[2]*c[0]) + a[2]*(b[0]*c[1]-b[1]*c[0]); }
const cavityCm3 = Math.abs(c6)/6/1000;
const matCm3 = Math.max(solidCm3-cavityCm3,0);
console.log(`İç yüzey: ${res.positions.length.toLocaleString()} vertex, ${res.cells.length.toLocaleString()} üçgen`);
console.log(`Kavite: ${cavityCm3.toFixed(4)} cm³ · Malzeme: ${matCm3.toFixed(4)} cm³ · Tasarruf %${(cavityCm3/solidCm3*100).toFixed(0)}`);
console.log(`Gümüş: dolu ${(solidCm3*10.36).toFixed(2)}g → boş ${(matCm3*10.36).toFixed(2)}g`);
