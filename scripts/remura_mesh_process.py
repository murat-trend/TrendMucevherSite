# remura_mesh_process.py -- Remaura Mesh AI: STL cleanup, repair & decimation
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
import numpy as np
import trimesh
import pymeshlab
from collections import Counter


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


def report(mesh: trimesh.Trimesh, label: str):
    edges = mesh.edges_sorted
    edge_counts = Counter(map(tuple, edges.tolist()))
    boundary = sum(1 for c in edge_counts.values() if c == 1)
    non_manifold = sum(1 for c in edge_counts.values() if c > 2)
    print(f"[{label}] vertices={len(mesh.vertices):,}  faces={len(mesh.faces):,}  "
          f"boundary_edges={boundary:,}  non_manifold={non_manifold:,}  "
          f"watertight={mesh.is_watertight}")


def cleanup_trimesh(mesh: trimesh.Trimesh) -> trimesh.Trimesh:
    """Remove duplicate vertices/faces and degenerate triangles."""
    mesh.merge_vertices()

    unique_mask = mesh.unique_faces()
    if not np.all(unique_mask):
        removed = int(np.sum(~unique_mask))
        mesh.update_faces(unique_mask)
        print(f"[cleanup] {removed} duplicate face removed")

    nondegen_mask = mesh.nondegenerate_faces()
    if not np.all(nondegen_mask):
        removed = int(np.sum(~nondegen_mask))
        mesh.update_faces(nondegen_mask)
        print(f"[cleanup] {removed} degenerate face removed")

    mesh.remove_unreferenced_vertices()
    return mesh


def remove_small_islands(mesh: trimesh.Trimesh, min_face_ratio: float = 0.005) -> trimesh.Trimesh:
    """Remove disconnected components smaller than min_face_ratio of total faces."""
    try:
        components = mesh.split(only_watertight=False)
    except Exception as e:
        print(f"[islands] split failed: {e}")
        return mesh

    if len(components) <= 1:
        print(f"[islands] single component, nothing to remove")
        return mesh

    total_faces = len(mesh.faces)
    threshold = max(int(total_faces * min_face_ratio), 50)

    kept = [c for c in components if len(c.faces) >= threshold]
    removed_count = len(components) - len(kept)

    if not kept:
        kept = [max(components, key=lambda c: len(c.faces))]
        removed_count = len(components) - 1

    if removed_count > 0:
        removed_faces = total_faces - sum(len(c.faces) for c in kept)
        print(f"[islands] removed {removed_count} island(s) ({removed_faces:,} faces) "
              f"from {len(components)} total components, kept {len(kept)}")

    return trimesh.util.concatenate(kept) if len(kept) > 1 else kept[0]


def repair_normals(mesh: trimesh.Trimesh) -> trimesh.Trimesh:
    """Fix winding, normals, and fill simple holes via trimesh."""
    mesh.fix_normals()
    trimesh.repair.fix_inversion(mesh)
    trimesh.repair.fix_winding(mesh)
    try:
        trimesh.repair.fill_holes(mesh)
        print(f"[repair] normals fixed, holes filled (trimesh)")
    except Exception as e:
        print(f"[repair] normals fixed, hole filling failed: {e}")
    return mesh


def repair_pymeshlab(input_path: str, output_path: str,
                     fix_non_manifold: bool = True,
                     close_holes: bool = True,
                     max_hole_size: int = 1000):
    """Advanced repair using PyMeshLab: non-manifold edges/vertices, hole closing."""
    ms = pymeshlab.MeshSet()
    ms.load_new_mesh(input_path)

    before_v = ms.current_mesh().vertex_number()
    before_f = ms.current_mesh().face_number()

    if fix_non_manifold:
        try:
            ms.apply_filter("meshing_repair_non_manifold_edges")
            print(f"[repair-pml] non-manifold edges repaired")
        except Exception as e:
            print(f"[repair-pml] non-manifold edge repair failed: {e}")

        try:
            ms.apply_filter("meshing_repair_non_manifold_vertices")
            print(f"[repair-pml] non-manifold vertices repaired")
        except Exception as e:
            print(f"[repair-pml] non-manifold vertex repair failed: {e}")

    if close_holes:
        try:
            ms.apply_filter("meshing_close_holes", maxholesize=max_hole_size)
            print(f"[repair-pml] holes closed (max size: {max_hole_size})")
        except Exception as e:
            print(f"[repair-pml] hole closing failed: {e}")

    try:
        ms.apply_filter("meshing_re_orient_faces_coherentely")
        print(f"[repair-pml] face orientation fixed")
    except Exception:
        pass

    after_v = ms.current_mesh().vertex_number()
    after_f = ms.current_mesh().face_number()
    print(f"[repair-pml] vertices: {before_v:,} -> {after_v:,}, "
          f"faces: {before_f:,} -> {after_f:,}")

    ms.save_current_mesh(output_path)


