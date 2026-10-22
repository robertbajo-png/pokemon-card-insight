import { IDBFactory } from "fake-indexeddb";
import { beforeEach, afterEach, expect, it, vi } from "vitest";
import {
  acknowledgeUpload,
  deleteScannedCard,
  importBackup,
  importLocalCollection,
  mergeCloudCards,
  readScannedCards,
  readStoredCards,
  resolveConflict,
  saveScannedCard,
  updateScannedCard,
  type RemoteCard,
} from "@/services/scannedCardsStorage";
import { scannedCardSchema } from "@/lib/cardAnalysis";
import {
  belongsToSet,
  parseCollectionBackup,
  setProgress,
} from "@/lib/collection";
import type { PokemonCard } from "@/services/pokemonTcgApi";

const input = {
  name: "Pikachu",
  number: "058/102",
  set: "Base Set",
  image: "data:image/jpeg;base64,AA==",
};
beforeEach(() => {
  vi.stubGlobal("indexedDB", new IDBFactory());
  localStorage.clear();
});
afterEach(() => vi.unstubAllGlobals());
const remote = (
  card: ReturnType<typeof scannedCardSchema.parse>,
  revision = 1,
): RemoteCard => ({
  id: card.id,
  card,
  revision,
  deleted: false,
  mutation_id: crypto.randomUUID(),
});

