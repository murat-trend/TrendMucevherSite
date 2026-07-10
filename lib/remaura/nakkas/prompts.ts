/**
 * NAKKAŞ — desen üretici prompt reçetesi (izole deney).
 *
 * Çıktı = forma UYGULANACAK DESEN (bitmiş bordürlü madalyon DEĞİL).
 * İki mod: "yuzey" (tekrarlanan all-over ornament, kareyi doldurur → forma clip'lenir),
 *          "band"  (yatayda seamless → yüzük bandına sarılır).
 * TAŞ YOK — saf metal ornament. RENK YOK — mesh için tek-ton mat oksit gümüş
 * (renk/iki-ton image-to-3D'yi bozar; metal rengi sonra CAD'de seçilir).
 */

export type NakkasStyleKey =
  | "osmanli" | "telkari" | "arabesk" | "barok" | "gotik" | "artnouveau"
  | "selcuklu" | "viktorya" | "western" | "kelt" | "artdeco" | "biker"
  | "monogram" | "dini" | "minimal" | "doga" | "heraldik"
  // İnanç / maneviyat / geometri (2026-07-04 eklendi)
  | "hindu" | "budist" | "hristiyan" | "yahudi"
  | "spiritual" | "reiki" | "ateist" | "yoga" | "geometrik"
  // Kültür / mitoloji / tema (2026-07-04 eklendi)
  | "sufi" | "nazar" | "misir" | "zodyak" | "japon" | "viking" | "ask" | "astronomi";

export type NakkasMode = "yuzey" | "band";

