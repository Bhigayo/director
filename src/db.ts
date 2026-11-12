// Everything is saved on this device in IndexedDB: your shoots, reference photos and settings.
// Nothing leaves the phone. Backups are a single file you can save and restore.

import type { Shoot } from "./model";

const DB_NAME = "director";
const VERSION = 1;

let opening: Promise<IDBDatabase> | null = null;

export function openDb(): Promise<IDBDatabase> {
  opening ??= new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains("shoots")) db.createObjectStore("shoots", { keyPath: "id" });
      if (!db.objectStoreNames.contains("photos")) db.createObjectStore("photos");
      if (!db.objectStoreNames.contains("settings")) db.createObjectStore("settings");
    };
    req.onsuccess = () => {
      const db = req.result;
      db.onversionchange = () => {
        db.close();
        opening = null;
      };
      resolve(db);
    };
    req.onerror = () => {
      opening = null;
      reject(req.error);
    };
  });
  return opening;
}

function run<T>(store: string, mode: IDBTransactionMode, work: (s: IDBObjectStore) => IDBRequest<T> | void): Promise<T> {
  return openDb().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const tx = db.transaction(store, mode);
        const req = work(tx.objectStore(store));
        tx.oncomplete = () => resolve(req ? req.result : (undefined as T));
        tx.onerror = () => reject(tx.error);
        tx.onabort = () => reject(tx.error);
      }),
  );
}

export const db = {
  allShoots: () => run<Shoot[]>("shoots", "readonly", (s) => s.getAll() as IDBRequest<Shoot[]>),
  putShoot: (shoot: Shoot) => run("shoots", "readwrite", (s) => void s.put(shoot)),
  deleteShoot: (id: string) => run("shoots", "readwrite", (s) => void s.delete(id)),

  getPhoto: (key: string) => run<Blob | undefined>("photos", "readonly", (s) => s.get(key) as IDBRequest<Blob | undefined>),
  putPhoto: (key: string, blob: Blob) => run("photos", "readwrite", (s) => void s.put(blob, key)),
  deletePhoto: (key: string) => run("photos", "readwrite", (s) => void s.delete(key)),
  photoKeys: () => run<IDBValidKey[]>("photos", "readonly", (s) => s.getAllKeys()),

  getSetting: <T>(key: string) => run<T | undefined>("settings", "readonly", (s) => s.get(key) as IDBRequest<T | undefined>),
  putSetting: (key: string, value: unknown) => run("settings", "readwrite", (s) => void s.put(value, key)),
};
