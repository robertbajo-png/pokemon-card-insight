import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  ArrowUpRight,
  BookOpen,
  CalendarDays,
  ChevronDown,
  ChevronUp,
  Layers3,
  Library,
  Loader2,
  RefreshCw,
  WifiOff,
} from "lucide-react";
import Navigation from "@/components/Navigation";
import SetChecklist from "@/components/SetChecklist";
import PokemonCard from "@/components/PokemonCard";
import { Button } from "@/components/ui/button";
import {
  getCardsBySet,
  getSetById,
  type PokemonCard as CatalogueCard,
  type PokemonSet,
} from "@/services/pokemonTcgApi";
import { pokemonSets } from "@/data/pokemonSets";
import { withTimeout } from "@/utils/withTimeout";
import { useScannedCards } from "@/hooks/useScannedCards";
import { belongsToSet, cardNumber } from "@/lib/collection";

export default function SetDetail() {
  const { setId } = useParams<{ setId: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const collection = useScannedCards();
  const [set, setSet] = useState<PokemonSet | null>(null);
  const [cards, setCards] = useState<CatalogueCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retry, setRetry] = useState(0);
  const [showOwned, setShowOwned] = useState(false);
  const [logoFailed, setLogoFailed] = useState(false);
  const localSet = pokemonSets.find((candidate) => candidate.id === setId);
  const returnSearch =
    typeof location.state?.gallerySearch === "string"
      ? location.state.gallerySearch
      : "";
  const ownedCards = useMemo(
    () =>
      collection.cards.filter((card) =>
        belongsToSet(card, {
          id: setId ?? "",
          name: set?.name ?? localSet?.name ?? "",
        }),
      ),
    [collection.cards, setId, set?.name, localSet?.name],
  );
  const ownedQuantity = ownedCards.reduce(
    (sum, card) => sum + card.quantity,
    0,
  );
  const uniqueOwned = new Set(ownedCards.map((card) => cardNumber(card.number)))
    .size;
  const collectionReady = !collection.isLoading && !collection.error;

  useEffect(() => {
    const controller = new AbortController();
    const local = pokemonSets.find((candidate) => candidate.id === setId);
    const fallback: PokemonSet | null = local
      ? {
          id: local.id,
          name: local.name,
          series: local.series,
          printedTotal: local.totalCards,
          total: local.totalCards,
          releaseDate: local.releaseDate,
          images: {
            symbol: local.symbol || local.symbolUrl || "",
            logo: local.logo || local.logoUrl || "",
          },
          ptcgoCode: local.setCode,
        }
      : null;
    setLoading(true);
    setCards([]);
    setError(null);
    setSet(fallback);
    setShowOwned(false);
    setLogoFailed(false);
    const load = async () => {
      try {
        const [remote, result] = await Promise.all([
          withTimeout(
            (signal) => getSetById(setId!, signal),
            controller.signal,
          ).catch(() => fallback),
          withTimeout(
            (signal) => getCardsBySet(setId!, signal),
            controller.signal,
            40000,
          ),
        ]);
        if (controller.signal.aborted) return;
        setSet(remote ?? fallback);
        // Only a real, complete catalogue can establish which card numbers are missing.
        if (!result.data.length)
          setError("Kortlistan finns inte tillgänglig ännu.");
        else {
          setCards(result.data);
          if (!remote && !fallback)
            setSet({
              id: setId!,
              name: result.data[0].set.name,
              series: result.data[0].set.series,
              total: result.totalCount,
              printedTotal: result.totalCount,
              releaseDate: "",
              images: { logo: "", symbol: "" },
            });
        }
      } catch (cause) {
        if (!controller.signal.aborted)
          setError(
            cause instanceof Error
              ? cause.message
              : "Kortlistan kunde inte hämtas.",
          );
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };
    void load();
    return () => controller.abort();
  }, [setId, retry]);

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <main id="main-content" tabIndex={-1} className="page-shell space-y-8">
        <Link
          to={{
            pathname: "/gallery",
            search: returnSearch ? `?${returnSearch}` : "",
          }}
          className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Tillbaka till galleriet
        </Link>
        <header className="surface-panel relative overflow-hidden p-6 sm:p-8">
          <div
            aria-hidden="true"
            className="absolute -right-24 -top-28 h-80 w-80 rounded-full bg-primary/[0.05] blur-3xl"
          />
          <div className="relative flex flex-col gap-6 sm:flex-row sm:items-center sm:gap-7">
            <div className="relative flex h-24 w-32 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-border bg-muted/50 sm:h-28 sm:w-40">
              {set?.images.logo && !logoFailed ? (
                <img
                  src={set.images.logo}
                  alt=""
                  onError={() => setLogoFailed(true)}
                  className="max-h-[70%] max-w-[80%] object-contain"
                />
              ) : (
                <span
                  aria-hidden="true"
                  className="text-4xl font-bold tracking-[-0.07em] text-primary/40"
                >
                  {localSet?.setCode ?? set?.ptcgoCode ?? "SET"}
                </span>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="page-eyebrow">{set?.series || "Kortbibliotek"}</p>
              <h1 className="page-title">
                {set?.name || localSet?.name || "Setdetaljer"}
              </h1>
              <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-muted-foreground">
                {set?.releaseDate && (
                  <span className="inline-flex items-center gap-2">
                    <CalendarDays className="h-4 w-4" />
                    {new Date(set.releaseDate).toLocaleDateString("sv-SE")}
                  </span>
                )}
                {Boolean(set?.total ?? localSet?.totalCards) && (
                  <span className="inline-flex items-center gap-2">
                    <Layers3 className="h-4 w-4" />
                    {set?.total ?? localSet?.totalCards} kort i setet
                  </span>
                )}
              </div>
            </div>
            <Button
              asChild
              variant="outline"
              className="shrink-0 gap-2 self-start sm:self-center"
            >
              <Link to="/collection">
                Min samling
                <ArrowUpRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </header>

        <section
          className="grid grid-cols-2 gap-3 sm:gap-4"
          aria-label="Din samling i setet"
        >
          <div className="metric-card flex items-center gap-4 p-5">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <BookOpen className="h-4 w-4" />
            </span>
            <div>
              <p className="text-xs text-muted-foreground">
                Unika kort i samlingen
              </p>
              <p className="mt-1 text-2xl font-semibold tracking-tight">
                {collectionReady ? uniqueOwned : "–"}
              </p>
            </div>
          </div>
          <div className="metric-card flex items-center gap-4 p-5">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-muted text-muted-foreground">
              <Library className="h-4 w-4" />
            </span>
            <div>
              <p className="text-xs text-muted-foreground">Dina exemplar</p>
              <p className="mt-1 text-2xl font-semibold tracking-tight">
                {collectionReady ? ownedQuantity : "–"}
              </p>
            </div>
          </div>
        </section>

        {ownedCards.length > 0 && collectionReady && (
          <section className="space-y-4">
            <button
              type="button"
              onClick={() => setShowOwned((current) => !current)}
              aria-expanded={showOwned}
              aria-controls="owned-set-cards"
              className="flex w-full items-center justify-between gap-3 rounded-xl border border-border px-5 py-4 text-left transition-colors hover:bg-card"
            >
              <span className="flex items-center gap-3">
                <BookOpen className="h-4 w-4 text-primary" />
                <span className="text-sm font-semibold">Dina kort i setet</span>
                <span className="rounded-md bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                  {ownedCards.length}
                </span>
              </span>
              {showOwned ? (
                <ChevronUp className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              )}
            </button>
            {showOwned && (
              <div
                id="owned-set-cards"
                className="grid grid-cols-2 gap-4 md:grid-cols-3 2xl:grid-cols-4"
              >
                {ownedCards.map((card) => (
                  <PokemonCard
                    key={card.id}
                    id={card.id}
                    name={card.name}
                    image={card.image ?? ""}
                    type={card.type}
                    rarity={card.rarity}
                    set={card.set}
                    number={card.number}
                    quantity={card.quantity}
                    onClick={() => navigate(`/card/${card.id}`)}
                  />
                ))}
              </div>
            )}
          </section>
        )}

        {loading ? (
          <section
            className="surface-panel px-6 py-16 text-center"
            role="status"
          >
            <span className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </span>
            <h2 className="text-lg font-semibold">
              Hämtar setets kortlista...
            </h2>
            <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground">
              Snart kan du se hela setet och vilka kort som saknas i din
              samling.
            </p>
          </section>
        ) : error ? (
          <section className="surface-panel grid gap-6 p-6 sm:grid-cols-[auto_1fr] sm:p-8">
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl border border-primary/15 bg-primary/[0.06] text-primary">
              <WifiOff className="h-6 w-6" />
            </span>
            <div className="max-w-xl">
              <p className="page-eyebrow">Kortkatalog</p>
              <h2 role="alert" className="text-xl font-semibold tracking-tight">
                Kortlistan kunde inte hämtas
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                Vi får ingen komplett kortlista från katalogen just nu. Dina
                sparade kort finns kvar, och du kan fortsätta använda samlingen
                under tiden.
              </p>
              <div className="mt-5 flex flex-wrap gap-3">
                <Button
                  variant="outline"
                  className="gap-2"
                  onClick={() => setRetry((value) => value + 1)}
                >
                  <RefreshCw className="h-4 w-4" />
                  Försök igen
                </Button>
                <Button asChild variant="ghost">
                  <Link to="/collection">
                    Öppna samlingen
                    <ArrowUpRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </div>
          </section>
        ) : (
          set && <SetChecklist key={set.id} set={set} catalog={cards} />
        )}
      </main>
    </div>
  );
}
