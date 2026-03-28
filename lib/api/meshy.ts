import { loadEnvConfig } from "@next/env";

let meshyEnvLoaded = false;

function ensureMeshyEnv(): void {
  if (meshyEnvLoaded) return;
  loadEnvConfig(process.cwd());
  meshyEnvLoaded = true;
}

export function getMeshyApiKey(): string | undefined {
  ensureMeshyEnv();
  const raw = process.env.MESHY_API_KEY;
  if (typeof raw !== "string") return undefined;
  const trimmed = raw.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}
