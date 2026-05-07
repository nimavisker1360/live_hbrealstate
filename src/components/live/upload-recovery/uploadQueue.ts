"use client";

const DB_NAME = "hb-live-upload-recovery";
const DB_VERSION = 1;
const STORE_NAME = "uploadQueue";
const STORAGE_FALLBACK_KEY = "hb-live-upload-queue";

export type QueuedUpload = {
  id: string;
  chunkSize: number;
  createdAt: string;
  duration: number | null;
  fileLastModified: number;
  fileName: string;
  fileSize: number;
  mimeType: string;
  progress: number;
  propertyId?: string;
  recordingId?: string;
  selectedTarget?: string;
  status: "local_pending" | "uploading" | "uploaded" | "failed";
  streamId?: string;
  uploadSessionId?: string;
  uploadedChunks: number;
  updatedAt: string;
};

function canUseIndexedDb() {
  return typeof window !== "undefined" && "indexedDB" in window;
}

function openQueueDb() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;

      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "id" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function withStore<T>(
  mode: IDBTransactionMode,
  callback: (store: IDBObjectStore) => IDBRequest<T>,
) {
  const db = await openQueueDb();

  return new Promise<T>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, mode);
    const request = callback(tx.objectStore(STORE_NAME));

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
    tx.oncomplete = () => db.close();
    tx.onerror = () => {
      db.close();
      reject(tx.error);
    };
  });
}

function readLocalStorageQueue() {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const rawValue = window.localStorage.getItem(STORAGE_FALLBACK_KEY);
    const parsedValue: unknown = rawValue ? JSON.parse(rawValue) : [];

    return Array.isArray(parsedValue) ? (parsedValue as QueuedUpload[]) : [];
  } catch {
    return [];
  }
}

function writeLocalStorageQueue(items: QueuedUpload[]) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(STORAGE_FALLBACK_KEY, JSON.stringify(items));
}

export function createQueueId({
  fileLastModified,
  fileName,
  fileSize,
  propertyId,
  streamId,
}: {
  fileLastModified: number;
  fileName: string;
  fileSize: number;
  propertyId?: string;
  streamId?: string;
}) {
  return [
    streamId ?? "manual",
    propertyId ?? "no-property",
    fileName,
    fileSize,
    fileLastModified,
  ].join(":");
}

export async function listQueuedUploads() {
  if (!canUseIndexedDb()) {
    return readLocalStorageQueue();
  }

  try {
    return await withStore<QueuedUpload[]>("readonly", (store) =>
      store.getAll(),
    );
  } catch {
    return readLocalStorageQueue();
  }
}

export async function saveQueuedUpload(upload: QueuedUpload) {
  if (!canUseIndexedDb()) {
    const existing = readLocalStorageQueue().filter(
      (item) => item.id !== upload.id,
    );

    writeLocalStorageQueue([upload, ...existing].slice(0, 30));
    return;
  }

  try {
    await withStore<IDBValidKey>("readwrite", (store) => store.put(upload));
  } catch {
    const existing = readLocalStorageQueue().filter(
      (item) => item.id !== upload.id,
    );

    writeLocalStorageQueue([upload, ...existing].slice(0, 30));
  }
}

export async function removeQueuedUpload(id: string) {
  if (!canUseIndexedDb()) {
    writeLocalStorageQueue(readLocalStorageQueue().filter((item) => item.id !== id));
    return;
  }

  try {
    await withStore<undefined>("readwrite", (store) => store.delete(id));
  } catch {
    writeLocalStorageQueue(readLocalStorageQueue().filter((item) => item.id !== id));
  }
}
