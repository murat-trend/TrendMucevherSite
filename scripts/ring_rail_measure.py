# ring_rail_measure.py -- Ring Rail Resize: section-based ring measurement & scaling
# -*- coding: utf-8 -*-
import sys
import io
import builtins
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding="utf-8", errors="replace")

_orig_print = builtins.print
def print(*a, **kw):
    kw.setdefault("flush", True)
    _orig_print(*a, **kw)

import math
import json
import argparse
import warnings
from typing import Optional, Dict, Any, List, Tuple
import numpy as np
import trimesh

PI = math.pi

# ---------------------------------------------------------------------------
# Ring size conversion tables (inner diameter mm -> size number)
# ---------------------------------------------------------------------------

RING_SIZES = [
    # (inner_dia_mm, EU, US, TR)
    (14.05, 4, 3.0, 4),
    (14.45, 6, 3.5, 6),
    (14.86, 7, 4.0, 7),
    (15.27, 8, 4.5, 8),
    (15.70, 9, 5.0, 9),
    (16.10, 10, 5.5, 10),
    (16.51, 11, 6.0, 11),
    (16.92, 12, 6.5, 12),
    (17.35, 13, 7.0, 13),
    (17.75, 14, 7.5, 14),
    (18.19, 15, 8.0, 15),
    (18.53, 16, 8.5, 16),
    (18.89, 17, 9.0, 17),
    (19.41, 18, 9.5, 18),
    (19.84, 19, 10.0, 19),
    (20.20, 20, 10.5, 20),
    (20.68, 21, 11.0, 21),
    (21.08, 22, 11.5, 22),
    (21.49, 23, 12.0, 23),
    (21.89, 24, 12.5, 24),
    (22.33, 25, 13.0, 25),
    (22.60, 26, 13.5, 26),
    (23.06, 27, 14.0, 27),
    (23.47, 28, 14.5, 28),
    (23.87, 29, 15.0, 29),
    (24.27, 30, 15.5, 30),
    (24.68, 31, 16.0, 31),
    (25.08, 32, 16.5, 32),
    (25.50, 33, 17.0, 33),
    (25.94, 34, 17.5, 34),
    (26.30, 35, 18.0, 35),
    (26.71, 36, 18.5, 36),
    (27.11, 37, 19.0, 37),
    (27.53, 38, 19.5, 38),
    (27.93, 39, 20.0, 39),
    (28.33, 40, 20.5, 40),
]


def inner_dia_to_ring_sizes(inner_mm: float) -> Dict[str, Any]:
    """Find the closest ring size for EU, US, TR."""
    best = min(RING_SIZES, key=lambda r: abs(r[0] - inner_mm))
    return {
        "eu": best[1],
        "us": best[2],
        "tr": best[3],
        "ref_inner_mm": best[0],
    }


# ---------------------------------------------------------------------------
# Mesh loading & unit normalization
# ---------------------------------------------------------------------------

def load_mesh(path: str) -> trimesh.Trimesh:
    loaded = trimesh.load(path, force="mesh", file_type="stl")
    if isinstance(loaded, trimesh.Scene):
        meshes = [g for g in loaded.geometry.values() if isinstance(g, trimesh.Trimesh)]
        if not meshes:
            raise ValueError("STL dosyasinda mesh bulunamadi.")
        return trimesh.util.concatenate(meshes)
    if isinstance(loaded, trimesh.Trimesh):
        return loaded
    raise ValueError("Desteklenmeyen dosya.")


def normalize_to_mm(mesh: trimesh.Trimesh) -> trimesh.Trimesh:
    ext = float(np.max(mesh.bounding_box.extents))
    if ext < 1.0:
        mesh = mesh.copy()
        mesh.apply_scale(1000.0)
        print(f"[unit] meters detected (max={ext:.5f}) -> x1000 -> mm")
    elif ext < 10.0:
        mesh = mesh.copy()
        mesh.apply_scale(10.0)
        print(f"[unit] centimeters detected (max={ext:.4f}) -> x10 -> mm")
    else:
        print(f"[unit] already mm (max={ext:.3f})")
    return mesh


