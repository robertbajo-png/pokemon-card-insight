import {
  scannedCardSchema,
  type NewScannedCard,
  type ScannedCard,
} from "@/lib/cardAnalysis";
import { resolveSetId, samePrinting } from "@/lib/collection";

const LEGACY_KEY = "pokemon_scanned_cards";
const STORE = "collection";
export const GUEST = "guest";
export const SCANNED_CARDS_CHANGED = "scanned-cards-changed";
export interface RemoteCard {
  id: string;
  card: ScannedCard;
  revision: number;
  deleted: boolean;
  mutation_id: string;
}
export interface StoredCard {
  key: string;
  owner: string;
  card: ScannedCard;
  revision: number;
  deleted: boolean;
  mutationId: string | null;
  conflict?: RemoteCard;
}
const key = (owner: string, id: string) => `${owner}:${id}`;
const entry = (card: ScannedCard, owner: string): StoredCard => ({
  key: key(owner, card.id),
  owner,
  card,
  revision: 0,
  deleted: false,
  mutationId: owner === GUEST ? null : crypto.randomUUID(),
});

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("Webbläsaren stöder inte lagring av kort."));
      return;
    }
    const request = indexedDB.open("pokemon-card-insight", 2);
    request.onupgradeneeded = () => {
      const store = request.result.createObjectStore(STORE, { keyPath: "key" });
      store.createIndex("owner", "owner");
      if (request.result.objectStoreNames.contains("cards")) {
        const cursor = request.transaction!.objectStore("cards").openCursor();
        cursor.onsuccess = () => {
          if (!cursor.result) {
            request.result.deleteObjectStore("cards");
            return;
          }
          store.put(entry(cursor.result.value, GUEST));
          cursor.result.continue();
        };
      }
    };
    request.onerror = () =>
      reject(new Error("Kunde inte öppna kortsamlingen."));
    request.onblocked = () =>
      reject(new Error("Stäng andra flikar och försök igen."));
    request.onsuccess = () => resolve(request.result);
  });
}

async function transaction<T>(
  mode: IDBTransactionMode,
  action: (
    store: IDBObjectStore,
    setResult: (result: T) => void,
    fail: (error: Error) => void,
  ) => void,
): Promise<T> {
  const db = await openDatabase();
  return new Promise<T>((resolve, reject) => {
    const tx = db.transaction(STORE, mode);
    let result: T;
    let failure: Error | undefined;
    tx.oncomplete = () => {
      db.close();
      resolve(result);
    };
    tx.onabort = () => {
      db.close();
      reject(
        failure ??
          new Error(
            "Kortet kunde inte sparas. Kontrollera enhetens lagringsutrymme och försök igen.",
          ),
      );
    };
    tx.onerror = () => {
      /* onabort reports the failed transaction */
    };
    try {
      action(
        tx.objectStore(STORE),
        (value) => {
          result = value;
        },
        (error) => {
          failure = error;
          tx.abort();
        },
      );
    } catch (error) {
      tx.abort();
      reject(error);
    }
  });
}

async function migrateLegacyCards() {
  const raw = localStorage.getItem(LEGACY_KEY);
  if (!raw) return;
  const legacy = scannedCardSchema.array().parse(JSON.parse(raw));
  await transaction<void>("readwrite", (store) => {
    for (const card of legacy) {
      const request = store.get(key(GUEST, card.id));
      request.onsuccess = () => {
        if (!request.result) store.put(entry(card, GUEST));
      };
    }
  });
  if (localStorage.getItem(LEGACY_KEY) === raw)
    localStorage.removeItem(LEGACY_KEY);
}

export async function readStoredCards(owner = GUEST): Promise<StoredCard[]> {
  await migrateLegacyCards();
  return transaction("readonly", (store, setResult) => {
    const request = store.index("owner").getAll(owner);
    request.onsuccess = () => {
      try {
        setResult(
          request.result.map((row) => ({
            ...row,
            card: scannedCardSchema.parse(row.card),
          })),
        );
      } catch {
        request.transaction.abort();
      }
    };
  });
}

