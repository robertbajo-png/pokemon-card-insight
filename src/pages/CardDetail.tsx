import { Link, useParams, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  ArrowLeft,
  ArrowRight,
  ChevronDown,
  ChevronRight,
  CircleAlert,
  Library,
  Loader2,
  RefreshCw,
  Star,
  Swords,
  TrendingUp,
} from "lucide-react";
import Navigation from "@/components/Navigation";
import {
  getCardById,
  type PokemonCard as PokemonCardType,
} from "@/services/pokemonTcgApi";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/contexts/LanguageContext";
import { convertPriceValue } from "@/utils/currency";
import { withTimeout } from "@/utils/withTimeout";
import ScannedCardDetail from "@/components/ScannedCardDetail";

const ApiCardDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [card, setCard] = useState<PokemonCardType | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retry, setRetry] = useState(0);
  const { currency, setCurrency } = useLanguage();
  useEffect(() => {
    if (!id) {
      setIsLoading(false);
      setError("Kortets adress saknas.");
      return;
    }
    const controller = new AbortController();
    setIsLoading(true);
    setCard(null);
    setError(null);
    withTimeout((signal) => getCardById(id, signal), controller.signal, 20000)
      .then((data) => {
        if (controller.signal.aborted) return;
        if (data) setCard(data);
        else {
          toast.error("Kort hittades inte");
          navigate("/gallery");
        }
      })
      .catch((cause) => {
        if (!controller.signal.aborted) {
          console.error(cause);
          setError(
            "Vi kunde inte hämta kortet från katalogen. Försök igen om en stund.",
          );
          toast.error("Kunde inte ladda kort");
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setIsLoading(false);
      });
    return () => controller.abort();
  }, [id, navigate, retry]);
  const marketValue = card?.cardmarket?.prices?.trendPrice
    ? convertPriceValue(card.cardmarket.prices.trendPrice * 11, currency)
    : "Pris ej tillgängligt";
  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <main id="main-content" tabIndex={-1} className="page-shell space-y-7">
        <Link
          to="/gallery"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Tillbaka till galleri
        </Link>
        {isLoading ? (
          <section
            className="surface-panel flex min-h-80 items-center justify-center gap-3"
            role="status"
          >
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
            Hämtar kortet...
          </section>
        ) : error ? (
          <section className="surface-panel p-8 sm:p-12">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-muted text-primary">
              <CircleAlert className="h-6 w-6" />
            </span>
            <h1 className="mt-5 text-2xl font-semibold">
              Kortkatalogen tar en paus.
            </h1>
            <p
              role="alert"
              className="mt-3 max-w-lg text-sm leading-relaxed text-muted-foreground"
            >
              {error}
            </p>
            <Button
              onClick={() => setRetry((value) => value + 1)}
              variant="outline"
              className="mt-6 gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              Försök igen
            </Button>
          </section>
        ) : card ? (
          <>
            <header>
              <p className="page-eyebrow">Ur kortkatalogen</p>
              <h1 className="page-title break-words">{card.name}</h1>
              <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                <span>{card.set.name}</span>
                <ChevronRight className="h-3 w-3" />
                <span>#{card.number}</span>
                {card.types?.map((type) => (
                  <span
                    key={type}
                    className="ml-1 rounded-full border border-primary/20 bg-primary/5 px-2.5 py-1 text-xs font-medium text-primary"
                  >
                    {type}
                  </span>
                ))}
              </div>
            </header>
            <div className="grid items-start gap-6 lg:grid-cols-[0.95fr_1.15fr]">
              <div className="space-y-4 lg:sticky lg:top-28">
                <section className="surface-panel overflow-hidden">
                  <div className="flex min-h-80 items-center justify-center bg-muted/20 px-7 py-8 sm:px-10 sm:py-10">
                    <img
                      src={card.images.large || card.images.small}
                      alt={card.name}
                      className="max-h-[560px] max-w-full rounded-xl object-contain shadow-2xl"
                    />
                  </div>
                  <div className="flex items-center gap-2 border-t border-border px-5 py-4 text-xs font-medium">
                    <Star className="h-4 w-4 text-primary" />
                    {card.rarity || "Sällsynthet ej angiven"}
                  </div>
                </section>
                <Button asChild variant="outline" className="w-full gap-2">
                  <Link to={card.set.id ? "/set/" + card.set.id : "/gallery"}>
                    Visa setet
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              </div>
              <div className="space-y-5">
                <section className="surface-panel p-6 sm:p-7">
                  <h2 className="section-heading">Kortets detaljer</h2>
                  <dl className="mt-6 grid grid-cols-2 gap-x-6 gap-y-5">
                    {[
                      ["HP", card.hp ?? "—"],
                      ["Sällsynthet", card.rarity ?? "Ej angivet"],
                      [
                        "Svaghet",
                        card.weaknesses
                          ?.map((value) => value.type + " " + value.value)
                          .join(", ") || "—",
                      ],
                      [
                        "Motstånd",
                        card.resistances
                          ?.map((value) => value.type + " " + value.value)
                          .join(", ") || "—",
                      ],
                      [
                        "Reträttskostnad",
                        card.retreatCost
                          ? card.retreatCost.length + " energi"
                          : "—",
                      ],
                      ["Set", card.set.name],
                    ].map(([label, value]) => (
                      <div key={label} className="min-w-0">
                        <dt className="text-xs text-muted-foreground">
                          {label}
                        </dt>
                        <dd className="mt-2 break-words text-sm font-medium">
                          {value}
                        </dd>
                      </div>
                    ))}
                  </dl>
                </section>
                {card.attacks && card.attacks.length > 0 && (
                  <section className="surface-panel p-6 sm:p-7">
                    <h2 className="section-heading flex items-center gap-2">
                      <Swords className="h-4 w-4 text-primary" />
                      Attacker
                    </h2>
                    <div className="mt-5 divide-y divide-border">
                      {card.attacks.map((attack, index) => (
                        <div key={index} className="py-4 first:pt-0 last:pb-0">
                          <div className="flex items-start justify-between gap-4">
                            <h3 className="font-semibold">{attack.name}</h3>
                            <span className="text-lg font-semibold tabular-nums text-primary">
                              {attack.damage || "—"}
                            </span>
                          </div>
                          <p className="mt-2 text-xs text-muted-foreground">
                            {attack.cost.join(" · ")}
                          </p>
                          {attack.text && (
                            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                              {attack.text}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </section>
                )}
                {card.flavorText && (
                  <section className="surface-panel p-6 sm:p-7">
                    <h2 className="section-heading">
                      Berättelsen bakom kortet
                    </h2>
                    <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
                      {card.flavorText}
                    </p>
                  </section>
                )}
                <section className="surface-panel p-6 sm:p-7">
                  <div className="flex items-center justify-between gap-3">
                    <h2 className="section-heading flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-primary" />
                      Marknadsvärde
                    </h2>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-2"
                          aria-label={"Valuta: " + currency}
                        >
                          {currency}
                          <ChevronDown className="h-3.5 w-3.5" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-40 p-2" align="end">
                        {(
                          [
                            ["SEK", "SEK (kr)"],
                            ["USD", "USD ($)"],
                            ["EUR", "EUR (€)"],
                            ["JPY", "JPY (¥)"],
                          ] as const
                        ).map(([value, label]) => (
                          <button
                            key={value}
                            onClick={() => setCurrency(value)}
                            className={cn(
                              "w-full rounded-lg px-3 py-2 text-left text-sm font-medium",
                              currency === value
                                ? "bg-primary text-primary-foreground"
                                : "text-foreground hover:bg-muted",
                            )}
                          >
                            {label}
                          </button>
                        ))}
                      </PopoverContent>
                    </Popover>
                  </div>
                  <p className="mt-5 text-2xl font-semibold tracking-tight text-primary">
                    {marketValue}
                  </p>
                  {card.cardmarket?.prices && (
                    <dl className="mt-5 space-y-3 border-t border-border pt-5">
                      {card.cardmarket.prices.averageSellPrice !==
                        undefined && (
                        <div className="flex flex-wrap justify-between gap-2 text-sm">
                          <dt className="text-muted-foreground">
                            Genomsnittspris
                          </dt>
                          <dd className="font-medium">
                            {convertPriceValue(
                              card.cardmarket.prices.averageSellPrice * 11,
                              currency,
                            )}
                          </dd>
                        </div>
                      )}
                      {card.cardmarket.prices.trendPrice !== undefined && (
                        <div className="flex flex-wrap justify-between gap-2 text-sm">
                          <dt className="text-muted-foreground">Trendpris</dt>
                          <dd className="font-medium">
                            {convertPriceValue(
                              card.cardmarket.prices.trendPrice * 11,
                              currency,
                            )}
                          </dd>
                        </div>
                      )}
                    </dl>
                  )}
                  <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
                    Katalogpriset är vägledande. Skick, språk och edition kan
                    påverka värdet.
                  </p>
                </section>
                <div className="flex items-start gap-3 px-1 text-sm text-muted-foreground">
                  <Library className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  <p>
                    Äger du kortet? Öppna setet och lägg till ditt exemplar i
                    checklistan.
                  </p>
                </div>
              </div>
            </div>
          </>
        ) : null}
      </main>
    </div>
  );
};
const CardDetail = () => {
  const { id } = useParams();
  return id?.startsWith("card-") ? (
    <ScannedCardDetail id={id} />
  ) : (
    <ApiCardDetail />
  );
};
export default CardDetail;
