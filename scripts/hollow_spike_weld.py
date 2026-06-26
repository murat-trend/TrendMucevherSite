"""
Spike 2: Önce vertex kaynak (weld), SONRA gerçek sağlık analizi.
"""
import sys, time
import numpy as np
import trimesh

path = sys.argv[1] if len(sys.argv) > 1 else r"C:\Users\Murat\Desktop\AurelleTr.stl"

t0 = time.time()
# process=True → trimesh otomatik merge_vertices yapar
mesh = trimesh.load(path, force="mesh", process=True)
if not isinstance(mesh, trimesh.Trimesh):
    mesh = trimesh.util.concatenate(tuple(mesh.geometry.values()))

print(f"Yüklendi + kaynak: {time.time()-t0:.2f}s")
print("\n=== KAYNAK SONRASI ===")
print(f"Üçgen      : {len(mesh.faces):,}")
print(f"Vertex     : {len(mesh.vertices):,}")
print(f"Watertight : {mesh.is_watertight}")
print(f"Winding OK : {mesh.is_winding_consistent}")
try:
    print(f"is_volume  : {mesh.is_volume}")
    print(f"Volume mm³ : {mesh.volume:,.1f}")
except Exception as e:
    print(f"Volume: {e}")

# Açık kenar
edges = mesh.edges_sorted
_, counts = np.unique(edges, axis=0, return_counts=True)
print(f"\nAçık kenar        : {int((counts==1).sum()):,}")
print(f"Non-manifold kenar : {int((counts>2).sum()):,}")

# Gerçek kabuk sayısı (artık hızlı olmalı)
t1 = time.time()
shells = mesh.split(only_watertight=False)
print(f"\nGerçek kabuk sayısı: {len(shells)}  ({time.time()-t1:.2f}s)")
for i, s in enumerate(sorted(shells, key=lambda m: len(m.faces), reverse=True)[:10]):
    try: v = s.volume
    except Exception: v = float("nan")
    print(f"  shell {i}: {len(s.faces):>8,} üçgen | watertight={s.is_watertight} | vol={v:,.1f}")

print(f"\nToplam: {time.time()-t0:.2f}s")
