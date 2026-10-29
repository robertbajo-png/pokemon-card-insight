import { useRef, useState, type FormEvent } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useScannedCards } from "@/hooks/useScannedCards";
import {
  scannedCardSchema,
  type NewScannedCard,
  type ScannedCard,
} from "@/lib/cardAnalysis";
import { resolveSetId } from "@/lib/collection";
import { pokemonSets } from "@/data/pokemonSets";
import { toast } from "sonner";
import {
  Check,
  Pencil,
  Plus,
  ScanLine,
  Layers3,
  MapPin,
  PackageCheck,
  Loader2,
} from "lucide-react";

function CardForm({
  card: initialCard,
  draft,
  close,
  saving,
  setSaving,
  onCreated,
}: {
  card?: ScannedCard;
  draft?: NewScannedCard;
  close: () => void;
  saving: boolean;
  setSaving: (saving: boolean) => void;
  onCreated?: (card: ScannedCard) => void;
}) {
  const { addCard, updateCard } = useScannedCards();
  // Form values belong to the version opened by the user, even if a background
  // sync changes the parent props while this dialog remains open.
  const [card] = useState(initialCard);
  const [source] = useState(
    () =>
      initialCard ??
      (draft
        ? scannedCardSchema.omit({ id: true, scannedAt: true }).parse(draft)
        : undefined),
  );
  const [name, setName] = useState(source?.name ?? "");
  const [number, setNumber] = useState(source?.number ?? "");
  const [setId, setSetId] = useState(
    source ? (resolveSetId(source) ?? "") : "",
  );
  const [customSetName, setCustomSetName] = useState(source?.set ?? "");
  const [quantity, setQuantity] = useState(String(source?.quantity ?? 1));
  const [condition, setCondition] = useState(source?.condition ?? "");
  const [language, setLanguage] = useState(source?.language ?? "en");
  const [variant, setVariant] = useState(source?.variant ?? "normal");
  const [location, setLocation] = useState(source?.location ?? "");
  const [notes, setNotes] = useState(source?.notes ?? "");
  const savingRef = useRef(false);
  const [error, setError] = useState<string | null>(null);
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (savingRef.current) return;
    const selected = pokemonSets.find((set) => set.id === setId);
    const nextSet = selected?.name ?? customSetName.trim();
    if (!name.trim() || !number.trim() || !nextSet) {
      setError("Fyll i kortnamn, set och kortnummer.");
      return;
    }
    if (
      !Number.isInteger(Number(quantity)) ||
      Number(quantity) < 1 ||
      Number(quantity) > 9999
    ) {
      setError("Antal måste vara ett heltal mellan 1 och 9 999.");
      return;
    }
    const identityChanged =
      source &&
      (name.trim() !== source.name ||
        number.trim() !== source.number ||
        nextSet !== source.set);
    const input = {
      ...(source ?? {}),
      name: name.trim(),
      number: number.trim(),
      set: nextSet,
      setId: selected?.id,
      setCode: selected?.setCode,
      quantity: Number(quantity),
      condition: condition.trim(),
      language,
      variant,
      location,
      notes,
      catalogId: identityChanged ? undefined : source?.catalogId,
    };
    savingRef.current = true;
    setSaving(true);
    setError(null);
    try {
      // Validate before writing, including all editable bounds.
      const parsed = scannedCardSchema
        .omit({ id: true, scannedAt: true })
        .parse(input);
      if (card) await updateCard(card.id, parsed, card);
      else {
        const created = await addCard(parsed);
        onCreated?.(created);
      }
      toast.success("Kortet är sparat i samlingen.");
      close();
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Kunde inte spara kortet.",
      );
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  };
  const selectClass =
    "w-full rounded-xl border border-input bg-background/60 px-3 py-2.5 text-sm font-normal text-foreground transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-card";
  return (
    <form
      onSubmit={submit}
      className="flex min-h-0 flex-col gap-5 overflow-hidden"
    >
      <div className="min-h-0 space-y-6 overflow-y-auto pr-1">
        {source?.image && (
          <div className="flex items-center gap-5 rounded-2xl border border-border/60 bg-background/50 p-4">
            <img
              src={source.image}
              alt="Skannat kort"
              className="h-28 w-20 shrink-0 rounded-md object-contain drop-shadow-lg"
            />
            <div className="min-w-0">
              <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-primary">
                {draft ? "Ditt skannade kort" : "I din samling"}
              </p>
              <p className="truncate font-semibold tracking-tight">
                {source.name}
              </p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                {source.set} · #{source.number}
              </p>
              <p className="mt-3 text-xs text-muted-foreground">
                Bilden följer med kortet.
              </p>
            </div>
          </div>
        )}
        <section className="space-y-4" aria-label="Kortuppgifter">
          <h3 className="flex items-center gap-2 text-sm font-semibold">
            <Layers3 className="h-4 w-4 text-primary" />
            Kortet
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <label className="space-y-2 text-sm font-medium">
              Kortnamn
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={200}
                required
              />
            </label>
            <label className="space-y-2 text-sm font-medium">
              Kortnummer
              <Input
                value={number}
                onChange={(e) => setNumber(e.target.value)}
                maxLength={100}
                placeholder="58 eller 58/102"
                required
              />
            </label>
            <label className="space-y-2 text-sm font-medium sm:col-span-2">
              Set
              <select
                aria-label="Set"
                value={setId}
                onChange={(e) => setSetId(e.target.value)}
                className={selectClass}
              >
                <option value="">Annat set / ange namn</option>
                {pokemonSets.map((set) => (
                  <option key={set.id} value={set.id}>
                    {set.name} ({set.setCode})
                  </option>
                ))}
              </select>
            </label>
            {!setId && (
              <label className="space-y-2 text-sm font-medium sm:col-span-2">
                Setnamn
                <Input
                  value={customSetName}
                  onChange={(e) => setCustomSetName(e.target.value)}
                  maxLength={200}
                  required
                />
              </label>
            )}
          </div>
        </section>
        <section
          className="space-y-4 border-t border-border/60 pt-5"
          aria-label="Exemplarsuppgifter"
        >
          <h3 className="flex items-center gap-2 text-sm font-semibold">
            <PackageCheck className="h-4 w-4 text-primary" />
            Dina exemplar
          </h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className="space-y-2 text-sm font-medium">
              Antal
              <Input
                type="number"
                min={1}
                max={9999}
                step={1}
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                required
              />
            </label>
            <label className="space-y-2 text-sm font-medium">
              Språk
              <select
                aria-label="Språk"
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className={selectClass}
              >
                {[
                  ["en", "Engelska"],
                  ["ja", "Japanska"],
                  ["sv", "Svenska"],
                  ["de", "Tyska"],
                  ["fr", "Franska"],
                  ["it", "Italienska"],
                  ["es", "Spanska"],
                  ["ko", "Koreanska"],
                  ["zh", "Kinesiska"],
                  ["other", "Annat"],
                ].map(([id, label]) => (
                  <option key={id} value={id}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-2 text-sm font-medium">
              Variant
              <Input
                value={variant}
                onChange={(e) => setVariant(e.target.value)}
                maxLength={80}
                placeholder="normal, holo, reverse holo..."
              />
            </label>
            <label className="space-y-2 text-sm font-medium">
              Skick
              <Input
                value={condition}
                onChange={(e) => setCondition(e.target.value)}
                maxLength={200}
                placeholder="Till exempel Near Mint"
              />
            </label>
          </div>
        </section>
        <section
          className="space-y-4 border-t border-border/60 pt-5"
          aria-label="Förvaring och anteckningar"
        >
          <h3 className="flex items-center gap-2 text-sm font-semibold">
            <MapPin className="h-4 w-4 text-primary" />
            Förvaring och anteckningar
          </h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className="space-y-2 text-sm font-medium sm:col-span-2">
              Förvaringsplats
              <Input
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                maxLength={200}
                placeholder="Pärm 2, sida 8"
              />
            </label>
            <label className="space-y-2 text-sm font-medium sm:col-span-2">
              Anteckningar
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                maxLength={2000}
                rows={3}
                className={selectClass}
              />
            </label>
          </div>
        </section>
        {error && (
          <p
            role="alert"
            className="rounded-xl border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm leading-relaxed text-destructive"
          >
            {error}
          </p>
        )}
      </div>
      <div className="flex shrink-0 justify-end gap-2.5 border-t border-border/70 pt-4">
        <Button
          type="button"
          variant="outline"
          disabled={saving}
          onClick={close}
        >
          Avbryt
        </Button>
        <Button type="submit" disabled={saving} className="min-w-32">
          {saving ? (
            <Loader2 className="mr-1 h-4 w-4 animate-spin" />
          ) : (
            <Check className="mr-1 h-4 w-4" />
          )}
          {saving ? "Sparar..." : "Spara kort"}
        </Button>
      </div>
    </form>
  );
}

export default function CollectionCardEditor({
  card,
  draft,
  open,
  onOpenChange,
  onCreated,
}: {
  card?: ScannedCard;
  draft?: NewScannedCard;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: (card: ScannedCard) => void;
}) {
  const [saving, setSaving] = useState(false);
  const EditorIcon = card ? Pencil : draft ? ScanLine : Plus;
  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!saving) onOpenChange(next);
      }}
    >
      <DialogContent className="flex max-h-[90dvh] w-[calc(100%_-_1.5rem)] flex-col gap-6 overflow-hidden rounded-3xl border-border/80 bg-card p-5 sm:max-w-2xl sm:p-7">
        <DialogHeader className="shrink-0 pr-4 text-left">
          <div className="flex items-start gap-4">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10 text-primary">
              <EditorIcon className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <DialogTitle className="text-xl font-semibold tracking-tight sm:text-2xl">
                {card
                  ? "Redigera kort"
                  : draft
                    ? "Kontrollera skannat kort"
                    : "Lägg till kort manuellt"}
              </DialogTitle>
              <DialogDescription className="mt-2 text-sm leading-relaxed">
                {draft
                  ? "Kontrollera uppgifterna mot kortet och ange vilka exemplar du vill lägga till."
                  : "Registrera dina exemplar och var du förvarar dem. Ändringarna sparas på enheten och synkas när du är inloggad."}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>
        <CardForm
          key={card?.id ?? "new"}
          card={card}
          draft={draft}
          saving={saving}
          setSaving={setSaving}
          onCreated={onCreated}
          close={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  );
}
