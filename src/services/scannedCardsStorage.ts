import { scannedCardSchema, type NewScannedCard, type ScannedCard } from "@/lib/cardAnalysis";

const LEGACY_KEY = "pokemon_scanned_cards";
const STORE = "cards";
export const SCANNED_CARDS_CHANGED = "scanned-cards-changed";

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("Webbläsaren stöder inte lagring av kort."));
      return;
    }
    const request = indexedDB.open("pokemon-card-insight", 1);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE, { keyPath: "id" });
    request.onerror = () => reject(new Error("Kunde inte öppna kortsamlingen."));
    request.onblocked = () => reject(new Error("Stäng andra flikar och försök igen."));
    request.onsuccess = () => resolve(request.result);
  });
}

async function transaction<T>(mode: IDBTransactionMode, action: (store: IDBObjectStore, setResult: (result: T) => void) => void): Promise<T> {
  const db = await openDatabase();
  return new Promise<T>((resolve, reject) => {
    const tx = db.transaction(STORE, mode);
    let result: T;
    tx.oncomplete = () => { db.close(); resolve(result); };
    tx.onabort = () => { db.close(); reject(new Error("Kortet kunde inte sparas. Kontrollera enhetens lagringsutrymme och försök igen.")); };
    tx.onerror = () => { /* onabort reports the failed transaction */ };
    try { action(tx.objectStore(STORE), value => { result = value; }); }
    catch (error) { tx.abort(); reject(error); }
  });
}

async function migrateLegacyCards() {
  const raw = localStorage.getItem(LEGACY_KEY);
  if (!raw) return;
  const legacy = scannedCardSchema.array().parse(JSON.parse(raw));
  await transaction<void>("readwrite", store => {
    for (const card of legacy) {
      const request = store.get(card.id);
      // Never overwrite newer data if a previous legacy cleanup failed.
      request.onsuccess = () => { if (!request.result) store.put(card); };
    }
  });
  // Preserve old data until every IndexedDB write has committed.
  if (localStorage.getItem(LEGACY_KEY) === raw) localStorage.removeItem(LEGACY_KEY);
}

export async function readScannedCards(): Promise<ScannedCard[]> {
  await migrateLegacyCards();
  const cards = await transaction<ScannedCard[]>("readonly", (store, setResult) => {
    const request = store.getAll();
    request.onsuccess = () => {
      try { setResult(scannedCardSchema.array().parse(request.result)); }
      catch { request.transaction.abort(); }
    };
  });
  return cards.sort((a, b) => b.scannedAt.localeCompare(a.scannedAt));
}

export async function saveScannedCard(input: NewScannedCard): Promise<ScannedCard> {
  await migrateLegacyCards();
  const card = scannedCardSchema.parse({ ...input, id: `card-${crypto.randomUUID()}`, scannedAt: new Date().toISOString() });
  await transaction<void>("readwrite", store => {
    const request = store.getAll();
    request.onsuccess = () => {
      for (const existing of request.result as ScannedCard[]) {
        if (existing.name === card.name && existing.set === card.set && existing.number === card.number) store.delete(existing.id);
      }
      store.put(card);
    };
  });
  return card;
}

export async function deleteScannedCards(): Promise<void> {
  await migrateLegacyCards();
  await transaction<void>("readwrite", store => { store.clear(); });
}
