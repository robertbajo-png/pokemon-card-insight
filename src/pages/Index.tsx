import { Link } from "react-router-dom";
import {
  ArrowRight,
  ArrowUpRight,
  ScanLine,
  Library,
  Layers3,
  Plus,
  Sparkles,
  ShieldCheck,
  BookOpen,
  Camera,
} from "lucide-react";
import Navigation from "@/components/Navigation";
import { Button } from "@/components/ui/button";
import { useScannedCards } from "@/hooks/useScannedCards";
import { pokemonSets } from "@/data/pokemonSets";
import { cardNumber, resolveSetId } from "@/lib/collection";
import charizard from "@/assets/charizard-base-set.jpg";

export default function Index() {
  const { cards, isLoading, error } = useScannedCards();
  const copies = cards.reduce((sum, card) => sum + card.quantity, 0);
  const unique = new Set(
    cards.map(
      (card) =>
        (resolveSetId(card) ?? card.set) + ":" + cardNumber(card.number),
    ),
  ).size;
  const sets = new Set(
    cards
      .map((card) => resolveSetId(card) ?? card.set)
      .filter((set) => set && set.toLowerCase() !== "unknown"),
  ).size;
  const recent = [...cards]
    .sort((a, b) => b.scannedAt.localeCompare(a.scannedAt))
    .slice(0, 4);
  const featured = pokemonSets
    .filter((set) => ["base1", "sv3pt5", "sv8"].includes(set.id))
    .slice(0, 3);
  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <main id="main-content" tabIndex={-1} className="page-shell space-y-8">
        <header className="flex flex-wrap items-end justify-between gap-5">
          <div>
            <p className="page-eyebrow">Din samlarplats</p>
            <h1 className="page-title">En samling av favoriter.</h1>
            <p className="page-subtitle">
              Från första kortet till nästa stora upptäckt. Allt på ett ställe.
            </p>
          </div>
          <Link
            to="/collection"
            className="inline-flex items-center gap-2 text-xs font-bold text-muted-foreground transition-colors hover:text-primary"
          >
            Till din samling
            <ArrowUpRight className="h-4 w-4" />
          </Link>
        </header>

        <section
          className="collection-hero"
          aria-labelledby="collector-hero-heading"
        >
          <div className="collection-hero-copy">
            <span className="mb-5 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1.5 text-[9px] font-bold tracking-wide text-primary">
              <Sparkles className="h-3 w-3" />
              För dig som samlar
            </span>
            <h2 id="collector-hero-heading" className="collection-hero-title">
              Varje kort har
              <br />
              en <em>historia.</em>
            </h2>
            <p className="mt-5 max-w-[31ch] text-xs leading-6 text-muted-foreground">
              Fånga kortet med kameran, upptäck detaljerna och ge det en plats i
              din samling.
            </p>
            <div className="mt-7 flex flex-wrap items-center gap-3">
              <Button asChild variant="hero">
                <Link to="/scanner">
                  <ScanLine className="h-4 w-4" />
                  Skanna ett kort
                  <ArrowUpRight className="ml-2 h-3.5 w-3.5" />
                </Link>
              </Button>
              <Button asChild variant="outline">
                <Link to="/gallery">Utforska set</Link>
              </Button>
            </div>
          </div>
          <div className="collection-hero-art">
            <div className="hero-orbit" aria-hidden="true" />
            <img
              src="/design/blastoise-base-set.png"
              alt=""
              aria-hidden="true"
              className="hero-card hero-card--left"
              onError={(event) => {
                event.currentTarget.style.visibility = "hidden";
              }}
            />
            <img
              src="/design/pikachu-base-set.png"
              alt=""
              aria-hidden="true"
              className="hero-card hero-card--right"
              onError={(event) => {
                event.currentTarget.style.visibility = "hidden";
              }}
            />
            <img
              src={charizard}
              alt="Charizard från Base Set, ett katalogexempel"
              className="hero-card hero-card--main"
            />
            <p className="hero-art-caption">Katalogexempel · Base Set, 1999</p>
          </div>
        </section>

        <section
          className="grid grid-cols-3 gap-3 sm:gap-4"
          aria-label="Din samling i siffror"
        >
          {[
            {
              label: "Exemplar",
              value: copies,
              detail: "kort i din samling",
              icon: Library,
            },
            {
              label: "Unika kort",
              value: unique,
              detail: "olika kortnummer",
              icon: BookOpen,
            },
            {
              label: "Set",
              value: sets,
              detail: "i din samling",
              icon: Layers3,
            },
          ].map(({ label, value, detail, icon: Icon }) => (
            <div key={label} className="metric-card min-w-0">
              <div className="mb-4 flex items-center justify-between gap-2">
                <p className="text-[10px] font-semibold text-muted-foreground sm:text-xs">
                  {label}
                </p>
                <Icon
                  className="hidden h-4 w-4 text-muted-foreground/60 sm:block"
                  strokeWidth={1.6}
                />
              </div>
              <p className="text-3xl font-bold tracking-[-0.06em] sm:text-4xl">
                {isLoading ? "—" : value.toLocaleString("sv-SE")}
              </p>
              <p className="mt-2 hidden text-[10px] text-muted-foreground sm:block">
                {detail}
              </p>
            </div>
          ))}
        </section>

        <section aria-labelledby="latest-cards-heading">
          <div className="mb-5 flex items-end justify-between gap-4">
            <div>
              <p className="page-eyebrow mb-1.5">Dina upptäckter</p>
              <h2 id="latest-cards-heading" className="section-heading">
                Senast i samlingen
              </h2>
            </div>
            <Link
              to="/collection"
              className="inline-flex items-center gap-1.5 text-[11px] font-bold text-muted-foreground hover:text-primary"
            >
              Visa samlingen
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          {error ? (
            <div className="surface-panel p-6">
              <p role="alert" className="text-sm text-destructive">
                {error}
              </p>
              <Link
                to="/collection"
                className="mt-3 inline-block text-xs font-bold text-primary"
              >
                Öppna samlingen
              </Link>
            </div>
          ) : isLoading ? (
            <div
              className="surface-panel p-10 text-sm text-muted-foreground"
              role="status"
            >
              Hämtar din samling…
            </div>
          ) : recent.length ? (
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              {recent.map((card) => (
                <Link
                  to={"/card/" + card.id}
                  key={card.id}
                  className="group surface-panel overflow-hidden p-3 transition-transform duration-200 hover:-translate-y-1"
                >
                  <div className="relative flex aspect-[3/4] items-center justify-center overflow-hidden rounded-xl bg-muted/40 p-3">
                    {card.image ? (
                      <img
                        src={card.image}
                        alt={card.name}
                        className="h-full w-full object-contain transition-transform duration-300 group-hover:scale-[1.025]"
                        loading="lazy"
                      />
                    ) : (
                      <ScanLine className="h-12 w-12 text-muted-foreground/25" />
                    )}
                    <span className="absolute right-2 top-2 rounded-full border border-border bg-card/90 px-2 py-1 text-[9px] font-bold">
                      {card.quantity} st
                    </span>
                  </div>
                  <div className="px-1 pb-1 pt-4">
                    <p className="truncate text-[10px] text-muted-foreground">
                      {card.set} · #{card.number}
                    </p>
                    <h3 className="mt-1 truncate text-sm font-bold">
                      {card.name}
                    </h3>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="surface-panel flex flex-col items-center gap-6 p-8 text-center sm:flex-row sm:p-9 sm:text-left">
              <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl border border-primary/15 bg-primary/5">
                <Library
                  className="h-8 w-8 text-primary/65"
                  strokeWidth={1.3}
                />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold tracking-tight">
                  Din samling börjar med ett kort.
                </h3>
                <p className="mt-2 max-w-md text-xs leading-6 text-muted-foreground">
                  Lägg till en gammal favorit eller något du precis har hittat.
                  Vi hjälper dig att hålla ordning på resten.
                </p>
              </div>
              <Button asChild variant="outline">
                <Link to="/collection">
                  <Plus className="h-4 w-4" />
                  Lägg till kort
                </Link>
              </Button>
            </div>
          )}
        </section>

        <section aria-labelledby="explore-sets-heading">
          <div className="mb-5 flex items-end justify-between gap-4">
            <div>
              <p className="page-eyebrow mb-1.5">Nostalgi & nya favoriter</p>
              <h2 id="explore-sets-heading" className="section-heading">
                Hitta ditt nästa set
              </h2>
            </div>
            <Link
              to="/gallery"
              className="inline-flex items-center gap-1.5 text-[11px] font-bold text-muted-foreground hover:text-primary"
            >
              Alla {pokemonSets.length} set
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            {featured.map((set, index) => (
              <Link
                key={set.id}
                to={"/set/" + set.id}
                className="group surface-panel flex items-center gap-4 p-5 transition-colors hover:border-primary/30"
              >
                <div
                  className={
                    "flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border text-lg font-extrabold tracking-tighter " +
                    (index === 0
                      ? "border-primary/20 bg-primary/10 text-primary"
                      : index === 1
                        ? "border-emerald-500/15 bg-emerald-500/5 text-emerald-600 dark:text-emerald-300"
                        : "border-sky-500/15 bg-sky-500/5 text-sky-600 dark:text-sky-300")
                  }
                >
                  {set.setCode}
                </div>
                <div className="min-w-0">
                  <p className="text-[9px] text-muted-foreground">
                    {set.series}
                  </p>
                  <h3 className="mt-1 truncate text-xs font-bold">
                    {set.name}
                  </h3>
                  <p className="mt-1 text-[9px] text-muted-foreground">
                    {set.totalCards} kort
                  </p>
                </div>
                <ArrowUpRight className="ml-auto h-4 w-4 shrink-0 text-muted-foreground transition-colors group-hover:text-primary" />
              </Link>
            ))}
          </div>
        </section>
        <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-5 text-[9px] text-muted-foreground">
          <span>Card Lens · För korten du vill behålla.</span>
          <span className="inline-flex items-center gap-1.5">
            <Camera className="h-3 w-3" />
            Skanna
            <ChevronDot />
            Upptäck
            <ChevronDot />
            Samla
            <ShieldCheck className="ml-2 h-3 w-3" />
          </span>
        </footer>
      </main>
    </div>
  );
}
function ChevronDot() {
  return (
    <span
      aria-hidden="true"
      className="mx-1 h-0.5 w-0.5 rounded-full bg-muted-foreground/50"
    />
  );
}
