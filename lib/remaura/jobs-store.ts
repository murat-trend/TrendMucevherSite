import { mkdir, readFile, writeFile, copyFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";

export type RemauraJobType = "generate" | "optimize" | "analyze_style" | "analyze_jewelry";
export type RemauraJobStatus = "ok" | "error";

export type RemauraJobEntry = {
  id: string;
  type: RemauraJobType;
  status: RemauraJobStatus;
  userId?: string;
  platform?: string;
  durationMs: number;
  estimatedCostUsd?: number;
  message?: string;
  createdAt: string;
};

const REMAURA_DATA_DIR = path.join(process.cwd(), "data", "remaura");
const JOBS_PATH = path.join(REMAURA_DATA_DIR, "remaura-jobs.json");
const LEGACY_JOBS_PATH = path.join(process.cwd(), "data", "admin", "remaura-jobs.json");

function nowIso() {
  return new Date().toISOString();
}

async function ensureJobsFile(): Promise<void> {
  await mkdir(REMAURA_DATA_DIR, { recursive: true });
  try {
    await readFile(JOBS_PATH, "utf8");
  } catch {
    try {
      await copyFile(LEGACY_JOBS_PATH, JOBS_PATH);
    } catch {
      await writeFile(JOBS_PATH, JSON.stringify([], null, 2), "utf8");
    }
  }
}

async function readJobs(): Promise<RemauraJobEntry[]> {
  await ensureJobsFile();
  const raw = await readFile(JOBS_PATH, "utf8");
  try {
    const parsed = JSON.parse(raw) as RemauraJobEntry[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function writeJobs(entries: RemauraJobEntry[]): Promise<void> {
  await ensureJobsFile();
  await writeFile(JOBS_PATH, JSON.stringify(entries, null, 2), "utf8");
}

export async function appendRemauraJob(
  input: Omit<RemauraJobEntry, "id" | "createdAt">
): Promise<RemauraJobEntry> {
  const jobs = await readJobs();
  const next: RemauraJobEntry = {
    id: randomUUID(),
    createdAt: nowIso(),
    ...input,
  };
  jobs.unshift(next);
  await writeJobs(jobs.slice(0, 2000));
  return next;
}

export async function listRemauraJobs(limit = 200): Promise<RemauraJobEntry[]> {
  const jobs = await readJobs();
  return jobs.slice(0, Math.max(1, limit));
}