/** Tarz presetleri — {i18n anahtarı: prompt parçası}. UI etiketi sözlükten gelir. */
export const NAKKAS_STYLES: Record<NakkasStyleKey, string> = {
  osmanli: "Ottoman court ornament, rumi and hatai motifs, tulip and carnation, İznik-inspired arabesque scrollwork",
  telkari: "Anatolian/Mardin telkari filigree, dense twisted-wire lacework, heavy granulation beadwork",
  arabesk: "Islamic arabesque, interlacing vegetal scrolls, girih geometry, symmetric repeating ornament",
  barok: "Baroque acanthus scrollwork, ornate European volutes, rich foliate scrolls",
  gotik: "Gothic cathedral tracery, pointed arches, fleur-de-lis, ornate cross motifs",
  artnouveau: "Art Nouveau flowing floral, organic vines, leaves and blossoms, whiplash curves",
  selcuklu: "Seljuk geometric interlace, star-and-polygon girih, knotwork",
  viktorya: "Victorian antique lace-like filigree, delicate scrolls, milgrain detailing",
  western: "Western bright-cut scroll engraving, cowboy/rodeo tradition, oak-leaf and acanthus Western scrolls, deep chiseled relief (belt-buckle & Colt engraving style)",
  kelt: "Celtic knotwork, interwoven eternal knots, triquetra and spirals, raised interlaced bands, Book-of-Kells insular style",
  artdeco: "Art Deco geometric ornament, 1920s luxury, stepped symmetry, sunburst and chevron, sleek geometric lines",
  biker: "biker / rocker aesthetic — bold, heavy, masculine deep relief with a gothic edge; skulls / memento-mori, chains and thorns, plus any requested motifs (e.g. motorcycles, helmets, engines, flames) rendered in the same chiseled biker style",
  monogram: "elegant intertwined monogram / initials (use the exact letters given in the description), ornate calligraphic entwined letters woven into scrollwork",
  dini: "elegant religious ornament with fine Arabic calligraphy (render the exact Arabic text given in the description, e.g. ماشاءالله / الله), woven into symmetric arabesque",
  minimal: "modern minimalist ornament, clean fine line-art, subtle shallow relief, contemporary geometric elegance",
  doga: "nature and animal motifs — render the specific creatures named in the request (e.g. fish, elephant, eagle, wolf, serpent, butterfly) — sculptural organic relief, dynamic natural composition",
  heraldik: "heraldic ornament, crest and mantling scrollwork, regal symmetric ornament",

  // ── İnanç / maneviyat / geometri ── (otantik ikonografi + ornamental işleme)
  hindu: "Hindu sacred ornament — Om / Aum symbol, lotus (padma), intricate mandala and Sri Yantra geometry, mehndi / paisley (buta) scrollwork, temple-carving motifs, richly symmetrical devotional pattern",
  budist: "Buddhist sacred ornament — dharma wheel (dharmachakra), the endless eternal knot, lotus, bodhi leaf, the eight auspicious symbols (ashtamangala), serene balanced mandala, temple relief",
  hristiyan: "Christian sacred ornament — ornate crosses (Latin, Byzantine and Celtic cross), Chi-Rho and IHS monogram, vine-and-grape scrollwork, dove, ichthys fish, Gothic ecclesiastical tracery, devotional symmetry",
  yahudi: "Jewish sacred ornament — Star of David (Magen David), seven-branch menorah, Hamsa protective hand, Tree of Life, pomegranate, Chai symbol, interlacing Hebraic geometric ornament",
  spiritual: "Mystical metaphysical ornament — sacred geometry, all-seeing eye, moon phases, sun, stars and constellations, alchemical and esoteric symbols, celestial mandala, ethereal cosmic motifs",
  reiki: "Reiki and chakra energy ornament — the seven chakra emblems, flower of life, reiki energy symbols, spiral life-force motifs, lotus, harmonious balanced sacred geometry",
  ateist: "Secular / atheist emblem ornament — the stylized atom-orbit symbol and atheist 'A', evolution / Darwin motif, rationalist scientific icons, clean non-religious geometric ornament",
  yoga: "Yoga and meditation ornament — Om symbol, lotus, the seven chakras, mandala, tree of life, serene meditative sacred-geometry composition, calm balanced flow",
  geometrik: "Pure geometric ornament — sacred geometry, flower of life, Metatron's cube, Platonic solids, tessellated interlocking polygons, precise mandala symmetry, timeless modern geometric relief",

  // ── Kültür / mitoloji / tema ── (hero motifler İYİ ARALIKLI, sıkışma yok)
  sufi: "Sufi / Mevlevi ornament — whirling dervish (semazen) in a flowing skirt, the ney reed flute, Mevlana-inspired calligraphic spirals and spiritual whirling motion; hero motifs well-spaced with graceful scrollwork between them, airy and uncrowded",
  nazar: "Anatolian talismanic ornament — the nazar evil-eye, tree of life (hayat ağacı), Anatolian kilim motifs, protective geometric elements; motifs well-spaced with ornamental connectors, balanced folk composition, clean and uncrowded",
  misir: "Ancient Egyptian ornament — the Ankh, Eye of Horus (Wadjet), scarab beetle, lotus and papyrus, a few hieroglyphic cartouches; stately orderly registers, hero symbols well-spaced with clear breathing room, NOT crammed",
  zodyak: "Astrological / zodiac ornament — elegant zodiac sign emblems and constellations, sun, moon and stars, a celestial wheel; symbols well-spaced with flowing star-map scrollwork between them, airy and uncrowded",
  japon: "Japanese / East-Asian ornament — cherry blossom (sakura), seigaiha wave pattern, geometric kamon-style crests, refined negative space (ma), balanced and well-spaced, never crowded",
  viking: "Norse / Viking ornament — runic staves, the Valknut, Yggdrasil world-tree, interlaced Norse knotwork, Mjölnir; bold clean interlaced bands, legible and well-spaced, not tangled or cramped",
  ask: "Love / romantic ornament — intertwined hearts, the infinity symbol, interlocking rings, delicate ribbon and floral scrolls; tender and elegant, motifs well-spaced with airy breathing room (leave room for a name or date if requested)",
  astronomi: "Astronomy / cosmic ornament — moon phases, planets and orbits, stars, a spiral galaxy, a comet; serene spacious celestial composition, generous breathing room, uncrowded and elegant",
};

export interface NakkasDesenParams {
  style?: NakkasStyleKey;
  /** Serbest metin (preset yerine ya da yanında); base reçete yine uygulanır. */
  manual?: string;
  mode?: NakkasMode;
}