def smooth_pymeshlab(input_path: str, output_path: str, iterations: int = 2):
    """Apply Laplacian smoothing via PyMeshLab."""
    ms = pymeshlab.MeshSet()
    ms.load_new_mesh(input_path)
    ms.apply_filter("apply_coord_laplacian_smoothing", stepsmoothnum=iterations)
    ms.save_current_mesh(output_path)
    print(f"[smooth] {iterations} iterations applied")


def decimate_pymeshlab(input_path: str, output_path: str, target_faces: int):
    """Quadric edge collapse decimation via PyMeshLab."""
    ms = pymeshlab.MeshSet()
    ms.load_new_mesh(input_path)
    current = ms.current_mesh().face_number()
    if current <= target_faces:
        print(f"[decimate] face count {current:,} already <= target {target_faces:,}, skipping")
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


def main():
    parser = argparse.ArgumentParser(description="Remaura Mesh Process: STL cleanup, repair & decimation")
    parser.add_argument("--input", required=True)
    parser.add_argument("--output", required=True)
    parser.add_argument("--cleanup", action="store_true", help="Remove duplicates, degenerate faces, small islands")
    parser.add_argument("--repair", action="store_true", help="Repair normals, fix non-manifold, fill/close holes")
    parser.add_argument("--smooth", action="store_true", help="Apply Laplacian smoothing")
    parser.add_argument("--smooth-iterations", type=int, default=2)
    parser.add_argument("--decimate", action="store_true", help="Decimate to target face count")
    parser.add_argument("--target-faces", type=int, default=250000)
    parser.add_argument("--max-hole-size", type=int, default=1000)
    args = parser.parse_args()

    print(f"[mesh] loading: {args.input}")
    mesh = load_stl(args.input)
    print(f"[mesh] loaded: {len(mesh.vertices):,} vertices, {len(mesh.faces):,} faces")
    report(mesh, "input")

    # --- Phase 1: trimesh cleanup ---
    if args.cleanup:
        mesh = cleanup_trimesh(mesh)
        mesh = remove_small_islands(mesh)
        report(mesh, "after-cleanup")

    # --- Phase 2: trimesh basic repair ---
    if args.repair:
        mesh = repair_normals(mesh)

    # Save intermediate for PyMeshLab phases
    tmp_dir = tempfile.mkdtemp(prefix="remura_mesh_")
    current_path = os.path.join(tmp_dir, "intermediate.stl")
    mesh.export(current_path, file_type="stl")

    # --- Phase 3: PyMeshLab advanced repair ---
    if args.repair:
        repaired_path = os.path.join(tmp_dir, "repaired.stl")
        repair_pymeshlab(
            current_path, repaired_path,
            fix_non_manifold=True,
            close_holes=True,
            max_hole_size=args.max_hole_size
        )
        current_path = repaired_path

    # --- Phase 4: Smooth ---
    if args.smooth:
        smoothed_path = os.path.join(tmp_dir, "smoothed.stl")
        smooth_pymeshlab(current_path, smoothed_path, iterations=args.smooth_iterations)
        current_path = smoothed_path

    # --- Phase 5: Decimate ---
    if args.decimate:
        decimated_path = os.path.join(tmp_dir, "decimated.stl")
        decimate_pymeshlab(current_path, decimated_path, target_faces=args.target_faces)
        current_path = decimated_path

    # --- Phase 6: Final cleanup (remove fragments created by decimation) ---
    if args.cleanup or args.decimate:
        try:
            post_mesh = load_stl(current_path)
            before_post = len(post_mesh.faces)
            post_mesh = cleanup_trimesh(post_mesh)
            post_mesh = remove_small_islands(post_mesh, min_face_ratio=0.001)
            after_post = len(post_mesh.faces)
            if after_post < before_post:
                final_cleaned = os.path.join(tmp_dir, "final_cleaned.stl")
                post_mesh.export(final_cleaned, file_type="stl")
                current_path = final_cleaned
                print(f"[final-cleanup] {before_post:,} -> {after_post:,} faces")
            else:
                print(f"[final-cleanup] no extra fragments found")
        except Exception as e:
            print(f"[final-cleanup] skipped: {e}")

    # Copy final result to output
    shutil.copy2(current_path, args.output)

    # Final report
    final_mesh = load_stl(args.output)
    print("=====================================")
    report(final_mesh, "output")
    print(f"[mesh] DONE -> {args.output}")
    print("=====================================")

    # Cleanup temp dir
    try:
        shutil.rmtree(tmp_dir)
    except Exception:
        pass


if __name__ == "__main__":
    main()
