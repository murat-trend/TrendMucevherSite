/// <reference lib="webworker" />
import * as THREE from "three";
import { hollowShell, hollowShellSDF } from "./meshOps";

type Req = { positions: Float32Array; wall: number; method: "fast" | "sdf" };

self.onmessage = (e: MessageEvent<Req>) => {
  const { positions, wall, method } = e.data;
  try {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    const r = method === "sdf"
      ? hollowShellSDF(geo, wall, { onProgress: (p) => self.postMessage({ type: "progress", p }) })
      : hollowShell(geo, wall);
    const arr = r.shell.attributes.position.array as Float32Array;
    const copy = new Float32Array(arr);
    self.postMessage(
      {
        type: "done",
        positions: copy,
        cavityMm3: r.cavityMm3,
        resolutionMm: "resolutionMm" in r ? (r as { resolutionMm: number }).resolutionMm : 0,
        trapped: "trappedRemoved" in r ? (r as { trappedRemoved: number }).trappedRemoved : 0,
      },
      [copy.buffer],
    );
  } catch (err) {
    self.postMessage({ type: "error", message: String((err as Error)?.message ?? err) });
  }
};