/** SABİT işçilik + 3D reçetesi + değişken tarz → tam prompt (DESEN, madalyon değil). */
export function buildDesenPrompt(p: NakkasDesenParams): string {
  const styleFrag = p.style ? NAKKAS_STYLES[p.style] : "";
  const manualFrag = p.manual?.trim() ?? "";

  // STİL = NASIL görüneceği (estetik/gelenek). KONU = NE görüneceği (kullanıcı isteği).
  // İkisi ayrı satır: kullanıcı isteği motif/içerik için EN YÜKSEK öncelik, stil sadece
  // sanatsal dili verir. Çakışırsa kullanıcı isteği kazanır (içerik), stil kalır (üslup).
  const styleLine = styleFrag ? `STYLE (artistic tradition — governs HOW it looks): ${styleFrag}.` : "";
  const subjectLine = manualFrag
    ? `SUBJECT — USER REQUEST (HIGHEST PRIORITY — this decides WHAT appears in the pattern): ${manualFrag}. Feature exactly these requested motifs/elements as the MAIN subject, woven harmoniously and repeated across the all-over ornamental composition. Render them in the artistic style above (its scrollwork, relief depth, technique and character) — the STYLE governs HOW it looks, this REQUEST governs WHAT appears. Where the request differs from the style's usual/default motifs, the USER REQUEST WINS for content; still keep the chosen style's aesthetic, relief and craftsmanship.`
    : "";

  const modeFrag =
    p.mode === "band"
      ? "PATTERN — this is a SEAMLESS TILEABLE ornamental BAND, NOT a finished piece: a continuous horizontal ornamental strip that FILLS the frame edge-to-edge; the LEFT edge continues PERFECTLY into the RIGHT edge (horizontally seamless, no visible seam) so it wraps around a ring band and repeats. NO finished ends, NO outer border, NO empty background — all-metal ornament covering the whole frame."
      : "PATTERN — this is an ALL-OVER REPEATING ornamental FIELD (like an engraved damask / wallpaper), NOT a finished centered piece: the ornamental motif REPEATS and tiles SEAMLESSLY across the whole square, completely FILLING the frame edge-to-edge to ALL FOUR corners with uniform dense coverage. NO central focal medallion, NO outer border, NO empty background — every part of the square is covered metalwork. It will be clipped onto a jewelry form later.";

  return [
    "Master-crafted jewelry ornament PATTERN, museum-quality artisanal silversmith metalwork.",
    "CAMERA — CRITICAL: strict FLAT-ON orthographic top-down view, camera perfectly PERPENDICULAR (exactly 90°) to the surface, ZERO tilt, dead-front. NO perspective, NO oblique or angled view, NOT a tilted product shot. The ornament lies completely FLAT and square to the frame like a technical relief scan. Depth is shown ONLY by raking light and shadows in the recesses.",
    modeFrag,
    styleLine,
    subjectLine,
    "RELIEF: deep, MULTI-LAYERED high relief — recessed metal ground, raised scrollwork; strong ambient-occlusion shadows in every recess so it reads as TRUE 3D sculpted geometry, NOT a flat print.",
    "TECHNIQUE: fine twisted-wire filigree + granulation (tiny metal beads), crisp and cleanly separated elements, razor-sharp edges, no muddy or blurry detail. Ordered, balanced, symmetric flow.",
    "COMPOSITION — WELL-SPACED, NEVER CRAMMED: the main/hero motifs sit clearly separated with breathing room around each; ornamental scrollwork fills the ground BETWEEN them. Full edge-to-edge coverage YES, but each element stays readable and distinct — no crowding, no overlapping clutter, no muddy tangle. If a style names many symbols, choose a FEW and space them elegantly rather than cramming them all in.",
    "NO STONES: pure metal ornament relief only — NO gemstones, no set diamonds, no stones of any kind (granulation beads are metal — keep them; stones are gems — exclude them).",
    "FINISH & PATINA — MATCH EXACTLY (antique silver tone): NOT a single color — a spectrum of close GRAYSCALE tones, single-tone SILVER only (NO gold, NO rose, NO two-tone, NO color). BRIGHT silver highlights on the raised relief (roughly #E0E0E0 to #FFFFFF — reflection points). Recesses drop to DARK ANTHRACITE / smoke — NOT pure black (roughly #2A2A2A to #4A4A4A, around #333333) for a realistic AGED patina depth. Connect highlights and shadows with SOFT GRADIENTS, not sharp transitions. Strong AMBIENT-OCCLUSION contrast between recesses and raised parts to sell the 3D metal illusion. Cold matte metal feel, aged antique look — like a real oxidized silver photograph.",
    "PRODUCTION: relief deep and crisp enough to survive casting, filing and polishing. No text, no signature, no watermark.",
  ]
    .filter(Boolean)
    .join("\n");
}
