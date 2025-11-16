import { supabase } from "@/integrations/supabase/client";

type Language = "sv" | "en" | "de" | "fr" | "ja";

// Cache for translations to avoid repeated API calls
const translationCache: Record<string, Record<Language, string>> = {};

export const translateText = async (text: string, targetLanguage: Language): Promise<string> => {
  // Check cache first
  const cacheKey = text.toLowerCase().trim();
  if (translationCache[cacheKey]?.[targetLanguage]) {
    return translationCache[cacheKey][targetLanguage];
  }

  try {
    const { data, error } = await supabase.functions.invoke('translate', {
      body: { text, targetLanguage }
    });

    if (error) throw error;

    const translation = data?.translation || text;

    // Cache the result
    if (!translationCache[cacheKey]) {
      translationCache[cacheKey] = {} as Record<Language, string>;
    }
    translationCache[cacheKey][targetLanguage] = translation;

    return translation;
  } catch (error) {
    console.error('Translation error:', error);
    return text; // Fallback to original text
  }
};

export const translateBatch = async (
  texts: string[],
  targetLanguage: Language
): Promise<Record<string, string>> => {
  const results: Record<string, string> = {};
  
  // Translate in parallel
  await Promise.all(
    texts.map(async (text) => {
      results[text] = await translateText(text, targetLanguage);
    })
  );

  return results;
};
