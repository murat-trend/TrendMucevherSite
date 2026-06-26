"""
Spike 1: Gerçek modelin sağlık analizi.
Kullanım: python scripts/hollow_spike_analyze.py "C:\\path\\model.stl"
"""
import sys, time
import numpy as np
import trimesh

path = sys.argv[1] if len(sys.argv) > 1 else r"C:\Users\Murat\Desktop\AurelleTr.stl"

t0 = time.time()
mesh = trimesh.load(path, force="mesh", process=False)
if not isinstance(mesh, trimesh.Trimesh):
    mesh = trimesh.util.concatenate(tuple(mesh.geometry.values()))
print(f"Yüklendi: {time.time()-t0:.2f}s")

print("\n=== HAM MODEL ===")
print(f"Üçgen      : {len(mesh.faces):,}")
print(f"Vertex     : {len(mesh.vertices):,}")
ext = mesh.extents
print(f"Boyut (mm) : {ext[0]:.2f} x {ext[1]:.2f} x {ext[2]:.2f}")
print(f"Watertight : {mesh.is_watertight}")
print(f"Winding tutarlı : {mesh.is_winding_consistent}")
try:
    print(f"Volume (mm³)    : {mesh.volume:,.1f}  (watertight değilse anlamsız)")
except Exception as e:
    print(f"Volume hesaplanamadı: {e}")

# Kabuk (shell) analizi
t1 = time.time()
shells = mesh.split(only_watertight=False)
print(f"\nKabuk sayısı   : {len(shells)}  (split {time.time()-t1:.2f}s)")
vols = []
for i, s in enumerate(sorted(shells, key=lambda m: len(m.faces), reverse=True)[:8]):
    try:
        v = s.volume
    except Exception:
        v = float("nan")
    vols.append((len(s.faces), v, s.is_watertight))
    print(f"  shell {i}: {len(s.faces):>8,} üçgen | watertight={s.is_watertight} | vol={v:,.1f}")

# Açık kenar (boundary) sayısı
edges = mesh.edges_sorted
unique, counts = np.unique(edges, axis=0, return_counts=True)
open_edges = int((counts == 1).sum())
nonmanifold_edges = int((counts > 2).sum())
print(f"\nAçık kenar (1 yüz)        : {open_edges:,}")
print(f"Non-manifold kenar (>2 yüz): {nonmanifold_edges:,}")

# Self-intersection kontrolü (varsa)
try:
    from trimesh import collision
    # trimesh dogrudan self-intersection saymaz; sadece bilgi
except Exception:
    pass
print(f"\nToplam analiz süresi: {time.time()-t0:.2f}s")
