"""
Jewelry Hollow Tool — Local Flask Server
Kullanım: pip install flask trimesh numpy
          python scripts/hollow_server.py
Sonra: http://127.0.0.1:5001/hollow
"""

from flask import Flask, request, jsonify, Response
import trimesh
import numpy as np
import tempfile
import os
import io

# Not: Tarayıcı bu server'a doğrudan değil, Next.js API route'u üzerinden
# (server-to-server) konuşur — bu yüzden CORS gerekmez.
app = Flask(__name__)

# ---------------------------------------------------------------------------
# Yardımcı: en büyük kabuğu tut
# ---------------------------------------------------------------------------
def keep_largest_shell(mesh: trimesh.Trimesh) -> trimesh.Trimesh:
    pieces = mesh.split(only_watertight=False)
    if len(pieces) <= 1:
        return mesh.copy()
    largest = max(pieces, key=lambda m: len(m.faces))
    largest.remove_unreferenced_vertices()
    return largest

# ---------------------------------------------------------------------------
# Yardımcı: temel topoloji onarımı (bozuk mücevher mesh'leri için)
# ---------------------------------------------------------------------------
def repair_mesh(mesh: trimesh.Trimesh) -> trimesh.Trimesh:
    repaired = keep_largest_shell(mesh)

    for op in (
        lambda m: m.update_faces(m.unique_faces()),
        lambda m: m.update_faces(m.nondegenerate_faces()),
        lambda m: m.remove_unreferenced_vertices(),
        lambda m: m.merge_vertices(digits_vertex=6),
        lambda m: trimesh.repair.fix_winding(m),
        lambda m: trimesh.repair.fix_normals(m),
        lambda m: trimesh.repair.fill_holes(m),
        lambda m: m.process(validate=True),
    ):
        try:
            op(repaired)
        except Exception:
            pass

    return repaired

# ---------------------------------------------------------------------------
# İç çekirdek: vertex normal yönünün tersine offset (SABİT duvar kalınlığı)
# ---------------------------------------------------------------------------
def make_inner_core(mesh: trimesh.Trimesh, wall_mm: float, invert: bool = True) -> trimesh.Trimesh:
    """
    Her vertex'i kendi yüzey normalinin tersine wall_mm kadar iter.
    Uniform scale'in aksine her yerde SABİT duvar kalınlığı verir —
    mücevher için doğru olan budur.

    invert=True  → normaller içe bakar (fast shell + boşluk hacmi için)
    invert=False → kapalı katı çekirdek (boolean fark için)
    """
    outer = mesh.copy()
    try:
        trimesh.repair.fix_normals(outer)
    except Exception:
        pass

    inner = trimesh.Trimesh(
        vertices=outer.vertices - outer.vertex_normals * wall_mm,
        faces=outer.faces.copy(),
        process=False,
    )
    if invert:
        inner.invert()  # normaller içe baksın
    else:
        # Boolean için: geçerli, kapalı bir hacim olmalı
        for op in (
            lambda m: trimesh.repair.fix_winding(m),
            lambda m: trimesh.repair.fix_normals(m),
            lambda m: m.process(validate=True),
        ):
            try:
                op(inner)
            except Exception:
                pass
    inner.remove_unreferenced_vertices()
    return inner

# ---------------------------------------------------------------------------
# Hollow: hızlı kabuk (dış + ters normal iç — boolean gerektirmez)
# ---------------------------------------------------------------------------
def hollow_fast(mesh: trimesh.Trimesh, wall_mm: float) -> trimesh.Trimesh:
    """
    Dış kabuk + içe ofsetlenmiş ters-normal iç kabuk.
    Watertight bir solid için bu iki iç içe kabuk = içi boş katı.
    """
    outer = mesh.copy()
    try:
        trimesh.repair.fix_normals(outer)
    except Exception:
        pass

    inner = make_inner_core(outer, wall_mm)
    hollow = trimesh.util.concatenate([outer, inner])
    hollow.remove_unreferenced_vertices()
    return hollow

