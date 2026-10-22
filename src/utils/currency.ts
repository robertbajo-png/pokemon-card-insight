import type { Currency } from "@/contexts/LanguageContext";

// Växelkurser relativt till SEK.
export const CURRENCY_RATES: Record<Currency, number> = {
  SEK: 1,
  USD: 0.091,
  EUR: 0.084,
  JPY: 14.5,
};

// Valutasymboler för formatering.
export const CURRENCY_SYMBOLS: Record<Currency, string> = {
  SEK: "kr",
  USD: "$",
  EUR: "€",
  JPY: "¥",
};

/**
 * Konvertera ett numeriskt pris i SEK till en sträng i vald valuta.
 * Exempel: convertPriceValue(100, "USD") -> "$9".
 */
export function convertPriceValue(
  priceInSEK: number,
  currency: Currency,
): string {
  const converted = priceInSEK * CURRENCY_RATES[currency];
  const formatted = Math.round(converted);
  const symbol = CURRENCY_SYMBOLS[currency];
  const symbolAfter = currency === "SEK" || currency === "EUR";
  return symbolAfter ? `${formatted} ${symbol}` : `${symbol}${formatted}`;
}

/**
 * Konvertera ett prisintervall i textform (t.ex. "1200-1500 kr" eller "1200 kr")
 * till vald valuta. Om formatet inte matchar returneras originalsträngen.
 */
export function convertPriceRange(
  range: string,
  currency: Currency,
): string {
  const match = range.trim().match(/^(\d+(?:[ \u00a0]\d{3})*(?:[.,]\d{1,2})?)(?:\s*[-–—]\s*(\d+(?:[ \u00a0]\d{3})*(?:[.,]\d{1,2})?))?\s*(?:kr|SEK)$/i);
  if (!match) return range;
  const parse = (value: string) => Number(value.replace(/[ \u00a0]/g, "").replace(",", "."));
  const min = parse(match[1]);
  const max = match[2] ? parse(match[2]) : null;
  const convertedMin = Math.round(min * CURRENCY_RATES[currency]);
  const symbol = CURRENCY_SYMBOLS[currency];
  const symbolAfter = currency === "SEK" || currency === "EUR";
  if (max !== null) {
    const convertedMax = Math.round(max * CURRENCY_RATES[currency]);
    return symbolAfter
      ? `${convertedMin}-${convertedMax} ${symbol}`
      : `${symbol}${convertedMin}-${convertedMax}`;
  }
  return symbolAfter
    ? `${convertedMin} ${symbol}`
    : `${symbol}${convertedMin}`;
}
