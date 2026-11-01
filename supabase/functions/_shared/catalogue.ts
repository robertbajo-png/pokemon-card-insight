export interface CatalogueSet {
  id: string;
  name: string;
  series: string;
  total: number;
  printedTotal?: number | null;
  releaseDate: string;
  images: { symbol: string; logo: string };
  [key: string]: unknown;
}

export interface CatalogueCard {
  id: string;
  name: string;
  number: string;
  images: { small: string; large: string };
  types?: string[];
  rarity?: string;
  [key: string]: unknown;
}

export interface CatalogueRepository {
  revision: string;
  updatedAt: string;
  listSets(signal: AbortSignal): Promise<CatalogueSet[]>;
  readCards(setId: string, signal: AbortSignal): Promise<CatalogueCard[]>;
}

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
};
const collator = new Intl.Collator("en", {
  numeric: true,
  sensitivity: "base",
});
class CatalogueError extends Error {
  constructor(
    message: string,
    readonly status = 400,
  ) {
    super(message);
  }
}
type Clause = {
  field: "set.id" | "name" | "types" | "rarity";
  matches: (text: string) => boolean;
};
const normalized = (value: string) =>
  value.normalize("NFKC").toLocaleLowerCase("en");

function textMatcher(value: string) {
  if (!value || value.length > 150)
    throw new CatalogueError("Ogiltigt sökfilter.");
  const parts = normalized(value).split("*");
  return (value: string) => {
    const text = normalized(value);
    if (parts.length === 1) return text === parts[0];
    const first = parts[0];
    const last = parts[parts.length - 1];
    if (!text.startsWith(first) || !text.endsWith(last)) return false;
    let cursor = first.length;
    const end = text.length - last.length;
    if (cursor > end) return false;
    for (const part of parts.slice(1, -1)) {
      if (!part) continue;
      const position = text.indexOf(part, cursor);
      if (position < 0 || position + part.length > end) return false;
      cursor = position + part.length;
    }
    return true;
  };
}

