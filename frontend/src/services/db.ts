import { openDB, type DBSchema } from 'idb';

const DB_NAME = 'hooked-pwa-db';
const DB_VERSION = 1;
const STORE_NAME = 'offline-photos';

interface HookedDB extends DBSchema {
  [STORE_NAME]: {
    key: string;
    value: {
      id: string;
      projectId: string;
      file: File | Blob; // Accept Blob as well for safety
    };
  };
}

const dbPromise = openDB<HookedDB>(DB_NAME, DB_VERSION, {
  upgrade(db) {
    if (!db.objectStoreNames.contains(STORE_NAME)) {
      db.createObjectStore(STORE_NAME, { keyPath: 'id' });
    }
  },
});

export const db = {
  async addOfflinePhoto(id: string, projectId: string, file: File | Blob) {
    return (await dbPromise).put(STORE_NAME, { id, projectId, file });
  },
  async getOfflinePhoto(id: string) {
    return (await dbPromise).get(STORE_NAME, id);
  },
  async getAllOfflinePhotos() {
    return (await dbPromise).getAll(STORE_NAME);
  },
  async deleteOfflinePhoto(id: string) {
    return (await dbPromise).delete(STORE_NAME, id);
  },
};