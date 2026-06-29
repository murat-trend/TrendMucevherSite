// Shrinkwrap + Hierarchical Normal-Raycast Projection (Netfabb/ZBrush ProjectAll mantığı)
// node scripts/test_project.mjs model.stl
import fs from "fs";
import { createRequire } from "module";
import * as THREE from "three";
import { MeshBVH } from "three-mesh-bvh";
const require = createRequire(import.meta.url);
const _ec = require("isosurface"); const { surfaceNets } = _ec;

const path = process.argv[2] || "C:\\Users\\Murat\\Downloads\\ejder_seri_03.stl";
const t00 = Date.now();

// --- STL parse ---
const raw = fs.readFileSync(path);
const dv = new DataView(raw.buffer, raw.byteOffset, raw.byteLength);
const n = dv.getUint32(80, true);
const op = new Float32Array(n*9); let o=84,pp=0;
for (let i=0;i<n;i++){o+=12;for(let k=0;k<9;k++){op[pp++]=dv.getFloat32(o,true);o+=4;}o+=2;}
const orig = new THREE.BufferGeometry(); orig.setAttribute("position", new THREE.BufferAttribute(op,3));
const origBVH = new MeshBVH(orig);
console.log(`Orijinal: ${n.toLocaleString()} üçgen`);

// --- 1) WRAP: unsigned SDF baz (watertight) ---
orig.computeBoundingBox(); const bb=orig.boundingBox; const ext=new THREE.Vector3().subVectors(bb.max,bb.min);
const maxGrid=90; const pitch=Math.max(ext.x,ext.y,ext.z)/(maxGrid-6); const offset=pitch*1.5;
const pad=offset+pitch*3; const minB=[bb.min.x-pad,bb.min.y-pad,bb.min.z-pad], maxB=[bb.max.x+pad,bb.max.y+pad,bb.max.z+pad];
const M=[Math.ceil((maxB[0]-minB[0])/pitch),Math.ceil((maxB[1]-minB[1])/pitch),Math.ceil((maxB[2]-minB[2])/pitch)];
const sc=[(maxB[0]-minB[0])/M[0],(maxB[1]-minB[1])/M[1],(maxB[2]-minB[2])/M[2]];
const ud=new Float32Array(M[0]*M[1]*M[2]); const q=new THREE.Vector3(); const tg={point:new THREE.Vector3(),distance:0};
let ii=0; for(let z=0;z<M[2];z++)for(let y=0;y<M[1];y++)for(let x=0;x<M[0];x++,ii++){q.set(minB[0]+x*sc[0],minB[1]+y*sc[1],minB[2]+z*sc[2]);origBVH.closestPointToPoint(q,tg);ud[ii]=tg.distance;}
const look=(wx,wy,wz)=>{let a=Math.round((wx-minB[0])/sc[0]);if(a<0)a=0;else if(a>=M[0])a=M[0]-1;let b=Math.round((wy-minB[1])/sc[1]);if(b<0)b=0;else if(b>=M[1])b=M[1]-1;let c=Math.round((wz-minB[2])/sc[2]);if(c<0)c=0;else if(c>=M[2])c=M[2]-1;return ud[a+b*M[0]+c*M[0]*M[1]]-offset;};
const sn=surfaceNets(M,look,[minB,maxB]);
// keep largest component
let P=sn.positions.map(p=>p.slice()); let Fc=sn.cells;
{const np=P.length;const par=new Int32Array(np);for(let i=0;i<np;i++)par[i]=i;const fd=x=>{while(par[x]!==x){par[x]=par[par[x]];x=par[x];}return x;};for(const t of Fc){const a=fd(t[0]),b=fd(t[1]),c=fd(t[2]);if(a!==b)par[b]=a;if(a!==c)par[c]=a;}const cnt=new Map();for(const t of Fc){const r=fd(t[0]);cnt.set(r,(cnt.get(r)||0)+1);}let best=-1,bn=0;cnt.forEach((v,k)=>{if(v>bn){bn=v;best=k;}});Fc=Fc.filter(t=>fd(t[0])===best);}
console.log(`Wrap baz: ${P.length.toLocaleString()} vertex, ${Fc.length.toLocaleString()} üçgen (watertight baz)`);

