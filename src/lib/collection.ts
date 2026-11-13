import {
  pokemonSets,
  legacySetMappings,
  type PokemonSet as LocalSet,
} from "@/data/pokemonSets";
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

type SetIdentity = Pick<ScannedCard, "setId" | "set" | "setCode"> &
  Partial<Pick<ScannedCard, "catalogId">>;
type CardIdentity = SetIdentity & Pick<ScannedCard, "name" | "number">;

const canonicalSets = new Map(pokemonSets.map((set) => [set.id, set]));
const legacySets = new Map(legacySetMappings.map((set) => [set.id, set]));
const names = new Map<string, Set<string>>();
const codes = new Map<string, Set<string>>();
const japaneseNames = new Map<string, Set<string>>();
const japaneseCodes = new Map<string, Set<string>>();
// Match the whole known set prefix; a region namespace itself is not a set ID.
const cataloguePrefixes = [...pokemonSets].sort(
  (a, b) => b.id.length - a.id.length,
);
function indexLabel(
  index: Map<string, Set<string>>,
  value: string,
  id: string,
) {
  const key = normalize(value);
  const ids = index.get(key) ?? new Set<string>();
  ids.add(id);
  index.set(key, ids);
}
for (const set of pokemonSets) {
  const nameIndex = set.region === "jp" ? japaneseNames : names;
  const codeIndex = set.region === "jp" ? japaneseCodes : codes;
  for (const name of [set.id, set.name, ...set.aliases])
    indexLabel(nameIndex, name, set.id);
  for (const code of [set.id, ...set.codeAliases])
    indexLabel(codeIndex, code, set.id);
}

const knownSetLabel = (value: string) =>
  names.has(value) ||
  codes.has(value) ||
  japaneseNames.has(value) ||
  japaneseCodes.has(value);

export function resolveSetId(card: SetIdentity): string | undefined {
  const nameIds = names.get(normalize(card.set ?? "")) ?? new Set<string>();
  const codeIds = codes.get(normalize(card.setCode ?? "")) ?? new Set<string>();
  const japaneseNameIds =
    japaneseNames.get(normalize(card.set ?? "")) ?? new Set<string>();
  const japaneseCodeIds =
    japaneseCodes.get(normalize(card.setCode ?? "")) ?? new Set<string>();
  const storedId = card.setId ? normalize(card.setId) : undefined;
  const canonical = storedId ? canonicalSets.get(storedId) : undefined;
  const catalogId = card.catalogId?.trim();
  const catalogSet = catalogId
    ? cataloguePrefixes.find((set) => catalogId.startsWith(`${set.id}-`))
    : undefined;
  const japaneseSet =
    canonical?.region === "jp"
      ? canonical
      : catalogSet?.region === "jp"
        ? catalogSet
        : undefined;

  if (japaneseSet) {
    // Only an explicit known Japanese ID/prefix may select that edition.
    // Recognized labels may corroborate it, but never override conflicting IDs.
    if (
      (storedId && storedId !== japaneseSet.id) ||
      (catalogId && catalogSet?.id !== japaneseSet.id) ||
      nameIds.size ||
      codeIds.size ||
      (japaneseNameIds.size && !japaneseNameIds.has(japaneseSet.id)) ||
      (japaneseCodeIds.size && !japaneseCodeIds.has(japaneseSet.id))
    )
      return undefined;
    return japaneseSet.id;
  }
  // Japanese text without edition evidence needs review. Shared old English
  // labels retain their old meaning, even if a future Japanese code overlaps.
  if (
    (japaneseNameIds.size && !nameIds.size) ||
    (japaneseCodeIds.size && !codeIds.size)
  )
    return undefined;
  const labels = new Set(
    nameIds.size && codeIds.size
      ? [...nameIds].filter((id) => codeIds.has(id))
      : [...nameIds, ...codeIds],
  );
  // Recognized labels disagree: never credit either set's checklist.
  if (nameIds.size && codeIds.size && !labels.size) return undefined;

  const legacy = storedId ? legacySets.get(storedId) : undefined;
  const legacySupported = Boolean(
    legacy &&
      labels.has(legacy.canonicalId) &&
      (normalize(card.set ?? "") === normalize(legacy.name) ||
        normalize(card.setCode ?? "") === normalize(legacy.setCode)),
  );
  const catalogSetId = catalogSet?.id;

  if (catalogId) {
    if (!catalogSetId || (labels.size && !labels.has(catalogSetId)))
      return undefined;
    if (
      storedId &&
      canonical?.id !== catalogSetId &&
      !(legacySupported && legacy?.canonicalId === catalogSetId)
    )
      return undefined;
    // A catalogue prefix needs supporting labels or the same canonical set ID.
    return labels.has(catalogSetId) || canonical?.id === catalogSetId
      ? catalogSetId
      : undefined;
  }
  if (storedId) {
    if (legacySupported) return legacy!.canonicalId;
    // sv5–sv10 have two historical meanings; an ID alone cannot disambiguate them.
    if (legacy)
      return canonical && labels.has(canonical.id) ? canonical.id : undefined;
    return canonical && (!labels.size || labels.has(canonical.id))
      ? canonical.id
      : undefined;
  }
  return labels.size === 1 ? [...labels][0] : undefined;
}

