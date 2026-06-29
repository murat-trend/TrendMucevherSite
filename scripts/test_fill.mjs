// Delik yamama pipeline doğrulama (nm sil → loop → earcut+düzlem+winding).
// node scripts/test_fill.mjs model.stl
import fs from "fs";
import { createRequire } from "module";
const require = createRequire(import.meta.url);
const _ec = require("earcut"); const earcut = _ec.default || _ec;

const path = process.argv[2] || "C:\\Users\\Murat\\Downloads\\ejder_seri_03.stl";
const raw = fs.readFileSync(path);
const dv = new DataView(raw.buffer, raw.byteOffset, raw.byteLength);
const n = dv.getUint32(80, true);
const fpos = new Float32Array(n*9); let o=84,p=0;
for (let i=0;i<n;i++){o+=12;for(let k=0;k<9;k++){fpos[p++]=dv.getFloat32(o,true);o+=4;}o+=2;}

// weld
const vmap=new Map(); const V=[]; const vid=(x,y,z)=>{const k=x.toFixed(5)+','+y.toFixed(5)+','+z.toFixed(5);const e=vmap.get(k);if(e!==undefined)return e;const id=V.length;V.push([x,y,z]);vmap.set(k,id);return id;};
let F=[]; for(let i=0;i<fpos.length;i+=9)F.push([vid(fpos[i],fpos[i+1],fpos[i+2]),vid(fpos[i+3],fpos[i+4],fpos[i+5]),vid(fpos[i+6],fpos[i+7],fpos[i+8])]);
console.log(`Ham: ${F.length.toLocaleString()} üçgen, ${V.length.toLocaleString()} vertex`);

const ek=(a,b)=>a<b?a+'_'+b:b+'_'+a;
function edgeStats(faces){const m=new Map();for(let fi=0;fi<faces.length;fi++){const f=faces[fi];for(const[a,b]of[[f[0],f[1]],[f[1],f[2]],[f[2],f[0]]]){const k=ek(a,b);let e=m.get(k);if(!e){e={c:0,he:[]};m.set(k,e);}e.c++;e.he.push([a,b,fi]);}}return m;}
let em=edgeStats(F);
let open=0,nm=0;em.forEach(e=>{if(e.c===1)open++;if(e.c>2)nm++;});
console.log(`Başlangıç: açık ${open}, non-manifold ${nm}`);

// 1) non-manifold yüzleri sil
const bad=new Set();em.forEach(e=>{if(e.c>2)e.he.forEach(h=>bad.add(h[2]));});
F=F.filter((_,i)=>!bad.has(i));
console.log(`NM yüz silindi: ${bad.size} → ${F.length.toLocaleString()} üçgen kaldı`);

// 2) açık kenar yarı-kenarları (yönlü)
em=edgeStats(F);
const boundary=[]; em.forEach(e=>{if(e.c===1)boundary.push(e.he[0]);}); // [a,b,face]
console.log(`Açık kenar (nm silindikten sonra): ${boundary.length}`);

// 3) loop chaining (from->to)
const nextFrom=new Map(); for(const h of boundary){if(!nextFrom.has(h[0]))nextFrom.set(h[0],[]);nextFrom.get(h[0]).push(h);}
const usedH=new Set(); const loops=[];
for(const h0 of boundary){const id0=h0[0]+'_'+h0[1];if(usedH.has(id0))continue;
  const loop=[h0[0]]; let cur=h0; usedH.add(id0);
  for(let g=0;g<100000;g++){loop.push(cur[1]);const cands=(nextFrom.get(cur[1])||[]).filter(x=>!usedH.has(x[0]+'_'+x[1]));if(!cands.length)break;const nx=cands[0];usedH.add(nx[0]+'_'+nx[1]);if(nx[1]===h0[0]){break;}cur=nx;}
  if(loop.length>=3)loops.push(loop);
}
console.log(`Delik (loop) sayısı: ${loops.length} · boyutlar: ${loops.map(l=>l.length).sort((a,b)=>b-a).slice(0,8).join(',')}…`);

// 4) her loop'u earcut ile yamala (düzlem + winding)
let added=0;
for(const loop of loops){
  const m=loop.length; if(m<3)continue;
  // Newell normal + centroid
  let nx=0,ny=0,nz=0,cx=0,cy=0,cz=0;
  for(let i=0;i<m;i++){const a=V[loop[i]],b=V[loop[(i+1)%m]];nx+=(a[1]-b[1])*(a[2]+b[2]);ny+=(a[2]-b[2])*(a[0]+b[0]);nz+=(a[0]-b[0])*(a[1]+b[1]);cx+=a[0];cy+=a[1];cz+=a[2];}
  const nl=Math.hypot(nx,ny,nz)||1;nx/=nl;ny/=nl;nz/=nl;cx/=m;cy/=m;cz/=m;
  // basis
  let ux=1,uy=0,uz=0; if(Math.abs(nx)>0.9){ux=0;uy=1;uz=0;}
  let vx=ny*uz-nz*uy,vy=nz*ux-nx*uz,vz=nx*uy-ny*ux; const vl=Math.hypot(vx,vy,vz)||1;vx/=vl;vy/=vl;vz/=vl;
  ux=vy*nz-vz*ny;uy=vz*nx-vx*nz;uz=vx*ny-vy*nx;
  const flat=[];for(const id of loop){const a=V[id];const dx=a[0]-cx,dy=a[1]-cy,dz=a[2]-cz;flat.push(dx*ux+dy*uy+dz*uz,dx*vx+dy*vy+dz*vz);}
  const tri=earcut(flat); // indices into loop
  const newF=[];for(let i=0;i<tri.length;i+=3)newF.push([loop[tri[i]],loop[tri[i+1]],loop[tri[i+2]]]);
  // winding: rim kenarı boundary half-edge ile AYNI yöndeyse hepsini ters çevir
  const b0=[loop[0],loop[1]]; let needFlip=false;
  for(const t of newF){for(let e=0;e<3;e++){if(t[e]===b0[0]&&t[(e+1)%3]===b0[1]){needFlip=true;}}}
  for(const t of newF){if(needFlip){const tmp=t[1];t[1]=t[2];t[2]=tmp;}F.push(t);added++;}
}
console.log(`Yama üçgeni eklendi: ${added}`);

// 5) yeniden kontrol
em=edgeStats(F);open=0;nm=0;em.forEach(e=>{if(e.c===1)open++;if(e.c>2)nm++;});
console.log(`SONUÇ: ${F.length.toLocaleString()} üçgen · açık ${open} · non-manifold ${nm} → ${open===0&&nm===0?'WATERTIGHT ✓ (detay korundu)':'hâlâ sorun var'}`);