# ---------------------------------------------------------------------------
# Principal axes alignment
# ---------------------------------------------------------------------------

def align_to_principal_axes(mesh: trimesh.Trimesh) -> trimesh.Trimesh:
    """Align mesh so principal inertia axes map to X, Y, Z."""
    aligned = mesh.copy()
    centroid = aligned.centroid.copy()
    aligned.vertices -= centroid

    try:
        vectors = aligned.principal_inertia_vectors
        rot = np.eye(4)
        rot[:3, :3] = vectors.T
        aligned.apply_transform(rot)
        print(f"[align] mesh aligned to principal inertia axes")
    except Exception as e:
        print(f"[align] principal axes failed ({e}), using original orientation")

    return aligned


# ---------------------------------------------------------------------------
# Circle fitting (algebraic)
# ---------------------------------------------------------------------------

def fit_circle(points_2d: np.ndarray):
    """Returns (center, radius, residual_std)."""
    x, y = points_2d[:, 0], points_2d[:, 1]
    A = np.column_stack([2 * x, 2 * y, np.ones_like(x)])
    b = x ** 2 + y ** 2
    c, *_ = np.linalg.lstsq(A, b, rcond=None)
    cx, cy, c0 = c
    radius = math.sqrt(max(c0 + cx ** 2 + cy ** 2, 0.0))
    center = np.array([cx, cy])
    dists = np.linalg.norm(points_2d - center, axis=1)
    residual = float(np.std(dists - radius))
    return center, radius, residual


# ---------------------------------------------------------------------------
# Section analysis: extract inner/outer from a single cross-section
# ---------------------------------------------------------------------------

