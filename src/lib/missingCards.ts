import type { PokemonCard, PokemonSet } from "@/services/pokemonTcgApi";

function uniqueCards(catalog: readonly PokemonCard[]): PokemonCard[] {
  const seen = new Set<string>();
  return catalog.filter((card) => {
    if (seen.has(card.id)) return false;
    seen.add(card.id);
    return true;
  });
}

/** Use the full catalogue and setProgress.quantities, independently of UI filters. */
export function missingCards(
  catalog: readonly PokemonCard[],
  quantities: ReadonlyMap<string, number>,
): PokemonCard[] {
  return uniqueCards(catalog).filter(
    (card) => !((quantities.get(card.id) ?? 0) > 0),
  );
}

const singleLine = (value: string) => value.replace(/\s+/g, " ").trim();

/** Plain text has a stable order, no timestamps, and one row per catalogue ID. */
export function formatMissingCards(
  set: Pick<PokemonSet, "id" | "name">,
  cards: readonly PokemonCard[],
): string {
  const unique = uniqueCards(cards);
  const lines = [
    `Saknade kort — ${singleLine(set.name)} (${singleLine(set.id)})`,
    `${unique.length} kort saknas.`,
    "",
    ...(unique.length
      ? unique.map(
          (card) => `#${singleLine(card.number)} — ${singleLine(card.name)}`,
        )
      : ["Setet är komplett."]),
  ];
  return lines.join("\n") + "\n";
}
