import { existsSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname, resolve as presolve } from "node:path";
export async function resolve(specifier, context, next) {
  if (specifier.startsWith(".") && !/\.(ts|tsx|mts|cts|js|mjs|cjs|json|wasm)$/.test(specifier)) {
    const parent = context.parentURL ? fileURLToPath(context.parentURL) : process.cwd();
    const base = presolve(dirname(parent), specifier);
    for (const ext of [".ts", ".tsx", "/index.ts"]) {
      if (existsSync(base + ext)) return next(pathToFileURL(base + ext).href, context);
    }
  }
  return next(specifier, context);
}