# ---------------------------------------------------------------------------
# Hollow: gerçek boolean fark (manifold3d gerektirir — en temiz sonuç)
# ---------------------------------------------------------------------------
def hollow_boolean(mesh: trimesh.Trimesh, wall_mm: float) -> trimesh.Trimesh:
    try:
        import manifold3d  # noqa: F401
    except ImportError:
        raise RuntimeError("Boolean motoru yüklü değil.")

    outer = mesh.copy()
    try:
        trimesh.repair.fix_normals(outer)
        outer.process(validate=True)
    except Exception:
        pass
    inner = make_inner_core(outer, wall_mm, invert=False)
    result = trimesh.boolean.difference([outer, inner], engine="manifold")

    if result is None or len(result.faces) == 0:
        raise RuntimeError("Boolean sonucu boş geldi.")

    result.remove_unreferenced_vertices()
    try:
        trimesh.repair.fix_normals(result)
    except Exception:
        pass
    return result

# ---------------------------------------------------------------------------
# Endpoint: /hollow  (POST multipart/form-data)
# ---------------------------------------------------------------------------
@app.route("/hollow", methods=["POST"])
def process_hollow():
    if "file" not in request.files:
        return jsonify({"error": "Dosya gönderilmedi."}), 400

    file = request.files["file"]
    wall_mm = float(request.form.get("wallThicknessMm", 1.5))
    method = request.form.get("method", "fast")  # "fast" | "boolean"

    # Geçici dosyaya yaz
    suffix = os.path.splitext(file.filename)[1].lower() or ".stl"
    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
        file.save(tmp.name)
        tmp_path = tmp.name

    try:
        mesh = trimesh.load(tmp_path, force="mesh")
        if not isinstance(mesh, trimesh.Trimesh):
            # Scene gelirse birleştir
            mesh = trimesh.util.concatenate(list(mesh.geometry.values()))

        mesh = repair_mesh(mesh)

        vol_before = abs(mesh.volume) / 1000  # mm³ → cm³

        if method == "boolean":
            result = hollow_boolean(mesh, wall_mm)
        else:
            result = hollow_fast(mesh, wall_mm)

        # Boşluk = iç çekirdek hacmi; kalan malzeme = önce - boşluk
        cavity = abs(make_inner_core(mesh, wall_mm).volume) / 1000
        vol_after = max(vol_before - cavity, 0.0)

        # 18k altın ~15.5 g/cm³ (tahmini)
        density = 15.5
        weight_saved = cavity * density

        # STL olarak dışa aktar
        stl_bytes = result.export(file_type="stl")

        return Response(
            stl_bytes,
            mimetype="model/stl",
            headers={
                "Content-Disposition": "attachment; filename=hollow_output.stl",
                "X-Volume-Before": str(round(vol_before, 4)),
                "X-Volume-After": str(round(vol_after, 4)),
                "X-Weight-Saved": str(round(weight_saved, 2)),
                "X-Wall-Mm": str(wall_mm),
            },
        )

    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        os.unlink(tmp_path)


# ---------------------------------------------------------------------------
# Endpoint: /stats  (POST — sadece istatistik döner, dosya yok)
# ---------------------------------------------------------------------------
@app.route("/stats", methods=["POST"])
def stats_only():
    if "file" not in request.files:
        return jsonify({"error": "Dosya gönderilmedi."}), 400

    file = request.files["file"]
    wall_mm = float(request.form.get("wallThicknessMm", 1.5))
    suffix = os.path.splitext(file.filename)[1].lower() or ".stl"

    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
        file.save(tmp.name)
        tmp_path = tmp.name

    try:
        mesh = trimesh.load(tmp_path, force="mesh")
        if not isinstance(mesh, trimesh.Trimesh):
            mesh = trimesh.util.concatenate(list(mesh.geometry.values()))
        mesh = repair_mesh(mesh)

        vol_before = abs(mesh.volume) / 1000
        cavity = abs(make_inner_core(mesh, wall_mm).volume) / 1000
        vol_after = max(vol_before - cavity, 0.0)
        density = 15.5

        return jsonify({
            "wallThicknessMm": wall_mm,
            "volumeBeforeCm3": round(vol_before, 4),
            "volumeAfterCm3": round(vol_after, 4),
            "weightSavedGr": round(cavity * density, 2),
            "isWatertight": mesh.is_watertight,
            "faceCount": len(mesh.faces),
            "vertexCount": len(mesh.vertices),
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        os.unlink(tmp_path)


if __name__ == "__main__":
    print("Hollow server başlatılıyor: http://127.0.0.1:5001")
    app.run(host="127.0.0.1", port=5001, debug=False)