// --- helpers ---
function vnormals(P,F){const N=P.map(()=>[0,0,0]);for(const f of F){const a=P[f[0]],b=P[f[1]],c=P[f[2]];const ux=b[0]-a[0],uy=b[1]-a[1],uz=b[2]-a[2],wx=c[0]-a[0],wy=c[1]-a[1],wz=c[2]-a[2];const nx=uy*wz-uz*wy,ny=uz*wx-ux*wz,nz=ux*wy-uy*wx;for(const v of f){N[v][0]+=nx;N[v][1]+=ny;N[v][2]+=nz;}}for(const m of N){const l=Math.hypot(m[0],m[1],m[2])||1;m[0]/=l;m[1]/=l;m[2]/=l;}return N;}
function subdivide(P,F){const mid=new Map();const key=(a,b)=>a<b?a+'_'+b:b+'_'+a;const NP=P.map(p=>p.slice());const getMid=(a,b)=>{const k=key(a,b);let m=mid.get(k);if(m!==undefined)return m;const pa=P[a],pb=P[b];const id=NP.length;NP.push([(pa[0]+pb[0])/2,(pa[1]+pb[1])/2,(pa[2]+pb[2])/2]);mid.set(k,id);return id;};const NF=[];for(const f of F){const a=f[0],b=f[1],c=f[2];const ab=getMid(a,b),bc=getMid(b,c),ca=getMid(c,a);NF.push([a,ab,ca],[ab,b,bc],[ca,bc,c],[ab,bc,ca]);}return[NP,NF];}
function adjacency(P,F){const adj=P.map(()=>new Set());for(const f of F){adj[f[0]].add(f[1]);adj[f[0]].add(f[2]);adj[f[1]].add(f[0]);adj[f[1]].add(f[2]);adj[f[2]].add(f[0]);adj[f[2]].add(f[1]);}return adj;}

function project(P,F,searchDist){
  const N=vnormals(P,F); const ray=new THREE.Ray(); let snapped=0;
  for(let i=0;i<P.length;i++){
    const o=P[i],nm=N[i];
    let bestD=Infinity,bestP=null;
    for(const s of [1,-1]){
      ray.origin.set(o[0],o[1],o[2]); ray.direction.set(nm[0]*s,nm[1]*s,nm[2]*s);
      const hit=origBVH.raycastFirst(ray,THREE.DoubleSide);
      if(!hit||hit.distance>searchDist)continue;
      const fn=hit.face?.normal; if(fn){const al=fn.x*nm[0]+fn.y*nm[1]+fn.z*nm[2]; if(Math.abs(al)<0.25)continue;}
      if(hit.distance<bestD){bestD=hit.distance;bestP=hit.point;}
    }
    if(bestP){o[0]=bestP.x;o[1]=bestP.y;o[2]=bestP.z;snapped++;}
  }
  return snapped;
}
function relaxTangential(P,F,lambda=0.5){
  const N=vnormals(P,F); const adj=adjacency(P,F);
  const out=P.map(p=>p.slice());
  for(let i=0;i<P.length;i++){const ns=[...adj[i]];if(!ns.length)continue;let sx=0,sy=0,sz=0;for(const j of ns){sx+=P[j][0];sy+=P[j][1];sz+=P[j][2];}sx/=ns.length;sy/=ns.length;sz/=ns.length;let dx=sx-P[i][0],dy=sy-P[i][1],dz=sz-P[i][2];const dn=dx*N[i][0]+dy*N[i][1]+dz*N[i][2];dx-=dn*N[i][0];dy-=dn*N[i][1];dz-=dn*N[i][2];out[i][0]=P[i][0]+lambda*dx;out[i][1]=P[i][1]+lambda*dy;out[i][2]=P[i][2]+lambda*dz;}
  return out;
}

// --- 3) Hiyerarşik projeksiyon (coarse → fine) ---
let search=Math.max(ext.x,ext.y,ext.z)*0.12; // ~kaba
for(let lvl=0;lvl<3;lvl++){
  const eff=Math.max(search, offset*2.5); // base→yüzey mesafesine (offset) erişebilmeli
  const sn1=project(P,Fc,eff);
  P=relaxTangential(P,Fc,0.5);
  console.log(`Seviye ${lvl}: searchDist ${eff.toFixed(4)} · snap ${sn1.toLocaleString()}/${P.length.toLocaleString()} · üçgen ${Fc.length.toLocaleString()}`);
  if(lvl<2){[P,Fc]=subdivide(P,Fc);search/=2;}
}

// --- watertight kontrol (topoloji baz indeksinden) ---
const ek=(a,b)=>a<b?a+'_'+b:b+'_'+a; const em=new Map();
for(const f of Fc)for(const[a,b]of[[f[0],f[1]],[f[1],f[2]],[f[2],f[0]]]){const k=ek(a,b);em.set(k,(em.get(k)||0)+1);}
let open=0,nm=0;em.forEach(v=>{if(v===1)open++;if(v>2)nm++;});
console.log(`\nSONUÇ: ${Fc.length.toLocaleString()} üçgen · açık ${open} · non-manifold ${nm} → ${open===0&&nm===0?'WATERTIGHT ✓':'sorun var'} · süre ${((Date.now()-t00)/1000).toFixed(1)}s`);

// OBJ kaydet (Magics kontrolü için)
const out=path.replace(/\.stl$/i,'_project.obj'); const lines=[];
for(const p of P)lines.push(`v ${p[0]} ${p[1]} ${p[2]}`);
for(const f of Fc)lines.push(`f ${f[0]+1} ${f[1]+1} ${f[2]+1}`);
fs.writeFileSync(out,lines.join('\n'));
console.log(`→ ${out}`);
