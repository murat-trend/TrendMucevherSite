import { tmpdir } from "os";

/** Vercel serverless: yazılabilir alan /tmp (512 MB); cwd genelde salt okunur. */
export function remauraServerlessTempDir(): string {
  if (process.env.VERCEL === "1") return "/tmp";
  return tmpdir();
}
