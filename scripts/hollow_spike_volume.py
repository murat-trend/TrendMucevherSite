"""
Spike 5: DOĞRU hacim — remesh YOK, detaya dokunMAZ, igl GEREKMEZ.
İki bağımsız yöntem + çapraz doğrulama:
  A) Voxel occupancy sayımı (pitch küçüldükçe gerçeğe yakınsar)
  B) Monte Carlo ray-parity (trimesh.contains)
"""
import sys, time
import numpy as np
import trimesh
from scipy import ndimage

path = sys.argv[1] if len(sys.argv) > 1 else r"C:\Users\Murat\Desktop\AurelleTr.stl"
AG925 = 10.36

mesh = trimesh.load(path, force="mesh", process=True)
ext = mesh.extents
print(f"Model: {len(mesh.faces):,} üçgen | {ext[0]:.1f}x{ext[1]:.1f}x{ext[2]:.1f} mm\n")

def report(cm3, tag):
    print(f"  {tag}: {cm3:.4f} cm³  →  Ag925 {cm3*AG925:.2f} g | "
          f"Au14k {cm3*13.1:.2f} g | Au18k {cm3*15.6:.2f} g")

# ---------- A) Voxel occupancy (yüzey değil, DOLULUK sayımı) ----------
print("=== A) Voxel occupancy (yakınsama) ===")
for pitch in (0.10, 0.06, 0.04):
    t = time.time()
    try:
        vg = mesh.voxelized(pitch=pitch).fill()
        n = int(vg.matrix.sum())
        cm3 = n * (pitch**3) / 1000.0
        print(f"pitch {pitch} mm | {vg.matrix.shape} | dolu {n:,} voxel | {time.time()-t:.1f}s")
        report(cm3, "hacim")
    except Exception as e:
        print(f"pitch {pitch}: HATA {e}")

# ---------- B) Monte Carlo ray-parity ----------
print("\n=== B) Monte Carlo ray-parity (contains) ===")
t = time.time()
lo, hi = mesh.bounds
bbox_vol = float(np.prod(hi - lo))
N = 300_000
pts = lo + (hi - lo) * np.random.rand(N, 3)
try:
    inside = mesh.contains(pts)
    cm3 = inside.mean() * bbox_vol / 1000.0
    print(f"{N:,} nokta | {time.time()-t:.1f}s | içeride {inside.mean()*100:.1f}%")
    report(cm3, "hacim")
except Exception as e:
    print(f"HATA: {e}")
