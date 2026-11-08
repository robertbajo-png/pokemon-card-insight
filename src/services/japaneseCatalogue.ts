import catalogue from "@/data/japanese-catalogue.json";
import { japanesePokemonSets } from "@/data/pokemonSets";
import type { CatalogueSource, PokemonCard, PokemonSet } from "./pokemonTcgApi";

const source: CatalogueSource = {
  kind: "snapshot",
  revision: catalogue.revision,
  updatedAt: catalogue.updatedAt,
  provider: "tcgdex",
  language: "ja",
  details: "basic",
};

interface JapaneseCardRow {
  id: string;
  number: string;
  name: string;
  image: string;
}
type JapaneseCards = Record<string, JapaneseCardRow[]>;
let snapshot: Promise<JapaneseCards> | null = null;
const sets = new Map(japanesePokemonSets.map((set) => [set.id, set]));
const loaded = new Map<string, PokemonCard[]>();

function aborted(signal?: AbortSignal) {
  if (signal?.aborted) throw new DOMException("Aborted", "AbortError");
}

// Cancel only this caller's wait; another view can still use the shared import.
function waitForSnapshot(
  promise: Promise<JapaneseCards>,
  signal?: AbortSignal,
): Promise<JapaneseCards> {
  if (!signal) return promise;
  return new Promise((resolve, reject) => {
    const cancel = () => {
      signal.removeEventListener("abort", cancel);
      reject(new DOMException("Aborted", "AbortError"));
    };
    signal.addEventListener("abort", cancel, { once: true });
    promise.then(
      (value) => {
        signal.removeEventListener("abort", cancel);
        resolve(value);
      },
      (error) => {
        signal.removeEventListener("abort", cancel);
        reject(error);
      },
    );
    if (signal.aborted) cancel();
  });
}

export function getJapaneseSet(id: string): PokemonSet | null {
  const set = sets.get(id);
  return set
    ? {
        id: set.id,
        name: set.name,
        nativeName: set.nativeName,
        series: set.series,
        total: set.totalCards,
        printedTotal: set.printedTotal,
        releaseDate: set.releaseDate,
        ptcgoCode: set.setCode,
        language: "ja",
        region: "jp",
        catalogueSource: source,
        images: { logo: set.logo || "", symbol: set.symbol || "" },
      }
    : null;
}

function validImage(value: string): boolean {
  if (!value) return true;
  try {
    const url = new URL(value);
    return (
      url.protocol === "https:" &&
      url.hostname === "assets.tcgdex.net" &&
      !url.username &&
      !url.password &&
      !url.port &&
      !url.search &&
      !url.hash &&
      /^\/ja\/[A-Za-z0-9_+/-]+\/high\.webp$/.test(url.pathname)
    );
  } catch {
    return false;
  }
}

export async function getJapaneseCardsBySet(
  id: string,
  signal?: AbortSignal,
): Promise<PokemonCard[]> {
  aborted(signal);
  const set = getJapaneseSet(id);
  if (!set) return [];
  if (loaded.has(id)) return loaded.get(id)!.slice();
  snapshot ??= import("@/data/japanese-cards.json")
    .then((module) => module.default as JapaneseCards)
    .catch((error) => {
      snapshot = null;
      throw error;
    });
  const data = (await waitForSnapshot(snapshot, signal))[id];
  aborted(signal);
  const seen = new Set<string>();
  const numbers = new Set<number>();
  if (
    !Array.isArray(data) ||
    data.length !== set.total ||
    data.some((card) => {
      if (
        !card ||
        typeof card.id !== "string" ||
        typeof card.number !== "string" ||
        !/^\d{1,4}$/.test(card.number) ||
        card.id !== `${id}-${card.number}` ||
        typeof card.name !== "string" ||
        !card.name.trim() ||
        typeof card.image !== "string" ||
        !validImage(card.image) ||
        seen.has(card.id) ||
        Number(card.number) < 1 ||
        Number(card.number) > set.total ||
        numbers.has(Number(card.number))
      )
        return true;
      seen.add(card.id);
      numbers.add(Number(card.number));
      return false;
    })
  )
    throw new Error(
      "Den japanska kortlistan kunde inte verifieras. Försök igen.",
    );
  const cards: PokemonCard[] = data.map((card) => ({
    id: card.id,
    name: card.name,
    number: card.number,
    language: "ja",
    images: {
      large: card.image,
      small: card.image.replace(/\/high\.webp$/, "/low.webp"),
    },
    set: { id: set.id, name: set.name, series: set.series },
    catalogueSource: source,
  }));
  loaded.set(id, cards);
  return cards.slice();
}

export async function getJapaneseCard(
  id: string,
  signal?: AbortSignal,
): Promise<PokemonCard | null> {
  aborted(signal);
  const setId = [...sets.keys()].find((candidate) =>
    id.startsWith(`${candidate}-`),
  );
  if (!setId) return null;
  const cards = await getJapaneseCardsBySet(setId, signal);
  return cards.find((card) => card.id === id) ?? null;
}
