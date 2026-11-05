interface CatalogueLocation {
  pathname: string;
  search: string;
  state?: unknown;
}

function record(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === "object"
    ? (value as Record<string, unknown>)
    : undefined;
}

// A card can return only to an internal catalogue/collection view. Copy just
// that view's supported filters, never an arbitrary redirect or nested state.
function cataloguePath(value: unknown): string | undefined {
  if (typeof value !== "string" || value.length > 4096) return undefined;
  const withoutHash = value.split("#", 1)[0];
  const question = withoutHash.indexOf("?");
  const pathname = question < 0 ? withoutHash : withoutHash.slice(0, question);
  if (
    pathname !== "/gallery" &&
    pathname !== "/collection" &&
    !/^\/set\/[a-z0-9-]+$/.test(pathname)
  )
    return undefined;
  const input = new URLSearchParams(
    question < 0 ? "" : withoutHash.slice(question + 1),
  );
  const output = new URLSearchParams();
  const query = input.get("q");
  if (query) output.set("q", query);
  if (pathname === "/gallery") {
    const series = input.get("serie");
    if (series && series !== "all") output.set("serie", series);
    if (input.get("mina") === "1") output.set("mina", "1");
  } else {
    const filter = input.get("filter");
    const allowed =
      pathname === "/collection"
        ? ["duplicates", "unlinked"]
        : ["owned", "missing", "duplicates"];
    if (filter && allowed.includes(filter)) output.set("filter", filter);
  }
  const search = output.toString();
  return pathname + (search ? `?${search}` : "");
}

function gallerySearch(state: unknown): string | undefined {
  const value = record(state)?.gallerySearch;
  if (typeof value !== "string") return undefined;
  const path = cataloguePath(`/gallery?${value}`);
  return path?.startsWith("/gallery?")
    ? path.slice("/gallery?".length)
    : undefined;
}

export function catalogueNavigationState(location: CatalogueLocation) {
  const to = cataloguePath(location.pathname + location.search);
  return to
    ? {
        catalogueReturn: { to, gallerySearch: gallerySearch(location.state) },
      }
    : undefined;
}

export function catalogueReturn(
  state: unknown,
  fallback: "/gallery" | "/collection",
) {
  const origin = record(record(state)?.catalogueReturn);
  const validated = cataloguePath(origin?.to);
  const to = validated ?? fallback;
  const search = validated ? gallerySearch(origin) : undefined;
  return {
    to,
    state: search ? { gallerySearch: search } : undefined,
    label: to.startsWith("/set/")
      ? "Tillbaka till checklistan"
      : to.startsWith("/collection")
        ? "Tillbaka till samlingen"
        : "Tillbaka till galleriet",
  };
}
