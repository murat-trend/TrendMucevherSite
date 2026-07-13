# Çizim Koçu — ADIM 1: fotoğraftan dış silüet çıkarma (deterministik, göz kararı yok)
# Düz fonlu ürün fotoğrafından kolye ucunun dış hat(lar)ını piksel piksel ölçer.
# Parça destekli: gövde + kopuk sallantılar ayrı konturlar olarak çıkar.
# Normalize koordinat (x,y ∈ [-0.5, 0.5], y yukarı, ortak bbox) JSON'a yazılır;
# doğrulama için kontur çizili overlay PNG üretilir.
#
# python scripts/coach_extract_outline.py "<girdi.png>" [cikti_prefix] [--kes x0,y0,x1,y1]...
#   --kes: maskeden silinecek piksel dikdörtgeni (zincir gibi modele ait olmayan
#          parçalar için; birden çok verilebilir)
import sys, json
import numpy as np
from PIL import Image
from scipy import ndimage
from skimage import color, measure, morphology

args = [a for a in sys.argv[1:] if not a.startswith("--kes")]
cuts = []
it = iter(sys.argv[1:])
for a in it:
    if a == "--kes":
        cuts.append([int(v) for v in next(it).split(",")])
inp = args[0]
prefix = args[1] if len(args) > 1 else inp.rsplit(".", 1)[0]

img = np.asarray(Image.open(inp).convert("RGB"), dtype=np.float64) / 255.0
gray = color.rgb2gray(img)
H, W = gray.shape
print(f"Girdi: {inp}  {W}x{H}  kesim: {len(cuts)} bölge")

# 1) Fon modeli: fon pürüzsüz gradyan -> geniş medyanla tahmin, farkı eşikle.
#    DOKU KAPISI: gölgeler fondan koyu ama PÜRÜZSÜZ; metal ise dokulu.
#    Yerel std düşük + fark orta olan pikseller (gölge) elenir.
bg = ndimage.median_filter(gray, size=61)
diff = np.abs(gray - bg)
m1 = ndimage.uniform_filter(gray, size=9)
m2 = ndimage.uniform_filter(gray * gray, size=9)
texture = np.sqrt(np.maximum(m2 - m1 * m1, 0))
# eşikler ölçümle seçildi (kelebek probu): gölge tex~0.027/diff<0.20, metal tex>0.15
mask = (diff > max(0.035, np.percentile(diff, 90) * 0.5)) & ((texture > 0.06) | (diff > 0.25))

# 2) Kafes deliklerini köprüle + doldur + ufak gürültüyü at
mask = morphology.closing(mask, morphology.disk(9))
mask = ndimage.binary_fill_holes(mask)
mask = morphology.opening(mask, morphology.disk(3))

# 3) Modele ait olmayan bölgeleri sil (zincir vb.)
for x0, y0, x1, y1 in cuts:
    mask[y0:y1, x0:x1] = False

# 4) Parça seçimi: yeterince büyük VE merkez şeridine değen (kolye ucu düşey
#    eksende asılıdır) ya da çok büyük (gövde) bileşenler
lbl, n = ndimage.label(mask)
cx = W // 2
strip = (cx - int(0.05 * W), cx + int(0.05 * W))
parts = []
for i in range(1, n + 1):
    comp = lbl == i
    area = int(comp.sum())
    if area < 1500:
        continue
    touches_center = comp[:, strip[0]:strip[1]].any()
    if area > 0.05 * mask.sum() or touches_center:
        parts.append((area, ndimage.binary_fill_holes(comp)))
parts.sort(key=lambda t: -t[0])
print(f"bileşen: {n} -> seçilen parça: {len(parts)} (alanlar: {[a for a, _ in parts]})")

# 5) Parça başına kontur + ortak bbox ile normalize
conts, full_conts = [], []
for _, comp in parts:
    cs = measure.find_contours(comp.astype(float), 0.5)
    c = max(cs, key=len)
    full_conts.append(c)
    conts.append(measure.approximate_polygon(c, tolerance=1.8))
all_pts = np.vstack(conts)
r0, r1 = all_pts[:, 0].min(), all_pts[:, 0].max()
c0, c1 = all_pts[:, 1].min(), all_pts[:, 1].max()
h_px, w_px = r1 - r0, c1 - c0
def norm(a):
    return [[round(float((c - c0) / w_px - 0.5), 4), round(float(0.5 - (r - r0) / h_px), 4)]
            for r, c in a]
report = {
    "girdi": inp, "pikselBoyut": [int(W), int(H)],
    "bboxPx": {"x": [float(c0), float(c1)], "y": [float(r0), float(r1)]},
    "enBoyOrani": round(float(w_px / h_px), 4),  # gerçek mm bunun üstüne kalibre edilir
    "parcalar": [{"noktaSayisi": len(a), "dishat": norm(a)} for a in conts],
}
with open(f"{prefix}_dishat.json", "w", encoding="utf-8") as fh:
    json.dump(report, fh, ensure_ascii=False)

# 6) Doğrulama overlay'i
ov = (img * 255).astype(np.uint8).copy()
for cont in full_conts:
    for r, c in cont:
        rr, cc = int(r), int(c)
        ov[max(0, rr - 1):rr + 2, max(0, cc - 1):cc + 2] = [220, 30, 30]
for c in (int(c0), int(c1)):
    ov[int(r0):int(r1), max(0, c - 1):c + 2] = [30, 120, 220]
for r in (int(r0), int(r1)):
    ov[max(0, r - 1):r + 2, int(c0):int(c1)] = [30, 120, 220]
for x0, y0, x1, y1 in cuts:
    ov[y0:y1, x0:x0 + 2] = [230, 180, 40]; ov[y0:y1, x1 - 2:x1] = [230, 180, 40]
    ov[y0:y0 + 2, x0:x1] = [230, 180, 40]; ov[y1 - 2:y1, x0:x1] = [230, 180, 40]
Image.fromarray(ov).save(f"{prefix}_overlay.png")
print(f"-> {prefix}_dishat.json  (en/boy {report['enBoyOrani']}, {len(parts)} parça)")
print(f"-> {prefix}_overlay.png")
