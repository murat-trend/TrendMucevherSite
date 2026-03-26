# ring_scale.py -- Remaura 3D AI: Ring scaling pipeline
# pip install -r scripts/requirements.txt
# -*- coding: utf-8 -*-
import sys
import io
# Force UTF-8 output so Node.js subprocess pipes don't fail on Windows
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding="utf-8", errors="replace")

import math
import argparse
import warnings
import numpy as np
import trimesh

PI = math.pi


# ---------------------------------------------------------------------------
# 1. (reserved for future size-system helpers)
# ---------------------------------------------------------------------------


# ---------------------------------------------------------------------------
# 2. Scene -> single Trimesh
# ---------------------------------------------------------------------------

def scene_to_single_mesh(loaded) -> trimesh.Trimesh:
    if isinstance(loaded, trimesh.Scene):
        meshes = [g for g in loaded.geometry.values() if isinstance(g, trimesh.Trimesh)]
        if not meshes:
            raise ValueError("No mesh geometry found in scene.")
        return trimesh.util.concatenate(meshes)
    if isinstance(loaded, trimesh.Trimesh):
        return loaded
    raise ValueError("Unsupported file content type.")


# ---------------------------------------------------------------------------
# 3. Meter -> mm normalisation  (Meshy outputs in meters)
# ---------------------------------------------------------------------------

def normalize_to_mm(mesh: trimesh.Trimesh):
    """
    Auto-detect coordinate unit and convert to millimeters.

    Meshy GLB outputs are inconsistent across generations:
      max_extent <  1.0  -> meters      (GLTF standard, e.g. 0.022 m)  -> x1000
      1.0 <= max < 10.0  -> centimeters (some Meshy models, e.g. 1.9)   -> x10
      >= 10.0            -> millimeters (already correct)

    A valid jewelry ring is always 14-40 mm outer diameter, so these
    thresholds are safe in practice.

    Returns (mesh_mm, was_converted: bool).
    """
    max_extent = float(np.max(mesh.bounding_box.extents))

    if max_extent < 1.0:
        converted = mesh.copy()
        converted.apply_scale(1000.0)
        print(f"[unit] Meters detected (max={max_extent:.5f} m) -> x1000 -> mm")
        return converted, True

    if max_extent < 10.0:
        converted = mesh.copy()
        converted.apply_scale(10.0)
        print(f"[unit] Centimeters detected (max={max_extent:.4f} cm) -> x10 -> mm")
        return converted, True

    print(f"[unit] Already mm (max={max_extent:.3f} mm)")
    return mesh, False


# ---------------------------------------------------------------------------
# 4. Estimate ring axis from OBB
# ---------------------------------------------------------------------------

def estimate_ring_axis(mesh: trimesh.Trimesh) -> np.ndarray:
    """
    The shortest OBB edge is typically aligned with the ring's finger axis.
    """
    obb = mesh.bounding_box_oriented
    extents = obb.primitive.extents
    axes = obb.primitive.transform[:3, :3]
    smallest_idx = int(np.argmin(extents))
    axis = axes[:, smallest_idx]
    return axis / np.linalg.norm(axis)


# ---------------------------------------------------------------------------
# 5. Algebraic circle fitting
# ---------------------------------------------------------------------------

def fit_circle_radius(points_2d: np.ndarray):
    x, y = points_2d[:, 0], points_2d[:, 1]
    A = np.column_stack([2 * x, 2 * y, np.ones_like(x)])
    b = x ** 2 + y ** 2
    c, *_ = np.linalg.lstsq(A, b, rcond=None)
    cx, cy, c0 = c
    radius = math.sqrt(max(c0 + cx ** 2 + cy ** 2, 0.0))
    return np.array([cx, cy]), radius


# ---------------------------------------------------------------------------
# 6. Extract loops from Path2D (multi-version trimesh support)
# ---------------------------------------------------------------------------

def extract_loops_from_path2d(path2d) -> list:
    """
    Compatible with trimesh 3.x and 4.x.
    Method A: entities + vertices  (reliable in 4.x)
    Method B: .discrete property   (older versions)
    """
    loops = []

    # Method A
    try:
        for entity in path2d.entities:
            idx = entity.points
            pts = np.asarray(path2d.vertices[idx], dtype=np.float64)
            if pts.shape[0] >= 8:
                loops.append(pts)
        if loops:
            return loops
    except Exception:
        pass

    # Method B
    try:
        for discrete in path2d.discrete:
            arr = np.asarray(discrete, dtype=np.float64)
            if arr.ndim == 2 and arr.shape[0] >= 8:
                loops.append(arr)
        if loops:
            return loops
    except Exception:
        pass

    return []


# ---------------------------------------------------------------------------
# 7. Outer diameter measurement (cross-section based)
# ---------------------------------------------------------------------------

