// Persistance du snapshot de session en IndexedDB.
//
// POURQUOI IndexedDB et pas localStorage (storage.ts) : le snapshot est un
// `Uint8Array` opaque produit par le moteur. IndexedDB stocke le binaire nativement
// (structured clone), gère des charges plus lourdes, et est asynchrone — adapté à
// « seul écrivain en solo » (plan §1). localStorage imposerait un base64 (gonflé)
// et reste synchrone. Le moteur narratif étant un produit séparé des outils v1,
// il NE réutilise PAS `storage.ts`.

export interface SnapshotStore {
  save(sessionId: string, bytes: Uint8Array): Promise<void>;
  load(sessionId: string): Promise<Uint8Array | null>;
  clear(sessionId: string): Promise<void>;
}

const DB_NAME = 'choix-narratifs-moteur';
const STORE = 'snapshots';
const DB_VERSION = 1;

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error('Ouverture IndexedDB impossible.'));
  });
}

function runRequest<T>(
  db: IDBDatabase,
  mode: IDBTransactionMode,
  op: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, mode);
    const req = op(tx.objectStore(STORE));
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error('Requête IndexedDB échouée.'));
    tx.onabort = () => reject(tx.error ?? new Error('Transaction IndexedDB annulée.'));
  });
}

/** Implémentation IndexedDB. Une instance ouvre/garde la base ; clé = sessionId. */
export class IdbSnapshotStore implements SnapshotStore {
  private dbPromise: Promise<IDBDatabase>;

  constructor() {
    this.dbPromise = openDb();
  }

  async save(sessionId: string, bytes: Uint8Array): Promise<void> {
    const db = await this.dbPromise;
    // On clone dans un Uint8Array « propre » pour éviter de stocker une vue sur
    // un buffer plus grand (mémoire WASM).
    await runRequest(db, 'readwrite', (store) =>
      store.put(new Uint8Array(bytes), sessionId),
    );
  }

  async load(sessionId: string): Promise<Uint8Array | null> {
    const db = await this.dbPromise;
    const value = await runRequest<unknown>(db, 'readonly', (store) =>
      store.get(sessionId),
    );
    if (value === undefined || value === null) return null;
    if (value instanceof ArrayBuffer) return new Uint8Array(value);
    // `ArrayBuffer.isView` plutôt que `instanceof Uint8Array` : le structured
    // clone d'IndexedDB peut restituer une vue d'un AUTRE realm (cas observé
    // sous fake-indexeddb, et possible selon les moteurs), où `instanceof`
    // échoue alors que c'est bien un typed array.
    if (ArrayBuffer.isView(value)) {
      const view = value as ArrayBufferView;
      return new Uint8Array(view.buffer.slice(view.byteOffset, view.byteOffset + view.byteLength));
    }
    throw new Error('Snapshot stocké dans un format inattendu.');
  }

  async clear(sessionId: string): Promise<void> {
    const db = await this.dbPromise;
    await runRequest(db, 'readwrite', (store) => store.delete(sessionId));
  }
}

/** Double en mémoire — fallback non-persistant et utile pour les tests d'orchestration. */
export class MemorySnapshotStore implements SnapshotStore {
  private map = new Map<string, Uint8Array>();

  async save(sessionId: string, bytes: Uint8Array): Promise<void> {
    this.map.set(sessionId, new Uint8Array(bytes));
  }

  async load(sessionId: string): Promise<Uint8Array | null> {
    return this.map.get(sessionId) ?? null;
  }

  async clear(sessionId: string): Promise<void> {
    this.map.delete(sessionId);
  }
}
