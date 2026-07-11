// ---------------------------------------------------------------------------
// Remaura araçlar arası mesh köprüsü — IndexedDB (PRD §7)
// Zincir: dönüştür → iç boşalt → ajurla → indir. STL'ler 5-8 MB olduğu için
// localStorage yetersiz; tek slotlu IndexedDB store kullanılır.
// ---------------------------------------------------------------------------

export type BridgeSource = "hollow" | "ajur" | "convert";

export type BridgeRecord = {
  meshBlob: Blob;           // binary STL
  source: BridgeSource;
  wallThickness?: number;   // mm (hollow'dan geliyorsa)
  volumeCm3: number;
  timestamp: number;
};

const DB_NAME = "remaura-tools";
const STORE = "mesh-bridge";
const KEY = "active";
/** Bu süreden eski kayıt bayat sayılır (PRD: 30 dk) */
export const BRIDGE_TTL_MS = 30 * 60 * 1000;

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(STORE)) {
        req.result.createObjectStore(STORE);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error("IndexedDB açılamadı"));
  });
}

export async function writeBridge(record: Omit<BridgeRecord, "timestamp">): Promise<void> {
  const db = await openDb();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, "readwrite");
      tx.objectStore(STORE).put({ ...record, timestamp: Date.now() } satisfies BridgeRecord, KEY);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error ?? new Error("Köprüye yazılamadı"));
    });
  } finally {
    db.close();
  }
}

/** Taze kayıt varsa döndürür; bayatsa (TTL aşımı) null döner ve slotu temizler. */
export async function readBridge(): Promise<BridgeRecord | null> {
  const db = await openDb();
  try {
    const rec = await new Promise<BridgeRecord | undefined>((resolve, reject) => {
      const tx = db.transaction(STORE, "readonly");
      const req = tx.objectStore(STORE).get(KEY);
      req.onsuccess = () => resolve(req.result as BridgeRecord | undefined);
      req.onerror = () => reject(req.error ?? new Error("Köprü okunamadı"));
    });
    if (!rec) return null;
    if (Date.now() - rec.timestamp > BRIDGE_TTL_MS) {
      await clearBridgeIn(db);
      return null;
    }
    return rec;
  } finally {
    db.close();
  }
}

function clearBridgeIn(db: IDBDatabase): Promise<void> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).delete(KEY);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error("Köprü temizlenemedi"));
  });
}

export async function clearBridge(): Promise<void> {
  const db = await openDb();
  try {
    await clearBridgeIn(db);
  } finally {
    db.close();
  }
}
