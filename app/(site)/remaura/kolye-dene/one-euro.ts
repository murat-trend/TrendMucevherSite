// One-Euro filter — jitter azaltma (pozisyon: eksen başına skaler, rotasyon: quaternion slerp)
// Ref: Casiez et al. 2012. Euler açılarında DEĞİL, quaternion üzerinde filtrele (gimbal).

import * as THREE from "three";

class LowPassFilter {
  private y: number | null = null;

  filter(x: number, alpha: number): number {
    if (this.y === null) {
      this.y = x;
    } else {
      this.y = alpha * x + (1 - alpha) * this.y;
    }
    return this.y;
  }

  last(): number | null {
    return this.y;
  }

  reset() {
    this.y = null;
  }
}

function smoothingAlpha(cutoff: number, dt: number): number {
  const tau = 1 / (2 * Math.PI * cutoff);
  return 1 / (1 + tau / dt);
}

export class OneEuro1D {
  private xFilter = new LowPassFilter();
  private dxFilter = new LowPassFilter();
  private lastValue: number | null = null;

  constructor(
    public minCutoff = 1.0,
    public beta = 0.01,
    public dCutoff = 1.0,
  ) {}

  filter(x: number, dt: number): number {
    if (dt <= 0) dt = 1 / 60;
    const dx = this.lastValue === null ? 0 : (x - this.lastValue) / dt;
    this.lastValue = x;
    const edx = this.dxFilter.filter(dx, smoothingAlpha(this.dCutoff, dt));
    const cutoff = this.minCutoff + this.beta * Math.abs(edx);
    return this.xFilter.filter(x, smoothingAlpha(cutoff, dt));
  }

  reset() {
    this.xFilter.reset();
    this.dxFilter.reset();
    this.lastValue = null;
  }
}

export class OneEuroVec3 {
  private fx: OneEuro1D;
  private fy: OneEuro1D;
  private fz: OneEuro1D;

  constructor(minCutoff = 1.0, beta = 0.01) {
    this.fx = new OneEuro1D(minCutoff, beta);
    this.fy = new OneEuro1D(minCutoff, beta);
    this.fz = new OneEuro1D(minCutoff, beta);
  }

  filter(v: THREE.Vector3, dt: number, out: THREE.Vector3): THREE.Vector3 {
    return out.set(
      this.fx.filter(v.x, dt),
      this.fy.filter(v.y, dt),
      this.fz.filter(v.z, dt),
    );
  }

  reset() {
    this.fx.reset();
    this.fy.reset();
    this.fz.reset();
  }
}

// Quaternion One-Euro: yeni ölçüm ile önceki filtrelenmiş değer arasındaki açısal
// hıza göre dinamik alpha hesaplar, slerp ile uygular.
export class OneEuroQuat {
  private prev: THREE.Quaternion | null = null;
  private speedFilter = new LowPassFilter();

  constructor(
    public minCutoff = 1.0,
    public beta = 0.01,
    public dCutoff = 1.0,
  ) {}

  filter(q: THREE.Quaternion, dt: number, out: THREE.Quaternion): THREE.Quaternion {
    if (dt <= 0) dt = 1 / 60;
    if (!this.prev) {
      this.prev = q.clone();
      return out.copy(q);
    }
    // açısal fark (rad) → hız (rad/s)
    const angle = this.prev.angleTo(q);
    const speed = this.speedFilter.filter(
      angle / dt,
      smoothingAlpha(this.dCutoff, dt),
    );
    const cutoff = this.minCutoff + this.beta * Math.abs(speed);
    const alpha = smoothingAlpha(cutoff, dt);
    this.prev.slerp(q, alpha);
    return out.copy(this.prev);
  }

  reset() {
    this.prev = null;
    this.speedFilter.reset();
  }
}