function parseFilters(query: string): Clause[] {
  if (query.length > 600) throw new CatalogueError("Sökningen är för lång.");
  const clauses: Clause[] = [];
  const token =
    /\s*(set\.id|name|types|rarity):(?:"((?:[^"\\]|\\.)*)"|\(([^()]*)\)|([^\s]+))/y;
  let index = 0;
  while (index < query.trimEnd().length) {
    token.lastIndex = index;
    const match = token.exec(query);
    if (!match || clauses.length >= 8)
      throw new CatalogueError("Sökfiltret stöds inte av kortkatalogen.");
    index = token.lastIndex;
    if (index < query.length && !/\s/.test(query[index]))
      throw new CatalogueError("Ogiltigt sökfilter.");
    const field = match[1] as Clause["field"];
    if (match[4] !== undefined && /["\\():]/.test(match[4]))
      throw new CatalogueError("Ogiltigt sökfilter.");
    if (match[3] !== undefined) {
      if (field !== "types")
        throw new CatalogueError("Sökfiltret stöds inte av kortkatalogen.");
      const values = match[3].split(/\s+OR\s+/i);
      if (
        !values.length ||
        values.length > 12 ||
        values.some((value) => !/^[a-zA-Z]+$/.test(value.trim()))
      )
        throw new CatalogueError("Ogiltigt typfilter.");
      const alternatives = new Set(
        values.map((value) => normalized(value.trim())),
      );
      clauses.push({
        field,
        matches: (text) => alternatives.has(normalized(text)),
      });
    } else {
      const value = (match[2] ?? match[4]).replace(/\\(["\\])/g, "$1");
      if (field === "set.id" && !/^[a-zA-Z0-9-]+$/.test(value))
        throw new CatalogueError("Ogiltigt setfilter.");
      clauses.push({ field, matches: textMatcher(value) });
    }
  }
  return clauses;
}

function positiveInteger(value: string | null, fallback: number, max: number) {
  if (value === null) return fallback;
  if (!/^[1-9]\d*$/.test(value) || Number(value) > max)
    throw new CatalogueError("Ogiltig sidindelning.");
  return Number(value);
}

// Bound the await itself, including adapters which accidentally ignore a signal.
function abortable<T>(work: () => Promise<T>, signal: AbortSignal): Promise<T> {
  signal.throwIfAborted();
  return new Promise((resolve, reject) => {
    const cancelled = () => reject(signal.reason);
    signal.addEventListener("abort", cancelled, { once: true });
    Promise.resolve()
      .then(work)
      .then(
        (value) => {
          signal.removeEventListener("abort", cancelled);
          if (signal.aborted) reject(signal.reason);
          else resolve(value);
        },
        (error) => {
          signal.removeEventListener("abort", cancelled);
          reject(error);
        },
      );
  });
}

/** The installed local application reads a pinned, complete public snapshot. */
export function createCatalogueHandler(repository: CatalogueRepository) {
  const catalogueSource = {
    kind: "snapshot",
    revision: repository.revision,
    updatedAt: repository.updatedAt,
  };
  return async (req: Request): Promise<Response> => {
    const json = (body: Record<string, unknown>, status = 200) =>
      new Response(
        req.method === "HEAD"
          ? null
          : JSON.stringify({ ...body, catalogueSource }),
        {
          status,
          headers: {
            ...cors,
            "Content-Type": "application/json",
            "Cache-Control": "no-store",
          },
        },
      );
    if (req.method === "OPTIONS") return new Response(null, { headers: cors });
    if (req.method !== "GET" && req.method !== "HEAD")
      return json({ error: "Metoden stöds inte." }, 405);
    try {
      const outer = new URL(req.url).searchParams;
      if (
        [...outer.keys()].some((key) => !["path", "query"].includes(key)) ||
        outer.getAll("path").length > 1 ||
        outer.getAll("query").length > 1
      )
        throw new CatalogueError("Ogiltigt kataloganrop.");
      let path: string;
      try {
        path = decodeURIComponent(outer.get("path") || "/cards");
      } catch {
        throw new CatalogueError("Ogiltig katalogsökväg.");
      }
      const route = /^\/(cards|sets)(?:\/([a-zA-Z0-9_!?-]{1,100}))?$/.exec(
        path,
      );
      if (!route) throw new CatalogueError("Ogiltig katalogsökväg.");
      const [, resource, id] = route;
      const rawQuery = outer.get("query") ?? "";
      if (rawQuery.length > 1500)
        throw new CatalogueError("Sökningen är för lång.");
      const query = new URLSearchParams(rawQuery);
      if (
        [...query.keys()].some(
          (key) =>
            !["q", "page", "pageSize", "orderBy"].includes(key) ||
            query.getAll(key).length > 1,
        )
      )
        throw new CatalogueError("Katalogparametern stöds inte.");
      if (id && [...query.keys()].length)
        throw new CatalogueError(
          "Filter kan inte kombineras med ett kort- eller set-ID.",
        );
      const page = positiveInteger(query.get("page"), 1, 10000);
      const pageSize = positiveInteger(
        query.get("pageSize"),
        resource === "sets" ? 250 : 20,
        250,
      );
      const filters = parseFilters(query.get("q") ?? "");
      if (
        resource === "sets" &&
        filters.some((filter) => !["name", "set.id"].includes(filter.field))
      )
        throw new CatalogueError("Setfiltret stöds inte.");
      const orderBy =
        query.get("orderBy") ||
        (resource === "sets" ? "releaseDate" : "-set.releaseDate");
      const field = orderBy.replace(/^-/, "");
      if (
        !["number", "name", "set.releaseDate", "releaseDate"].includes(field) ||
        (resource === "sets" && field === "number")
      )
        throw new CatalogueError("Sorteringen stöds inte.");
      const signal = AbortSignal.any([req.signal, AbortSignal.timeout(9000)]);
      const sets = await abortable(() => repository.listSets(signal), signal);
      if (
        !Array.isArray(sets) ||
        sets.length > 1000 ||
        new Set(sets.map((set) => set.id)).size !== sets.length
      )
        throw new CatalogueError("Kortkatalogen är ofullständig.", 503);
      const byId = new Map(sets.map((set) => [set.id, set]));
      const setData = (set: CatalogueSet) => ({ ...set, catalogueSource });
      const cardsFor = async (set: CatalogueSet) => {
        const cards = await abortable(
          () => repository.readCards(set.id, signal),
          signal,
        );
        if (
          !Array.isArray(cards) ||
          cards.length !== set.total ||
          new Set(cards.map((card) => card.id)).size !== cards.length ||
          cards.some(
            (card) =>
              !card.id.startsWith(`${set.id}-`) ||
              typeof card.name !== "string" ||
              typeof card.number !== "string",
          )
        )
          throw new CatalogueError("Kortlistan är ofullständig.", 503);
        return cards.map((card) => ({
          ...card,
          set: setData(set),
          catalogueSource,
        }));
      };
      if (id) {
        if (resource === "sets") {
          const set = byId.get(id);
          return set
            ? json({ data: setData(set) })
            : json(
                { error: "Setet finns inte i kortkatalogen.", data: null },
                404,
              );
        }
        const separator = id.indexOf("-");
        const set = byId.get(id.slice(0, separator));
        if (!set || separator < 1)
          return json(
            { error: "Kortet finns inte i kortkatalogen.", data: null },
            404,
          );
        const card = (await cardsFor(set)).find((card) => card.id === id);
        return card
          ? json({ data: card })
          : json(
              { error: "Kortet finns inte i kortkatalogen.", data: null },
              404,
            );
      }
      const selectedSets = sets.filter((set) =>
        filters.every((filter) =>
          filter.field === "set.id"
            ? filter.matches(set.id)
            : resource === "sets"
              ? filter.matches(set.name)
              : true,
        ),
      );
      let rows: Array<
        | ReturnType<typeof setData>
        | (CatalogueCard & { set: ReturnType<typeof setData> })
      > = [];
      if (resource === "sets") rows = selectedSets.map(setData);
      else {
        for (const set of selectedSets) {
          signal.throwIfAborted();
          const cards = await cardsFor(set);
          rows.push(
            ...cards.filter((card) =>
              filters.every((filter) => {
                if (filter.field === "set.id") return true;
                if (filter.field === "name") return filter.matches(card.name);
                if (filter.field === "types")
                  return (card.types ?? []).some(filter.matches);
                return filter.matches(card.rarity ?? "");
              }),
            ),
          );
        }
      }
      const direction = orderBy.startsWith("-") ? -1 : 1;
      const value = (row: (typeof rows)[number]): string =>
        field === "name"
          ? row.name
          : field === "number"
            ? String((row as CatalogueCard).number ?? "")
            : String(
                (resource === "cards"
                  ? (row as CatalogueCard & { set: CatalogueSet }).set
                      .releaseDate
                  : row.releaseDate) ?? "",
              ).replaceAll("/", "-");
      rows.sort(
        (left, right) =>
          direction * collator.compare(value(left), value(right)) ||
          collator.compare(left.id, right.id),
      );
      signal.throwIfAborted();
      const totalCount = rows.length;
      const data = rows.slice((page - 1) * pageSize, page * pageSize);
      return json({ data, page, pageSize, count: data.length, totalCount });
    } catch (error) {
      if (error instanceof CatalogueError)
        return json({ error: error.message, data: [] }, error.status);
      if (
        req.signal.aborted ||
        (error instanceof Error &&
          ["AbortError", "TimeoutError"].includes(error.name))
      )
        return json(
          { error: "Kataloganropet avbröts eller tog för lång tid.", data: [] },
          504,
        );
      return json(
        {
          error: "Den lokala kortkatalogen kunde inte läsas. Försök igen.",
          data: [],
        },
        503,
      );
    }
  };
}
