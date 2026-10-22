import { invokeAi } from "@/services/aiFunctions";
import { z } from "zod";
type Language = "sv" | "en" | "de" | "fr" | "ja";
const cache = new Map<string, string>();
const pending = new Map<string, Promise<string>>();
export async function translateText(text: string, language: Language): Promise<string> {
  const key = `${language}\0${text}`;
  const cached = cache.get(key);
  if (cached !== undefined) return cached;
  if (pending.has(key)) return pending.get(key)!;
  const request = (async () => {
    try {
      const result = z.object({ translation: z.string() }).parse(await invokeAi("translate", { text, targetLanguage: language }));
      cache.set(key, result.translation);
      return result.translation;
    } catch { return text; }
    finally { pending.delete(key); }
  })();
  pending.set(key, request);
  return request;
}
export async function translateBatch(texts: string[], language: Language): Promise<Record<string, string>> {
  const entries = await Promise.all(texts.map(async text => [text, await translateText(text, language)]));
  return Object.fromEntries(entries);
}
