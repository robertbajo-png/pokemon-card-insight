import { Link } from "react-router-dom";
import { useMemo, useRef, useState, type ChangeEvent } from "react";
import { toast } from "sonner";
import {
  Download,
  Upload,
  Plus,
  Pencil,
  Trash2,
  Search,
  Library,
  ArrowUpRight,
  Scan,
  Layers3,
  Copy,
  MapPin,
  ImageOff,
  SlidersHorizontal,
  AlertTriangle,
  RefreshCw,
  ArrowRight,
} from "lucide-react";
import Navigation from "@/components/Navigation";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import CollectionCardEditor from "@/components/CollectionCardEditor";
import CollectionSyncStatus from "@/components/CollectionSyncStatus";
import { useScannedCards } from "@/hooks/useScannedCards";
import { useLanguage } from "@/contexts/LanguageContext";
import { convertPriceRange } from "@/utils/currency";
import {
  cardNumber,
  localSetProgress,
  normalize,
  parseCollectionBackup,
  resolveSetId,
} from "@/lib/collection";
import { pokemonSets } from "@/data/pokemonSets";
import type { ScannedCard } from "@/lib/cardAnalysis";
import { isLocalHosting } from "@/lib/hosting";

function CardVersion({
  card,
  deleted,
}: {
  card: ScannedCard;
  deleted: boolean;
}) {
  return (
    <div className="space-y-2 text-sm leading-relaxed">
      {deleted ? (
        <p>Kortet är borttaget.</p>
      ) : (
        <>
          <p className="font-semibold text-foreground">
            {card.name} · {card.set} #{card.number}
          </p>
          <p className="text-muted-foreground">
            {card.quantity} exemplar · {card.language} · {card.variant}
          </p>
          <p className="text-muted-foreground">
            Skick: {card.condition || "Inte angivet"}
          </p>
          <p className="text-muted-foreground">
            Plats: {card.location || "Inte angiven"}
          </p>
          {card.notes && (
            <p className="whitespace-pre-wrap break-words">{card.notes}</p>
          )}
        </>
      )}
    </div>
  );
}

