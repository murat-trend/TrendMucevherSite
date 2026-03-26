import { spawn } from "child_process";
import { tmpdir } from "os";
import { join } from "path";
import { writeFile, readFile, unlink } from "fs/promises";
import { randomUUID } from "crypto";

const SCRIPT_PATH = join(process.cwd(), "scripts", "remura_mesh_process.py");

export interface MeshProcessOptions {
  cleanup: boolean;
  repair: boolean;
  smooth: boolean;
  decimate: boolean;
  targetFaces: number;
  maxHoleSize: number;
}

export async function runMeshProcess(
  inputBuffer: Buffer,
  options: MeshProcessOptions
): Promise<{ buffer: Buffer; success: boolean; log: string }> {
  const id = randomUUID();
  const tmpIn = join(tmpdir(), `remura_mesh_in_${id}.stl`);
  const tmpOut = join(tmpdir(), `remura_mesh_out_${id}.stl`);

  try {
    await writeFile(tmpIn, inputBuffer);

    const log = await new Promise<string>((resolve, reject) => {
      const candidates =
        process.platform === "win32"
          ? [
              "C:\\Users\\Murat\\AppData\\Local\\Programs\\Python\\Python312\\python.exe",
              "py",
              "python",
              "python3",
            ]
          : ["python3", "python"];

      const args: string[] = [
        SCRIPT_PATH,
        "--input", tmpIn,
        "--output", tmpOut,
      ];

      if (options.cleanup) args.push("--cleanup");
      if (options.repair) {
        args.push("--repair");
        args.push("--max-hole-size", String(options.maxHoleSize || 1000));
      }
      if (options.smooth) args.push("--smooth");
      if (options.decimate) {
        args.push("--decimate");
        args.push("--target-faces", String(options.targetFaces));
      }

      let attemptIndex = 0;

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

        let stdout = "";
        let stderr = "";
        proc.stdout?.on("data", (d: Buffer) => {
          stdout += d.toString();
        });
        proc.stderr?.on("data", (d: Buffer) => {
          stderr += d.toString();
        });

        proc.on("close", (code) => {
          const combined = [stdout.trim(), stderr.trim()]
            .filter(Boolean)
            .join("\n");
          if (code === 0) {
            resolve(combined);
          } else {
            reject(
              new Error(
                `remura_mesh_process.py (${cmd}) çıkış kodu ${code}:\n${combined.slice(0, 1200)}`
              )
            );
          }
        });

        proc.on("error", () => {
          tryNext();
        });
      };

      tryNext();
    });

    const result = await readFile(tmpOut);
    console.log("[mesh-process] Başarılı:\n", log);
    return { buffer: result, success: true, log };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[mesh-process] Başarısız:", msg);
    return { buffer: inputBuffer, success: false, log: msg };
  } finally {
    await unlink(tmpIn).catch(() => {});
    await unlink(tmpOut).catch(() => {});
  }
}
