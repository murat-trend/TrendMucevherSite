"""
Spike 6: Generalized Winding Number — kendi implementasyonum (igl gerekmez).
Self-intersecting / açık / non-manifold mesh'te bile DOĞRU dolu hacim.
Detaya dokunmaz (sadece hacim integrali).
"""
import sys, time
import numpy as np
import trimesh

path = sys.argv[1] if len(sys.argv) > 1 else r"C:\Users\Murat\Desktop\AurelleTr.stl"
AG925 = 10.36

mesh = trimesh.load(path, force="mesh", process=True)
print(f"Ham: {len(mesh.faces):,} üçgen | {mesh.extents[0]:.1f}x{mesh.extents[1]:.1f}x{mesh.extents[2]:.1f} mm")

# Hacim integrali için decimate yeter (winding number hacme duyarsız, detaya değil)
try:
    import pymeshlab
    ms = pymeshlab.MeshSet(); ms.load_new_mesh(path)
    ms.apply_filter('meshing_decimation_quadric_edge_collapse', targetfacenum=12000)
    m = ms.current_mesh()
    V = m.vertex_matrix().astype(np.float64)
    F = m.face_matrix().astype(np.int64)
    print(f"Hacim hesabı için decimate: {len(F):,} üçgen")
except Exception as e:
    print(f"decimate atlandı ({e}), ham kullanılıyor")
    V = mesh.vertices.astype(np.float64); F = mesh.faces.astype(np.int64)

def winding_number(points, V, F, fchunk=20000):
    """Van Oosterom-Strackee solid angle toplamı / 4π."""
    A = V[F[:, 0]]; B = V[F[:, 1]]; C = V[F[:, 2]]
    w = np.zeros(len(points))
    for i in range(0, len(points), 256):
        P = points[i:i+256][:, None, :]          # (p,1,3)
        acc = np.zeros(len(P))
        for j in range(0, len(F), fchunk):
            a = A[j:j+fchunk] - P; b = B[j:j+fchunk] - P; c = C[j:j+fchunk] - P
            la = np.linalg.norm(a, axis=2); lb = np.linalg.norm(b, axis=2); lc = np.linalg.norm(c, axis=2)
            numer = np.einsum('pfk,pfk->pf', a, np.cross(b, c))
            denom = (la*lb*lc
                     + np.einsum('pfk,pfk->pf', a, b)*lc
                     + np.einsum('pfk,pfk->pf', b, c)*la
                     + np.einsum('pfk,pfk->pf', c, a)*lb)
            acc += np.arctan2(numer, denom).sum(axis=1)
        w[i:i+256] = acc
    return w / (2*np.pi)   # arctan2 zaten yarı-açı → /2π

t = time.time()
lo, hi = V.min(0), V.max(0)
bbox_vol = float(np.prod(hi - lo))
N = 20000
pts = lo + (hi - lo) * np.random.rand(N, 3)
w = winding_number(pts, V, F)
inside = (np.abs(w) > 0.5).mean()
cm3 = inside * bbox_vol / 1000.0
print(f"\nGWN: {N:,} nokta | {time.time()-t:.1f}s | içeride {inside*100:.2f}%")
print(f"DOĞRU HACİM: {cm3:.4f} cm³")
print(f"  Gümüş 925 : {cm3*AG925:.2f} g")
print(f"  Altın 14k : {cm3*13.1:.2f} g")
print(f"  Altın 18k : {cm3*15.6:.2f} g")
