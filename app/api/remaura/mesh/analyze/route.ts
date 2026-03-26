import { NextResponse } from "next/server";
import { spawn } from "child_process";
import { tmpdir } from "os";
import { join } from "path";
import { writeFile, unlink } from "fs/promises";
import { randomUUID } from "crypto";

const SCRIPT_PATH = join(process.cwd(), "scripts", "remura_mesh_analyze.py");
const TIMEOUT_MS = 15_000;

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get("file");

    if (!file || !(file instanceof Blob)) {
      return NextResponse.json({ error: "STL dosyası gerekli." }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const inputBuffer = Buffer.from(arrayBuffer);
    const id = randomUUID();
    const tmpIn = join(tmpdir(), `remura_analyze_${id}.stl`);

    await writeFile(tmpIn, inputBuffer);

    try {
      const result = await new Promise<string>((resolve, reject) => {
        const candidates =
          process.platform === "win32"
            ? [
                "C:\\Users\\Murat\\AppData\\Local\\Programs\\Python\\Python312\\python.exe",
                "py",
                "python",
                "python3",
              ]
            : ["python3", "python"];

        let attemptIndex = 0;
        let killed = false;

        const tryNext = () => {
          if (attemptIndex >= candidates.length) {
            reject(new Error("Python bulunamadı."));
            return;
          }
          const cmd = candidates[attemptIndex++];
          const proc = spawn(cmd, [SCRIPT_PATH, "--input", tmpIn], {
            stdio: ["ignore", "pipe", "pipe"],
            env: { ...process.env, PYTHONUTF8: "1", PYTHONIOENCODING: "utf-8" },
          });

          const timer = setTimeout(() => {
            killed = true;
            proc.kill("SIGTERM");
            reject(new Error("Analiz zaman aşımına uğradı."));
          }, TIMEOUT_MS);

          let stdout = "";
          let stderr = "";
          proc.stdout?.on("data", (d: Buffer) => { stdout += d.toString(); });
          proc.stderr?.on("data", (d: Buffer) => { stderr += d.toString(); });

          proc.on("close", (code) => {
            clearTimeout(timer);
            if (killed) return;
            if (code === 0) resolve(stdout.trim());
            else reject(new Error(stderr.trim().slice(0, 500) || `Çıkış kodu ${code}`));
          });

          proc.on("error", () => {
            clearTimeout(timer);
            if (!killed) tryNext();
          });
        };

        tryNext();
      });

      const stats = JSON.parse(result);
      return NextResponse.json(stats);
    } finally {
      await unlink(tmpIn).catch(() => {});
    }
  } catch (error: unknown) {
    const err = error as { message?: string };
    return NextResponse.json(
      { error: err?.message ?? "Analiz başarısız." },
      { status: 500 }
    );
  }
}
