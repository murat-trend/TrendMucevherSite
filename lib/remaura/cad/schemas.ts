/**
 * CAD Koç — şema şablonları (ileride)
 * Örn. top_view / cross_section için SVG iskeletleri, viewBox ve layer isimleri.
 */

export type CadSchemaTemplateId =
  | "top_view"
  | "side_view"
  | "cross_section"
  | "curve_path"
  | "point_layout";

export type CadSchemaTemplate = {
  id: CadSchemaTemplateId;
  /** İleride: SVG string veya bileşen prop’ları */
  placeholder: true;
};

/** Genişletilecek — şimdilik boş kayıt */
export const CAD_SCHEMA_TEMPLATES: Partial<Record<CadSchemaTemplateId, CadSchemaTemplate>> = {};