def analyze_section(path3d, min_inner_area_ratio: float = 0.02) -> Optional[Dict[str, Any]]:
    """
    Convert a 3D section to 2D, find outer contour and inner hole.
    Returns dict with outer_dia, inner_dia, quality metrics, or None.
    """
    if path3d is None:
        return None

    try:
        path2d, _ = path3d.to_2D()
    except AttributeError:
        try:
            with warnings.catch_warnings():
                warnings.simplefilter("ignore")
                path2d, _ = path3d.to_planar()
        except Exception:
            return None
    except Exception:
        return None

    # Strategy 1: Shapely polygons with interior rings
    try:
        polys = list(path2d.polygons_full)
        if polys:
            polys.sort(key=lambda p: p.area, reverse=True)
            outer_poly = polys[0]
            outer_ring = np.array(outer_poly.exterior.coords)

            inner_ring = None
            inner_poly_area = 0

            # İç halka: en uzun çevre DEĞİL — en büyük alanlı iç boşluk (parmak deliği).
            # Filigran / taş yuvası çevresi uzun ama alanı küçük olabilir; r.length yanlış seçim yapıyordu.
            from shapely.geometry import Polygon as ShapelyPolygon

            if outer_poly.interiors:
                best_interior = max(
                    outer_poly.interiors,
                    key=lambda r: float(ShapelyPolygon(r).area),
                )
                inner_ring = np.array(best_interior.coords)
                inner_poly_area = float(ShapelyPolygon(inner_ring).area)

            # Fallback: ayrı polygon olarak delik — en büyük alanlı ikinci parça (parmak deliği adayı)
            if inner_ring is None and len(polys) > 1:
                hole_candidates = sorted(polys[1:], key=lambda p: p.area, reverse=True)
                inner_poly = hole_candidates[0]
                inner_ring = np.array(inner_poly.exterior.coords)
                inner_poly_area = float(inner_poly.area)

            if inner_ring is None:
                return None

            # Guard: inner area must be significant relative to outer
            if inner_poly_area < outer_poly.area * min_inner_area_ratio:
                return None

            _, outer_r, outer_res = fit_circle(outer_ring[:-1] if np.allclose(outer_ring[0], outer_ring[-1]) else outer_ring)
            _, inner_r, inner_res = fit_circle(inner_ring[:-1] if np.allclose(inner_ring[0], inner_ring[-1]) else inner_ring)

            if outer_r < 1.0 or inner_r < 0.5:
                return None
            if inner_r >= outer_r:
                return None

            # Quality metrics
            outer_circ = 4 * PI * outer_poly.area / max(outer_poly.length ** 2, 1e-9)
            if inner_poly_area > 0:
                inner_sp = ShapelyPolygon(inner_ring)
                inner_circ = 4 * PI * inner_sp.area / max(inner_sp.length ** 2, 1e-9)
                inner_convexity = inner_sp.area / max(inner_sp.convex_hull.area, 1e-9)
            else:
                inner_circ = 0
                inner_convexity = 0

            # Weighted quality score (convexity is support metric, not hard gate)
            quality = (
                0.50 * min(inner_circ, 1.0)
                + 0.30 * min(1.0, 1.0 - min(inner_res / max(inner_r, 1e-9), 1.0))
                + 0.20 * min(inner_convexity, 1.0)
            )

            return {
                "outer_dia": outer_r * 2,
                "inner_dia": inner_r * 2,
                "outer_residual": outer_res,
                "inner_residual": inner_res,
                "inner_circularity": inner_circ,
                "inner_convexity": inner_convexity,
                "quality": quality,
            }
    except Exception:
        pass

    # Strategy 2: loop-based fallback (non-watertight meshes)
    try:
        loops = _extract_loops(path2d)
        if len(loops) < 2:
            return None

        fitted = []
        for loop in loops:
            if len(loop) < 10:
                continue
            pts = loop[:-1] if np.allclose(loop[0], loop[-1]) else loop
            if len(pts) < 8:
                continue
            center, radius, residual = fit_circle(pts)
            fitted.append({"radius": radius, "residual": residual, "pts": pts})

        if len(fitted) < 2:
            return None

        fitted.sort(key=lambda f: f["radius"], reverse=True)
        outer = fitted[0]
        # İkinci en büyük çember her zaman parmak deliği değil (ara boşluklar, süs delikleri).
        # Dış konturdan küçük, içerdeki EN BÜYÜK daire adayını al.
        inner_candidates = [
            f
            for f in fitted[1:]
            if f["radius"] < outer["radius"] * 0.93 and f["radius"] >= 2.5
        ]
        if not inner_candidates:
            return None
        inner = max(inner_candidates, key=lambda f: f["radius"])

        if inner["radius"] >= outer["radius"] or inner["radius"] < 0.5:
            return None

        quality = max(0, 1.0 - inner["residual"] / max(inner["radius"], 1e-9))

        return {
            "outer_dia": outer["radius"] * 2,
            "inner_dia": inner["radius"] * 2,
            "outer_residual": outer["residual"],
            "inner_residual": inner["residual"],
            "inner_circularity": 0,
            "inner_convexity": 0,
            "quality": quality,
        }
    except Exception:
        return None


def _extract_loops(path2d) -> List[np.ndarray]:
    loops = []
    try:
        for entity in path2d.entities:
            pts = np.asarray(path2d.vertices[entity.points], dtype=np.float64)
            if pts.shape[0] >= 8:
                loops.append(pts)
        if loops:
            return loops
    except Exception:
        pass
    try:
        for d in path2d.discrete:
            arr = np.asarray(d, dtype=np.float64)
            if arr.ndim == 2 and arr.shape[0] >= 8:
                loops.append(arr)
    except Exception:
        pass
    return loops


# ---------------------------------------------------------------------------
# Multi-section measurement along a candidate axis
# ---------------------------------------------------------------------------

def measure_along_axis(mesh: trimesh.Trimesh, axis: np.ndarray,
                       num_slices: int = 7) -> List[Dict[str, Any]]:
    """Take num_slices cross-sections perpendicular to axis, return valid results."""
    center = mesh.bounding_box.centroid
    extents = mesh.bounding_box.extents
    span = float(np.dot(extents, np.abs(axis))) * 0.5

    offsets = np.linspace(-span * 0.30, span * 0.30, num_slices)
    results = []

    for i, offset in enumerate(offsets):
        origin = center + axis * offset
        section = mesh.section(plane_origin=origin, plane_normal=axis)
        result = analyze_section(section)
        if result is not None:
            result["offset"] = float(offset)
            results.append(result)

    return results


