import { describe, expect, it } from "vitest";
import { missingCards, formatMissingCards } from "@/lib/missingCards";
import type { PokemonCard } from "@/services/pokemonTcgApi";

const card = (id: string, name: string, number: string): PokemonCard => ({
  id,
  name,
  number,
  images: { small: "", large: "" },
  set: { id: id.split("-")[0], name: "Fixture set", series: "Fixture series" },
});
// These real Classic Collection cards have different IDs but the same number.
const venusaur = card("cel25c-15_A1", "Venusaur", "15");
const teamRocket = card("cel25c-15_A2", "Here Comes Team Rocket!", "15");
const claydol = card("cel25c-15_A4", "Claydol", "15");
const classic = { id: "cel25c", name: "Celebrations: Classic Collection" };

describe("a complete missing-card list", () => {
  it("excludes only owned catalogue IDs and keeps distinct cards with repeated printed numbers", () => {
    const quantities = new Map([
      [venusaur.id, 3],
      ["another-set-15", 1],
    ]);
    expect(missingCards([venusaur, teamRocket, claydol], quantities)).toEqual([
      teamRocket,
      claydol,
    ]);
  });

  it("deduplicates catalogue IDs without sorting or replacing the first catalogue entry", () => {
    const duplicate = { ...teamRocket, name: "Duplicate metadata" };
    const result = missingCards(
      [claydol, teamRocket, venusaur, duplicate],
      new Map(),
    );
    expect(result).toEqual([claydol, teamRocket, venusaur]);
    expect(result[1]).toBe(teamRocket);
  });

  it("requires a positive quantity to exclude a card", () => {
    const quantities = new Map([
      [venusaur.id, 0],
      [teamRocket.id, -1],
      [claydol.id, Number.NaN],
    ]);
    expect(missingCards([venusaur, teamRocket, claydol], quantities)).toEqual([
      venusaur,
      teamRocket,
      claydol,
    ]);
  });

  it("returns an empty list for a complete set or empty catalogue", () => {
    expect(
      missingCards(
        [venusaur, teamRocket],
        new Map([
          [venusaur.id, 1],
          [teamRocket.id, 2],
        ]),
      ),
    ).toEqual([]);
    expect(missingCards([], new Map([[venusaur.id, 1]]))).toEqual([]);
  });
});

describe("a deterministic take-away text", () => {
  it("includes the set, unique missing count, and separate lines for same-number cards", () => {
    expect(formatMissingCards(classic, [teamRocket, claydol, teamRocket])).toBe(
      "Saknade kort — Celebrations: Classic Collection (cel25c)\n" +
        "2 kort saknas.\n\n" +
        "#15 — Here Comes Team Rocket!\n" +
        "#15 — Claydol\n",
    );
  });

  it("keeps punctuation and accents in collector numbers and card names", () => {
    const special = [
      card("ex10-?", "Unown", "?"),
      card("ex10-!", "Unown", "!"),
    ];
    expect(
      formatMissingCards({ id: "ex10", name: "Unseen Forces" }, special),
    ).toBe(
      "Saknade kort — Unseen Forces (ex10)\n2 kort saknas.\n\n#? — Unown\n#! — Unown\n",
    );
    expect(
      formatMissingCards({ id: "xy2", name: "Pokémon" }, [
        card("xy2-64", "Flabébé", "64"),
      ]),
    ).toContain("#64 — Flabébé\n");
  });

  it("explains a complete set without manufacturing a missing card", () => {
    expect(formatMissingCards(classic, [])).toBe(
      "Saknade kort — Celebrations: Classic Collection (cel25c)\n" +
        "0 kort saknas.\n\nSetet är komplett.\n",
    );
  });

  it("keeps every card on one line while retaining ordinary plain-text characters", () => {
    expect(
      formatMissingCards({ id: "custom\tid", name: "Custom\nset" }, [
        card("custom-1", "=Example\r\nname", "1\tA"),
      ]),
    ).toBe(
      "Saknade kort — Custom set (custom id)\n1 kort saknas.\n\n#1 A — =Example name\n",
    );
  });

  it("does not mutate the input catalogue, its entries, or ownership quantities", () => {
    const catalog = Object.freeze([
      Object.freeze(venusaur),
      Object.freeze(teamRocket),
    ]);
    const quantities = new Map([[venusaur.id, 2]]);
    const before = [...quantities];
    const result = missingCards(catalog, quantities);
    expect(formatMissingCards(classic, result)).toContain("1 kort saknas.");
    expect(catalog).toEqual([venusaur, teamRocket]);
    expect([...quantities]).toEqual(before);
    expect(result).toEqual([teamRocket]);
  });
});
