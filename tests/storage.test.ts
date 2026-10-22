import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { IDBFactory, IDBDatabase } from "fake-indexeddb";
import { deleteScannedCards, readScannedCards, saveScannedCard } from "@/services/scannedCardsStorage";
import { cardAnalysisSchema, cardToScan } from "@/lib/cardAnalysis";
import { convertPriceRange } from "@/utils/currency";

const input = { name: "Pikachu", type: "Lightning", set: "Base Set", number: "58/102", rarity: "Common", image: "data:image/jpeg;base64,AA==" };
beforeEach(() => { vi.stubGlobal("indexedDB", new IDBFactory()); localStorage.clear(); });
afterEach(() => vi.unstubAllGlobals());

it("migrates old cards and their images without losing prices", async () => {
  const legacy = { ...input, id: "card-old", scannedAt: "2026-10-22T10:00:00.000Z", estimatedValue: "50-100 SEK" };
  localStorage.setItem("pokemon_scanned_cards", JSON.stringify([legacy]));
  const cards = await readScannedCards();
  expect(cards[0]).toMatchObject(legacy);
  expect(localStorage.getItem("pokemon_scanned_cards")).toBeNull();
  expect((await readScannedCards())[0].id).toBe("card-old");
});
it("keeps the legacy copy when a database write fails", async () => {
  const raw = JSON.stringify([{ ...input, id: "card-old", scannedAt: "2026-10-22T10:00:00.000Z" }]);
  localStorage.setItem("pokemon_scanned_cards", raw);
  const original = IDBDatabase.prototype.transaction;
  vi.spyOn(IDBDatabase.prototype, "transaction").mockImplementation(function (...args) {
    const tx = original.apply(this, args);
    if (args[1] === "readwrite") queueMicrotask(() => tx.abort());
    return tx;
  });
  await expect(readScannedCards()).rejects.toThrow("kunde inte sparas");
  expect(localStorage.getItem("pokemon_scanned_cards")).toBe(raw);
});
it("reports failed saves instead of pretending a card was persisted", async () => {
  const original = IDBDatabase.prototype.transaction;
  const spy = vi.spyOn(IDBDatabase.prototype, "transaction").mockImplementation(function (...args) {
    const tx = original.apply(this, args);
    if (args[1] === "readwrite") queueMicrotask(() => tx.abort());
    return tx;
  });
  await expect(saveScannedCard(input)).rejects.toThrow("kunde inte sparas");
  spy.mockRestore();
  expect(await readScannedCards()).toEqual([]);
});
it("serializes concurrent writes and replaces only the matching card", async () => {
  await Promise.all(Array.from({ length: 8 }, (_, i) => saveScannedCard({ ...input, number: String(i) })));
  expect(await readScannedCards()).toHaveLength(8);
  await Promise.all([saveScannedCard({ ...input, number: "1" }), saveScannedCard({ ...input, number: "1" })]);
  expect(await readScannedCards()).toHaveLength(8);
  await deleteScannedCards();
  expect(await readScannedCards()).toEqual([]);
});
it("preserves every grading price and renders SEK ranges in the chosen currency", () => {
  const analysis = cardAnalysisSchema.parse({ ...input, priceByGrade: { ungraded: "50-100 SEK", psa10: "1 200–1 500 SEK" } });
  expect(cardToScan(analysis, input.image)).toMatchObject({ estimatedValue: "50-100 SEK", priceByGrade: analysis.priceByGrade });
  expect(convertPriceRange("50-100 SEK", "SEK")).toBe("50-100 kr");
  expect(convertPriceRange("1 200–1 500 SEK", "USD")).toBe("$109-137");
  expect(convertPriceRange("50,50 kr", "SEK")).toBe("51 kr");
  expect(convertPriceRange("Unknown", "USD")).toBe("Unknown");
  expect(() => cardAnalysisSchema.parse({ name: {} })).toThrow();
});
