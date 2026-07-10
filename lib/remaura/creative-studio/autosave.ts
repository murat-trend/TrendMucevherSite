// AUTOSAVE — localStorage'a kota-güvenli proje kaydı.
// Büyük data URL'ler (video/STL/uzun ses) metadata'ya indirgenir;
// kullanıcı oturumu yenilerse yapı korunur, ağır medya yeniden yüklenir.

import { AUTOSAVE_ASSET_BYTE_LIMIT } from "./constants";
import type { Project } from "./types";

const KEY = "remaura.creative-studio.project.v1";

function slim(project: Project): Project {
  return {
    ...project,
    assets: project.assets.map((a) =>
      a.dataUrl && a.dataUrl.length > AUTOSAVE_ASSET_BYTE_LIMIT
        ? { ...a, dataUrl: undefined }
        : a,
    ),
  };
}

export function saveProject(project: Project): boolean {
  if (typeof window === "undefined") return false;
  const stamped = { ...project, updatedAt: Date.now() };
  try {
    window.localStorage.setItem(KEY, JSON.stringify(stamped));
    return true;
  } catch {
    // Kota dolduysa ağır medyayı at, yapıyı kurtar.
    try {
      window.localStorage.setItem(KEY, JSON.stringify(slim(stamped)));
      return true;
    } catch {
      return false;
    }
  }
}

export function loadProject(): Project | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Project;
    return parsed.version === 1 ? parsed : null;
  } catch {
    return null;
  }
}

export function clearProject(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    /* yoksay */
  }
}