it("upgrades the existing IndexedDB v1 collection without losing photos or prices", async () => {
  const legacy = scannedCardSchema.parse({
    ...input,
    id: "card-old",
    scannedAt: new Date().toISOString(),
    estimatedValue: "50 SEK",
  });
  await new Promise<void>((resolve, reject) => {
    const request = indexedDB.open("pokemon-card-insight", 1);
    request.onupgradeneeded = () =>
      request.result.createObjectStore("cards", { keyPath: "id" });
    request.onerror = reject;
    request.onsuccess = () => {
      const db = request.result,
        tx = db.transaction("cards", "readwrite");
      tx.objectStore("cards").put(legacy);
      tx.oncomplete = () => {
        db.close();
        resolve();
      };
    };
  });
  expect(await readScannedCards()).toEqual([legacy]);
});
it("counts duplicate physical copies while preserving notes, and separates conditions and languages", async () => {
  const saved = await saveScannedCard(input);
  await updateScannedCard(saved.id, { notes: "Favorit" });
  await saveScannedCard({ ...input, number: "58" });
  expect((await readScannedCards())[0]).toMatchObject({
    quantity: 2,
    notes: "Favorit",
  });
  await saveScannedCard({ ...input, language: "ja" });
  await saveScannedCard({ ...input, condition: "Played" });
  expect(await readScannedCards()).toHaveLength(3);
});
it("isolates account caches and imports local cards only on an explicit atomic move", async () => {
  const guest = await saveScannedCard(input);
  await saveScannedCard({ ...input, name: "Eevee" }, "bob");
  expect(await readScannedCards("alice")).toEqual([]);
  await importLocalCollection("alice");
  expect(await readScannedCards()).toEqual([]);
  expect((await readScannedCards("alice"))[0].id).toBe(guest.id);
  expect((await readScannedCards("bob"))[0].name).toBe("Eevee");
  expect((await readStoredCards("alice"))[0].mutationId).toBeTruthy();
  await importLocalCollection("alice");
  expect(await readScannedCards("alice")).toHaveLength(1);
});
it("keeps an edit made during upload pending against the newly acknowledged revision", async () => {
  const card = await saveScannedCard(input, "alice"),
    sent = (await readStoredCards("alice"))[0];
  await updateScannedCard(card.id, { quantity: 4 }, "alice");
  await acknowledgeUpload("alice", sent, {
    ...remote(card),
    mutation_id: sent.mutationId!,
  });
  expect((await readStoredCards("alice"))[0]).toMatchObject({
    revision: 1,
    card: { quantity: 4 },
  });
  expect((await readStoredCards("alice"))[0].mutationId).toBeTruthy();
});
it("does not revive a card deleted during upload or after a stale cloud pull", async () => {
  const card = await saveScannedCard(input, "alice"),
    sent = (await readStoredCards("alice"))[0];
  await deleteScannedCard(card.id, "alice");
  await acknowledgeUpload("alice", sent, remote(card));
  expect(await readScannedCards("alice")).toEqual([]);
  expect((await readStoredCards("alice"))[0]).toMatchObject({
    deleted: true,
    revision: 1,
  });
  const tombstone = { ...remote(card, 2), deleted: true };
  await mergeCloudCards("bob", [tombstone]);
  await mergeCloudCards("bob", [remote(card, 1)]);
  expect(await readScannedCards("bob")).toEqual([]);
});
it("retains both versions on conflict and supports explicit local or cloud resolution", async () => {
  const card = await saveScannedCard(input, "alice");
  await mergeCloudCards("alice", [remote({ ...card, quantity: 7 })]);
  expect((await readStoredCards("alice"))[0].conflict?.card.quantity).toBe(7);
  expect((await readScannedCards("alice"))[0].quantity).toBe(1);
  await resolveConflict("alice", card.id, "cloud");
  expect((await readScannedCards("alice"))[0].quantity).toBe(7);
  await updateScannedCard(card.id, { quantity: 8 }, "alice");
  await mergeCloudCards("alice", [remote({ ...card, quantity: 9 }, 2)]);
  await resolveConflict("alice", card.id, "local");
  expect((await readStoredCards("alice"))[0]).toMatchObject({
    card: { quantity: 8 },
    revision: 2,
    conflict: undefined,
  });
});
it("rejects a stale editor snapshot after a newer cloud version has already been pulled", async () => {
  const opened = await saveScannedCard(input, "alice");
  const sent = (await readStoredCards("alice"))[0];
  await acknowledgeUpload("alice", sent, {
    ...remote(opened),
    mutation_id: sent.mutationId!,
  });
  await mergeCloudCards("alice", [
    remote({ ...opened, quantity: 7, notes: "Ändrat på andra enheten" }, 2),
  ]);
  await expect(
    updateScannedCard(opened.id, { quantity: 2, notes: "" }, "alice", opened),
  ).rejects.toThrow("Kortet har ändrats");
  expect((await readScannedCards("alice"))[0]).toMatchObject({
    quantity: 7,
    notes: "Ändrat på andra enheten",
  });
});
it("validates backups, preserves active edits and explicitly restores deleted records", async () => {
  const card = await saveScannedCard(input, "alice");
  const backup = parseCollectionBackup(
    JSON.stringify({ version: 1, cards: [card] }),
  );
  await updateScannedCard(card.id, { notes: "Ny anteckning" }, "alice");
  await importBackup(backup, "alice");
  expect((await readScannedCards("alice"))[0].notes).toBe("Ny anteckning");
  await deleteScannedCard(card.id, "alice");
  await importBackup(backup, "alice");
  expect((await readScannedCards("alice"))[0]).toMatchObject({
    id: card.id,
    quantity: 1,
  });
  expect(() =>
    parseCollectionBackup(
      JSON.stringify({ version: 1, cards: [{ ...card, quantity: 0 }] }),
    ),
  ).toThrow();
});
it("counts unique catalogue numbers across variants, padded numbers and copies, without matching Base Set 2", () => {
  const base = scannedCardSchema.parse({
    ...input,
    id: "card-pika",
    scannedAt: new Date().toISOString(),
    quantity: 5,
  });
  const catalog = [
    { id: "base1-58", name: "Pikachu", number: "58" },
    { id: "base1-1", name: "Alakazam", number: "1" },
  ] as PokemonCard[];
  const progress = setProgress(
    [
      base,
      { ...base, id: "card-holo", variant: "holo", quantity: 2 },
      { ...base, id: "card-other", set: "Base Set 2", number: "1" },
    ],
    { id: "base1", name: "Base Set" },
    catalog,
  );
  expect(progress).toMatchObject({
    ownedCount: 1,
    missing: 1,
    total: 2,
    percent: 50,
  });
  expect(progress.quantities.get("58")).toBe(7);
  expect(
    belongsToSet(
      { ...base, set: "Base Set 2" },
      { id: "base1", name: "Base Set" },
    ),
  ).toBe(false);
});
