import { pokemonSets, type PokemonSet as LocalSet } from "@/data/pokemonSets";
import {
  scannedCardSchema,
  type NewScannedCard,
  type ScannedCard,
} from "./cardAnalysis";
import type { PokemonCard, PokemonSet } from "@/services/pokemonTcgApi";

export const normalize = (value: string) =>
  value.trim().normalize("NFKC").toLocaleLowerCase("en");
export const cardNumber = (value: string) =>
  normalize(value.split("/")[0]).replace(/(^|[a-z])0+(?=\d)/g, "$1");

export function resolveSetId(
  card: Pick<ScannedCard, "setId" | "set" | "setCode">,
): string | undefined {
  if (card.setId) return card.setId;
  const labels = [card.set, card.setCode].filter(Boolean).map(normalize);
  return pokemonSets.find((set) =>
    [set.id, set.name, set.setCode].some((label) =>
      labels.includes(normalize(label)),
    ),
  )?.id;
}

export function belongsToSet(
  card: ScannedCard,
  set: Pick<PokemonSet, "id" | "name"> & {
    ptcgoCode?: string;
    setCode?: string;
  },
): boolean {
  const id = resolveSetId(card);
  if (id) return id === set.id;
  const labels = [set.name, set.ptcgoCode, set.setCode]
    .filter(Boolean)
    .map(normalize);
  return [card.set, card.setCode]
    .filter(Boolean)
    .some((label) => labels.includes(normalize(label)));
}

export function samePrinting(a: ScannedCard, b: ScannedCard): boolean {
  return (
    (resolveSetId(a) ?? normalize(a.set)) ===
      (resolveSetId(b) ?? normalize(b.set)) &&
    cardNumber(a.number) === cardNumber(b.number) &&
    normalize(a.name) === normalize(b.name) &&
    a.language === b.language &&
    normalize(a.variant) === normalize(b.variant) &&
    normalize(a.condition ?? "") === normalize(b.condition ?? "") &&
    a.location === b.location
  );
}

export function catalogCardToCollection(
  card: PokemonCard,
  setId?: string,
): NewScannedCard {
  return {
    name: card.name,
    number: card.number,
    set: card.set.name,
    setId: card.set.id ?? setId,
    catalogId: card.id,
    image: card.images.large || card.images.small,
    type: card.types?.[0] ?? "Colorless",
    rarity: card.rarity ?? "Unknown",
    hp: card.hp,
    attacks: card.attacks ?? [],
    weaknesses: card.weaknesses ?? [],
    resistances: card.resistances ?? [],
    retreatCost: card.retreatCost?.length,
  };
}

export function setProgress(
  owned: ScannedCard[],
  set: Pick<PokemonSet, "id" | "name">,
  catalog: PokemonCard[],
) {
  const collection = owned.filter((card) => belongsToSet(card, set));
  const quantities = new Map<string, number>();
  for (const card of collection) {
    const key = cardNumber(card.number);
    quantities.set(key, (quantities.get(key) ?? 0) + card.quantity);
  }
  // Each catalogue number counts once, regardless of copies, finish or language.
  const numbers = new Set(catalog.map((card) => cardNumber(card.number)));
  const ownedCount = [...numbers].filter((number) =>
    quantities.has(number),
  ).length;
  return {
    quantities,
    ownedCount,
    total: numbers.size,
    missing: numbers.size - ownedCount,
    percent: numbers.size ? Math.round((ownedCount / numbers.size) * 100) : 0,
  };
}

export function localSetProgress(owned: ScannedCard[], set: LocalSet) {
  return new Set(
    owned
      .filter((card) => belongsToSet(card, set))
      .map((card) => cardNumber(card.number)),
  ).size;
}

export function parseCollectionBackup(raw: string): ScannedCard[] {
  const parsed = JSON.parse(raw);
  if (
    parsed?.version !== 1 ||
    !Array.isArray(parsed.cards) ||
    parsed.cards.length > 10000
  ) {
    throw new Error(
      "Välj en säkerhetskopia exporterad från appen (högst 10 000 poster).",
    );
  }
  const cards = scannedCardSchema.array().parse(parsed.cards);
  if (new Set(cards.map((card) => card.id)).size !== cards.length)
    throw new Error("Säkerhetskopian innehåller flera poster med samma ID.");
  return cards;
}
