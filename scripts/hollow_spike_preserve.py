"""
Spike 4: Dış yüzeyi KORUYARAK su geçirmez yap + doğru ağırlık.
  1) pymeshlab ile LOKAL onarım (detay korunur)
  2) libigl winding-number ile remesh YAPMADAN doğru hacim
"""
import sys, time
import numpy as np
import trimesh

path = sys.argv[1] if len(sys.argv) > 1 else r"C:\Users\Murat\Desktop\AurelleTr.stl"
AG925 = 10.36  # g/cm³

# ---------- Referans: ham mesh ----------
raw = trimesh.load(path, force="mesh", process=True)
print(f"Ham: {len(raw.faces):,} üçgen, {len(raw.vertices):,} vertex, watertight={raw.is_watertight}\n")

# ---------- 1) WINDING-NUMBER ile DOĞRU HACİM (remesh yok) ----------
print("=== 1) Winding-number hacim (detaya dokunmaz) ===")
try:
    import igl
    t = time.time()
    V = raw.vertices.astype(np.float64)
    F = raw.faces.astype(np.int32)
    # Monte Carlo: bbox içinde rastgele noktalar, GWN>0.5 = içeride
    lo, hi = V.min(0), V.max(0)
    bbox_vol = float(np.prod(hi - lo))  # mm³
    N = 2_000_000
    pts = lo + (hi - lo) * np.random.rand(N, 3)
    w = igl.fast_winding_number_for_meshes(V, F, pts.astype(np.float64))
    inside = (np.abs(w) > 0.5).mean()
    vol_mm3 = inside * bbox_vol
    cm3 = vol_mm3 / 1000.0
    print(f"süre {time.time()-t:.2f}s | {N:,} örnek")
    print(f"Hacim: {cm3:.4f} cm³")
    print(f"AĞIRLIK (Ag925): {cm3*AG925:.2f} g")
    print(f"AĞIRLIK (Au14k 13.1): {cm3*13.1:.2f} g | (Au18k 15.6): {cm3*15.6:.2f} g")
except ImportError:
    print("libigl yok, atlandı")
except Exception as e:
    print(f"HATA: {e}")

# ---------- 2) pymeshlab LOKAL ONARIM (detay korunur) ----------
print("\n=== 2) pymeshlab lokal onarım (detay korunur) ===")
try:
    import pymeshlab
    t = time.time()
    ms = pymeshlab.MeshSet()
    ms.load_new_mesh(path)
    print(f"yüklendi: {ms.current_mesh().face_number():,} üçgen")

    # Lokal temizlik — yüzeyi yeniden ÜRETMEZ
    ms.apply_filter('meshing_remove_duplicate_vertices')
    ms.apply_filter('meshing_remove_duplicate_faces')
    ms.apply_filter('meshing_remove_unreferenced_vertices')
    try:
        ms.apply_filter('meshing_remove_connected_component_by_face_number',
                        mincomponentsize=25)  # minik çöp kabukları sil
    except Exception as e:
        print(f"  (component temizliği atlandı: {e})")
    try:
        ms.apply_filter('meshing_repair_non_manifold_edges')
    except Exception as e:
        print(f"  (nm-edge onarım atlandı: {e})")
    try:
        ms.apply_filter('meshing_close_holes', maxholesize=60)
    except Exception as e:
        print(f"  (close holes atlandı: {e})")

    m = ms.current_mesh()
    print(f"süre {time.time()-t:.2f}s | sonuç: {m.face_number():,} üçgen, {m.vertex_number():,} vertex")

    out = path.replace('.stl', '_repaired.stl')
    ms.save_current_mesh(out)
    # trimesh ile doğrula
    r = trimesh.load(out, force="mesh", process=True)
    print(f"watertight={r.is_watertight} | is_volume={r.is_volume}")
    if r.is_volume:
        cm3 = abs(r.volume)/1000.0
        print(f"Hacim: {cm3:.4f} cm³ → {cm3*AG925:.2f} g (Ag925)")
    print(f"→ {out}  (ZBrush'ta aç, detay korunmuş mu bak)")
except ImportError:
    print("pymeshlab yok, atlandı")
except Exception as e:
    print(f"HATA: {e}")
