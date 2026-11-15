import {
  sets as internationalSets,
  updatedAt as internationalUpdatedAt,
} from "@/data/catalogue-sets.json";
import {
  sets as japaneseSets,
  updatedAt as japaneseUpdatedAt,
} from "@/data/japanese-catalogue.json";

export interface PreviewSet {
  id: string;
  name: string;
  nativeName?: string;
  series: string;
  code: string;
  language: "en" | "ja";
  total: number;
  releaseDate: string;
}

const newestFirst = (a: PreviewSet, b: PreviewSet) =>
  b.releaseDate.localeCompare(a.releaseDate) || a.id.localeCompare(b.id);

const searchText = (value: string) =>
  value
    .normalize("NFKC")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("sv");

// Metadata only. The preview must not load the web app, remote images or card APIs.
export const previewInternationalSets: PreviewSet[] = internationalSets
  .map(
    (set): PreviewSet => ({
      id: set.id,
      name: set.name,
      series: set.series,
      code:
        ("ptcgoCode" in set &&
          typeof set.ptcgoCode === "string" &&
          set.ptcgoCode) ||
        set.id.toUpperCase(),
      language: "en",
      total: set.total,
      releaseDate: set.releaseDate.replace(/\//g, "-"),
    }),
  )
  .sort(newestFirst);

export const previewJapaneseSets: PreviewSet[] = japaneseSets
  .map(
    (set): PreviewSet => ({
      id: set.id,
      name: set.name,
      nativeName: set.nativeName,
      series: set.series,
      code: set.setCode,
      language: "ja",
      total: set.total,
      releaseDate: set.releaseDate,
    }),
  )
  .sort(newestFirst);

export const previewCatalogueDates = {
  international: internationalUpdatedAt,
  japanese: japaneseUpdatedAt,
};

export function searchPreviewSets(sets: PreviewSet[], query: string) {
  const terms = searchText(query.trim()).split(/\s+/);
  return sets.filter((set) => {
    const searchable = searchText(
      [
        set.name,
        set.nativeName,
        set.id,
        set.code,
        set.series,
        set.language === "ja" ? "Japan japanska" : "engelska",
      ]
        .filter(Boolean)
        .join(" "),
    );
    return terms.every((term) => searchable.includes(term));
  });
}
