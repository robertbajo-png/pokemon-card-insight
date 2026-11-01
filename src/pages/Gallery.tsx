import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  ArrowDownWideNarrow,
  ArrowUpRight,
  BookOpen,
  Check,
  Layers3,
  Search,
  Sparkles,
  X,
} from "lucide-react";
import Navigation from "@/components/Navigation";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { pokemonSets, type PokemonSet } from "@/data/pokemonSets";
import { useScannedCards } from "@/hooks/useScannedCards";
import { getAllSets } from "@/services/pokemonTcgApi";
import { localSetProgress } from "@/lib/collection";

function SetArtwork({
  set,
  featured = false,
}: {
  set: PokemonSet;
  featured?: boolean;
}) {
  const [failed, setFailed] = useState(false);
  const source = set.packArt || set.logo || set.logoUrl;
  return (
    <div
      className={`relative flex items-center justify-center overflow-hidden ${featured ? "h-48 w-36 sm:h-56 sm:w-44" : "h-28 w-full rounded-xl bg-muted/50 sm:h-32"}`}
    >
      <span
        aria-hidden="true"
        className={`select-none font-bold tracking-[-0.08em] text-foreground/[0.07] ${featured ? "text-7xl" : "text-5xl"}`}
      >
        {set.setCode}
      </span>
      <div
        aria-hidden="true"
        className="absolute inset-3 rounded-lg border border-foreground/[0.04]"
      />
      {source && !failed && (
        <img
          src={source}
          alt=""
          loading="lazy"
          onError={() => setFailed(true)}
          className={`absolute object-contain transition-transform duration-500 group-hover:scale-105 ${set.packArt ? "h-[92%] w-[92%]" : "h-auto max-h-[70%] w-auto max-w-[78%]"}`}
        />
      )}
    </div>
  );
}

