// Unsigned-SDF wrap (mesh onar) doğrulama. node scripts/test_wrap.mjs model.stl
import fs from "fs";
import { createRequire } from "module";
import * as THREE from "three";
import { MeshBVH } from "three-mesh-bvh";
const require = createRequire(import.meta.url);
const { surfaceNets } = require("isosurface");

const path = process.argv[2] || "C:\\Users\\Murat\\Downloads\\EfeBal__kesir_temiz.stl";
const raw = fs.readFileSync(path);
const dv = new DataView(raw.buffer, raw.byteOffset, raw.byteLength);
const n = dv.getUint32(80, true);
const pos = new Float32Array(n*9); let o=84,p=0;
for (let i=0;i<n;i++){ o+=12; for(let k=0;k<9;k++){pos[p++]=dv.getFloat32(o,true);o+=4;} o+=2; }
const geo = new THREE.BufferGeometry(); geo.setAttribute("position", new THREE.BufferAttribute(pos,3));
const bvh = new MeshBVH(geo);
geo.computeBoundingBox(); const bb=geo.boundingBox; const ext=new THREE.Vector3().subVectors(bb.max,bb.min);
const maxGrid=110; const pitch=Math.max(ext.x,ext.y,ext.z)/(maxGrid-6); const offset=Math.max(pitch*1.1,0.12);
const pad=offset+pitch*3; const minB=[bb.min.x-pad,bb.min.y-pad,bb.min.z-pad], maxB=[bb.max.x+pad,bb.max.y+pad,bb.max.z+pad];
const M=[Math.ceil((maxB[0]-minB[0])/pitch),Math.ceil((maxB[1]-minB[1])/pitch),Math.ceil((maxB[2]-minB[2])/pitch)];
const scale=[(maxB[0]-minB[0])/M[0],(maxB[1]-minB[1])/M[1],(maxB[2]-minB[2])/M[2]];
console.log(`Grid ${M[0]}x${M[1]}x${M[2]}, pitch ${pitch.toFixed(2)}, offset ${offset.toFixed(2)}mm`);
const t0=Date.now(); const ud=new Float32Array(M[0]*M[1]*M[2]); const q=new THREE.Vector3(); const tgt={point:new THREE.Vector3(),distance:0};
let idx=0;
for(let kz=0;kz<M[2];kz++)for(let ky=0;ky<M[1];ky++)for(let kx=0;kx<M[0];kx++,idx++){
  q.set(minB[0]+kx*scale[0],minB[1]+ky*scale[1],minB[2]+kz*scale[2]); bvh.closestPointToPoint(q,tgt); ud[idx]=tgt.distance; }
console.log(`Mesafe: ${((Date.now()-t0)/1000).toFixed(1)}s`);
const lookup=(wx,wy,wz)=>{let ix=Math.round((wx-minB[0])/scale[0]);if(ix<0)ix=0;else if(ix>=M[0])ix=M[0]-1;
  let iy=Math.round((wy-minB[1])/scale[1]);if(iy<0)iy=0;else if(iy>=M[1])iy=M[1]-1;
  let iz=Math.round((wz-minB[2])/scale[2]);if(iz<0)iz=0;else if(iz>=M[2])iz=M[2]-1;
  return ud[ix+iy*M[0]+iz*M[0]*M[1]]-offset;};
const res=surfaceNets(M,lookup,[minB,maxB]);
// en büyük bileşen
const np=res.positions.length; const par=new Int32Array(np); for(let i=0;i<np;i++)par[i]=i;
const find=x=>{while(par[x]!==x){par[x]=par[par[x]];x=par[x];}return x;};
for(const t of res.cells){const a=find(t[0]),b=find(t[1]),c=find(t[2]);if(a!==b)par[b]=a;if(a!==c)par[c]=a;}
const cnt=new Map();for(const t of res.cells){const r=find(t[0]);cnt.set(r,(cnt.get(r)||0)+1);}
let best=-1,bn=0;cnt.forEach((v,k)=>{if(v>bn){bn=v;best=k;}});
const kept=res.cells.filter(t=>find(t[0])===best);
// watertight check (weld + edge counts) + volume
const vmap=new Map(); const V=[]; const vid=(pt)=>{const k=pt.map(x=>x.toFixed(4)).join();const e=vmap.get(k);if(e!==undefined)return e;const id=V.length;vmap.set(k,id);V.push(pt);return id;};
const F=kept.map(t=>[vid(res.positions[t[0]]),vid(res.positions[t[1]]),vid(res.positions[t[2]])]);
const ec=new Map(); for(const f of F)for(const[a,b]of[[f[0],f[1]],[f[1],f[2]],[f[2],f[0]]]){const k=a<b?a+'_'+b:b+'_'+a;ec.set(k,(ec.get(k)||0)+1);}
let open=0,nm=0;ec.forEach(v=>{if(v===1)open++;if(v>2)nm++;});
let v6=0;for(const f of F){const a=V[f[0]],b=V[f[1]],c=V[f[2]];v6+=a[0]*(b[1]*c[2]-b[2]*c[1])-a[1]*(b[0]*c[2]-b[2]*c[0])+a[2]*(b[0]*c[1]-b[1]*c[0]);}
console.log(`Bileşen: ${cnt.size} → en büyük tutuldu (${kept.length.toLocaleString()} üçgen)`);
console.log(`Sonuç: açık kenar ${open}, non-manifold ${nm} → ${open===0&&nm===0?'WATERTIGHT ✓':'KAPALI DEĞİL ✗'}`);
console.log(`Wrap hacim: ${(Math.abs(v6)/6/1000).toFixed(3)} cm³ (orijinal dolu ~1.585)`);