function CollectionContent() {
  const {
    cards,
    isLoading,
    error,
    owner,
    removeCard,
    clearCards,
    importCards,
    conflicts,
    resolve,
  } = useScannedCards();
  const { currency } = useLanguage();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [editor, setEditor] = useState<{ card?: ScannedCard } | null>(null);
  const [deleting, setDeleting] = useState<ScannedCard | "all" | null>(null);
  const [busy, setBusy] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const copies = cards.reduce((sum, card) => sum + card.quantity, 0);
  const unique = new Set(
    cards.map(
      (card) =>
        `${resolveSetId(card) ?? normalize(card.set)}:${cardNumber(card.number)}`,
    ),
  ).size;
  const visible = useMemo(
    () =>
      cards.filter(
        (card) =>
          (filter !== "duplicates" || card.quantity > 1) &&
          normalize(
            `${card.name} ${card.set} ${card.number} ${card.location}`,
          ).includes(normalize(query)),
      ),
    [cards, filter, query],
  );
  const sets = useMemo(
    () =>
      pokemonSets
        .map((set) => ({ ...set, owned: localSetProgress(cards, set) }))
        .filter((set) => set.owned > 0)
        .sort((a, b) => b.owned - a.owned),
    [cards],
  );
  const download = () => {
    const blob = new Blob(
      [
        JSON.stringify(
          { version: 1, exportedAt: new Date().toISOString(), cards },
          null,
          2,
        ),
      ],
      { type: "application/json" },
    );
    const url = URL.createObjectURL(blob),
      anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `pokemon-samling-${new Date().toISOString().slice(0, 10)}.json`;
    anchor.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  const upload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setBusy(true);
    try {
      if (file.size > 100 * 1024 * 1024)
        throw new Error("Säkerhetskopian får vara högst 100 MB.");
      const backup = parseCollectionBackup(await file.text());
      await importCards(backup);
      toast.success(
        "Säkerhetskopian har importerats. Befintliga poster behålls.",
      );
    } catch (cause) {
      toast.error(
        cause instanceof Error
          ? cause.message
          : "Kunde inte importera säkerhetskopian.",
      );
    } finally {
      setBusy(false);
    }
  };
  const confirmDelete = async () => {
    if (!deleting || busy) return;
    setBusy(true);
    try {
      if (deleting === "all") await clearCards();
      else await removeCard(deleting.id);
      setDeleting(null);
      toast.success("Samlingen är uppdaterad.");
    } catch (cause) {
      toast.error(
        cause instanceof Error ? cause.message : "Kunde inte ta bort kortet.",
      );
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <main
        id="main-content"
        tabIndex={-1}
        className="page-shell space-y-7 sm:space-y-9"
      >
        <header className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-xl">
            <p className="page-eyebrow">Dina kort, på ditt sätt</p>
            <h1 className="page-title">Min samling</h1>
            <p className="page-subtitle">
              Från första fyndet till ett komplett set. Här har varje kort sin
              plats.
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap gap-2.5">
            <Button asChild variant="outline" className="flex-1 sm:flex-none">
              <Link to="/scanner">
                <Scan className="w-4 h-4 mr-2" />
                Skanna
              </Link>
            </Button>
            <Button
              className="flex-1 sm:flex-none"
              disabled={isLoading}
              onClick={() => setEditor({})}
            >
              <Plus className="w-4 h-4 mr-2" />
              Lägg till kort
            </Button>
          </div>
        </header>
        <CollectionSyncStatus />
        {conflicts?.map((row) => (
          <section
            key={row.key}
            className="surface-panel space-y-5 border-primary/30 bg-primary/[0.04] p-5 sm:p-6"
            aria-label={`Konflikt: ${row.card.name}`}
          >
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <h2 className="section-heading">
                  {row.card.name} har ändrats i två sessioner
                </h2>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                  Båda versionerna finns kvar tills du väljer vilken som ska
                  användas.
                </p>
              </div>
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="rounded-2xl border border-border/70 bg-background/60 p-4">
                <h3 className="mb-3 text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                  Denna enhet
                </h3>
                <CardVersion card={row.card} deleted={row.deleted} />
              </div>
              <div className="rounded-2xl border border-border/70 bg-background/60 p-4">
                <h3 className="mb-3 text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                  {isLocalHosting ? "Din lokala server" : "Molnet"}
                </h3>
                <CardVersion
                  card={row.conflict!.card}
                  deleted={row.conflict!.deleted}
                />
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {(
                [
                  ["local", "Behåll denna enhet"],
                  [
                    "cloud",
                    isLocalHosting
                      ? "Använd serverversionen"
                      : "Använd molnversionen",
                  ],
                ] as const
              ).map(([choice, label]) => (
                <Button
                  key={choice}
                  size="sm"
                  variant={choice === "local" ? "default" : "outline"}
                  onClick={async () => {
                    try {
                      await resolve(row.card.id, choice);
                    } catch {
                      toast.error("Kunde inte spara ditt val.");
                    }
                  }}
                >
                  {label}
                </Button>
              ))}
            </div>
          </section>
        ))}
        <section
          aria-label="Samlingsöversikt"
          className="grid grid-cols-3 gap-2.5 sm:gap-4"
        >
          {[
            {
              label: "Exemplar",
              value: copies,
              icon: Layers3,
              detail: "Kort i din samling",
            },
            {
              label: "Unika kort",
              value: unique,
              icon: Library,
              detail: "Olika kortnummer",
            },
            {
              label: "Extra exemplar",
              value: copies - unique,
              icon: Copy,
              detail: "Utöver det första",
            },
          ].map(({ label, value, icon: Icon, detail }) => (
            <div key={label} className="metric-card min-w-0">
              <div className="mb-4 flex items-center justify-between gap-2">
                <p className="text-[11px] font-medium text-muted-foreground sm:text-sm">
                  {label}
                </p>
                <Icon className="hidden h-4 w-4 shrink-0 text-primary/75 sm:block" />
              </div>
              <p className="text-3xl font-semibold tracking-tight tabular-nums sm:text-4xl">
                {value}
              </p>
              <p className="mt-2 hidden text-xs text-muted-foreground sm:block">
                {detail}
              </p>
            </div>
          ))}
        </section>
        {sets.length > 0 && (
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="section-heading">Färdigställ dina set</h2>
              <Link
                to="/gallery"
                className="inline-flex items-center gap-1 text-sm font-medium text-primary transition-colors hover:text-primary/80"
              >
                Alla set
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
            <div className="flex gap-3 overflow-x-auto pb-2">
              {sets.map((set) => (
                <Link
                  key={set.id}
                  to={`/set/${set.id}`}
                  className="group min-w-56 shrink-0 rounded-2xl border border-border/70 bg-card p-5 transition-colors hover:border-primary/50 hover:bg-muted/20"
                >
                  <div className="mb-4 flex items-center justify-between">
                    <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <Library className="h-4 w-4" />
                    </span>
                    <ArrowUpRight className="h-4 w-4 text-muted-foreground transition-colors group-hover:text-primary" />
                  </div>
                  <p className="font-semibold text-sm">{set.name}</p>
                  <p className="mt-2 text-xs text-muted-foreground">
                    {set.owned} unika registrerade · Se saknade{" "}
                    <ArrowUpRight className="inline w-3 h-3" />
                  </p>
                </Link>
              ))}
            </div>
          </section>
        )}
        <section
          className="surface-panel space-y-4 p-4 sm:p-5"
          aria-label="Sök och hantera samlingen"
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="section-heading">Dina kort</h2>
              <p className="mt-1 text-xs text-muted-foreground">
                {visible.length} av {cards.length} kortposter
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="ghost"
                disabled={isLoading || !cards.length}
                onClick={download}
              >
                <Download className="mr-2 h-4 w-4" />
                Exportera
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={busy || isLoading}
                onClick={() => fileInput.current?.click()}
              >
                <Upload className="mr-2 h-4 w-4" />
                Importera
              </Button>
            </div>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative min-w-0 flex-1">
              <Search className="pointer-events-none absolute left-3.5 top-3.5 h-4 w-4 text-muted-foreground" />
              <Input
                aria-label="Sök i samlingen"
                placeholder="Sök kort, set, nummer eller plats..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="h-11 rounded-xl bg-background/60 pl-10"
              />
            </div>
            <div className="relative shrink-0">
              <SlidersHorizontal className="pointer-events-none absolute left-3.5 top-3.5 h-4 w-4 text-muted-foreground" />
              <select
                aria-label="Visa kort"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className="h-11 w-full rounded-xl border border-input bg-background/60 pr-8 pl-10 text-sm sm:min-w-48"
              >
                <option value="all">Alla kort</option>
                <option value="duplicates">Flera exemplar</option>
              </select>
            </div>
          </div>
          <input
            ref={fileInput}
            type="file"
            accept="application/json,.json"
            className="hidden"
            aria-label="Importera säkerhetskopia"
            onChange={upload}
          />
        </section>
        {isLoading ? (
          <div
            role="status"
            className="surface-panel flex items-center justify-center gap-3 py-16 text-sm text-muted-foreground"
          >
            <RefreshCw className="h-4 w-4 animate-spin" />
            Laddar samlingen...
          </div>
        ) : error ? (
          <p
            role="alert"
            className="rounded-2xl border border-destructive/20 bg-destructive/5 p-5 text-sm text-destructive"
          >
            {error}
          </p>
        ) : !cards.length ? (
          <div className="empty-state surface-panel px-6 py-16 text-center sm:py-20">
            <span className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-3xl border border-primary/20 bg-primary/10">
              <Library className="h-8 w-8 text-primary" />
            </span>
            <p className="page-eyebrow">Plats för dina favoriter</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight">
              Börja med ditt första kort
            </h2>
            <p className="mx-auto mt-3 mb-6 max-w-md text-sm leading-relaxed text-muted-foreground">
              Skanna ett kort, lägg till det manuellt eller välj det i ett sets
              checklista.
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              <Button asChild>
                <Link to="/scanner">
                  <Scan className="mr-2 h-4 w-4" />
                  Skanna ditt första kort
                </Link>
              </Button>
              <Button variant="outline" onClick={() => setEditor({})}>
                Lägg till mitt första kort
              </Button>
            </div>
          </div>
        ) : !visible.length ? (
          <div className="empty-state surface-panel px-6 py-14 text-center">
            <Search className="mx-auto mb-4 h-7 w-7 text-muted-foreground" />
            <h3 className="text-lg font-semibold">
              Inga kort matchar ditt filter.
            </h3>
            <p className="mt-2 mb-5 text-sm text-muted-foreground">
              Prova ett annat namn, set eller en annan förvaringsplats.
            </p>
            <Button
              variant="outline"
              onClick={() => {
                setQuery("");
                setFilter("all");
              }}
            >
              Rensa filter
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4 sm:gap-5">
            {visible.map((card) => (
              <Card
                key={card.id}
                className="group flex min-w-0 flex-col overflow-hidden rounded-2xl border-border/70 bg-card transition-colors hover:border-primary/40"
              >
                <Link
                  to={`/card/${card.id}`}
                  className="relative block aspect-[3/4] overflow-hidden border-b border-border/50 bg-gradient-to-b from-muted/30 to-background/50 p-3 sm:p-5"
                >
                  {card.image ? (
                    <img
                      src={card.image}
                      alt={card.name}
                      className="h-full w-full object-contain drop-shadow-[0_10px_16px_rgba(0,0,0,0.25)] transition-transform duration-300 group-hover:scale-[1.025] motion-reduce:transform-none"
                      loading="lazy"
                    />
                  ) : (
                    <div className="flex h-full flex-col items-center justify-center gap-2 text-xs text-muted-foreground">
                      <ImageOff className="h-7 w-7 opacity-50" />
                      Ingen bild
                    </div>
                  )}
                  <Badge className="absolute right-2.5 top-2.5 rounded-full border border-border/70 bg-card/95 px-2.5 text-foreground shadow-sm backdrop-blur">
                    {card.quantity} st
                  </Badge>
                </Link>
                <div className="flex flex-1 flex-col gap-3 p-3 sm:p-4">
                  <div>
                    <h2 className="truncate text-base font-semibold tracking-tight sm:text-lg">
                      <Link
                        to={`/card/${card.id}`}
                        className="transition-colors hover:text-primary"
                      >
                        {card.name}
                      </Link>
                    </h2>
                    <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
                      {card.set} · #{card.number}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    <Badge
                      variant="outline"
                      className="rounded-md border-border/70 text-[10px] font-medium"
                    >
                      {card.language.toUpperCase()}
                    </Badge>
                    <Badge
                      variant="outline"
                      className="max-w-full rounded-md border-border/70 text-[10px] font-medium whitespace-normal break-words"
                    >
                      {card.variant}
                    </Badge>
                    {card.condition && (
                      <Badge
                        variant="outline"
                        className="max-w-full rounded-md border-border/70 text-[10px] font-medium whitespace-normal break-words"
                      >
                        {card.condition}
                      </Badge>
                    )}
                  </div>
                  {card.location && (
                    <p
                      title={card.location}
                      className="flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground"
                    >
                      <MapPin className="h-3.5 w-3.5 shrink-0" />
                      <span className="truncate">{card.location}</span>
                    </p>
                  )}
                  {card.estimatedValue && (
                    <p className="text-xs leading-relaxed text-muted-foreground">
                      Uppskattning per exemplar:
                      <span className="mt-1 block text-sm font-semibold text-primary">
                        {convertPriceRange(card.estimatedValue, currency)}
                      </span>
                    </p>
                  )}
                  <div className="mt-auto flex gap-1.5 border-t border-border/60 pt-3">
                    <Button
                      size="sm"
                      variant="outline"
                      className="min-w-0 flex-1 gap-1 px-2 text-xs sm:text-sm"
                      onClick={() => setEditor({ card })}
                      aria-label={`Redigera ${card.name}`}
                    >
                      <Pencil className="h-3.5 w-3.5 shrink-0" />
                      Redigera
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="shrink-0 px-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                      onClick={() => setDeleting(card)}
                      aria-label={`Ta bort ${card.name}`}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      <span className="hidden sm:inline">Ta bort</span>
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
        {cards.length > 0 && (
          <div className="surface-panel flex flex-wrap items-center justify-between gap-4 p-5">
            <div className="max-w-2xl">
              <p className="mb-1.5 text-sm font-medium">
                En kopia av din samling
              </p>
              <p className="text-xs leading-relaxed text-muted-foreground">
                Säkerhetskopian innehåller kort, bilder och anteckningar. Import
                lägger till nya poster och behåller befintliga.
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
              onClick={() => setDeleting("all")}
            >
              Rensa samlingen
            </Button>
          </div>
        )}
        <CollectionCardEditor
          open={editor !== null}
          card={editor?.card}
          onOpenChange={(open) => {
            if (!open) setEditor(null);
          }}
        />
        <AlertDialog
          open={deleting !== null}
          onOpenChange={(open) => {
            if (!open && !busy) setDeleting(null);
          }}
        >
          <AlertDialogContent className="rounded-3xl border-border/80 bg-card p-6 sm:p-7">
            <div className="mb-1 flex h-12 w-12 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
              <Trash2 className="h-5 w-5" />
            </div>
            <AlertDialogHeader>
              <AlertDialogTitle className="text-xl font-semibold tracking-tight">
                {deleting === "all"
                  ? "Rensa hela samlingen?"
                  : "Ta bort kortposten?"}
              </AlertDialogTitle>
              <AlertDialogDescription className="text-sm leading-relaxed">
                {deleting === "all"
                  ? "Alla kortposter i den här samlingen tas bort. Exportera en säkerhetskopia först om du vill kunna återställa dem."
                  : `Alla exemplar i posten ${deleting ? deleting.name : ""} tas bort. Ändra antal i stället om du vill behålla några exemplar.`}{" "}
                {owner !== "guest" &&
                  (isLocalHosting
                    ? "Borttagningen synkas även till dina andra inloggade webbläsare."
                    : "Borttagningen synkas även till dina andra enheter.")}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={busy}>Avbryt</AlertDialogCancel>
              <Button
                variant="destructive"
                disabled={busy}
                onClick={confirmDelete}
              >
                {busy ? "Tar bort..." : "Ta bort"}
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </main>
    </div>
  );
}

export default function Collection() {
  const { owner } = useScannedCards();
  return <CollectionContent key={owner} />;
}