# ---------------------------------------------------------------------------
# Axis selection: try X, Y, Z and pick the best for inner-hole detection
# ---------------------------------------------------------------------------

def select_best_axis(
    mesh: trimesh.Trimesh, probe_slices: int = 5
) -> Tuple[np.ndarray, str, Dict[str, Any]]:
    """
    Try 3 candidate axes, score each by inner-hole detection success.
    Returns (best_axis_vector, axis_label, score_details).
    """
    candidates = [
        (np.array([1, 0, 0], dtype=float), "X"),
        (np.array([0, 1, 0], dtype=float), "Y"),
        (np.array([0, 0, 1], dtype=float), "Z"),
    ]

    best_axis = None
    best_label = "?"
    best_score = -1
    best_detail = {}

    for axis, label in candidates:
        results = measure_along_axis(mesh, axis, num_slices=probe_slices)
        n_valid = len(results)

        if n_valid == 0:
            print(f"[axis-{label}] 0/{probe_slices} valid sections")
            continue

        inner_dias = [r["inner_dia"] for r in results]
        qualities = [r["quality"] for r in results]
        mean_inner = float(np.mean(inner_dias))
        std_inner = float(np.std(inner_dias))
        stability = 1.0 - min(std_inner / max(mean_inner, 1e-9), 1.0)
        avg_quality = float(np.mean(qualities))

        # Composite score: valid section count + stability + average quality
        score = (
            0.40 * (n_valid / probe_slices)
            + 0.35 * stability
            + 0.25 * avg_quality
        )

        print(f"[axis-{label}] {n_valid}/{probe_slices} valid | "
              f"inner={mean_inner:.2f}mm +/-{std_inner:.3f} | "
              f"stability={stability:.3f} | quality={avg_quality:.3f} | "
              f"SCORE={score:.4f}")

        if score > best_score:
            best_score = score
            best_axis = axis
            best_label = label
            best_detail = {
                "valid_sections": n_valid,
                "mean_inner": mean_inner,
                "std_inner": std_inner,
                "stability": stability,
                "avg_quality": avg_quality,
            }

    if best_axis is None:
        # OBB fallback
        obb = mesh.bounding_box_oriented
        ext = obb.primitive.extents
        axes = obb.primitive.transform[:3, :3]
        idx = int(np.argmin(ext))
        best_axis = axes[:, idx]
        best_axis = best_axis / np.linalg.norm(best_axis)
        best_label = "OBB"
        best_detail = {"fallback": True}
        print(f"[axis] fallback to OBB shortest axis")

    print(f"[axis] SELECTED: {best_label} (score={best_score:.4f})")
    return best_axis, best_label, best_detail


# ---------------------------------------------------------------------------
# Full measurement
# ---------------------------------------------------------------------------

