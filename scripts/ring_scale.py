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
# 1. Ring size -> inner diameter (mm)
# ---------------------------------------------------------------------------

def size_to_inner_diameter_mm(size_value: float, system: str) -> float:
    """
    Swiss: inner circumference = size + 40 mm -> diameter = circumference / pi
    EU   : inner circumference = size mm       -> diameter = size / pi
    """
    system = system.lower().strip()
    if system == "swiss":
        circumference_mm = float(size_value) + 40.0
    elif system == "eu":
        circumference_mm = float(size_value)
    else:
        raise ValueError(f"Unknown size system: {system}")
    return circumference_mm / PI


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
# 7. Bounding-box fallback inner diameter
# ---------------------------------------------------------------------------

def inner_diameter_from_bbox(mesh: trimesh.Trimesh) -> float:
    """
    When cross-section fails: the two largest bounding-box extents approximate
    the outer diameter. Jewelry rings typically have inner/outer ratio ~ 0.83.
    """
    extents = sorted(mesh.bounding_box.extents)
    outer_diameter = (extents[1] + extents[2]) / 2.0
    inner_diameter = outer_diameter * 0.83
    print(f"[fallback] BBox extents={[round(e,3) for e in extents]} "
          f"-> outer~{outer_diameter:.3f} mm -> inner~{inner_diameter:.3f} mm")
    return float(inner_diameter)


# ---------------------------------------------------------------------------
# 8. Main inner-diameter measurement
# ---------------------------------------------------------------------------

def measure_inner_diameter_mm(mesh: trimesh.Trimesh) -> float:
    """
    Measures the inner diameter of a ring mesh (in mm).
    Requires the mesh to already be in millimeter coordinates (call normalize_to_mm first).
    Falls back to bounding-box estimation if cross-section fails.
    """
    axis = estimate_ring_axis(mesh)
    center = mesh.bounding_box.centroid

    # Minimum radius for a valid finger hole: 25% of the model's max extent.
    # This filters out decorative elements (gem settings, engravings) which
    # are much smaller than the actual ring hole.
    max_extent = float(np.max(mesh.bounding_box.extents))
    min_hole_radius = max_extent * 0.25

    section = mesh.section(plane_origin=center, plane_normal=axis)
    if section is None:
        print("[warn] Cross-section returned None -> bbox fallback")
        return inner_diameter_from_bbox(mesh)

    try:
        # to_2D (trimesh 4.x) or to_planar (older, deprecated)
        try:
            path2d, _ = section.to_2D()
        except AttributeError:
            with warnings.catch_warnings():
                warnings.simplefilter("ignore")
                path2d, _ = section.to_planar()

        loops = extract_loops_from_path2d(path2d)

        if not loops:
            print("[warn] No loops found in cross-section -> bbox fallback")
            return inner_diameter_from_bbox(mesh)

        candidates = []
        for loop in loops:
            # Remove duplicate closing point if present
            if len(loop) > 1 and np.linalg.norm(loop[0] - loop[-1]) < 1e-6:
                loop = loop[:-1]
            if loop.shape[0] < 8:
                continue
            center_2d, radius = fit_circle_radius(loop)
            radial = np.linalg.norm(loop - center_2d, axis=1)
            deviation = np.std(radial) / max(np.mean(radial), 1e-9)
            # Loop must be large enough to be a finger hole (not a decorative detail)
            # and reasonably circular
            if radius > min_hole_radius and deviation < 0.30:
                candidates.append({"radius": radius, "deviation": deviation})

        if not candidates:
            print("[warn] No valid loop candidates -> bbox fallback")
            return inner_diameter_from_bbox(mesh)

        # Smallest qualifying circular loop = inner hole
        hole = min(candidates, key=lambda c: c["radius"])
        diameter = hole["radius"] * 2.0
        print(f"[cross-section] Inner diameter: {diameter:.3f} mm "
              f"(circularity deviation: {hole['deviation']:.4f})")
        return float(diameter)

    except Exception as exc:
        print(f"[error] Cross-section failed: {exc} -> bbox fallback")
        return inner_diameter_from_bbox(mesh)


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
        description="Remaura Ring Scale: scale a ring mesh to a target ring size."
    )
    parser.add_argument("--input",       required=True, help="Input file (.glb/.stl/.obj)")
    parser.add_argument("--output",      required=True, help="Output file path")
    parser.add_argument("--size-system", required=True, choices=["eu", "swiss"])
    parser.add_argument("--size-value",  required=True, type=float)
    parser.add_argument("--dry-run",     action="store_true",
                        help="Measure and print only, do not save file")
    args = parser.parse_args()

    target_inner_diameter_mm = size_to_inner_diameter_mm(args.size_value, args.size_system)

    # Load
    loaded = trimesh.load(args.input, force="scene")
    mesh = scene_to_single_mesh(loaded)

    # Normalize units
    mesh_mm, was_converted = normalize_to_mm(mesh)

    # Measure current inner diameter
    current_inner_diameter_mm = measure_inner_diameter_mm(mesh_mm)

    if current_inner_diameter_mm <= 0:
        raise RuntimeError("Inner diameter is 0 or negative -- measurement failed.")

    scale_factor = target_inner_diameter_mm / current_inner_diameter_mm

    print("-------------------------------------")
    print(f"Unit conversion  : {'meters -> mm' if was_converted else 'already mm'}")
    print(f"Target inner dia : {target_inner_diameter_mm:.3f} mm")
    print(f"Current inner dia: {current_inner_diameter_mm:.3f} mm")
    print(f"Scale factor     : {scale_factor:.6f}")
    print("-------------------------------------")

    if args.dry_run:
        print("Dry-run mode -- file not saved.")
        return

    scaled = scale_mesh_uniform(mesh_mm, scale_factor)
    scaled.export(args.output)
    print(f"Saved: {args.output}")


if __name__ == "__main__":
    main()
