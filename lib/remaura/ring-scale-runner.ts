import { spawn } from "child_process";
import { tmpdir } from "os";
import { join } from "path";
import { writeFile, readFile, unlink } from "fs/promises";
import { randomUUID } from "crypto";

const SCRIPT_PATH = join(process.cwd(), "scripts", "ring_scale.py");

/**
 * Runs ring_scale.py in a child process.
 * Input buffer is written to a temp file, script scales it,
 * output is read back and returned as Buffer.
 *
 * Falls back to original buffer if Python or script fails.
 */
export async function applyRingScale(
  inputBuffer: Buffer,
  inputExt: string,
  outputExt: string,
  sizeSystem: "eu" | "swiss",
  sizeValue: number
): Promise<{ buffer: Buffer; scaled: boolean; log: string }> {
  const id = randomUUID();
  const inExt  = inputExt.toLowerCase().replace(/^\./, "");
  const outExt = outputExt.toLowerCase().replace(/^\./, "");
  const tmpIn  = join(tmpdir(), `remaura_in_${id}.${inExt}`);
  const tmpOut = join(tmpdir(), `remaura_out_${id}.${outExt}`);

  try {
    await writeFile(tmpIn, inputBuffer);

    const log = await new Promise<string>((resolve, reject) => {
      // Windows'da tam yol önce, sonra py → python → python3 dene
      const candidates = process.platform === "win32"
        ? [
            "C:\\Users\\Murat\\AppData\\Local\\Programs\\Python\\Python312\\python.exe",
            "py",
            "python",
            "python3",
          ]
        : ["python3", "python"];

      const args = [
        SCRIPT_PATH,
        "--input", tmpIn,
        "--output", tmpOut,
        "--size-system", sizeSystem,
        "--size-value", String(sizeValue),
      ];

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
        proc.stdout?.on("data", (d: Buffer) => { stdout += d.toString(); });
        proc.stderr?.on("data", (d: Buffer) => { stderr += d.toString(); });

        proc.on("close", (code) => {
          const combined = [stdout.trim(), stderr.trim()].filter(Boolean).join("\n");
          if (code === 0) {
            resolve(combined);
          } else {
            reject(new Error(`ring_scale.py (${cmd}) çıkış kodu ${code}:\n${combined.slice(0, 800)}`));
          }
        });

        proc.on("error", () => {
          // Bu komut bulunamadı, bir sonrakini dene
          tryNext();
        });
      };

      tryNext();
    });

    const result = await readFile(tmpOut);
    console.log("[ring_scale] Başarılı:\n", log);
    return { buffer: result, scaled: true, log };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn("[ring_scale] Ölçekleme başarısız, orijinal döndürülüyor:", msg);
    return { buffer: inputBuffer, scaled: false, log: msg };
  } finally {
    await unlink(tmpIn).catch(() => {});
    await unlink(tmpOut).catch(() => {});
  }
}
