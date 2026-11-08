import { describe, expect, it } from "vitest";
import {
  internationalPokemonSets as pokemonSets,
  catalogueRevision,
} from "@/data/pokemonSets";
import { scannedCardSchema, type ScannedCard } from "@/lib/cardAnalysis";
import {
  belongsToSet,
  collectionCardIdentity,
  localSetProgress,
  resolveSetId,
  samePrinting,
  setProgress,
} from "@/lib/collection";
import type { PokemonCard } from "@/services/pokemonTcgApi";

const card = (input: Partial<ScannedCard> = {}) =>
  scannedCardSchema.parse({
    id: "card-fixture",
    scannedAt: "2026-09-17T00:00:00.000Z",
    name: "Pikachu",
    number: "58",
    set: "Base Set",
    ...input,
  });
const set = (id: string) => pokemonSets.find((entry) => entry.id === id)!;

describe("the pinned canonical set registry", () => {
  it("keeps all 176 distinct set IDs, historical display names and the correct featured artwork", () => {
    expect(catalogueRevision).toBe("39a26a144c8b6ef6c2fb17b2c29d0bb7121e3a11");
    expect(pokemonSets).toHaveLength(176);
    expect(new Set(pokemonSets.map((entry) => entry.id)).size).toBe(176);
    expect(set("base1")).toMatchObject({
      name: "Base Set",
      canonicalName: "Base",
    });
    expect(set("me55").packArt).toBeTruthy();
    expect(
      pokemonSets.some((entry) =>
        ["lc1", "swsh13", "me5pt5"].includes(entry.id),
      ),
    ).toBe(false);
  });

  it("separates the printed numbering denominator from actual catalogue entries", () => {
    expect(set("base5")).toMatchObject({ printedTotal: 82, totalCards: 83 });
    expect(set("svp")).toMatchObject({ printedTotal: 102, totalCards: 165 });
    expect(set("me55")).toMatchObject({ printedTotal: 128, totalCards: 161 });
    expect(set("swsh9")).toMatchObject({ printedTotal: 172, totalCards: 186 });
    expect(set("swsh9tg")).toMatchObject({ printedTotal: 30, totalCards: 30 });
  });
});

describe("canonical and historical collection identities", () => {
  it("resolves exact canonical and historical names without guessing Base Set 2", () => {
    expect(resolveSetId(card({ set: "Base" }))).toBe("base1");
    expect(resolveSetId(card({ set: "Base Set" }))).toBe("base1");
    expect(resolveSetId(card({ set: "Base Set 2" }))).toBe("base4");
    expect(resolveSetId(card({ set: "EX FireRed & LeafGreen" }))).toBe("ex6");
    expect(resolveSetId(card({ set: "Paldean Fates" }))).toBe("sv4pt5");
    expect(resolveSetId(card({ set: "Unlisted mystery set" }))).toBeUndefined();
  });

  it("corrects lc1 only when the historical label supports Legendary Collection", () => {
    expect(
      resolveSetId(card({ setId: "lc1", set: "Legendary Collection" })),
    ).toBe("base6");
    expect(
      resolveSetId(card({ setId: "lc1", set: "Unknown", setCode: "LC" })),
    ).toBe("base6");
    expect(
      resolveSetId(card({ setId: "lc1", set: "Unknown" })),
    ).toBeUndefined();
    expect(
      resolveSetId(card({ setId: "lc1", set: "Base Set" })),
    ).toBeUndefined();
  });

  it("distinguishes legacy Paldean Fates sv5 from canonical Temporal Forces sv5", () => {
    expect(
      resolveSetId(
        card({ setId: "sv5", set: "Paldean Fates", setCode: "PAF" }),
      ),
    ).toBe("sv4pt5");
    expect(
      resolveSetId(card({ setId: "sv5", set: "Unknown", setCode: "PAF" })),
    ).toBe("sv4pt5");
    expect(
      resolveSetId(
        card({ setId: "sv5", set: "Temporal Forces", setCode: "TEF" }),
      ),
    ).toBe("sv5");
    expect(
      resolveSetId(card({ setId: "sv5", set: "Unknown" })),
    ).toBeUndefined();
    expect(
      resolveSetId(
        card({ setId: "sv5", set: "Temporal Forces", setCode: "PAF" }),
      ),
    ).toBeUndefined();
  });

  it("uses a catalogue identity with consistent labels, including a supported legacy set ID", () => {
    const canonical = card({
      setId: "sv5",
      set: "Temporal Forces",
      catalogId: "sv5-1",
    });
    const historical = { ...canonical, setId: "sv6", setCode: "TEF" };
    expect(resolveSetId(canonical)).toBe("sv5");
    expect(resolveSetId(historical)).toBe("sv5");
    expect(collectionCardIdentity(historical)).toBe(
      collectionCardIdentity(canonical),
    );
    expect(
      resolveSetId(card({ set: "Base Set", catalogId: "madeup-58" })),
    ).toBeUndefined();
  });

  it("does not fall back to a matching name when catalogue and historical labels conflict", () => {
    const conflict = card({
      setId: "sv5",
      set: "Paldean Fates",
      setCode: "PAF",
      catalogId: "sv5-1",
    });
    expect(resolveSetId(conflict)).toBeUndefined();
    expect(collectionCardIdentity(conflict)).toBeUndefined();
    expect(belongsToSet(conflict, set("sv4pt5"))).toBe(false);
    expect(belongsToSet(conflict, set("sv5"))).toBe(false);
    expect(
      samePrinting(conflict, card({ setId: "sv4pt5", set: "Paldean Fates" })),
    ).toBe(false);
  });

  it("does not merge matching set text when one identity resolves and the other has conflicting recognized labels", () => {
    const recognized = card({ set: "Base Set", setCode: "BS" });
    const conflicting = card({ set: "Base Set", setCode: "B2" });
    expect(resolveSetId(recognized)).toBe("base1");
    expect(resolveSetId(conflicting)).toBeUndefined();
    expect(samePrinting(recognized, conflicting)).toBe(false);
    expect(samePrinting(conflicting, recognized)).toBe(false);
    expect(
      samePrinting(conflicting, {
        ...conflicting,
        id: "card-another-conflict",
      }),
    ).toBe(false);
  });

  it("merges genuinely unknown custom sets only when both their name and code agree", () => {
    const custom = card({ set: "Family Custom Set", setCode: "FAMILY" });
    const matching = card({
      set: " family custom set ",
      setCode: "family",
      number: "058/102",
    });
    expect(resolveSetId(custom)).toBeUndefined();
    expect(resolveSetId(matching)).toBeUndefined();
    expect(samePrinting(custom, matching)).toBe(true);
    expect(samePrinting(custom, { ...matching, setCode: "FAMILY2" })).toBe(
      false,
    );
    expect(samePrinting(custom, { ...matching, setCode: "BS" })).toBe(false);
  });

  it("keeps main sets and Trainer Galleries distinct even though their printed codes are shared", () => {
    expect(
      resolveSetId(card({ set: "Unknown", setCode: "BRS" })),
    ).toBeUndefined();
    expect(resolveSetId(card({ set: "Brilliant Stars", setCode: "BRS" }))).toBe(
      "swsh9",
    );
    expect(
      resolveSetId(
        card({ set: "Brilliant Stars Trainer Gallery", setCode: "BRS" }),
      ),
    ).toBe("swsh9tg");
    const gallery = card({
      set: "Brilliant Stars Trainer Gallery",
      catalogId: "swsh9tg-TG01",
    });
    expect(belongsToSet(gallery, set("swsh9"))).toBe(false);
    expect(belongsToSet(gallery, set("swsh9tg"))).toBe(true);
  });
});