export function collectionCardIdentity(card: CardIdentity): string | undefined {
  const setId = resolveSetId(card);
  if (!setId) return undefined;
  return card.catalogId
    ? `catalog:${card.catalogId}`
    : `printing:${JSON.stringify([setId, normalize(card.name), cardNumber(card.number)])}`;
}

export function setLinkStatus(
  card: SetIdentity,
): "linked" | "unlinked" | "outside-catalogue" {
  if (resolveSetId(card)) return "linked";
  const name = normalize(card.set ?? "");
  const code = normalize(card.setCode ?? "");
  // The schema has no provenance flag for an intentionally custom set. Only
  // wholly unknown labels without an asserted catalogue identity are neutral.
  const unknownLabels = !knownSetLabel(name) && !knownSetLabel(code);
  if (
    !card.setId &&
    !card.catalogId &&
    name &&
    name !== "unknown" &&
    name !== "okänt" &&
    unknownLabels
  ) {
    return "outside-catalogue";
  }
  return "unlinked";
}

export function belongsToSet(
  card: ScannedCard,
  set: Pick<PokemonSet, "id" | "name"> & {
    ptcgoCode?: string;
    setCode?: string;
  },
): boolean {
  return resolveSetId(card) === set.id;
}

export function samePrinting(a: ScannedCard, b: ScannedCard): boolean {
  const aSet = resolveSetId(a),
    bSet = resolveSetId(b);
  let sameSet = false;
  if (aSet || bSet) {
    // A resolved identity must never merge with an unresolved conflict.
    sameSet = Boolean(aSet && bSet && aSet === bSet);
  } else {
    const name = normalize(a.set),
      code = normalize(a.setCode ?? "");
    // Only genuinely unknown custom labels may use textual identity. Known but
    // contradictory/ambiguous labels are unresolved, not custom set names.
    sameSet =
      !a.setId &&
      !b.setId &&
      !a.catalogId &&
      !b.catalogId &&
      Boolean(name) &&
      name === normalize(b.set) &&
      code === normalize(b.setCode ?? "") &&
      !knownSetLabel(name) &&
      !knownSetLabel(code);
  }
  return (
    sameSet &&
    (!a.catalogId || !b.catalogId || a.catalogId === b.catalogId) &&
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
    language:
      card.language ??
      (canonicalSets.get(card.set.id ?? setId ?? "")?.region === "jp"
        ? "ja"
        : "en"),
    image: card.images.large || card.images.small,
    type:
      card.types?.[0] ??
      (card.catalogueSource?.details === "basic" ? "Unknown" : "Colorless"),
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
  const catalogue = new Map(catalog.map((card) => [card.id, card]));
  const quantities = new Map<string, number>();
  for (const card of collection) {
    let id: string | undefined;
    if (card.catalogId) {
      if (catalogue.has(card.catalogId)) id = card.catalogId;
    } else {
      // Some sets print the same number on different cards. Name + number must
      // identify exactly one catalogue entry before a manual card is credited.
      const matches = [...catalogue.values()].filter(
        (candidate) =>
          cardNumber(candidate.number) === cardNumber(card.number) &&
          normalize(candidate.name) === normalize(card.name),
      );
      if (matches.length === 1) id = matches[0].id;
    }
    if (id) quantities.set(id, (quantities.get(id) ?? 0) + card.quantity);
  }
  const ownedCount = quantities.size;
  return {
    quantities,
    ownedCount,
    total: catalogue.size,
    missing: catalogue.size - ownedCount,
    percent: catalogue.size
      ? Math.round((ownedCount / catalogue.size) * 100)
      : 0,
  };
}

export function localSetProgress(owned: ScannedCard[], set: LocalSet) {
  return new Set(
    owned
      .filter((card) => belongsToSet(card, set))
      .map(collectionCardIdentity)
      .filter(Boolean),
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
