import { IDBFactory } from "fake-indexeddb";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { pokemonSets } from "@/data/pokemonSets";
import { scannedCardSchema, type ScannedCard } from "@/lib/cardAnalysis";
import {
  belongsToSet,
  cardNumber,
  catalogCardToCollection,
  collectionCardIdentity,
  resolveSetId,
  samePrinting,
  setLinkStatus,
  setProgress,
} from "@/lib/collection";
import {
  readScannedCards,
  saveScannedCard,
} from "@/services/scannedCardsStorage";
import type { PokemonCard } from "@/services/pokemonTcgApi";

const englishSet = pokemonSets.find((set) => set.id === "sv3pt5")!;
const japaneseSet = pokemonSets.find((set) => set.id === "jp-sv2a")!;
const anotherJapaneseSet = pokemonSets.find(
  (set) => set.region === "jp" && set.id !== "jp-sv2a",
)!;

const owned = (changes: Partial<ScannedCard> = {}): ScannedCard =>
  scannedCardSchema.parse({
    id: "card-identity-fixture",
    scannedAt: "2026-11-08T10:00:00.000Z",
    name: "Pikachu",
    number: "025/165",
    set: englishSet.name,
    setId: englishSet.id,
    setCode: englishSet.setCode,
    catalogId: "sv3pt5-25",
    ...changes,
  });

const japaneseOwned = (changes: Partial<ScannedCard> = {}): ScannedCard =>
  owned({
    set: japaneseSet.name,
    setId: japaneseSet.id,
    setCode: japaneseSet.setCode,
    catalogId: "jp-sv2a-025",
    language: "ja",
    ...changes,
  });

const catalogueCard = (
  set: typeof englishSet,
  changes: Partial<PokemonCard> = {},
): PokemonCard => ({
  id: set.region === "jp" ? `${set.id}-025` : `${set.id}-25`,
  name: "Pikachu",
  number: set.region === "jp" ? "025" : "25",
  language: set.region === "jp" ? "ja" : "en",
  set: { id: set.id, name: set.name, series: set.series },
  images: { small: "", large: "" },
  ...changes,
});

beforeEach(() => {
  vi.stubGlobal("indexedDB", new IDBFactory());
  localStorage.clear();
});
afterEach(() => vi.unstubAllGlobals());

it("keeps old English 151 labels and IDs English, including cards whose physical language is Japanese", () => {
  expect(resolveSetId({ set: "151", setCode: "MEW" })).toBe("sv3pt5");
  expect(resolveSetId(owned({ language: "ja" }))).toBe("sv3pt5");
  expect(
    resolveSetId(
      owned({ setId: undefined, catalogId: undefined, language: "ja" }),
    ),
  ).toBe("sv3pt5");
  expect(belongsToSet(owned({ language: "ja" }), japaneseSet)).toBe(false);
});

it("accepts an explicit known Japanese edition ID or full namespaced catalogue prefix", () => {
  expect(resolveSetId(japaneseOwned())).toBe("jp-sv2a");
  expect(resolveSetId(japaneseOwned({ catalogId: undefined }))).toBe("jp-sv2a");
  expect(resolveSetId(japaneseOwned({ setId: undefined }))).toBe("jp-sv2a");
  expect(
    resolveSetId(
      japaneseOwned({ setId: undefined, set: "Unknown", setCode: undefined }),
    ),
  ).toBe("jp-sv2a");
});

it("requires explicit edition evidence for Japanese display names, native names and set codes", () => {
  for (const labels of [
    { set: japaneseSet.name },
    { set: japaneseSet.nativeName! },
    { set: "Unknown", setCode: japaneseSet.setCode },
  ]) {
    expect(resolveSetId(labels)).toBeUndefined();
    expect(setLinkStatus(labels)).toBe("unlinked");
  }
  const textOnly = japaneseOwned({ setId: undefined, catalogId: undefined });
  expect(samePrinting(textOnly, { ...textOnly, id: "card-second" })).toBe(
    false,
  );
});

it.each([
  ["English ID and Japanese prefix", { setId: "sv3pt5" }],
  ["Japanese ID and English prefix", { catalogId: "sv3pt5-25" }],
  ["unknown Japanese ID", { setId: "jp-unverified" }],
  ["unknown Japanese prefix", { catalogId: "jp-unverified-025" }],
] as const)(
  "rejects conflicting or unverified edition evidence: %s",
  (_label, changes) => {
    const card = japaneseOwned(changes);
    expect(resolveSetId(card)).toBeUndefined();
    expect(setLinkStatus(card)).toBe("unlinked");
    expect(belongsToSet(card, englishSet)).toBe(false);
    expect(belongsToSet(card, japaneseSet)).toBe(false);
  },
);

