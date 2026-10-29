import { useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  Check,
  CheckCheck,
  Layers3,
  Loader2,
  Plus,
  Search,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useScannedCards } from "@/hooks/useScannedCards";
import {
  cardNumber,
  catalogCardToCollection,
  normalize,
  setProgress,
} from "@/lib/collection";
import type { PokemonCard, PokemonSet } from "@/services/pokemonTcgApi";
import { toast } from "sonner";

function CatalogueArtwork({ card }: { card: PokemonCard }) {
  const [failed, setFailed] = useState(false);
  return (
    <div className="flex aspect-[3/4] items-center justify-center overflow-hidden rounded-lg">
      {card.images?.small && !failed ? (
        <img
          src={card.images.small}
          alt={card.name}
          loading="lazy"
          onError={() => setFailed(true)}
          className="h-full w-full object-contain drop-shadow-md transition-transform duration-300 group-hover:scale-[1.025]"
        />
      ) : (
        <span className="flex flex-col items-center gap-3 text-muted-foreground">
          <Layers3 className="h-8 w-8 opacity-40" />
          <span className="text-xs">#{card.number}</span>
        </span>
      )}
    </div>
  );
}

export default function SetChecklist({
  set,
  catalog,
}: {
  set: Pick<PokemonSet, "id" | "name">;
  catalog: PokemonCard[];
}) {
  const { cards, addCard, isLoading, error } = useScannedCards();
  const [filter, setFilter] = useState("all");
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState<Set<string>>(new Set());
  const pending = useRef(new Set<string>());
  const progress = useMemo(
    () => setProgress(cards, set, catalog),
    [cards, set, catalog],
  );
  const ownershipReady = !isLoading && !error;
  const visible = catalog.filter((card) => {
    const quantity = progress.quantities.get(cardNumber(card.number)) ?? 0;
    return (
      (filter === "all" ||
        (filter === "owned" && quantity > 0) ||
        (filter === "missing" && quantity === 0) ||
        (filter === "duplicates" && quantity > 1)) &&
      normalize(`${card.name} ${card.number}`).includes(normalize(query))
    );
  });
  const duplicateCount = catalog.filter(
    (card) => (progress.quantities.get(cardNumber(card.number)) ?? 0) > 1,
  ).length;
  const add = async (card: PokemonCard) => {
    if (isLoading || error || pending.current.has(card.id)) return;
    pending.current.add(card.id);
    setBusy((current) => new Set(current).add(card.id));
    try {
      await addCard(catalogCardToCollection(card, set.id));
      toast.success(`${card.name} är sparat i samlingen.`);
    } catch (cause) {
      toast.error(
        cause instanceof Error ? cause.message : "Kunde inte spara kortet.",
      );
    } finally {
      pending.current.delete(card.id);
      setBusy((current) => {
        const next = new Set(current);
        next.delete(card.id);
        return next;
      });
    }
  };
  if (!catalog.length) return null;

  return (
    <section aria-label="Setkomplettering" className="space-y-6">
      <div className="surface-panel space-y-5 p-5 sm:p-7">
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div className="flex items-start gap-4">
            <span className="hidden h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-primary/15 bg-primary/[0.07] text-primary sm:flex">
              <CheckCheck className="h-5 w-5" />
            </span>
            <div>
              <p className="page-eyebrow">Ett kort i taget</p>
              <h2 className="section-heading">Din checklista</h2>
              <p className="mt-2 max-w-lg text-sm leading-relaxed text-muted-foreground">
                Ett exemplar av varje kortnummer räknas. Språk och
                holo-varianter delar samma plats.
              </p>
            </div>
          </div>
          {ownershipReady && (
            <div className="flex shrink-0 items-end gap-2">
              <span className="text-4xl font-semibold tracking-[-0.06em] text-primary">
                {progress.percent}
                <span className="ml-1 text-lg">%</span>
              </span>
              <span className="mb-1 text-xs text-muted-foreground">
                av setet samlat
              </span>
            </div>
          )}
        </div>
        {isLoading ? (
          <p
            role="status"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground"
          >
            <Loader2 className="h-4 w-4 animate-spin" />
            Laddar din samling...
          </p>
        ) : error ? (
          <p
            role="alert"
            className="rounded-xl border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive"
          >
            {error}
          </p>
        ) : (
          <>
            <div
              role="progressbar"
              aria-label={`${set.name}: samlade kort`}
              aria-valuemin={0}
              aria-valuemax={progress.total}
              aria-valuenow={progress.ownedCount}
              className="h-2 overflow-hidden rounded-full bg-muted"
            >
              <div
                style={{ width: `${progress.percent}%` }}
                className="h-full rounded-full bg-primary transition-[width] duration-500"
              />
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
              <p className="font-medium">
                {progress.ownedCount}
                <span className="ml-1 font-normal text-muted-foreground">
                  av {progress.total} unika kort
                </span>
              </p>
              <p className="text-muted-foreground">
                {progress.missing === 0 ? (
                  <span className="inline-flex items-center gap-1.5 text-primary">
                    <Check className="h-4 w-4" />
                    Setet är komplett!
                  </span>
                ) : (
                  `${progress.missing} kortnummer saknas`
                )}
              </p>
            </div>
          </>
        )}
      </div>

      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
        <div
          aria-label="Filtrera checklista"
          className="flex gap-1 self-start rounded-xl border border-border bg-card p-1"
        >
          {[
            ["all", "Alla", catalog.length],
            ["owned", "Ägda", progress.ownedCount],
            ["missing", "Saknade", progress.missing],
            ["duplicates", "Dubbletter", duplicateCount],
          ].map(([id, label, count]) => (
            <Button
              key={id}
              size="sm"
              variant={filter === id ? "secondary" : "ghost"}
              aria-label={String(label)}
              aria-pressed={filter === id}
              disabled={!ownershipReady && id !== "all"}
              onClick={() => setFilter(String(id))}
              className="gap-1.5 rounded-lg px-2.5 text-xs sm:px-3.5 sm:text-sm"
            >
              {label}
              {(id === "all" || ownershipReady) && (
                <span
                  aria-hidden="true"
                  className="hidden rounded-md bg-foreground/[0.06] px-1.5 py-0.5 text-[10px] font-medium sm:inline"
                >
                  {count}
                </span>
              )}
            </Button>
          ))}
        </div>
        <div className="relative w-full lg:w-64">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-10 pr-10"
            aria-label="Sök i checklistan"
            placeholder="Namn eller kortnummer"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
          {query && (
            <button
              type="button"
              aria-label="Rensa sökning i checklistan"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              onClick={() => setQuery("")}
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
        {visible.map((card) => {
          const quantity =
            progress.quantities.get(cardNumber(card.number)) ?? 0;
          const owned = quantity > 0 && ownershipReady;
          return (
            <article
              key={card.id}
              className={`group flex flex-col overflow-hidden rounded-2xl border bg-card transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/35 hover:shadow-lg ${owned ? "border-primary/30" : "border-border"}`}
            >
              <Link
                to={`/card/${card.id}`}
                aria-label={`Visa ${card.name} #${card.number}`}
                className="relative block bg-muted/30 p-3 pb-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring sm:p-4"
              >
                <CatalogueArtwork card={card} />
                {owned && (
                  <span className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full border border-primary/30 bg-primary text-primary-foreground shadow-sm">
                    <Check className="h-3.5 w-3.5" />
                  </span>
                )}
              </Link>
              <div className="flex flex-1 flex-col p-3 pt-3 sm:p-4">
                <div className="mb-2 flex items-center justify-between gap-2 text-[10px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
                  <span>#{card.number}</span>
                  {card.rarity && (
                    <span className="truncate">{card.rarity}</span>
                  )}
                </div>
                <h3 className="min-h-10 text-sm font-semibold leading-5 tracking-tight">
                  {card.name}
                </h3>
                <p
                  className={`mb-3 mt-2 inline-flex items-center gap-1.5 text-xs ${owned ? "text-primary" : "text-muted-foreground"}`}
                >
                  {!ownershipReady ? (
                    "Inväntar din samling"
                  ) : owned ? (
                    <>
                      <Check className="h-3.5 w-3.5" />
                      {quantity} st i samlingen
                    </>
                  ) : (
                    "Saknas"
                  )}
                </p>
                <Button
                  className="mt-auto min-h-10 w-full gap-1.5 px-2 text-xs"
                  size="sm"
                  variant={owned ? "outline" : "secondary"}
                  disabled={isLoading || Boolean(error) || busy.has(card.id)}
                  onClick={() => void add(card)}
                  aria-label={`Lägg till ${card.name} #${card.number}`}
                >
                  {busy.has(card.id) ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      Sparar...
                    </>
                  ) : (
                    <>
                      <Plus className="h-3.5 w-3.5" />
                      {owned ? "+1 exemplar" : "Jag har kortet"}
                    </>
                  )}
                </Button>
              </div>
            </article>
          );
        })}
      </div>
      {!visible.length && (
        <div className="empty-state surface-panel py-14 text-center">
          <span className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
            {filter === "missing" && progress.missing === 0 ? (
              <CheckCheck className="h-6 w-6 text-primary" />
            ) : (
              <Layers3 className="h-6 w-6" />
            )}
          </span>
          <h3 className="text-lg font-semibold">
            {filter === "missing" && progress.missing === 0
              ? "Du har alla kortnummer i setet."
              : "Inga kort matchar ditt filter."}
          </h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Prova en annan sökning eller gå tillbaka till hela checklistan.
          </p>
          <Button
            variant="outline"
            className="mt-5"
            onClick={() => {
              setFilter("all");
              setQuery("");
            }}
          >
            Visa alla kort
          </Button>
        </div>
      )}
    </section>
  );
}
