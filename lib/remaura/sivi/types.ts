// .rema — Remaura "Sıvı" düzenlenebilir model formatı (çekirdek tipler).
//
// Çekirdek ilke: dosya "pişmiş sonucu" DEĞİL, "tarifi" saklar.
//   document.json = düzenlenebilir kaynak gerçek (komutlar + eğriler)
//   baked.glb     = tariften yeniden üretilebilir cache (önizleme/dışa aktarım)
//
// Geometri-bağımsızdır: burada hiç THREE/gltf yok. Sadece veri şeması.
// Detaylı tasarım: docs/remaura-sivi-RD.md

export const REMA_FORMAT = "rema" as const;
export const REMA_VERSION = 1 as const;

export type Vec3 = [number, number, number];

// ---------------------------------------------------------------------------
// Manifest — formatı tanır, sürümü taşır (forward-compat için)
// ---------------------------------------------------------------------------
export type RemaManifest = {
  format: typeof REMA_FORMAT;
  version: number;
  createdAt: string; // ISO
  updatedAt: string; // ISO
  app?: string; // üreten araç (nötr ad; 3D/AI servis adı ASLA yazılmaz)
};

// ---------------------------------------------------------------------------
// Düzenlenebilir işlemler = komut registry'sinin veri karşılığı.
// Her işlem: kimlik + tip + açık/kapalı + parametreler.
// Sıra = dizi sırası (başlangıçta lineer feature-stack; ileride DAG'a evrilir).
// ---------------------------------------------------------------------------

/** Tahliye kanalı: kavite içinden dış yüzeye bir kaçış (kullanıcı seçer). */
export type DrainChannel = {
  fromCavityId?: string;
  point: Vec3; // dış yüzeyde kanal ağzı
  diameterMm: number;
};

export type HollowParams = {
  wallMm: number;
  maxGrid?: number;
  drainChannels?: DrainChannel[];
};

export type ExtractEdgesParams = {
  dihedralDeg: number; // bu açının üstündeki kenarlar = feature edge
  smooth?: boolean; // spline fit (merdivenli polyline'ı düzelt)
};

export type SweepParams = {
  alongCurveId: string;
  profile: Vec3[]; // süpürülecek kesit
};

export type PatternParams = {
  motifId: string;
  region?: string;
  spacingMm: number;
};

export type AjourParams = {
  motifId: string;
  depthMm: number; // delme derinliği (duvar kalınlığı üstünde)
  region?: string;
};

type OpBase = {
  id: string;
  enabled: boolean;
  /** İleride eklenecek komutların taşıyabileceği serbest alan (forward-compat). */
  label?: string;
};

export type RemaOperation =
  | (OpBase & { type: "hollow"; params: HollowParams })
  | (OpBase & { type: "extractEdges"; params: ExtractEdgesParams })
  | (OpBase & { type: "sweep"; params: SweepParams })
  | (OpBase & { type: "pattern"; params: PatternParams })
  | (OpBase & { type: "ajour"; params: AjourParams });

export type RemaOperationType = RemaOperation["type"];

/** Çıkarılan eğriler — spline kontrol noktaları (pişmiş polyline DEĞİL). */
export type RemaCurve = {
  id: string;
  closed: boolean;
  controlPoints: Vec3[];
  sourceOpId?: string; // hangi işlemden türedi
};

export type RemaDocument = {
  version: number;
  base: string; // zip içindeki taban geometri dosyası (örn. "base.glb")
  operations: RemaOperation[];
  curves?: RemaCurve[];
};

// ---------------------------------------------------------------------------
// meta.json — üretim verisi (önceki tasarım). İleriye dönük serbest.
// ---------------------------------------------------------------------------
export type RemaMeta = {
  metal?: string;
  weightGrams?: number;
  volumeMm3?: number;
  ringSize?: number;
  dimensionsMm?: Vec3;
  watertight?: boolean;
  productionReady?: boolean;
  [k: string]: unknown;
};

// ---------------------------------------------------------------------------
// Bellek içi proje (paketlenmemiş .rema)
// ---------------------------------------------------------------------------
export type RemaProject = {
  manifest: RemaManifest;
  document: RemaDocument;
  base: Uint8Array; // taban geometri (GLB)
  baked?: Uint8Array; // pişmiş sonuç cache (GLB)
  meta?: RemaMeta;
  thumbnail?: Uint8Array; // webp
  signature?: string;
};
