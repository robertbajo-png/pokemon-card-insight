const BASE_URL = "https://api.pokemontcg.io/v2";

export interface PokemonSet {
  id: string;
  name: string;
  series: string;
  printedTotal: number;
  total: number;
  releaseDate: string;
  images: {
    symbol: string;
    logo: string;
  };
  ptcgoCode?: string;
}

export interface PokemonCard {
  id: string;
  name: string;
  images: {
    small: string;
    large: string;
  };
  types?: string[];
  rarity?: string;
  set: {
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

export const searchCards = async (params: SearchParams = {}): Promise<{ data: PokemonCard[]; totalCount: number }> => {
  const { q = "", page = 1, pageSize = 20, orderBy = "-set.releaseDate" } = params;
  
  const queryParams = new URLSearchParams({
    page: page.toString(),
    pageSize: pageSize.toString(),
    orderBy,
  });

  if (q) {
    queryParams.append("q", q);
  }

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const proxyUrl = `${supabaseUrl}/functions/v1/pokemon-proxy?path=/cards&query=${queryParams.toString()}`;
  
  const response = await fetch(proxyUrl);
  const data = await response.json();
  
  return {
    data: data.data || [],
    totalCount: data.totalCount || 0,
  };
};

export const getCardById = async (id: string): Promise<PokemonCard | null> => {
  try {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const proxyUrl = `${supabaseUrl}/functions/v1/pokemon-proxy?path=/cards/${id}`;
    
    const response = await fetch(proxyUrl);
    const data = await response.json();
    return data.data || null;
  } catch (error) {
    console.error("Error fetching card:", error);
    return null;
  }
};

export const getCardsByName = async (name: string): Promise<PokemonCard[]> => {
  const { data } = await searchCards({ q: `name:"${name}"`, pageSize: 10 });
  return data;
};

export const filterCards = async (filters: {
  types?: string[];
  rarity?: string;
  searchQuery?: string;
  page?: number;
}): Promise<{ data: PokemonCard[]; totalCount: number }> => {
  const queries: string[] = [];

  if (filters.searchQuery) {
    queries.push(`name:*${filters.searchQuery}*`);
  }

  if (filters.types && filters.types.length > 0) {
    queries.push(`types:${filters.types.join(",")}`);
  }

  if (filters.rarity && filters.rarity !== "all") {
    queries.push(`rarity:"${filters.rarity}"`);
  }

  const q = queries.length > 0 ? queries.join(" ") : undefined;

  return searchCards({
    q,
    page: filters.page || 1,
    pageSize: 20,
  });
};

export const getAllSets = async (): Promise<PokemonSet[]> => {
  try {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const proxyUrl = `${supabaseUrl}/functions/v1/pokemon-proxy?path=/sets&query=orderBy=releaseDate`;
    
    const response = await fetch(proxyUrl);
    const data = await response.json();
    return data.data || [];
  } catch (error) {
    console.error("Error fetching sets:", error);
    return [];
  }
};

export const getCardsBySet = async (setId: string): Promise<{ data: PokemonCard[]; totalCount: number }> => {
  try {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const proxyUrl = `${supabaseUrl}/functions/v1/pokemon-proxy?path=/cards&query=q=set.id:${setId}&pageSize=250`;
    
    const response = await fetch(proxyUrl);
    const data = await response.json();
    return {
      data: data.data || [],
      totalCount: data.totalCount || 0,
    };
  } catch (error) {
    console.error("Error fetching cards by set:", error);
    return { data: [], totalCount: 0 };
  }
};

export const getSetById = async (setId: string): Promise<PokemonSet | null> => {
  try {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const proxyUrl = `${supabaseUrl}/functions/v1/pokemon-proxy?path=/sets/${setId}`;
    
    const response = await fetch(proxyUrl);
    const data = await response.json();
    return data.data || null;
  } catch (error) {
    console.error("Error fetching set:", error);
    return null;
  }
};
