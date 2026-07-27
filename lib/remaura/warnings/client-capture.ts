/**
 * İstemci tarafı global yakalayıcı.
 *
 * Araç sayfalarındayken `/api/remaura/*` çağrılarını izler; biri SERVİS sorunuyla
 * (5xx / 401 / 402 / 403 / 408 / 429) dönerse anında şeride düşürür. Böylece
 * HER araç (bugünkü + gelecekteki) route'a dokunmadan otomatik kapsanır.
 *
 * - Yalnızca süper-admin sayfalarında (şerit mount'unda) kurulur.
 * - Kullanıcı/doğrulama hatalarını (400/404/422) es geçer — gürültü olmasın.
 * - İsteğin gövdesini KLONLAYARAK okur; aracın kendi okumasını bozmaz.
 * - Asla throw etmez; hata olursa orijinal yanıtı aynen döndürür.
 */

export type ClientCapture = {
  id: string;
  tool: string;
  action: string | null;
  provider: string | null;
  status: number;
  reason: string;
};

const SERVICE_PROBLEM = new Set([401, 402, 403, 408, 429]);

function isServiceProblem(status: number): boolean {
  return status >= 500 || SERVICE_PROBLEM.has(status);
}

/** URL'den araç + işlem adını çıkar: /api/remaura/<tool>/<action>... */
function parseToolAction(url: string): { tool: string; action: string | null } {
  const m = url.match(/\/api\/remaura\/([^/?#]+)(?:\/([^/?#]+))?/);
  if (!m) return { tool: "remaura", action: null };
  return { tool: m[1], action: m[2] ?? null };
}

/** URL/işlem anahtar sözcüğünden sağlayıcıyı tahmin et (mümkünse). */
function inferProvider(url: string): string | null {
  const u = url.toLowerCase();
  if (u.includes("gemini") || u.includes("tas-kaldir")) return "gemini";
  if (u.includes("stability")) return "stability";
  if (u.includes("tripo")) return "tripo";
  if (u.includes("meshy")) return "meshy";
  if (u.includes("controlnet") || u.includes("flux")) return "fal";
  return null;
}

let installed = false;
let idCounter = 0;

/**
 * Global fetch yakalayıcısını kurar. Geri dönen fonksiyon kaldırır.
 * @param onCapture yeni bir servis sorunu yakalandığında çağrılır.
 */
export function installRemauraFetchCapture(onCapture: (c: ClientCapture) => void): () => void {
  if (typeof window === "undefined" || installed) return () => {};
  installed = true;

  const original = window.fetch.bind(window);

  const patched: typeof window.fetch = async (input, init) => {
    const res = await original(input, init);
    try {
      const url =
        typeof input === "string" ? input : input instanceof URL ? input.href : (input as Request).url;
      if (
        url &&
        url.includes("/api/remaura/") &&
        !url.includes("/api/remaura/warnings") &&
        !res.ok &&
        isServiceProblem(res.status)
      ) {
        const { tool, action } = parseToolAction(url);
        let reason = `HTTP ${res.status}`;
        try {
          const j = (await res.clone().json()) as { error?: string };
          if (j?.error) reason = String(j.error);
        } catch {
          /* JSON değil — durum koduyla yetin */
        }
        idCounter += 1;
        onCapture({
          id: `c${idCounter}-${res.status}`,
          tool,
          action,
          provider: inferProvider(url),
          status: res.status,
          reason,
        });
      }
    } catch {
      /* yakalayıcı asla akışı bozmaz */
    }
    return res;
  };

  window.fetch = patched;

  return () => {
    if (window.fetch === patched) window.fetch = original;
    installed = false;
  };
}
