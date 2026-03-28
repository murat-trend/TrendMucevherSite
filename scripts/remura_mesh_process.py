# remura_mesh_process.py -- Remaura Mesh AI: Check-Fix-Sweep Pipeline
# pip install trimesh numpy pymeshlab networkx
# -*- coding: utf-8 -*-
import sys
import io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding="utf-8", errors="replace")

import argparse
import tempfile
import shutil
import os
import builtins
import numpy as np
import trimesh
import pymeshlab
from collections import Counter

MAX_ROUNDS = 3

_orig_print = builtins.print
def print(*args, **kwargs):
    kwargs.setdefault("flush", True)
    _orig_print(*args, **kwargs)


# ---------------------------------------------------------------------------
# Utility
# ---------------------------------------------------------------------------

def load_stl(path: str) -> trimesh.Trimesh:
    loaded = trimesh.load(path, force="mesh", file_type="stl")
    if isinstance(loaded, trimesh.Scene):
        meshes = [g for g in loaded.geometry.values() if isinstance(g, trimesh.Trimesh)]
        if not meshes:
            raise ValueError("STL dosyasinda mesh bulunamadi.")
        return trimesh.util.concatenate(meshes)
    if isinstance(loaded, trimesh.Trimesh):
        return loaded
    raise ValueError("Desteklenmeyen dosya icerigi.")


def _edge_stats(mesh: trimesh.Trimesh):
    edges = mesh.edges_sorted
    counts = Counter(map(tuple, edges.tolist()))
    boundary = sum(1 for c in counts.values() if c == 1)
    non_manifold = sum(1 for c in counts.values() if c > 2)
    return boundary, non_manifold


# ---------------------------------------------------------------------------
# CHECK: analyse mesh and return all issues as a dict
# ---------------------------------------------------------------------------

def check_mesh(mesh: trimesh.Trimesh) -> dict:
    """Scan mesh for all known issues, return a diagnostics dict."""
    sys.stdout.flush()

    dup_mask = mesh.unique_faces()
    duplicate_faces = int(np.sum(~dup_mask))

    nondeg_mask = mesh.nondegenerate_faces()
    degenerate_faces = int(np.sum(~nondeg_mask))

    boundary_edges, non_manifold_edges = _edge_stats(mesh)

    shells = -1
    noise_shells = 0
    small_islands = 0
    total = len(mesh.faces)
    island_threshold = max(int(total * 0.005), 50)

    try:
        components = mesh.split(only_watertight=False)
        shells = len(components)
        noise_shells = sum(1 for c in components if len(c.faces) < 10)
        small_islands = sum(
            1 for c in components
            if len(c.faces) < island_threshold and len(c.faces) >= 10
        )
    except Exception:
        pass

    has_issues = (
        duplicate_faces > 0
        or degenerate_faces > 0
        or noise_shells > 0
        or small_islands > 0
        or non_manifold_edges > 0
    )

    return {
        "vertices": len(mesh.vertices),
        "faces": len(mesh.faces),
        "duplicate_faces": duplicate_faces,
        "degenerate_faces": degenerate_faces,
        "noise_shells": noise_shells,
        "small_islands": small_islands,
        "non_manifold_edges": non_manifold_edges,
        "boundary_edges": boundary_edges,
        "shells": shells,
        "watertight": bool(mesh.is_watertight),
        "has_issues": has_issues,
    }


def log_check(issues: dict, label: str):
    print(f"[{label}] faces={issues['faces']:,}  verts={issues['vertices']:,}  "
          f"shells={issues['shells']}  "
          f"duplicate={issues['duplicate_faces']}  degenerate={issues['degenerate_faces']}  "
          f"noise={issues['noise_shells']}  islands={issues['small_islands']}  "
          f"non_manifold={issues['non_manifold_edges']:,}  "
          f"boundary={issues['boundary_edges']:,}  "
          f"watertight={issues['watertight']}")


# ---------------------------------------------------------------------------
# FIX: repair only the issues that check_mesh found
# ---------------------------------------------------------------------------

