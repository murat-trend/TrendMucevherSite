"""
Neden bizim araç 'watertight 1 shell' derken Magics '38 shell, 139 ters normal' diyor?
Bizim JS analizini (toFixed(4) weld) trimesh ile yan yana koy.
"""
import sys
import numpy as np
import trimesh

path = sys.argv[1] if len(sys.argv) > 1 else r"C:\Users\Murat\Downloads\EfeBal__kesir_temiz.stl"

# --- HAM (weld yok) ---
raw = trimesh.load(path, force="mesh", process=False)
print(f"HAM: {len(raw.faces):,} üçgen, {len(raw.vertices):,} vertex")

# --- Bizim JS analizinin taklidi: koordinatı 4 ondalığa yuvarlayıp weld ---
V = raw.vertices
keys = np.round(V, 4)
# benzersiz key -> indeks
_, inv = np.unique(keys, axis=0, return_inverse=True)
F = inv[raw.faces]
print(f"\n[BİZİM YÖNTEM] toFixed(4) weld → {len(np.unique(inv)):,} benzersiz vertex")

# kenar -> kaç yüz
edges = np.sort(np.concatenate([F[:, [0,1]], F[:, [1,2]], F[:, [2,0]]]), axis=1)
ue, cnt = np.unique(edges, axis=0, return_counts=True)
print(f"  açık kenar (1 yüz)      : {(cnt==1).sum():,}")
print(f"  non-manifold (>2 yüz)   : {(cnt>2).sum():,}")
print(f"  → bizim 'watertight' : {(cnt==1).sum()==0 and (cnt>2).sum()==0}")

# --- TRIMESH (gerçek geometrik) ---
m = trimesh.load(path, force="mesh", process=True)
print(f"\n[TRIMESH] merge sonrası: {len(m.faces):,} üçgen, {len(m.vertices):,} vertex")
print(f"  watertight          : {m.is_watertight}")
print(f"  winding tutarlı     : {m.is_winding_consistent}  (← Magics 'ters normal')")
print(f"  is_volume           : {m.is_volume}")
e2 = m.edges_sorted
_, c2 = np.unique(e2, axis=0, return_counts=True)
print(f"  açık kenar          : {(c2==1).sum():,}")
print(f"  non-manifold        : {(c2>2).sum():,}")
sh = m.split(only_watertight=False)
print(f"  shell sayısı        : {len(sh)}  (← Magics '38 shell')")

# --- Self-intersection (kesişen üçgen) hızlı tahmini ---
try:
    # trimesh'in kendi kontrolü yok; sadece bilgi amaçlı atlanıyor
    print(f"\n  hacim (mm³)         : {abs(m.volume):.1f}")
except Exception as e:
    print(e)