def measure_ring(mesh: trimesh.Trimesh, num_slices: int = 7) -> Dict[str, Any]:
    """
    Complete ring measurement: align, select axis, multi-section, report.
    """
    aligned = align_to_principal_axes(mesh)
    axis, axis_label, _ = select_best_axis(aligned, probe_slices=5)

    print(f"\n=== FINAL MEASUREMENT ({num_slices} slices, axis={axis_label}) ===")
    results = measure_along_axis(aligned, axis, num_slices=num_slices)

    if not results:
        print("[measure] FAILED: no valid sections found on any axis")
        return {"error": "No valid ring cross-sections detected"}

    outer_dias = [r["outer_dia"] for r in results]
    inner_dias = [r["inner_dia"] for r in results]

    # Outlier filter: discard inner_dia values > 2 * std from median
    median_inner = float(np.median(inner_dias))
    std_inner = float(np.std(inner_dias))
    filtered = [r for r in results if abs(r["inner_dia"] - median_inner) < 2 * max(std_inner, 0.1)]

    if len(filtered) < 2:
        filtered = results

    f_outer = [r["outer_dia"] for r in filtered]
    f_inner = [r["inner_dia"] for r in filtered]

    outer_dia = float(np.median(f_outer))
    inner_dia = float(np.median(f_inner))
    inner_min = float(np.min(f_inner))
    inner_std = float(np.std(f_inner))

    # Stability warning
    stability_pct = (inner_std / max(inner_dia, 1e-9)) * 100
    if stability_pct > 5.0:
        print(f"[measure] WARNING: inner diameter variation {stability_pct:.1f}% > 5% threshold")

    ring_sizes = inner_dia_to_ring_sizes(inner_dia)

    inner_outer_ratio = float(inner_dia / max(outer_dia, 1e-9))
    inner_plausible = (
        0.22 <= inner_outer_ratio <= 0.93
        and 11.0 <= inner_dia <= 36.0
        and outer_dia >= 14.0
    )

    report = {
        "outer_diameter_mm": round(outer_dia, 3),
        "inner_diameter_mm": round(inner_dia, 3),
        "inner_diameter_min_mm": round(inner_min, 3),
        "inner_outer_ratio": round(inner_outer_ratio, 4),
        "inner_plausible": inner_plausible,
        "inner_std_mm": round(inner_std, 4),
        "stability_pct": round(stability_pct, 2),
        "stability_warning": bool(stability_pct > 5.0),
        "ring_axis": axis_label,
        "sections_used": len(filtered),
        "sections_total": num_slices,
        "watertight": bool(mesh.is_watertight),
        "ring_size_eu": ring_sizes["eu"],
        "ring_size_us": ring_sizes["us"],
        "ring_size_tr": ring_sizes["tr"],
        "ring_size_ref_mm": ring_sizes["ref_inner_mm"],
    }

    print(f"[measure] outer dia    : {outer_dia:.3f} mm")
    print(f"[measure] inner dia    : {inner_dia:.3f} mm (nominal/median)")
    print(f"[measure] inner dia min: {inner_min:.3f} mm")
    print(f"[measure] inner std    : {inner_std:.4f} mm ({stability_pct:.1f}%)")
    print(f"[measure] ring size    : EU {ring_sizes['eu']} / US {ring_sizes['us']} / TR {ring_sizes['tr']}")
    print(f"[measure] sections     : {len(filtered)}/{num_slices} used")

    return report


# ---------------------------------------------------------------------------
# Scaling with validation
# ---------------------------------------------------------------------------

SCALE_TOLERANCE_MM = 0.03
# Aşırı ölçek = yanlış iç delik ölçümü (ör. taş yuvası / filigran deliği parmak deliği sanıldı)
MAX_SAFE_SCALE_FACTOR = 2.25
MIN_SAFE_SCALE_FACTOR = 0.48