// These four real catalogue entries share the printed number 15.
const classic = { id: "cel25c", name: "Celebrations: Classic Collection" };
const classicCatalogue = [
  { id: "cel25c-15_A1", name: "Venusaur", number: "15", set: classic },
  {
    id: "cel25c-15_A2",
    name: "Here Comes Team Rocket!",
    number: "15",
    set: classic,
  },
  { id: "cel25c-15_A3", name: "Rocket's Zapdos", number: "15", set: classic },
  { id: "cel25c-15_A4", name: "Claydol", number: "15", set: classic },
] as PokemonCard[];
const classicCard = (input: Partial<ScannedCard> = {}) =>
  card({
    setId: classic.id,
    set: classic.name,
    name: "Venusaur",
    number: "015/102",
    ...input,
  });

describe("checklists with repeated printed numbers", () => {
  it("credits a manual card only to its unique name + number, not all four number-15 entries", () => {
    const progress = setProgress(
      [classicCard({ quantity: 3 })],
      classic,
      classicCatalogue,
    );
    expect(progress).toMatchObject({
      total: 4,
      ownedCount: 1,
      missing: 3,
      percent: 25,
    });
    expect([...progress.quantities]).toEqual([["cel25c-15_A1", 3]]);
    expect(
      setProgress([classicCard({ name: "Unknown" })], classic, classicCatalogue)
        .ownedCount,
    ).toBe(0);
  });

  it("counts catalogue IDs once, retains physical quantities, and separates same-number collection statistics", () => {
    const venusaur = classicCard({ catalogId: "cel25c-15_A1", quantity: 2 });
    const claydol = classicCard({ catalogId: "cel25c-15_A4", name: "Claydol" });
    const progress = setProgress(
      [
        venusaur,
        { ...venusaur, id: "card-holo", variant: "holo", quantity: 3 },
        claydol,
      ],
      classic,
      [...classicCatalogue, classicCatalogue[0]],
    );
    expect(progress).toMatchObject({
      total: 4,
      ownedCount: 2,
      missing: 2,
      percent: 50,
    });
    expect(progress.quantities.get(venusaur.catalogId!)).toBe(5);
    expect(progress.quantities.get(claydol.catalogId!)).toBe(1);
    expect(localSetProgress([venusaur, claydol], set(classic.id))).toBe(2);
    expect(collectionCardIdentity(venusaur)).not.toBe(
      collectionCardIdentity(claydol),
    );
  });

  it("requires a catalogue ID if even name + number is ambiguous", () => {
    const ambiguous = [
      classicCatalogue[0],
      { ...classicCatalogue[0], id: "cel25c-extra" },
    ];
    expect(setProgress([classicCard()], classic, ambiguous).ownedCount).toBe(0);
    expect(
      setProgress(
        [classicCard({ catalogId: "cel25c-15_A1" })],
        classic,
        ambiguous,
      ).ownedCount,
    ).toBe(1);
    expect(
      samePrinting(
        classicCard({ catalogId: "cel25c-15_A1" }),
        classicCard({ catalogId: "cel25c-extra" }),
      ),
    ).toBe(false);
  });
});
