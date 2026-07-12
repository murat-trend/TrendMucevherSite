import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // REMAURA AI adası (app/rai) hermetiktir: ada dışından import yasak.
  // İhtiyaç duyulan kod adaya kopyalanır ya da HTTP API'den çağrılır —
  // bu kural, adanın her an ayrılabilir kalmasını garanti eder.
  {
    files: ["app/rai/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@/*"],
              message:
                "RAI adası izoledir: repo genelinden import yapma; kodu adaya kopyala ya da API üzerinden çağır.",
            },
          ],
        },
      ],
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