def scale_ring(mesh: trimesh.Trimesh, target_inner_mm: float) -> Tuple[trimesh.Trimesh, Dict[str, Any]]:
    """
    Scale ring to target inner diameter. Returns (scaled_mesh, report).
    """
    print(f"\n=== SCALE: target inner = {target_inner_mm:.3f} mm ===")

    pre = measure_ring(mesh)
    if "error" in pre:
        return mesh, {"error": pre["error"], "scaled": False}

    current_inner = pre["inner_diameter_mm"]
    outer_pre = float(pre.get("outer_diameter_mm") or 0.0)
    ratio = float(current_inner / max(outer_pre, 1e-9))

    if outer_pre > 5.0 and (ratio < 0.20 or ratio > 0.95):
        msg = (
            f"Ic/dis cap orani gercekci degil (ic={current_inner:.2f}mm, dis={outer_pre:.2f}mm, oran={ratio:.3f}). "
            "Parmak deligi yerine baska bir bosluk olculmus olabilir."
        )
        print(f"[scale] REJECT: {msg}")
        return mesh, {"error": msg, "scaled": False, "pre": pre}

    scale_factor = target_inner_mm / current_inner

    print(f"[scale] current inner : {current_inner:.3f} mm")
    print(f"[scale] target inner  : {target_inner_mm:.3f} mm")
    print(f"[scale] factor        : {scale_factor:.6f}")

    if scale_factor > MAX_SAFE_SCALE_FACTOR or scale_factor < MIN_SAFE_SCALE_FACTOR:
        msg = (
            f"Guvenli olcek asildi (faktor {scale_factor:.3f}; izin {MIN_SAFE_SCALE_FACTOR}–{MAX_SAFE_SCALE_FACTOR}). "
            "Olcum muhtemelen yanlis; detayli yuzuklerde kucuk delik veya tas yuvasi secilmis olabilir."
        )
        print(f"[scale] REJECT: {msg}")
        return mesh, {
            "error": msg,
            "scaled": False,
            "pre": pre,
            "scale_factor_attempted": round(scale_factor, 6),
        }

    scaled = mesh.copy()
    scaled.apply_scale(scale_factor)

    # Post-scale validation
    print(f"\n=== POST-SCALE VALIDATION ===")
    post = measure_ring(scaled)

    if "error" in post:
        print(f"[scale] WARNING: post-scale measurement failed, cannot validate")
        return scaled, {
            "scaled": True,
            "scale_factor": round(scale_factor, 6),
            "pre": pre,
            "post": None,
            "warning": "Post-scale measurement failed",
            "validation_ok": None,
            "tolerance_mm": SCALE_TOLERANCE_MM,
        }

    new_inner = post["inner_diameter_mm"]
    error_mm = new_inner - target_inner_mm

    print(f"[scale] post inner    : {new_inner:.3f} mm")
    print(f"[scale] error         : {error_mm:+.4f} mm")

    warning = None
    if abs(error_mm) > SCALE_TOLERANCE_MM:
        warning = f"Scale error {error_mm:+.4f}mm exceeds tolerance {SCALE_TOLERANCE_MM}mm"
        print(f"[scale] WARNING: {warning}")
    else:
        print(f"[scale] OK: within {SCALE_TOLERANCE_MM}mm tolerance")

    return scaled, {
        "scaled": True,
        "scale_factor": round(scale_factor, 6),
        "pre": pre,
        "post": post,
        "error_mm": round(error_mm, 4),
        "warning": warning,
        "validation_ok": abs(error_mm) <= SCALE_TOLERANCE_MM,
        "tolerance_mm": SCALE_TOLERANCE_MM,
    }


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser(description="Ring Rail Measure & Scale")
    parser.add_argument("--input", required=True)
    parser.add_argument("--output", default=None)
    parser.add_argument("--target-inner-mm", type=float, default=None)
    parser.add_argument("--measure-only", action="store_true")
    parser.add_argument("--slices", type=int, default=7)
    parser.add_argument(
        "--report-json",
        default=None,
        help="Write final JSON report to this path (for Node subprocess parsing)",
    )
    args = parser.parse_args()

    mesh = load_mesh(args.input)
    mesh = normalize_to_mm(mesh)

    if args.measure_only or args.target_inner_mm is None:
        report = measure_ring(mesh, num_slices=args.slices)
        print(f"\n=== RESULT ===")
        print(json.dumps(report, indent=2, ensure_ascii=False))
        if args.report_json:
            with open(args.report_json, "w", encoding="utf-8") as f:
                json.dump(report, f, ensure_ascii=False, indent=2)
        return

    scaled, report = scale_ring(mesh, args.target_inner_mm)

    if args.output:
        scaled.export(args.output, file_type="stl")
        print(f"\n[save] {args.output}")

    print(f"\n=== RESULT ===")
    print(json.dumps(report, indent=2, ensure_ascii=False))
    if args.report_json:
        with open(args.report_json, "w", encoding="utf-8") as f:
            json.dump(report, f, ensure_ascii=False, indent=2)


if __name__ == "__main__":
    main()
