"""
Spike 3: İki yolla su geçirmez katı elde etmeyi dene + gümüş ağırlığı.
  A) Topolojik onarım (keep largest + fill holes)
  B) Voxel/SDF remesh (garantili — iç içe yüzeyleri çözer)
"""
import sys, time
import numpy as np
import trimesh

path = sys.argv[1] if len(sys.argv) > 1 else r"C:\Users\Murat\Desktop\AurelleTr.stl"
AG925 = 10.36  # gümüş 925 yoğunluğu g/cm³

def weight_str(mesh):
    try:
        if mesh.volume and mesh.is_volume:
            cm3 = abs(mesh.volume) / 1000.0
            return f"{cm3:.3f} cm³  →  {cm3*AG925:.2f} g (Ag925)"
    except Exception:
        pass
    return "geçersiz (watertight değil)"

mesh = trimesh.load(path, force="mesh", process=True)
print(f"Ham: {len(mesh.faces):,} üçgen, watertight={mesh.is_watertight}\n")

# ---------- A) TOPOLOJİK ONARIM ----------
print("=== A) Topolojik onarım ===")
t = time.time()
a = mesh.copy()
# en büyük kabuğu tut
pieces = a.split(only_watertight=False)
a = max(pieces, key=lambda m: len(m.faces))
for op in (
    lambda m: m.update_faces(m.unique_faces()),
    lambda m: m.update_faces(m.nondegenerate_faces()),
    lambda m: m.remove_unreferenced_vertices(),
    lambda m: trimesh.repair.fix_winding(m),
    lambda m: trimesh.repair.fix_normals(m),
    lambda m: trimesh.repair.fill_holes(m),
):
    try: op(a)
    except Exception: pass
print(f"süre {time.time()-t:.2f}s | watertight={a.is_watertight} | is_volume={a.is_volume}")
print(f"AĞIRLIK: {weight_str(a)}\n")

# ---------- B) VOXEL REMESH ----------
print("=== B) Voxel/SDF remesh (garantili katı) ===")
for pitch in (0.15, 0.08):
    t = time.time()
    try:
        vg = mesh.voxelized(pitch=pitch)
        vg = vg.fill()  # iç boşluğu doldur → katı
        solid = vg.marching_cubes
        # KRİTİK: marching_cubes index uzayında → dünya (mm) koordinatına taşı
        solid.apply_transform(vg.transform)
        solid.process(validate=True)
        # en büyük kabuk
        ps = solid.split(only_watertight=False)
        if len(ps) > 1:
            solid = max(ps, key=lambda m: len(m.faces))
        dt = time.time()-t
        grid = vg.matrix.shape
        print(f"pitch {pitch} mm | grid {grid[0]}x{grid[1]}x{grid[2]} | "
              f"{len(solid.faces):,} üçgen | süre {dt:.2f}s")
        print(f"   watertight={solid.is_watertight} is_volume={solid.is_volume}")
        print(f"   AĞIRLIK: {weight_str(solid)}")
        # kaydet
        out = path.replace('.stl', f'_solid_{pitch}.stl')
        solid.export(out)
        print(f"   → {out}")
    except Exception as e:
        print(f"pitch {pitch}: HATA {e}")
    print()
