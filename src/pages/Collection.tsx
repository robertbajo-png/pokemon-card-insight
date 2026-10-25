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
    <div className="text-sm space-y-1">
      {deleted ? (
        <p>Kortet är borttaget.</p>
      ) : (
        <>
          <p className="font-semibold">
            {card.name} · {card.set} #{card.number}
          </p>
          <p>
            {card.quantity} exemplar · {card.language} · {card.variant}
          </p>
          <p>Skick: {card.condition || "Inte angivet"}</p>
          <p>Plats: {card.location || "Inte angiven"}</p>
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
      <main className="container max-w-6xl mx-auto px-4 pt-24 pb-16 space-y-6">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-widest text-muted-foreground mb-1">
              Dina kort, på ditt sätt
            </p>
            <h1 className="text-3xl font-bold">Min samling</h1>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline">
              <Link to="/scanner">
                <Scan className="w-4 h-4 mr-2" />
                Skanna
              </Link>
            </Button>
            <Button disabled={isLoading} onClick={() => setEditor({})}>
              <Plus className="w-4 h-4 mr-2" />
              Lägg till kort
            </Button>
          </div>
        </header>
        <CollectionSyncStatus />
        {conflicts?.map((row) => (
          <section
            key={row.key}
            className="rounded-2xl border border-amber-500/50 bg-card p-5 space-y-4"
            aria-label={`Konflikt: ${row.card.name}`}
          >
            <div>
              <h2 className="font-bold">
                {row.card.name} har ändrats i två sessioner
              </h2>
              <p className="text-sm text-muted-foreground">
                Båda versionerna finns kvar tills du väljer vilken som ska
                användas.
              </p>
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <h3 className="font-medium mb-2">Denna enhet</h3>
                <CardVersion card={row.card} deleted={row.deleted} />
              </div>
              <div>
                <h3 className="font-medium mb-2">
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
          className="grid grid-cols-3 gap-3"
        >
          {[
            ["Exemplar", copies],
            ["Unika kort", unique],
            ["Extra exemplar", copies - unique],
          ].map(([label, value]) => (
            <Card key={label} className="p-4 rounded-2xl">
              <p className="text-xs text-muted-foreground">{label}</p>
              <p className="text-2xl sm:text-3xl font-bold mt-1">{value}</p>
            </Card>
          ))}
        </section>
        {sets.length > 0 && (
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold">Färdigställ dina set</h2>
              <Link
                to="/gallery"
                className="text-sm text-primary hover:underline"
              >
                Alla set
              </Link>
            </div>
            <div className="flex gap-3 overflow-x-auto pb-2">
              {sets.map((set) => (
                <Link
                  key={set.id}
                  to={`/set/${set.id}`}
                  className="shrink-0 rounded-2xl border bg-card p-4 min-w-48 hover:border-primary"
                >
                  <Library className="w-4 h-4 text-primary mb-2" />
                  <p className="font-semibold text-sm">{set.name}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {set.owned} unika registrerade · Se saknade{" "}
                    <ArrowUpRight className="inline w-3 h-3" />
                  </p>
                </Link>
              ))}
            </div>
          </section>
        )}
        <div className="flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
            <Input
              aria-label="Sök i samlingen"
              placeholder="Sök kort, set, nummer eller plats..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <select
            aria-label="Visa kort"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="rounded-md border bg-background p-2 text-sm"
          >
            <option value="all">Alla kort</option>
            <option value="duplicates">Flera exemplar</option>
          </select>
          <Button
            size="sm"
            variant="outline"
            disabled={isLoading || !cards.length}
            onClick={download}
          >
            <Download className="w-4 h-4 mr-2" />
            Exportera
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={busy || isLoading}
            onClick={() => fileInput.current?.click()}
          >
            <Upload className="w-4 h-4 mr-2" />
            Importera
          </Button>
          <input
            ref={fileInput}
            type="file"
            accept="application/json,.json"
            className="hidden"
            aria-label="Importera säkerhetskopia"
            onChange={upload}
          />
        </div>
        {isLoading ? (
          <p role="status">Laddar samlingen...</p>
        ) : error ? (
          <p role="alert">{error}</p>
        ) : !cards.length ? (
          <Card className="text-center py-16 px-6 rounded-2xl">
            <Library className="w-10 h-10 text-primary mx-auto mb-4" />
            <h2 className="text-xl font-bold">Börja med ditt första kort</h2>
            <p className="text-muted-foreground mt-2 mb-5">
              Skanna ett kort, lägg till det manuellt eller välj det i ett sets
              checklista.
            </p>
            <Button onClick={() => setEditor({})}>
              Lägg till mitt första kort
            </Button>
          </Card>
        ) : !visible.length ? (
          <p className="text-center text-muted-foreground py-12">
            Inga kort matchar ditt filter.
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {visible.map((card) => (
              <Card key={card.id} className="overflow-hidden rounded-2xl">
                <Link
                  to={`/card/${card.id}`}
                  className="block relative aspect-[4/3] bg-muted/30 p-4"
                >
                  {card.image ? (
                    <img
                      src={card.image}
                      alt={card.name}
                      className="w-full h-full object-contain"
                      loading="lazy"
                    />
                  ) : (
                    <div className="h-full flex items-center justify-center text-muted-foreground">
                      Ingen bild
                    </div>
                  )}
                  <Badge className="absolute right-3 top-3">
                    {card.quantity} st
                  </Badge>
                </Link>
                <div className="p-4 space-y-3">
                  <div>
                    <h2 className="text-lg font-bold">
                      <Link to={`/card/${card.id}`} className="hover:underline">
                        {card.name}
                      </Link>
                    </h2>
                    <p className="text-sm text-muted-foreground">
                      {card.set} · #{card.number}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    <Badge variant="outline">
                      {card.language.toUpperCase()}
                    </Badge>
                    <Badge variant="outline">{card.variant}</Badge>
                    {card.condition && (
                      <Badge variant="outline">{card.condition}</Badge>
                    )}
                  </div>
                  {card.location && (
                    <p className="text-sm text-muted-foreground">
                      {card.location}
                    </p>
                  )}
                  {card.estimatedValue && (
                    <p className="text-sm text-primary">
                      Uppskattning per exemplar:{" "}
                      {convertPriceRange(card.estimatedValue, currency)}
                    </p>
                  )}
                  <div className="flex gap-2 pt-2 border-t">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setEditor({ card })}
                      aria-label={`Redigera ${card.name}`}
                    >
                      <Pencil className="w-3.5 h-3.5 mr-2" />
                      Redigera
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setDeleting(card)}
                      aria-label={`Ta bort ${card.name}`}
                    >
                      <Trash2 className="w-3.5 h-3.5 mr-2" />
                      Ta bort
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
        {cards.length > 0 && (
          <div className="pt-4 border-t flex flex-wrap gap-3 items-center justify-between">
            <p className="text-xs text-muted-foreground">
              Säkerhetskopian innehåller kort, bilder och anteckningar. Import
              lägger till nya poster och behåller befintliga.
            </p>
            <Button
              variant="ghost"
              size="sm"
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
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                {deleting === "all"
                  ? "Rensa hela samlingen?"
                  : "Ta bort kortposten?"}
              </AlertDialogTitle>
              <AlertDialogDescription>
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