it("rejects contradictory known Japanese IDs and labels instead of selecting either edition", () => {
  const idConflict = japaneseOwned({ setId: anotherJapaneseSet.id });
  const labelConflict = japaneseOwned({
    set: anotherJapaneseSet.name,
    setCode: anotherJapaneseSet.setCode,
  });
  for (const card of [idConflict, labelConflict]) {
    expect(resolveSetId(card)).toBeUndefined();
    expect(belongsToSet(card, japaneseSet)).toBe(false);
    expect(belongsToSet(card, anotherJapaneseSet)).toBe(false);
  }
});

it("does not let Japanese labels hijack an English ID, or English labels contradict a Japanese ID", () => {
  expect(
    resolveSetId(owned({ set: japaneseSet.name, catalogId: undefined })),
  ).toBeUndefined();
  expect(
    resolveSetId(japaneseOwned({ set: "151", setCode: "MEW" })),
  ).toBeUndefined();
  expect(
    resolveSetId({ set: "Family custom set", setCode: "FAMILY" }),
  ).toBeUndefined();
  expect(setLinkStatus({ set: "Family custom set", setCode: "FAMILY" })).toBe(
    "outside-catalogue",
  );
});

it("never merges or credits English and Japanese printings with the same name, number and physical language", () => {
  const english = owned({ language: "ja", quantity: 3 });
  const japanese = japaneseOwned({ quantity: 2 });
  expect(collectionCardIdentity(english)).not.toBe(
    collectionCardIdentity(japanese),
  );
  expect(samePrinting(english, japanese)).toBe(false);
  const englishCatalogue = catalogueCard(englishSet);
  const japaneseCatalogue = catalogueCard(japaneseSet);
  expect(
    setProgress([japanese], englishSet, [englishCatalogue]).ownedCount,
  ).toBe(0);
  expect(
    setProgress([english], japaneseSet, [japaneseCatalogue]).ownedCount,
  ).toBe(0);
  expect(
    setProgress([english, japanese], japaneseSet, [
      japaneseCatalogue,
    ]).quantities.get(japaneseCatalogue.id),
  ).toBe(2);
  expect(
    setProgress([english, japanese], englishSet, [
      englishCatalogue,
    ]).quantities.get(englishCatalogue.id),
  ).toBe(3);
});

it("matches Japanese printed leading-zero numbers without rewriting the displayed number", () => {
  const manual = japaneseOwned({
    catalogId: undefined,
    name: "ピカチュウ",
    quantity: 2,
  });
  const card = catalogueCard(japaneseSet, { name: "ピカチュウ" });
  expect(cardNumber(manual.number)).toBe("25");
  expect(samePrinting(manual, { ...manual, number: "25" })).toBe(true);
  expect(
    setProgress([manual], japaneseSet, [card]).quantities.get(card.id),
  ).toBe(2);
  expect(manual.number).toBe("025/165");
  expect(card.number).toBe("025");
});

it("converts catalogue additions using their edition language while preserving old English defaults", () => {
  expect(catalogCardToCollection(catalogueCard(japaneseSet))).toMatchObject({
    setId: "jp-sv2a",
    catalogId: "jp-sv2a-025",
    number: "025",
    language: "ja",
  });
  expect(
    catalogCardToCollection(catalogueCard(englishSet, { language: undefined }))
      .language,
  ).toBe("en");
  expect(
    catalogCardToCollection(catalogueCard(englishSet, { language: "ja" }))
      .language,
  ).toBe("ja");
});

it("stores the two editions separately and merges only additional copies of the same Japanese printing", async () => {
  const english = await saveScannedCard({
    ...catalogCardToCollection(catalogueCard(englishSet)),
    language: "ja",
  });
  const japaneseInput = catalogCardToCollection(catalogueCard(japaneseSet));
  const japanese = await saveScannedCard(japaneseInput);
  const anotherCopy = await saveScannedCard({
    ...japaneseInput,
    number: "25/165",
  });
  expect(anotherCopy.id).toBe(japanese.id);
  expect(japanese.id).not.toBe(english.id);
  const saved = await readScannedCards();
  expect(saved).toHaveLength(2);
  expect(saved.find((card) => card.setId === "sv3pt5")).toMatchObject({
    quantity: 1,
    catalogId: "sv3pt5-25",
  });
  expect(saved.find((card) => card.setId === "jp-sv2a")).toMatchObject({
    quantity: 2,
    catalogId: "jp-sv2a-025",
    language: "ja",
  });
  expect(saved.every((card) => card.id.startsWith("card-"))).toBe(true);
});