export default function Gallery() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [setsWithLogos, setSetsWithLogos] = useState(pokemonSets);
  const { cards, isLoading, error } = useScannedCards();
  const uniqueSeries = useMemo(
    () => ["all", ...Array.from(new Set(pokemonSets.map((set) => set.series)))],
    [],
  );
  const searchQuery = searchParams.get("q") ?? "";
  const requestedSeries = searchParams.get("serie") ?? "all";
  const filterSeries = uniqueSeries.includes(requestedSeries)
    ? requestedSeries
    : "all";
  const ownedOnly = searchParams.get("mina") === "1";
  const progress = useMemo(
    () =>
      new Map(pokemonSets.map((set) => [set.id, localSetProgress(cards, set)])),
    [cards],
  );
  const ownedSetCount = [...progress.values()].filter(
    (count) => count > 0,
  ).length;
  const collectionReady = !isLoading && !error;
  const updateFilter = (key: string, value: string) => {
    const next = new URLSearchParams(searchParams);
    if (!value || value === "all") next.delete(key);
    else next.set(key, value);
    setSearchParams(next, { replace: true });
  };
  const resetFilters = () => setSearchParams({}, { replace: true });
  const openSet = (set: PokemonSet) =>
    navigate(`/set/${set.id}`, {
      state: { gallerySearch: searchParams.toString() },
    });
  const filteredSets = useMemo(
    () =>
      setsWithLogos
        .filter((set) => {
          const needle = searchQuery.trim().toLocaleLowerCase("sv");
          return (
            `${set.name} ${set.setCode}`
              .toLocaleLowerCase("sv")
              .includes(needle) &&
            (filterSeries === "all" || set.series === filterSeries) &&
            (!ownedOnly || (progress.get(set.id) ?? 0) > 0)
          );
        })
        .sort((a, b) => b.releaseDate.localeCompare(a.releaseDate)),
    [setsWithLogos, searchQuery, filterSeries, ownedOnly, progress],
  );
  const featured = [...setsWithLogos]
    .sort((a, b) => b.releaseDate.localeCompare(a.releaseDate))
    .find((set) => set.packArt);
  const filtered = Boolean(searchQuery || filterSeries !== "all" || ownedOnly);

  useEffect(() => {
    const controller = new AbortController();
    getAllSets(controller.signal)
      .then((remote) => {
        if (controller.signal.aborted) return;
        const byId = new Map(remote.map((set) => [set.id, set]));
        setSetsWithLogos(
          pokemonSets.map((set) => ({
            ...set,
            logo: byId.get(set.id)?.images?.logo || set.logo || set.logoUrl,
            symbol:
              byId.get(set.id)?.images?.symbol || set.symbol || set.symbolUrl,
          })),
        );
      })
      .catch(() => {
        /* Set codes remain available when decorative artwork cannot be fetched. */
      });
    return () => controller.abort();
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <main id="main-content" tabIndex={-1} className="page-shell space-y-8">
        <header className="flex flex-wrap items-end justify-between gap-5">
          <div className="max-w-xl">
            <p className="page-eyebrow">Bibliotek</p>
            <h1 className="page-title">Alla set</h1>
            <p className="page-subtitle">
              Hitta dina favoriter. Upptäck korten du saknar och bygg vidare på
              din samling.
            </p>
          </div>
          <div className="flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-sm text-muted-foreground">
            <Layers3 className="h-4 w-4 text-primary" />
            <span className="font-semibold text-foreground">
              {pokemonSets.length}
            </span>{" "}
            set att utforska
          </div>
        </header>

        {featured && !filtered && (
          <section
            className="surface-panel relative flex min-h-52 items-center justify-between gap-4 overflow-hidden px-6 py-5 sm:px-8"
            aria-label="Utvalt set"
          >
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -right-16 -top-28 h-80 w-80 rounded-full bg-primary/[0.06] blur-3xl"
            />
            <div className="relative z-10 max-w-md py-3">
              <p className="mb-3 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-primary">
                <Sparkles className="h-3.5 w-3.5" />
                Utvalt i biblioteket
              </p>
              <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
                {featured.name}
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {featured.totalCards} kort att upptäcka. Nästa favorit kanske
                finns här.
              </p>
              <Button className="mt-5 gap-2" onClick={() => openSet(featured)}>
                Utforska setet
                <ArrowUpRight className="h-4 w-4" />
              </Button>
            </div>
            <div className="relative hidden shrink-0 rotate-6 sm:block">
              <SetArtwork set={featured} featured />
            </div>
          </section>
        )}

        <section aria-label="Hitta set" className="space-y-5">
          <div className="surface-panel flex flex-col gap-3 p-3 sm:flex-row sm:items-center">
            <div className="relative min-w-0 flex-1">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                aria-label="Sök efter set..."
                placeholder="Sök efter set..."
                maxLength={200}
                value={searchQuery}
                onChange={(event) => updateFilter("q", event.target.value)}
                className="border-transparent bg-background/50 pl-10"
              />
            </div>
            <div className="flex gap-2 sm:shrink-0">
              <Select
                value={filterSeries}
                onValueChange={(value) => updateFilter("serie", value)}
              >
                <SelectTrigger
                  aria-label="Filtrera efter serie"
                  className="w-full border-transparent bg-background/50 sm:w-52"
                >
                  <SelectValue placeholder="Filtrera efter serie" />
                </SelectTrigger>
                <SelectContent>
                  {uniqueSeries.map((series) => (
                    <SelectItem key={series} value={series}>
                      {series === "all" ? "Alla serier" : series}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                variant={ownedOnly ? "secondary" : "outline"}
                aria-pressed={ownedOnly}
                disabled={!collectionReady}
                onClick={() => updateFilter("mina", ownedOnly ? "" : "1")}
                className="shrink-0 gap-2"
              >
                <BookOpen className="h-4 w-4" />
                Mina set
                {collectionReady && (
                  <span className="rounded-md bg-foreground/[0.07] px-1.5 py-0.5 text-[11px]">
                    {ownedSetCount}
                  </span>
                )}
              </Button>
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 px-1">
            <div className="flex items-center gap-3 text-sm">
              <span className="font-semibold">
                {ownedOnly && !collectionReady
                  ? "Dina set"
                  : `${filteredSets.length} set`}
              </span>
              {filtered && (
                <button
                  type="button"
                  onClick={resetFilters}
                  className="inline-flex items-center gap-1 text-muted-foreground transition-colors hover:text-foreground"
                >
                  <X className="h-3.5 w-3.5" />
                  Rensa filter
                </button>
              )}
            </div>
            <p className="inline-flex items-center gap-2 text-xs text-muted-foreground">
              <ArrowDownWideNarrow className="h-3.5 w-3.5" />
              Nyaste först
            </p>
          </div>
          {ownedOnly && !collectionReady && (
            <div className="surface-panel px-6 py-12 text-center">
              <p
                role={error ? "alert" : "status"}
                className="text-sm text-muted-foreground"
              >
                {error
                  ? "Dina set kunde inte läsas just nu. Dina sparade kort finns kvar."
                  : "Hämtar dina set..."}
              </p>
            </div>
          )}
          <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 2xl:grid-cols-4">
            {(!ownedOnly || collectionReady) &&
              filteredSets.map((set) => {
                const owned = progress.get(set.id) ?? 0;
                return (
                  <button
                    key={set.id}
                    type="button"
                    onClick={() => openSet(set)}
                    aria-label={`Öppna ${set.name}`}
                    className="group flex min-w-0 flex-col rounded-2xl border border-border bg-card p-3 text-left transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background sm:p-4"
                  >
                    <SetArtwork set={set} />
                    <div className="flex flex-1 flex-col px-1 pt-4">
                      <p className="mb-1.5 truncate text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                        {set.series}
                      </p>
                      <h2 className="min-h-10 text-sm font-semibold leading-5 tracking-tight sm:text-base">
                        {set.name}
                      </h2>
                      <div className="mt-3 flex items-center justify-between gap-2 text-xs text-muted-foreground">
                        <span>{set.totalCards} kort</span>
                        <span>{set.releaseDate.slice(0, 4)}</span>
                      </div>
                      <div className="mt-3 flex items-center justify-between gap-2 border-t border-border pt-3">
                        <span
                          className={`inline-flex items-center gap-1.5 text-[11px] ${owned && collectionReady ? "text-primary" : "text-muted-foreground"}`}
                        >
                          {owned && collectionReady ? (
                            <>
                              <Check className="h-3 w-3" />
                              {owned} unika i samlingen
                            </>
                          ) : (
                            "Öppna checklistan"
                          )}
                        </span>
                        <ArrowUpRight className="h-4 w-4 shrink-0 text-muted-foreground transition-colors group-hover:text-primary" />
                      </div>
                    </div>
                  </button>
                );
              })}
          </div>
          {!filteredSets.length && (!ownedOnly || collectionReady) && (
            <div className="empty-state surface-panel py-16 text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-muted">
                <Search className="h-6 w-6 text-muted-foreground" />
              </div>
              <h2 className="text-lg font-semibold">
                {ownedOnly && !ownedSetCount
                  ? "Dina set börjar med ditt första kort"
                  : "Inga set matchar din sökning"}
              </h2>
              <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground">
                {ownedOnly && !ownedSetCount
                  ? "Lägg till ett kort i samlingen så hittar du dess set här."
                  : "Prova ett annat setnamn eller ta bort något av filtren."}
              </p>
              <Button variant="outline" className="mt-5" onClick={resetFilters}>
                Visa alla set
              </Button>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
