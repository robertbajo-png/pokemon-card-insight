import { afterEach, beforeEach, expect, it, vi } from "vitest";
import {
  getCardById,
  getCardsBySet,
  getSetById,
} from "@/services/pokemonTcgApi";
import { japanesePokemonSets } from "@/data/pokemonSets";
import { catalogCardToCollection } from "@/lib/collection";

const network = vi.fn<typeof fetch>();
beforeEach(() => {
  network.mockReset();
  network.mockImplementation(() => {
    throw new Error("Japanese snapshots must not make a network request");
  });
  vi.stubGlobal("fetch", network);
});
afterEach(() => vi.unstubAllGlobals());

it("serves every included Japanese checklist locally, with unique contiguous edition-specific identities", async () => {
  expect(japanesePokemonSets).toHaveLength(5);
  let total = 0;
  for (const set of japanesePokemonSets) {
    const result = await getCardsBySet(set.id);
    expect(result.totalCount).toBe(set.totalCards);
    expect(result.data).toHaveLength(set.totalCards);
    expect(new Set(result.data.map((card) => card.id)).size).toBe(
      set.totalCards,
    );
    for (const [index, card] of result.data.entries()) {
      expect(Number(card.number)).toBe(index + 1);
      expect(card.id).toBe(`${set.id}-${card.number}`);
      expect(card.set.id).toBe(set.id);
      expect(card.language).toBe("ja");
      expect(card.catalogueSource).toMatchObject({
        provider: "tcgdex",
        language: "ja",
        details: "basic",
      });
    }
    total += result.totalCount;
  }
  expect(total).toBe(1033);
  expect(network).not.toHaveBeenCalled();
});

it("keeps Japanese 151 at 210 entries and fetches full namespaced card IDs without the English proxy", async () => {
  expect(await getSetById("jp-sv2a")).toMatchObject({
    id: "jp-sv2a",
    total: 210,
    printedTotal: 165,
    language: "ja",
    region: "jp",
    nativeName: "ポケモンカード151",
  });
  const result = await getCardsBySet("jp-sv2a");
  const first = await getCardById(result.data[0].id);
  expect(first).toEqual(result.data[0]);
  expect(first?.name).toBe("フシギダネ");
  expect(first?.images.large).toMatch(
    /^https:\/\/assets\.tcgdex\.net\/ja\/SV\/SV2a\/001\/high\.webp$/,
  );
  expect(first?.images.small).toMatch(/\/001\/low\.webp$/);
  expect(network).not.toHaveBeenCalled();
});

it("does not synthesize images, attacks or English equivalents for basic Japanese records", async () => {
  const result = await getCardsBySet("jp-s8b");
  expect(result.data).toHaveLength(285);
  expect(
    result.data.every(
      (card) => card.images.large === "" && card.images.small === "",
    ),
  ).toBe(true);
  expect(result.data[0].attacks).toBeUndefined();
  expect(result.data[0].hp).toBeUndefined();
  expect(result.data[0].cardmarket).toBeUndefined();
  expect(catalogCardToCollection(result.data[0]).type).toBe("Unknown");
  expect(network).not.toHaveBeenCalled();
});

it("does not fall back to English or invent a list for unavailable Japanese sets and invalid card identities", async () => {
  for (const id of ["jp-sv4a", "jp-s4a", "jp-s6a", "jp-madeup"]) {
    expect(await getSetById(id)).toBeNull();
    expect(await getCardsBySet(id)).toEqual({ data: [], totalCount: 0 });
    expect(await getCardById(`${id}-001`)).toBeNull();
  }
  expect(await getCardById("jp-sv2a-1")).toBeNull();
  expect(await getCardById("jp-sv2a-999")).toBeNull();
  expect(network).not.toHaveBeenCalled();
});

it("honours cancellation even for already cached Japanese cards and metadata", async () => {
  await getCardsBySet("jp-sv2a");
  const controller = new AbortController();
  controller.abort();
  await expect(
    getCardsBySet("jp-sv2a", controller.signal),
  ).rejects.toMatchObject({ name: "AbortError" });
  await expect(getSetById("jp-sv2a", controller.signal)).rejects.toMatchObject({
    name: "AbortError",
  });
  await expect(
    getCardById("jp-sv2a-001", controller.signal),
  ).rejects.toMatchObject({ name: "AbortError" });
  expect(network).not.toHaveBeenCalled();
});

it("leaves English IDs on the existing backend service", async () => {
  network.mockResolvedValueOnce(
    Response.json({ data: { id: "sv3pt5", name: "151" } }),
  );
  expect(await getSetById("sv3pt5")).toMatchObject({ id: "sv3pt5" });
  expect(network).toHaveBeenCalledOnce();
});
