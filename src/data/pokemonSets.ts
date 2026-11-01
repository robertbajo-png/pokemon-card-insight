import catalogue from "./catalogue-sets.json";
import { legacyPokemonSets } from "./legacyPokemonSets";

export interface PokemonSet {
  id: string;
  name: string;
  canonicalName: string;
  series: string;
  totalCards: number;
  printedTotal?: number | null;
  releaseDate: string;
  setCode: string;
  aliases: string[];
  codeAliases: string[];
  symbolUrl?: string;
  logoUrl?: string;
  logo?: string;
  symbol?: string;
  packArt?: string;
}

// Exact, known historical labels. They never change a canonical ID's meaning.
const nameAliases: Record<string, string[]> = {
  base1: ["Base Set"],
  xy1: ["XY Base Set"],
  sm1: ["Sun & Moon Base Set"],
  swsh1: ["Sword & Shield Base Set"],
  sv1: ["Scarlet & Violet Base Set"],
  hgss2: ["Unleashed"],
  hgss3: ["Undaunted"],
  hgss4: ["Triumphant"],
  swshp: ["Sword & Shield Promos"],
  svp: ["Scarlet & Violet Promos"],
  smp: ["Sun & Moon Promos"],
  xyp: ["XY Promos"],
  bwp: ["Black & White Promos"],
  hsp: ["HGSS Promos"],
  dpp: ["Diamond & Pearl Promos"],
  np: ["Nintendo Promos"],
  basep: ["Wizards Promos"],
};
const seriesLabels: Record<string, string> = {
  Base: "Original Series",
  Gym: "Original Series",
  Neo: "Neo Series",
  "E-Card": "e-Card Series",
  EX: "EX Series",
  "Diamond & Pearl": "Diamond & Pearl Series",
  Platinum: "Platinum Series",
  "HeartGold & SoulSilver": "HeartGold & SoulSilver Series",
  "Call of Legends": "Call of Legends Series",
  "Black & White": "Black & White Series",
  XY: "XY Series",
  "Sun & Moon": "Sun & Moon Series",
  "Sword & Shield": "Sword & Shield Series",
  "Scarlet & Violet": "Scarlet & Violet Series",
  "Mega Evolution": "Mega Evolution Series",
  POP: "Promo Sets",
};
const label = (value: string) =>
  value.trim().normalize("NFKC").toLocaleLowerCase("en");
const sourceAliases = (set: (typeof catalogue.sets)[number]) => [
  set.name,
  ...(nameAliases[set.id] ?? []),
  ...(/^ex\d+$/.test(set.id) ? [`EX ${set.name}`] : []),
];

// Match historical display labels by name, never by the old, possibly colliding ID.
const legacyMatches = legacyPokemonSets.flatMap((legacy) => {
  const candidates = catalogue.sets.filter((set) =>
    sourceAliases(set).some((name) => label(name) === label(legacy.name)),
  );
  return candidates.length === 1
    ? [{ legacy, canonicalId: candidates[0].id }]
    : [];
});

export const legacySetMappings = legacyMatches
  .filter(({ legacy, canonicalId }) => legacy.id !== canonicalId)
  .map(({ legacy, canonicalId }) => ({
    id: legacy.id,
    name: legacy.name,
    setCode: legacy.setCode,
    canonicalId,
  }));

export const catalogueRevision = catalogue.revision;
export const catalogueUpdatedAt = catalogue.updatedAt;
export const pokemonSets: PokemonSet[] = catalogue.sets.map((set) => {
  const legacy = legacyMatches.find(
    (match) => match.canonicalId === set.id,
  )?.legacy;
  const code = "ptcgoCode" in set ? set.ptcgoCode : undefined;
  return {
    id: set.id,
    name: legacy?.name ?? set.name,
    canonicalName: set.name,
    series: legacy?.series ?? seriesLabels[set.series] ?? set.series,
    totalCards: set.total,
    printedTotal: set.printedTotal,
    releaseDate: set.releaseDate.replace(/\//g, "-"),
    setCode: legacy?.setCode ?? code ?? set.id.toUpperCase(),
    aliases: [
      ...new Set([...sourceAliases(set), ...(legacy ? [legacy.name] : [])]),
    ],
    codeAliases: [
      ...new Set(
        [code, legacy?.setCode].filter((value): value is string =>
          Boolean(value),
        ),
      ),
    ],
    logo: set.images.logo,
    symbol: set.images.symbol,
    packArt: legacy?.packArt,
  };
});