def fix_issues(mesh: trimesh.Trimesh, issues: dict, max_hole_size: int = 1000,
               tmp_dir: str | None = None) -> trimesh.Trimesh:
    """Apply targeted repairs based on detected issues."""

    # --- trimesh fixes ---

    if issues["duplicate_faces"] > 0:
        mask = mesh.unique_faces()
        removed = int(np.sum(~mask))
        mesh.update_faces(mask)
        mesh.remove_unreferenced_vertices()
        print(f"[fix] {removed} duplicate faces removed")

    if issues["degenerate_faces"] > 0:
        mask = mesh.nondegenerate_faces()
        removed = int(np.sum(~mask))
        mesh.update_faces(mask)
        mesh.remove_unreferenced_vertices()
        print(f"[fix] {removed} degenerate faces removed")

    if issues["boundary_edges"] > 0:
        mesh.fix_normals()
        trimesh.repair.fix_inversion(mesh)
        trimesh.repair.fix_winding(mesh)
        try:
            trimesh.repair.fill_holes(mesh)
            print(f"[fix] normals fixed, simple holes filled (trimesh)")
        except Exception:
            mesh.fix_normals()
            print(f"[fix] normals fixed (hole fill skipped)")

    # --- PyMeshLab fixes (needs file round-trip) ---

    needs_pml = (issues["non_manifold_edges"] > 0 or issues["boundary_edges"] > 0)

    if needs_pml:
        if tmp_dir is None:
            tmp_dir = tempfile.mkdtemp(prefix="remura_fix_")

        pml_in = os.path.join(tmp_dir, "fix_in.stl")
        pml_out = os.path.join(tmp_dir, "fix_out.stl")
        mesh.export(pml_in, file_type="stl")

        ms = pymeshlab.MeshSet()
        ms.load_new_mesh(pml_in)

        if issues["non_manifold_edges"] > 0:
            try:
                ms.apply_filter("meshing_repair_non_manifold_edges")
                ms.apply_filter("meshing_repair_non_manifold_vertices")
                print(f"[fix] non-manifold edges+vertices repaired (pymeshlab)")
            except Exception as e:
                print(f"[fix] non-manifold repair failed: {e}")

        if issues["boundary_edges"] > 0:
            try:
                ms.apply_filter("meshing_close_holes", maxholesize=max_hole_size)
                print(f"[fix] holes closed (max edge size: {max_hole_size})")
            except Exception as e:
                print(f"[fix] hole closing failed: {e}")

        try:
            ms.apply_filter("meshing_re_orient_faces_coherentely")
        except Exception:
            pass

        ms.save_current_mesh(pml_out)
        mesh = load_stl(pml_out)

    return mesh


# ---------------------------------------------------------------------------
# SWEEP: remove debris created by the fix pass
# ---------------------------------------------------------------------------

def sweep(mesh: trimesh.Trimesh) -> trimesh.Trimesh:
    """Post-fix cleanup: noise shells, small islands, unreferenced vertices."""
    sys.stdout.flush()

    before_faces = len(mesh.faces)

    mesh.merge_vertices()

    dup_mask = mesh.unique_faces()
    if not np.all(dup_mask):
        mesh.update_faces(dup_mask)
    deg_mask = mesh.nondegenerate_faces()
    if not np.all(deg_mask):
        mesh.update_faces(deg_mask)

    noise_removed = 0
    islands_removed = 0

    try:
        components = mesh.split(only_watertight=False)
        if len(components) > 1:
            threshold = max(int(len(mesh.faces) * 0.005), 50)
            kept = []
            for c in components:
                n = len(c.faces)
                if n < 10:
                    noise_removed += 1
                elif n < threshold:
                    islands_removed += 1
                else:
                    kept.append(c)

            if not kept:
                kept = [max(components, key=lambda c: len(c.faces))]

            if noise_removed > 0 or islands_removed > 0:
                mesh = trimesh.util.concatenate(kept) if len(kept) > 1 else kept[0]
    except Exception:
        pass

    mesh.remove_unreferenced_vertices()

    after_faces = len(mesh.faces)
    delta = before_faces - after_faces

    parts = []
    if noise_removed > 0:
        parts.append(f"{noise_removed} noise shells")
    if islands_removed > 0:
        parts.append(f"{islands_removed} islands")
    if delta > 0 and not parts:
        parts.append(f"{delta} stale faces")

    if parts:
        print(f"[sweep] removed: {', '.join(parts)} ({delta:,} faces total)", flush=True)
    else:
        print(f"[sweep] clean, nothing removed", flush=True)

    return mesh


# ---------------------------------------------------------------------------
# Smooth & Decimate (unchanged from before)
# ---------------------------------------------------------------------------

