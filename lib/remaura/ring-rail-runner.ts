import { spawn } from "child_process";
import { join } from "path";
import { remauraServerlessTempDir } from "@/lib/remaura/runtime-temp-dir";
import { writeFile, readFile, unlink } from "fs/promises";
import { randomUUID } from "crypto";

const SCRIPT_PATH = join(process.cwd(), "scripts", "ring_rail_measure.py");

/** Measurement / scale report from ring_rail_measure.py */
export type RingRailMeasureReport = {
  error?: string;
  outer_diameter_mm?: number;
  inner_diameter_mm?: number;
  inner_diameter_min_mm?: number;
  inner_outer_ratio?: number;
  inner_plausible?: boolean;
  inner_std_mm?: number;
  stability_pct?: number;
  stability_warning?: boolean;
  ring_axis?: string;
  sections_used?: number;
  sections_total?: number;
  watertight?: boolean;
  ring_size_eu?: number;
  ring_size_us?: number;
  ring_size_tr?: number;
  ring_size_ref_mm?: number;
};

export type RingRailScaleReport = {
  scaled?: boolean;
  error?: string;
  scale_factor?: number;
  pre?: RingRailMeasureReport;
  post?: RingRailMeasureReport | null;
  error_mm?: number;
  warning?: string | null;
  validation_ok?: boolean | null;
  tolerance_mm?: number;
};

const MEASURE_TIMEOUT_MS = 120_000;
const SCALE_TIMEOUT_MS = 180_000;

function pythonCandidates(): string[] {
  return process.platform === "win32"
    ? [
        "C:\\Users\\Murat\\AppData\\Local\\Programs\\Python\\Python312\\python.exe",
        "py",
        "python",
        "python3",
      ]
    : ["python3", "python"];
}

function spawnPython(
  args: string[],
  timeoutMs: number
): Promise<{ log: string; code: number | null }> {
  return new Promise((resolve, reject) => {
    const candidates = pythonCandidates();
    let attemptIndex = 0;
    let killed = false;

    const tryNext = () => {
      if (attemptIndex >= candidates.length) {
        reject(new Error("Python bulunamadı. py / python / python3 PATH'de yok."));
        return;
      }
      const cmd = candidates[attemptIndex++];
      const proc = spawn(cmd, args, {
        stdio: ["ignore", "pipe", "pipe"],
        env: { ...process.env, PYTHONUTF8: "1", PYTHONIOENCODING: "utf-8" },
      });

      const timer = setTimeout(() => {
        killed = true;
        proc.kill("SIGTERM");
        reject(new Error("Ring Rail işlemi zaman aşımına uğradı."));
      }, timeoutMs);

      let stdout = "";
      let stderr = "";
      proc.stdout?.on("data", (d: Buffer) => {
        stdout += d.toString();
      });
      proc.stderr?.on("data", (d: Buffer) => {
        stderr += d.toString();
      });

      proc.on("close", (code) => {
        clearTimeout(timer);
        if (killed) return;
        const log = [stdout.trim(), stderr.trim()].filter(Boolean).join("\n");
        resolve({ log, code });
      });

      proc.on("error", () => {
        clearTimeout(timer);
        if (!killed) tryNext();
      });
    };

    tryNext();
  });
}

export async function runRingMeasure(
  inputBuffer: Buffer,
  slices = 7
): Promise<{ report: RingRailMeasureReport; log: string }> {
  const id = randomUUID();
  const tmpRoot = remauraServerlessTempDir();
  const tmpIn = join(tmpRoot, `ring_rail_in_${id}.stl`);
  const tmpReport = join(tmpRoot, `ring_rail_report_${id}.json`);

  try {
    await writeFile(tmpIn, inputBuffer);

    const args = [
      SCRIPT_PATH,
      "--input",
      tmpIn,
      "--measure-only",
      "--slices",
      String(slices),
      "--report-json",
      tmpReport,
    ];

    const { log, code } = await spawnPython(args, MEASURE_TIMEOUT_MS);
    if (code !== 0) {
      throw new Error(
        `ring_rail_measure.py çıkış kodu ${code}:\n${log.slice(0, 1500)}`
      );
    }

    let raw: string;
    try {
      raw = await readFile(tmpReport, "utf-8");
    } catch {
      throw new Error(`Ölçüm raporu okunamadı.\n${log.slice(0, 800)}`);
    }
    const report = JSON.parse(raw) as RingRailMeasureReport;
    return { report, log };
  } finally {
    await unlink(tmpIn).catch(() => {});
    await unlink(tmpReport).catch(() => {});
  }
}

export async function runRingScale(
  inputBuffer: Buffer,
  targetInnerMm: number,
  slices = 7
): Promise<{ stlBuffer: Buffer; report: RingRailScaleReport; log: string }> {
  const id = randomUUID();
  const tmpRoot = remauraServerlessTempDir();
  const tmpIn = join(tmpRoot, `ring_rail_scale_in_${id}.stl`);
  const tmpOut = join(tmpRoot, `ring_rail_scale_out_${id}.stl`);
  const tmpReport = join(tmpRoot, `ring_rail_scale_report_${id}.json`);

  try {
    await writeFile(tmpIn, inputBuffer);

    const args = [
      SCRIPT_PATH,
      "--input",
      tmpIn,
      "--output",
      tmpOut,
      "--target-inner-mm",
      String(targetInnerMm),
      "--slices",
      String(slices),
      "--report-json",
      tmpReport,
    ];

    const { log, code } = await spawnPython(args, SCALE_TIMEOUT_MS);
    if (code !== 0) {
      throw new Error(
        `ring_rail_measure.py (scale) çıkış kodu ${code}:\n${log.slice(0, 1500)}`
      );
    }

    let raw: string;
    try {
      raw = await readFile(tmpReport, "utf-8");
    } catch {
      throw new Error(`Boyutlandırma raporu okunamadı.\n${log.slice(0, 800)}`);
    }
    const report = JSON.parse(raw) as RingRailScaleReport;
    const stlBuffer = await readFile(tmpOut);
    return { stlBuffer, report, log };
  } finally {
    await unlink(tmpIn).catch(() => {});
    await unlink(tmpOut).catch(() => {});
    await unlink(tmpReport).catch(() => {});
  }
}