export async function readScannedCards(owner = GUEST): Promise<ScannedCard[]> {
  return (await readStoredCards(owner))
    .filter((row) => !row.deleted)
    .map((row) => row.card)
    .sort((a, b) => b.scannedAt.localeCompare(a.scannedAt));
}

export async function saveScannedCard(
  input: NewScannedCard,
  owner = GUEST,
): Promise<ScannedCard> {
  await migrateLegacyCards();
  const card = scannedCardSchema.parse({
    ...input,
    setId: input.setId || resolveSetId(input),
    id: `card-${crypto.randomUUID()}`,
    scannedAt: new Date().toISOString(),
  });
  return transaction("readwrite", (store, setResult) => {
    const request = store.index("owner").getAll(owner);
    request.onsuccess = () => {
      const existing = (request.result as StoredCard[]).find(
        (row) =>
          !row.deleted && samePrinting(scannedCardSchema.parse(row.card), card),
      );
      if (existing) {
        try {
          const merged = scannedCardSchema.parse({
            ...existing.card,
            quantity: (existing.card.quantity ?? 1) + card.quantity,
          });
          store.put({
            ...existing,
            card: merged,
            mutationId: owner === GUEST ? null : crypto.randomUUID(),
          });
          setResult(merged);
        } catch {
          request.transaction.abort();
        }
      } else {
        store.put(entry(card, owner));
        setResult(card);
      }
    };
  });
}

export async function updateScannedCard(
  id: string,
  changes: Partial<NewScannedCard>,
  owner = GUEST,
  expected?: ScannedCard,
): Promise<void> {
  await transaction<void>("readwrite", (store, _setResult, fail) => {
    const request = store.get(key(owner, id));
    request.onsuccess = () => {
      const row = request.result as StoredCard | undefined;
      if (!row || row.deleted) {
        request.transaction.abort();
        return;
      }
      try {
        if (
          expected &&
          JSON.stringify(scannedCardSchema.parse(row.card)) !==
            JSON.stringify(scannedCardSchema.parse(expected))
        ) {
          fail(
            new Error(
              "Kortet har ändrats sedan du öppnade redigeringen. Stäng och öppna kortet igen för att läsa den senaste versionen. Dina uppgifter i formuläret finns kvar tills du stänger det.",
            ),
          );
          return;
        }
        const card = scannedCardSchema.parse({
          ...row.card,
          ...changes,
          id,
          scannedAt: row.card.scannedAt,
        });
        store.put({
          ...row,
          card,
          mutationId: owner === GUEST ? null : crypto.randomUUID(),
        });
      } catch {
        request.transaction.abort();
      }
    };
  });
}

export async function deleteScannedCard(
  id: string,
  owner = GUEST,
): Promise<void> {
  await transaction<void>("readwrite", (store) => {
    const request = store.get(key(owner, id));
    request.onsuccess = () => {
      const row = request.result as StoredCard | undefined;
      if (!row) return;
      if (owner === GUEST) store.delete(row.key);
      else
        store.put({ ...row, deleted: true, mutationId: crypto.randomUUID() });
    };
  });
}

export async function deleteScannedCards(owner = GUEST): Promise<void> {
  await migrateLegacyCards();
  await transaction<void>("readwrite", (store) => {
    const request = store.index("owner").getAll(owner);
    request.onsuccess = () => {
      for (const row of request.result as StoredCard[]) {
        if (owner === GUEST) store.delete(row.key);
        else if (!row.deleted)
          store.put({ ...row, deleted: true, mutationId: crypto.randomUUID() });
      }
    };
  });
}

