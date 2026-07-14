// Geometri kütüphanesi — tarayıcı içi REÇETE DEFTERİ (IndexedDB)
// İlke (.rema vizyonu): model = reçete (tip + parametreler), mesh = sonuç.
// Kayıt ~1KB reçete + küçük önizleme görseli; mesh her açılışta motordan
// milisaniyede aynen yeniden doğar (deterministik, mikron-doğrulamalı).
// Bu modül sadece tarayıcıda çalışır ("use client" bileşenlerden çağrılır).

export type GeoRecipe = {
  id: string;
  ad: string;          // görünen isim (örn. "Kelebek · 14.07")
  model: string;       // ModelId
  material: string;    // MaterialId
  heightMm: number;
  fineDiaMm: number;
  frameDiaMm: number;
  createdAt: number;   // epoch ms
  thumb: string;       // küçük JPEG dataURL (viewer'dan)
};

const DB_NAME = "remaura-geo";
const STORE = "recipes";
const MAX_KAYIT = 20; // depo sınırı; UI son 10'u gösterir

function openDB(): Promise<IDBDatabase> {
  return new Promise((res, rej) => {
    const rq = indexedDB.open(DB_NAME, 1);
    rq.onupgradeneeded = () => {
      if (!rq.result.objectStoreNames.contains(STORE))
        rq.result.createObjectStore(STORE, { keyPath: "id" });
    };
    rq.onsuccess = () => res(rq.result);
    rq.onerror = () => rej(rq.error);
  });
}

function txDone(tx: IDBTransaction): Promise<void> {
  return new Promise((res, rej) => {
    tx.oncomplete = () => res();
    tx.onerror = () => rej(tx.error);
    tx.onabort = () => rej(tx.error);
  });
}

export async function listRecipes(): Promise<GeoRecipe[]> {
  const db = await openDB();
  const tx = db.transaction(STORE, "readonly");
  const rq = tx.objectStore(STORE).getAll();
  await txDone(tx);
  db.close();
  return ((rq.result as GeoRecipe[]) ?? []).sort((a, b) => b.createdAt - a.createdAt);
}

/** Reçeteyi kaydeder; depo MAX_KAYIT'ı aşarsa en eskiler silinir. */
export async function saveRecipe(r: GeoRecipe): Promise<void> {
  const db = await openDB();
  const tx = db.transaction(STORE, "readwrite");
  const store = tx.objectStore(STORE);
  store.put(r);
  await txDone(tx);
  const all = await listRecipes();
  if (all.length > MAX_KAYIT) {
    const tx2 = db.transaction(STORE, "readwrite");
    for (const eski of all.slice(MAX_KAYIT)) tx2.objectStore(STORE).delete(eski.id);
    await txDone(tx2);
  }
  db.close();
}

export async function deleteRecipe(id: string): Promise<void> {
  const db = await openDB();
  const tx = db.transaction(STORE, "readwrite");
  tx.objectStore(STORE).delete(id);
  await txDone(tx);
  db.close();
}

/** Viewer canvas'ından küçük önizleme üretir (genişlik px, JPEG). */
export function canvasThumb(canvas: HTMLCanvasElement, widthPx = 240): string {
  const h = Math.round((canvas.height / canvas.width) * widthPx);
  const off = document.createElement("canvas");
  off.width = widthPx;
  off.height = h;
  const ctx = off.getContext("2d")!;
  ctx.fillStyle = "#0a0b0e";
  ctx.fillRect(0, 0, widthPx, h);
  ctx.drawImage(canvas, 0, 0, widthPx, h);
  return off.toDataURL("image/jpeg", 0.82);
}
