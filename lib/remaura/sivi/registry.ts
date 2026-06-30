// Komut registry'si — sıvının "kelime dağarcığı".
//
// Geometri-bağımsız çekirdek. G = motorun geometri temsili:
//   tarayıcıda THREE.BufferGeometry, sunucuda gltf belgesi, testte sahte tip.
// Her komut bir bağlamı (geometri + eğriler + uyarılar) alır, yenisini döndürür.
//
// "Dosyayı pişirmek" = tarifteki açık işlemleri SIRAYLA bu registry ile uygulamak.
// Yeni takı komutu eklemek = registry'ye yeni bir tip + fonksiyon kaydetmek.
// (tırnak, yuva, pavé, galeri, milgrain… — yavaş yavaş, izole, eskiyi bozmadan.)

import type { RemaCurve, RemaDocument, RemaOperation, RemaOperationType } from "./types";

export type EvalContext<G> = {
  geometry: G;
  curves: RemaCurve[];
  warnings: string[];
};

export type OperationEvaluator<G> = (
  ctx: EvalContext<G>,
  op: RemaOperation,
) => EvalContext<G> | Promise<EvalContext<G>>;

export type EvaluateOptions = {
  /** Bilinmeyen komut (yeni sürümden) görülünce: atla+uyar (varsayılan) ya da hata fırlat. */
  onUnknown?: "skip" | "throw";
};

export class OperationRegistry<G> {
  private readonly map = new Map<RemaOperationType, OperationEvaluator<G>>();

  register(type: RemaOperationType, fn: OperationEvaluator<G>): this {
    this.map.set(type, fn);
    return this;
  }

  has(type: RemaOperationType): boolean {
    return this.map.has(type);
  }

  registeredTypes(): RemaOperationType[] {
    return [...this.map.keys()];
  }

  /**
   * Tarifi pişir: taban geometriden başla, açık (enabled) işlemleri sırayla uygula.
   * Bilinmeyen/kapalı işlemler atlanır; uyarılar ctx.warnings'e biriktirilir.
   */
  async evaluate(
    document: RemaDocument,
    base: G,
    options: EvaluateOptions = {},
  ): Promise<EvalContext<G>> {
    const onUnknown = options.onUnknown ?? "skip";
    let ctx: EvalContext<G> = {
      geometry: base,
      curves: document.curves ? [...document.curves] : [],
      warnings: [],
    };

    for (const op of document.operations) {
      if (!op.enabled) continue;
      const fn = this.map.get(op.type);
      if (!fn) {
        const msg = `Bilinmeyen işlem: ${op.type} (${op.id})`;
        if (onUnknown === "throw") throw new Error(msg);
        ctx.warnings.push(`${msg} — atlandı.`);
        continue;
      }
      ctx = await fn(ctx, op);
    }
    return ctx;
  }
}