// Moving guest entries and saving the account cache is one atomic, durable transaction.
export async function importLocalCollection(owner: string): Promise<void> {
  if (owner === GUEST)
    throw new Error("Logga in för att flytta kort till ditt konto.");
  await migrateLegacyCards();
  await transaction<void>("readwrite", (store) => {
    const request = store.index("owner").getAll(GUEST);
    request.onsuccess = () => {
      for (const row of request.result as StoredCard[]) {
        const existing = store.get(key(owner, row.card.id));
        existing.onsuccess = () => {
          const card = scannedCardSchema.parse(row.card);
          if (!existing.result) store.put(entry(card, owner));
          else if (
            JSON.stringify(existing.result.card) !== JSON.stringify(card) ||
            existing.result.deleted
          ) {
            // An ID collision must not throw away a different local copy.
            store.put(
              entry({ ...card, id: `card-${crypto.randomUUID()}` }, owner),
            );
          }
          store.delete(row.key);
        };
      }
    };
  });
}

export async function importBackup(
  cards: ScannedCard[],
  owner = GUEST,
): Promise<void> {
  const validated = scannedCardSchema.array().parse(cards);
  await transaction<void>("readwrite", (store) => {
    for (const card of validated) {
      const request = store.get(key(owner, card.id));
      request.onsuccess = () => {
        const current = request.result as StoredCard | undefined;
        if (!current) store.put(entry(card, owner));
        else if (current.deleted) {
          // A user explicitly restoring a backup may restore a deleted card. Use the known
          // revision so a newer remote deletion still requires conflict resolution.
          store.put({
            ...current,
            card,
            deleted: false,
            mutationId: crypto.randomUUID(),
            conflict: undefined,
          });
        }
      };
    }
  });
}

export async function acknowledgeUpload(
  owner: string,
  sent: StoredCard,
  remote: RemoteCard,
): Promise<void> {
  await transaction<void>("readwrite", (store) => {
    const request = store.get(sent.key);
    request.onsuccess = () => {
      const current = request.result as StoredCard | undefined;
      if (
        !current ||
        current.owner !== owner ||
        current.revision > remote.revision
      )
        return;
      if (current.mutationId === sent.mutationId) {
        store.put({
          key: current.key,
          owner,
          card: remote.card,
          deleted: remote.deleted,
          revision: remote.revision,
          mutationId: null,
        });
      } else {
        // Preserve edits made while an older version was uploading.
        store.put({
          ...current,
          revision: remote.revision,
          conflict: undefined,
        });
      }
    };
  });
}

export async function mergeCloudCards(
  owner: string,
  remote: RemoteCard[],
): Promise<void> {
  await transaction<void>("readwrite", (store) => {
    for (const cloud of remote) {
      const request = store.get(key(owner, cloud.id));
      request.onsuccess = () => {
        const current = request.result as StoredCard | undefined;
        if (current && cloud.revision <= current.revision) return;
        if (current?.mutationId && current.mutationId !== cloud.mutation_id) {
          store.put({ ...current, conflict: cloud });
        } else {
          store.put({
            key: key(owner, cloud.id),
            owner,
            card: cloud.card,
            revision: cloud.revision,
            deleted: cloud.deleted,
            mutationId: null,
          });
        }
      };
    }
  });
}

export async function resolveConflict(
  owner: string,
  id: string,
  choice: "local" | "cloud",
): Promise<void> {
  await transaction<void>("readwrite", (store) => {
    const request = store.get(key(owner, id));
    request.onsuccess = () => {
      const row = request.result as StoredCard | undefined;
      if (!row?.conflict) return;
      const cloud = row.conflict;
      store.put(
        choice === "local"
          ? {
              ...row,
              revision: cloud.revision,
              conflict: undefined,
              mutationId: crypto.randomUUID(),
            }
          : {
              key: row.key,
              owner,
              card: cloud.card,
              revision: cloud.revision,
              deleted: cloud.deleted,
              mutationId: null,
            },
      );
    };
  });
}
