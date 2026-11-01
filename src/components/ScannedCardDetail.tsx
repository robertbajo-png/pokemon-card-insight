import { useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowLeft,
  CalendarDays,
  ChevronRight,
  FileText,
  ImageOff,
  Layers,
  Loader2,
  MapPin,
  Pencil,
  Sparkles,
  Swords,
} from "lucide-react";
import Navigation from "@/components/Navigation";
import { useScannedCards } from "@/hooks/useScannedCards";
import { useLanguage } from "@/contexts/LanguageContext";
import { convertPriceRange } from "@/utils/currency";
import CollectionCardEditor from "./CollectionCardEditor";
import { Button } from "./ui/button";

export default function ScannedCardDetail({ id }: { id: string }) {
  const { cards, isLoading, error } = useScannedCards();
  const [grade, setGrade] = useState("ungraded");
  const [editing, setEditing] = useState(false);
  const { currency } = useLanguage();
  const card = cards.find((candidate) => candidate.id === id);
  const price =
    card?.priceByGrade?.[grade] ??
    (grade === "ungraded" ? card?.estimatedValue : undefined);
  const languageNames: Record<string, string> = {
    en: "Engelska",
    ja: "Japanska",
    sv: "Svenska",
    de: "Tyska",
    fr: "Franska",
    it: "Italienska",
    es: "Spanska",
    ko: "Koreanska",
    zh: "Kinesiska",
    other: "Annat",
  };
  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <main className="page-shell space-y-7">
        <Link
          className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
          to="/collection"
        >
          <ArrowLeft className="h-4 w-4" />
          Tillbaka till samlingen
        </Link>
        {isLoading ? (
          <section
            className="surface-panel flex min-h-72 items-center justify-center gap-3 p-8"
            role="status"
          >
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
            Laddar kort...
          </section>
        ) : error ? (
          <section className="surface-panel p-8">
            <h1 className="text-2xl font-semibold">
              Kortet kunde inte öppnas.
            </h1>
            <p role="alert" className="mt-3 text-sm text-muted-foreground">
              {error}
            </p>
          </section>
        ) : !card ? (
          <section className="surface-panel p-8 sm:p-12">
            <ImageOff className="h-8 w-8 text-muted-foreground" />
            <h1 className="mt-5 text-2xl font-semibold">Här var det tomt.</h1>
            <p
              role="alert"
              className="mt-3 max-w-lg text-sm leading-relaxed text-muted-foreground"
            >
              Kortet finns inte i den aktuella samlingen. Kontrollera att du är
              inloggad på rätt konto.
            </p>
            <Button asChild variant="outline" className="mt-6">
              <Link to="/collection">Öppna samlingen</Link>
            </Button>
          </section>
        ) : (
          <>
            <header className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
              <div className="min-w-0">
                <p className="page-eyebrow">Ur din samling</p>
                <h1 className="page-title break-words">{card.name}</h1>
                <p className="mt-3 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                  <span>{card.set}</span>
                  <ChevronRight className="h-3 w-3" />
                  <span>#{card.number}</span>
                </p>
              </div>
              <Button
                variant="outline"
                className="gap-2 self-start"
                onClick={() => setEditing(true)}
              >
                <Pencil className="h-4 w-4" />
                Redigera kort
              </Button>
            </header>
            <div className="grid items-start gap-6 lg:grid-cols-[0.95fr_1.15fr]">
              <div className="space-y-4 lg:sticky lg:top-28">
                <section className="surface-panel overflow-hidden">
                  <div className="flex min-h-80 items-center justify-center bg-muted/20 px-7 py-8 sm:px-10 sm:py-10">
                    {card.image ? (
                      <img
                        src={card.image}
                        alt={card.name}
                        className="max-h-[560px] max-w-full rounded-xl object-contain shadow-2xl"
                      />
                    ) : (
                      <div className="flex aspect-[3/4] w-full max-w-64 flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card text-muted-foreground">
                        <ImageOff className="mb-4 h-8 w-8" />
                        <p className="text-sm">Ingen bild tillgänglig</p>
                      </div>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-5 py-4">
                    <span className="inline-flex items-center gap-2 text-xs font-medium">
                      <Layers className="h-4 w-4 text-primary" />
                      {card.quantity ?? 1} exemplar
                    </span>
                    {card.scannedAt && (
                      <span className="inline-flex items-center gap-2 text-xs text-muted-foreground">
                        <CalendarDays className="h-3.5 w-3.5" />
                        {new Date(card.scannedAt).toLocaleDateString("sv-SE")}
                      </span>
                    )}
                  </div>
                </section>
                {card.location && (
                  <div className="surface-panel flex items-start gap-3 p-5">
                    <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    <div className="min-w-0">
                      <p className="text-xs text-muted-foreground">
                        Förvaringsplats
                      </p>
                      <p className="mt-1 break-words text-sm font-medium">
                        {card.location}
                      </p>
                    </div>
                  </div>
                )}
              </div>
              <div className="space-y-5">
                <section className="surface-panel p-6 sm:p-7">
                  <h2 className="section-heading">Kortets detaljer</h2>
                  <dl className="mt-6 grid grid-cols-2 gap-x-6 gap-y-5">
                    {[
                      ["Typ", card.type],
                      ["Sällsynthet", card.rarity],
                      ["HP", card.hp ?? "—"],
                      ["Skick", card.condition || "Ej angivet"],
                      [
                        "Språk",
                        languageNames[card.language ?? "en"] ?? card.language,
                      ],
                      ["Variant", card.variant ?? "normal"],
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
                  {card.description && (
                    <p className="mt-6 border-t border-border pt-5 text-sm leading-relaxed text-muted-foreground">
                      {card.description}
                    </p>
                  )}
                </section>
                {card.attacks.length > 0 && (
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
                            {attack.damage && (
                              <span className="text-lg font-semibold tabular-nums text-primary">
                                {attack.damage}
                              </span>
                            )}
                          </div>
                          {attack.cost.length > 0 && (
                            <p className="mt-2 text-xs text-muted-foreground">
                              {attack.cost.join(" · ")}
                            </p>
                          )}
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
                {card.notes && (
                  <section className="surface-panel p-6 sm:p-7">
                    <h2 className="section-heading flex items-center gap-2">
                      <FileText className="h-4 w-4 text-primary" />
                      Dina anteckningar
                    </h2>
                    <p className="mt-4 whitespace-pre-wrap break-words text-sm leading-relaxed text-muted-foreground">
                      {card.notes}
                    </p>
                  </section>
                )}
                <section className="surface-panel p-6 sm:p-7">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-primary" />
                    <h2 className="section-heading">Uppskattat värde</h2>
                  </div>
                  <p className="mt-4 text-2xl font-semibold tracking-tight text-primary">
                    {price ? convertPriceRange(price, currency) : "Pris saknas"}
                  </p>
                  <label
                    className="mt-6 block text-xs font-medium text-muted-foreground"
                    htmlFor="scanned-card-grade"
                  >
                    Gradering
                  </label>
                  <select
                    id="scanned-card-grade"
                    value={grade}
                    onChange={(event) => setGrade(event.target.value)}
                    className="mt-2 block h-11 w-full rounded-xl border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  >
                    <option value="ungraded">Ograderat</option>
                    {Array.from({ length: 10 }, (_, index) => (
                      <option key={index} value={"psa" + (index + 1)}>
                        PSA {index + 1}
                      </option>
                    ))}
                  </select>
                  <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
                    Värdet är ett förslag från analysen. Valet ovan visar en
                    prisuppskattning och innebär inte att kortet är graderat.
                  </p>
                </section>
              </div>
            </div>
          </>
        )}
        {card && (
          <CollectionCardEditor
            key={card.id}
            card={card}
            open={editing}
            onOpenChange={setEditing}
          />
        )}
      </main>
    </div>
  );
}
