/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * IndexedDB Binary Media Blob Store
 * Persists user-uploaded video bumpers (Intro/Outro) safely across browser reloads
 * without relying on ephemeral URL.createObjectURL strings stored in localStorage.
 */

const DB_NAME = 'newspress_media_store_v1';
const STORE_NAME = 'blobs';

function isIndexedDbAvailable(): boolean {
  return typeof window !== 'undefined' && typeof indexedDB !== 'undefined';
}

function openMediaDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (!isIndexedDbAvailable()) {
      reject(new Error('IndexedDB unavailable'));
      return;
    }
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('Failed to open IndexedDB'));
  });
}

export async function saveMediaBlob(key: string, blob: Blob): Promise<void> {
  if (!isIndexedDbAvailable()) return;
  try {
    const db = await openMediaDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      store.put(blob, key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  } catch (err) {
    console.warn('[mediaBlobStore] Failed to save blob:', key, err);
  }
}

export async function loadMediaBlob(key: string): Promise<Blob | null> {
  if (!isIndexedDbAvailable()) return null;
  try {
    const db = await openMediaDb();
    const result = await new Promise<Blob | null>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(key);
      req.onsuccess = () => resolve((req.result as Blob) || null);
      req.onerror = () => reject(req.error);
    });
    db.close();
    return result;
  } catch (err) {
    console.warn('[mediaBlobStore] Failed to load blob:', key, err);
    return null;
  }
}

export async function deleteMediaBlob(key: string): Promise<void> {
  if (!isIndexedDbAvailable()) return;
  try {
    const db = await openMediaDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      store.delete(key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  } catch (err) {
    console.warn('[mediaBlobStore] Failed to delete blob:', key, err);
  }
}
