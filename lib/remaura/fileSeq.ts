// Remaura indirme sıra numarası — her indirilen dosya adına kalıcı artan
// bir numara eklenir (001, 002, …), dosyalar karışmaz, kronoloji addan okunur.
// Sayaç tarayıcıda (localStorage) tutulur ve TÜM araçlarda ortaktır.

const KEY = "remaura-file-seq";

export function nextFileSeq(): string {
  let n = 0;
  try {
    n = parseInt(localStorage.getItem(KEY) ?? "0", 10) || 0;
  } catch { /* localStorage yoksa 0'dan başla */ }
  n += 1;
  try {
    localStorage.setItem(KEY, String(n));
  } catch { /* yazamazsa da numara döner */ }
  return String(n).padStart(3, "0");
}

/** "Cin.stl" + "ajur" → "Cin_ajur_007.stl" */
export function seqFileName(baseName: string, suffix: string, ext: string): string {
  const base = baseName.replace(/\.(stl|obj)$/i, "");
  return `${base}_${suffix}_${nextFileSeq()}.${ext}`;
}
