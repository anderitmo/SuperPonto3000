// IndexedDB Wrapper using IDB library (loaded via CDN)
const DB_NAME = 'TimeTrackerDB';
const DB_VERSION = 1;
const STORE_NAME = 'sync_queue';

export async function getDB() {
  if (!window.idb) {
    throw new Error('Biblioteca IDB não carregada.');
  }
  return window.idb.openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
      }
    }
  });
}

export async function saveOfflineRecord(record) {
  const db = await getDB();
  return db.add(STORE_NAME, {
    ...record,
    created_at_local: new Date().toISOString()
  });
}

export async function getOfflineQueue() {
  const db = await getDB();
  return db.getAll(STORE_NAME);
}

export async function removeOfflineRecord(id) {
  const db = await getDB();
  return db.delete(STORE_NAME, id);
}
