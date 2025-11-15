const BASE_URL = "https://api.pokemontcg.io/v2";

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
  const { q = "", pageSize = 20 } = params;
  
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  
  const response = await fetch(`${supabaseUrl}/functions/v1/analyze-pokemon-card`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      action: 'generate',
      searchQuery: q,
      pageSize,
    }),
  });
  
  if (!response.ok) {
    throw new Error('Failed to fetch cards');
  }
  
  const result = await response.json();
  return {
    data: result.data,
    totalCount: result.totalCount,
  };
};

export const getCardById = async (id: string): Promise<PokemonCard | null> => {
  try {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    
    const response = await fetch(`${supabaseUrl}/functions/v1/analyze-pokemon-card`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'generate',
        searchQuery: id,
        pageSize: 1,
      }),
    });
    
    if (!response.ok) {
      return null;
    }
    
    const result = await response.json();
    return result.data[0] || null;
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
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  
  const response = await fetch(`${supabaseUrl}/functions/v1/analyze-pokemon-card`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      action: 'generate',
      searchQuery: filters.searchQuery,
      types: filters.types,
      rarity: filters.rarity !== 'all' ? filters.rarity : undefined,
      pageSize: 20,
    }),
  });
  
  if (!response.ok) {
    throw new Error('Failed to fetch cards');
  }
  
  const result = await response.json();
  return {
    data: result.data,
    totalCount: result.totalCount,
  };
};
