// IndexedDB'ye FileSystemDirectoryHandle kaydeder/okur
// Sayfa yenilenince izin yeniden istenir ama klasör seçimi hatırlanır

const DB_NAME = "remaura-dirs";
const STORE = "handles";
const DB_VERSION = 1;

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function saveDirHandle(key: string, handle: FileSystemDirectoryHandle): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put(handle, key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

export async function loadDirHandle(key: string): Promise<FileSystemDirectoryHandle | null> {
  const db = await openDb();
  const handle = await new Promise<FileSystemDirectoryHandle | null>((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    const req = tx.objectStore(STORE).get(key);
    req.onsuccess = () => resolve((req.result as FileSystemDirectoryHandle | undefined) ?? null);
    req.onerror = () => reject(req.error);
  });
  db.close();
  return handle;
}

/**
 * Kaydedilmiş klasörü dener, izin yoksa yeniden ister, yoksa picker açar.
 * Kullanıcı picker'ı iptal ederse null döner.
 */
export async function getOrPickDir(key: string, startIn?: FileSystemHandleKind): Promise<FileSystemDirectoryHandle | null> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if (typeof window === "undefined" || !("showDirectoryPicker" in window)) return null;

  try {
    const saved = await loadDirHandle(key);
    if (saved) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const perm = await (saved as any).queryPermission({ mode: "readwrite" });
      if (perm === "granted") return saved;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const req = await (saved as any).requestPermission({ mode: "readwrite" });
      if (req === "granted") return saved;
    }
  } catch {
    // Handle geçersiz olmuş olabilir — picker'a düş
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const picked = await (window as any).showDirectoryPicker({ mode: "readwrite", startIn: startIn ?? "downloads" });
    await saveDirHandle(key, picked);
    return picked;
  } catch (e) {
    if ((e as { name?: string })?.name === "AbortError") return null;
    return null;
  }
}
