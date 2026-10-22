import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Check, Plus, Search } from "lucide-react";
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
  const progress = useMemo(
    () => setProgress(cards, set, catalog),
    [cards, set, catalog],
  );
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
  const add = async (card: PokemonCard) => {
    setBusy((current) => new Set(current).add(card.id));
    try {
      await addCard(catalogCardToCollection(card, set.id));
      toast.success(`${card.name} är sparat i samlingen.`);
    } catch (cause) {
      toast.error(
        cause instanceof Error ? cause.message : "Kunde inte spara kortet.",
      );
    } finally {
      setBusy((current) => {
        const next = new Set(current);
        next.delete(card.id);
        return next;
      });
    }
  };
  if (!catalog.length) return null;
  return (
    <section aria-label="Setkomplettering" className="space-y-5">
      <div className="rounded-2xl border bg-card p-5 space-y-4">
        <div className="flex flex-wrap justify-between items-end gap-3">
          <div>
            <h2 className="text-lg font-bold">Din checklista</h2>
            <p className="text-sm text-muted-foreground">
              Ett exemplar av varje kortnummer räknas. Språk och holo-varianter
              delar samma plats.
            </p>
          </div>
          {!isLoading && !error && (
            <p className="text-2xl font-bold text-primary">
              {progress.ownedCount}{" "}
              <span className="text-base text-muted-foreground">
                av {progress.total}
              </span>
            </p>
          )}
        </div>
        {isLoading ? (
          <p role="status">Laddar din samling...</p>
        ) : error ? (
          <p role="alert">{error}</p>
        ) : (
          <>
            <div
              role="progressbar"
              aria-label={`${set.name}: samlade kort`}
              aria-valuemin={0}
              aria-valuemax={progress.total}
              aria-valuenow={progress.ownedCount}
              className="h-2.5 rounded-full bg-muted overflow-hidden"
            >
              <div
                style={{ width: `${progress.percent}%` }}
                className="h-full bg-primary rounded-full transition-all"
              />
            </div>
            <div className="flex justify-between text-sm">
              <p>
                {progress.missing === 0
                  ? "Setet är komplett!"
                  : `${progress.missing} kortnummer saknas`}
              </p>
              <span>{progress.percent}%</span>
            </div>
          </>
        )}
      </div>
      <div className="flex flex-wrap gap-3 justify-between">
        <div className="flex flex-wrap gap-2" aria-label="Filtrera checklista">
          {[
            ["all", "Alla"],
            ["owned", "Ägda"],
            ["missing", "Saknade"],
            ["duplicates", "Dubbletter"],
          ].map(([id, label]) => (
            <Button
              key={id}
              size="sm"
              variant={filter === id ? "default" : "outline"}
              aria-pressed={filter === id}
              onClick={() => setFilter(id)}
            >
              {label}
            </Button>
          ))}
        </div>
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
          <Input
            className="pl-9"
            aria-label="Sök i checklistan"
            placeholder="Namn eller kortnummer"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
        {visible.map((card) => {
          const quantity =
            progress.quantities.get(cardNumber(card.number)) ?? 0;
          return (
            <article
              key={card.id}
              className={`rounded-2xl overflow-hidden border bg-card ${quantity ? "border-primary/50" : "border-border"}`}
            >
              <Link to={`/card/${card.id}`} className="block p-3 pb-0">
                <div className="aspect-[3/4] bg-muted/20 rounded-lg overflow-hidden">
                  <img
                    src={card.images.small}
                    alt={card.name}
                    loading="lazy"
                    className={`w-full h-full object-contain ${quantity ? "" : "opacity-60 grayscale-[50%]"}`}
                  />
                </div>
              </Link>
              <div className="p-3 space-y-2">
                <p className="text-xs text-muted-foreground">#{card.number}</p>
                <h3 className="text-sm font-semibold leading-tight min-h-9">
                  {card.name}
                </h3>
                <p
                  className={`text-xs flex items-center gap-1 ${quantity ? "text-primary" : "text-muted-foreground"}`}
                >
                  {quantity ? (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      {quantity} st i samlingen
                    </>
                  ) : (
                    "Saknas"
                  )}
                </p>
                <Button
                  className="w-full"
                  size="sm"
                  variant={quantity ? "outline" : "secondary"}
                  disabled={isLoading || Boolean(error) || busy.has(card.id)}
                  onClick={() => void add(card)}
                  aria-label={`Lägg till ${card.name} #${card.number}`}
                >
                  <Plus className="w-3.5 h-3.5 mr-1" />
                  {busy.has(card.id)
                    ? "Sparar..."
                    : quantity
                      ? "+1 exemplar"
                      : "Jag har kortet"}
                </Button>
              </div>
            </article>
          );
        })}
      </div>
      {!visible.length && (
        <p className="text-center py-10 text-muted-foreground">
          {filter === "missing" && progress.missing === 0
            ? "Du har alla kortnummer i setet."
            : "Inga kort matchar ditt filter."}
        </p>
      )}
    </section>
  );
}