def smooth_pymeshlab(input_path: str, output_path: str, iterations: int = 2):
    ms = pymeshlab.MeshSet()
    ms.load_new_mesh(input_path)
    ms.apply_filter("apply_coord_laplacian_smoothing", stepsmoothnum=iterations)
    ms.save_current_mesh(output_path)
    print(f"[smooth] {iterations} Laplacian iterations applied")


def decimate_pymeshlab(input_path: str, output_path: str, target_faces: int):
    ms = pymeshlab.MeshSet()
    ms.load_new_mesh(input_path)
    current = ms.current_mesh().face_number()
    if current <= target_faces:
        print(f"[decimate] {current:,} faces already <= target {target_faces:,}, skipping")
        ms.save_current_mesh(output_path)
        return
    ms.apply_filter(
        "meshing_decimation_quadric_edge_collapse",
        targetfacenum=target_faces,
        preservenormal=True,
        preservetopology=True,
        qualitythr=0.5,
    )
    ms.save_current_mesh(output_path)
    final = ms.current_mesh().face_number()
    print(f"[decimate] {current:,} -> {final:,} faces (target: {target_faces:,})")


# ---------------------------------------------------------------------------
# MAIN: Check-Fix-Sweep loop
# ---------------------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser(description="Remaura Mesh AI: Check-Fix-Sweep Pipeline")
    parser.add_argument("--input", required=True)
    parser.add_argument("--output", required=True)
    parser.add_argument("--cleanup", action="store_true")
    parser.add_argument("--repair", action="store_true")
    parser.add_argument("--smooth", action="store_true")
    parser.add_argument("--smooth-iterations", type=int, default=2)
    parser.add_argument("--decimate", action="store_true")
    parser.add_argument("--target-faces", type=int, default=250000)
    parser.add_argument("--max-hole-size", type=int, default=1000)
    args = parser.parse_args()

    do_repair = args.cleanup or args.repair

    print(f"[mesh] loading: {args.input}")
    mesh = load_stl(args.input)
    print(f"[mesh] loaded: {len(mesh.vertices):,} vertices, {len(mesh.faces):,} faces")

    tmp_dir = tempfile.mkdtemp(prefix="remura_mesh_")

    # --- Check-Fix-Sweep loop ---
    if do_repair:
        for rnd in range(1, MAX_ROUNDS + 1):
            print(f"\n=== ROUND {rnd}/{MAX_ROUNDS} ===")

            issues = check_mesh(mesh)
            log_check(issues, "check")

            if not issues["has_issues"]:
                print(f"[check] all clear, no fixable issues remain")
                break

            mesh = fix_issues(mesh, issues,
                              max_hole_size=args.max_hole_size,
                              tmp_dir=tmp_dir)
            mesh = sweep(mesh)
    else:
        issues = check_mesh(mesh)
        log_check(issues, "input")

    # --- Smooth (optional) ---
    if args.smooth:
        print(f"\n=== SMOOTH ===")
        smooth_in = os.path.join(tmp_dir, "pre_smooth.stl")
        smooth_out = os.path.join(tmp_dir, "post_smooth.stl")
        mesh.export(smooth_in, file_type="stl")
        smooth_pymeshlab(smooth_in, smooth_out, iterations=args.smooth_iterations)
        mesh = load_stl(smooth_out)

    # --- Decimate (optional) ---
    if args.decimate:
        print(f"\n=== DECIMATE ===")
        dec_in = os.path.join(tmp_dir, "pre_decimate.stl")
        dec_out = os.path.join(tmp_dir, "post_decimate.stl")
        mesh.export(dec_in, file_type="stl")
        decimate_pymeshlab(dec_in, dec_out, target_faces=args.target_faces)
        mesh = load_stl(dec_out)

        # Post-decimate sweep
        print(f"\n=== POST-DECIMATE SWEEP ===")
        mesh = sweep(mesh)

    # --- Final check ---
    print(f"\n{'=' * 50}")
    final = check_mesh(mesh)
    log_check(final, "output")

    mesh.export(args.output, file_type="stl")
    print(f"[mesh] DONE -> {args.output}")
    print(f"{'=' * 50}")

    try:
        shutil.rmtree(tmp_dir)
    except Exception:
        pass


if __name__ == "__main__":
    main()