def measure_outer_diameter_mm(mesh: trimesh.Trimesh) -> float:
    """
    Slice at center plane, fit circles to loops, return the largest
    circular loop diameter in mm.  Returns -1 on failure.
    """
    axis = estimate_ring_axis(mesh)
    center = mesh.bounding_box.centroid
    max_extent = float(np.max(mesh.bounding_box.extents))
    min_valid_radius = max_extent * 0.05

    section = mesh.section(plane_origin=center, plane_normal=axis)
    if section is None:
        print("[ring_scale] cross-section returned None")
        return -1.0

    try:
        try:
            path2d, _ = section.to_2D()
        except AttributeError:
            with warnings.catch_warnings():
                warnings.simplefilter("ignore")
                path2d, _ = section.to_planar()

        loops = extract_loops_from_path2d(path2d)
        if not loops:
            print("[ring_scale] no loops found in cross-section")
            return -1.0

        fitted = []
        for i, loop in enumerate(loops):
            if len(loop) > 1 and np.linalg.norm(loop[0] - loop[-1]) < 1e-6:
                loop = loop[:-1]
            if loop.shape[0] < 8:
                continue
            center_2d, radius = fit_circle_radius(loop)
            radial = np.linalg.norm(loop - center_2d, axis=1)
            deviation = np.std(radial) / max(np.mean(radial), 1e-9)
            if deviation < 0.30 and radius > min_valid_radius:
                fitted.append({"idx": i, "radius": radius, "dev": deviation, "pts": loop.shape[0]})

        print(f"[ring_scale] {len(fitted)} circular loop(s) detected:")
        for f in fitted:
            print(f"  loop#{f['idx']}: dia={f['radius']*2:.3f} mm  dev={f['dev']:.4f}  pts={f['pts']}")

        if not fitted:
            print("[ring_scale] no valid circular loops found")
            return -1.0

        fitted.sort(key=lambda c: c["radius"], reverse=True)
        outer_dia = fitted[0]["radius"] * 2.0
        print(f"[ring_scale] detected outer diameter: {outer_dia:.3f} mm")
        return float(outer_dia)

    except Exception as exc:
        print(f"[ring_scale] cross-section failed: {exc}")
        return -1.0


# ---------------------------------------------------------------------------
# 9. Uniform scaling
# ---------------------------------------------------------------------------

def scale_mesh_uniform(mesh: trimesh.Trimesh, factor: float) -> trimesh.Trimesh:
    scaled = mesh.copy()
    scaled.apply_scale(factor)
    return scaled


# ---------------------------------------------------------------------------
# 10. CLI entry point
# ---------------------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser(
        description="Remaura 3D Scale: scale a mesh to a target outer diameter (mm)."
    )
    parser.add_argument("--input",       required=True, help="Input file (.glb/.stl/.obj)")
    parser.add_argument("--output",      required=True, help="Output file path")
    parser.add_argument("--target-diameter-mm", required=True, type=float,
                        help="Desired outer diameter in millimeters")
    parser.add_argument("--dry-run",     action="store_true",
                        help="Measure and print only, do not save file")
    args = parser.parse_args()

    target_outer_mm = args.target_diameter_mm
    print(f"[ring_scale] target outer diameter: {target_outer_mm:.3f} mm")

    loaded = trimesh.load(args.input, force="scene")
    mesh = scene_to_single_mesh(loaded)

    mesh_mm, was_converted = normalize_to_mm(mesh)

    current_outer_mm = measure_outer_diameter_mm(mesh_mm)

    if current_outer_mm <= 0:
        print("[ring_scale] SKIP: could not detect outer diameter from cross-section.")
        print("[ring_scale] exporting original model without scaling.")
        mesh_mm.export(args.output)
        print(f"[ring_scale] Saved (unscaled): {args.output}")
        return

    scale_factor = target_outer_mm / current_outer_mm

    print("-------------------------------------")
    print(f"[ring_scale] unit conversion    : {'meters -> mm' if was_converted else 'already mm'}")
    print(f"[ring_scale] target outer dia   : {target_outer_mm:.3f} mm")
    print(f"[ring_scale] current outer dia  : {current_outer_mm:.3f} mm")
    print(f"[ring_scale] scale factor       : {scale_factor:.6f}")
    print("-------------------------------------")

    if args.dry_run:
        print("[ring_scale] Dry-run mode -- file not saved.")
        return

    scaled = scale_mesh_uniform(mesh_mm, scale_factor)

    final_outer_mm = measure_outer_diameter_mm(scaled)
    if final_outer_mm > 0:
        error_mm = final_outer_mm - target_outer_mm
        print("=====================================")
        print(f"[ring_scale] final outer diameter: {final_outer_mm:.3f} mm")
        print(f"[ring_scale] final error: {error_mm:+.3f} mm")
        print("=====================================")
    else:
        print("[ring_scale] post-scale verification: could not re-measure (non-critical)")

    scaled.export(args.output)
    print(f"[ring_scale] Saved: {args.output}")


if __name__ == "__main__":
    main()
