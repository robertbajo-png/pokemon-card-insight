import {
  getJapaneseCard,
  getJapaneseCardsBySet,
  getJapaneseSet,
} from "./japaneseCatalogue";

export interface CatalogueSource {
  kind: "snapshot";
  revision: string;
  updatedAt: string;
  provider?: "tcgdex";
  language?: "ja";
  details?: "basic";
}

export interface PokemonSet {
  language?: "en" | "ja";
  region?: "jp";
  nativeName?: string;
  catalogueSource?: CatalogueSource;
  id: string;
  name: string;
  series: string;
  printedTotal?: number | null;
  total: number;
  releaseDate: string;
  images: {
    symbol: string;
    logo: string;
  };
  ptcgoCode?: string;
}

export interface PokemonCard {
  language?: "en" | "ja";
  catalogueSource?: CatalogueSource;
  id: string;
  name: string;
  images: {
    small: string;
    large: string;
  };
  types?: string[];
  rarity?: string;
  set: {
    id?: string;
    name: string;
    series: string;
  };
  number: string;
  hp?: string;
  attacks?: Array<{
    name: string;
    damage: string;
    cost: string[];
    text?: string;
  }>;
  weaknesses?: Array<{
    type: string;
    value: string;
  }>;
  resistances?: Array<{
    type: string;
    value: string;
  }>;
  retreatCost?: string[];
  cardmarket?: {
    prices?: {
      averageSellPrice?: number;
      trendPrice?: number;
    };
  };
  flavorText?: string;
}

export interface SearchParams {
  q?: string;
  page?: number;
  pageSize?: number;
  orderBy?: string;
}

async function proxyRequest<T>(
  path: string,
  query = new URLSearchParams(),
  signal?: AbortSignal,
): Promise<T> {
  const url = new URL(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/pokemon-proxy`,
  );
  url.search = new URLSearchParams({
    path,
    query: query.toString(),
  }).toString();
  const response = await fetch(url, { signal });
  if (!response.ok)
    throw new Error(
      `Korttjänsten svarade med ${response.status}. Försök igen.`,
    );
  return response.json();
}

export const searchCards = async (
  params: SearchParams = {},
  signal?: AbortSignal,
): Promise<{ data: PokemonCard[]; totalCount: number }> => {
  const {
    q = "",
    page = 1,
    pageSize = 20,
    orderBy = "-set.releaseDate",
  } = params;
  const query = new URLSearchParams({
    page: String(page),
    pageSize: String(pageSize),
    orderBy,
  });
  if (q) query.set("q", q);
  const result = await proxyRequest<{
    data: PokemonCard[];
    totalCount: number;
  }>("/cards", query, signal);
  if (
    !Array.isArray(result.data) ||
    !Number.isSafeInteger(result.totalCount) ||
    result.totalCount < result.data.length ||
    result.totalCount > 100000
  )
    throw new Error("Korttjänsten skickade ett ofullständigt svar.");
  return { data: result.data, totalCount: result.totalCount };
};

export const getCardById = async (
  id: string,
  signal?: AbortSignal,
): Promise<PokemonCard | null> => {
  if (id.startsWith("jp-")) return getJapaneseCard(id, signal);
  const result = await proxyRequest<{ data: PokemonCard | null }>(
    `/cards/${encodeURIComponent(id)}`,
    undefined,
    signal,
  );
  return result.data ?? null;
};

export const getCardsByName = async (name: string): Promise<PokemonCard[]> => {
  const { data } = await searchCards({
    q: `name:"${name.replace(/["\\]/g, "")}"`,
    pageSize: 10,
  });
  return data;
};

export const filterCards = async (filters: {
  types?: string[];
  rarity?: string;
  searchQuery?: string;
  page?: number;
}) => {
  const queries: string[] = [];
  if (filters.searchQuery)
    queries.push(`name:*${filters.searchQuery.replace(/["\\]/g, "")}*`);
  if (filters.types?.length)
    queries.push(`types:(${filters.types.join(" OR ")})`);
  if (filters.rarity && filters.rarity !== "all")
    queries.push(`rarity:"${filters.rarity}"`);
  return searchCards({
    q: queries.join(" "),
    page: filters.page ?? 1,
    pageSize: 20,
  });
};

export const getAllSets = async (
  signal?: AbortSignal,
): Promise<PokemonSet[]> => {
  const result = await proxyRequest<{ data: PokemonSet[] }>(
    "/sets",
    new URLSearchParams({ orderBy: "releaseDate" }),
    signal,
  );
  return result.data ?? [];
};

export const getCardsBySet = async (
  setId: string,
  signal?: AbortSignal,
): Promise<{ data: PokemonCard[]; totalCount: number }> => {
  if (setId.startsWith("jp-")) {
    const data = await getJapaneseCardsBySet(setId, signal);
    return { data, totalCount: data.length };
  }
  const cards: PokemonCard[] = [];
  let totalCount = Infinity;
  for (let page = 1; cards.length < totalCount; page++) {
    const result = await searchCards(
      { q: `set.id:${setId}`, page, pageSize: 250, orderBy: "number" },
      signal,
    );
    if (
      result.totalCount > 5000 ||
      (Number.isFinite(totalCount) && result.totalCount !== totalCount)
    ) {
      throw new Error(
        "Kortlistans antal ändrades eller kunde inte verifieras. Försök igen.",
      );
    }
    if (result.data.some((card) => card.set?.id && card.set.id !== setId)) {
      throw new Error(
        "Korttjänsten skickade kort från fel set. Försök igen när tjänsten är uppdaterad.",
      );
    }
    const seen = new Set(cards.map((card) => card.id));
    if (
      result.data.some((card) => {
        if (seen.has(card.id)) return true;
        seen.add(card.id);
        return false;
      })
    ) {
      throw new Error(
        "Kortlistan innehöll upprepade sidor och kunde inte läsas fullständigt.",
      );
    }
    totalCount = result.totalCount;
    if (!result.data.length && cards.length < totalCount)
      throw new Error("Alla kort kunde inte hämtas. Försök igen.");
    cards.push(...result.data);
    if (cards.length > totalCount)
      throw new Error("Kortlistans antal stämmer inte.");
  }
  return { data: cards, totalCount };
};

export const getSetById = async (
  setId: string,
  signal?: AbortSignal,
): Promise<PokemonSet | null> => {
  if (setId.startsWith("jp-")) {
    if (signal?.aborted) throw new DOMException("Aborted", "AbortError");
    return getJapaneseSet(setId);
  }
  const result = await proxyRequest<{ data: PokemonSet | null }>(
    `/sets/${encodeURIComponent(setId)}`,
    undefined,
    signal,
  );
  return result.data ?? null;
};
