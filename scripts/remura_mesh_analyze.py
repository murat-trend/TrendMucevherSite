# remura_mesh_analyze.py -- Remaura Mesh AI: STL analysis (real mesh stats)
# -*- coding: utf-8 -*-
import sys
import io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding="utf-8", errors="replace")

import json
import struct
import argparse
import os


def read_binary_stl_header(filepath: str):
    """Read triangle count directly from binary STL header (instant, no library needed)."""
    size = os.path.getsize(filepath)
    if size < 84:
        return None
    with open(filepath, "rb") as f:
        header = f.read(80)
        if header[:5] == b"solid" and b"\n" in header:
            return None
        num_triangles = struct.unpack("<I", f.read(4))[0]
        expected = 84 + num_triangles * 50
        if abs(size - expected) <= 10:
            return num_triangles
    return None


def main():
    parser = argparse.ArgumentParser(description="Analyze STL mesh and output JSON stats")
    parser.add_argument("--input", required=True, help="Input STL file")
    args = parser.parse_args()

    filepath = args.input
    file_size = os.path.getsize(filepath)

    quick_tri = read_binary_stl_header(filepath)

    try:
        import trimesh
        loaded = trimesh.load(filepath, force="mesh", file_type="stl")
        if isinstance(loaded, trimesh.Scene):
            meshes = [g for g in loaded.geometry.values() if isinstance(g, trimesh.Trimesh)]
            if not meshes:
                if quick_tri is not None:
                    print(json.dumps({
                        "vertices": quick_tri * 3,
                        "faces": quick_tri,
                        "triangles": quick_tri,
                        "polygons": quick_tri,
                        "components": -1,
                        "watertight": False,
                    }))
                    return
                print(json.dumps({"error": "Mesh bulunamadı"}))
                return
            mesh = trimesh.util.concatenate(meshes)
        elif isinstance(loaded, trimesh.Trimesh):
            mesh = loaded
        else:
            if quick_tri is not None:
                print(json.dumps({
                    "vertices": quick_tri * 3,
                    "faces": quick_tri,
                    "triangles": quick_tri,
                    "polygons": quick_tri,
                    "components": -1,
                    "watertight": False,
                }))
                return
            print(json.dumps({"error": "Desteklenmeyen dosya"}))
            return

        num_faces = int(len(mesh.faces))
        num_vertices = int(len(mesh.vertices))
        is_watertight = bool(mesh.is_watertight)

        num_components = -1
        try:
            components = mesh.split(only_watertight=False)
            num_components = len(components)
        except Exception:
            num_components = -1

        print(json.dumps({
            "vertices": num_vertices,
            "faces": num_faces,
            "triangles": num_faces,
            "polygons": num_faces,
            "components": num_components,
            "watertight": is_watertight,
        }))

    except Exception as e:
        if quick_tri is not None:
            print(json.dumps({
                "vertices": quick_tri * 3,
                "faces": quick_tri,
                "triangles": quick_tri,
                "polygons": quick_tri,
                "components": -1,
                "watertight": False,
            }))
        else:
            print(json.dumps({"error": str(e)[:200]}))


if __name__ == "__main__":
    main()
