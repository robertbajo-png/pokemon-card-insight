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
    "w-full rounded-md border border-input bg-background px-3 py-2 text-sm";
  return (
    <form
      onSubmit={submit}
      className="flex min-h-0 flex-col gap-4 overflow-hidden"
    >
      <div className="min-h-0 space-y-4 overflow-y-auto pr-1">
        {draft?.image && (
          <img
            src={draft.image}
            alt="Skannat kort"
            className="mx-auto h-32 max-w-full rounded-md object-contain"
          />
        )}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <label className="space-y-1 text-sm">
            Kortnamn
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={200}
              required
            />
          </label>
          <label className="space-y-1 text-sm">
            Kortnummer
            <Input
              value={number}
              onChange={(e) => setNumber(e.target.value)}
              maxLength={100}
              placeholder="58 eller 58/102"
              required
            />
          </label>
          <label className="space-y-1 text-sm sm:col-span-2">
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
            <label className="space-y-1 text-sm sm:col-span-2">
              Setnamn
              <Input
                value={customSetName}
                onChange={(e) => setCustomSetName(e.target.value)}
                maxLength={200}
                required
              />
            </label>
          )}
          <label className="space-y-1 text-sm">
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
          <label className="space-y-1 text-sm">
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
          <label className="space-y-1 text-sm">
            Variant
            <Input
              value={variant}
              onChange={(e) => setVariant(e.target.value)}
              maxLength={80}
              placeholder="normal, holo, reverse holo..."
            />
          </label>
          <label className="space-y-1 text-sm">
            Skick
            <Input
              value={condition}
              onChange={(e) => setCondition(e.target.value)}
              maxLength={200}
              placeholder="Till exempel Near Mint"
            />
          </label>
          <label className="space-y-1 text-sm sm:col-span-2">
            Förvaringsplats
            <Input
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              maxLength={200}
              placeholder="Pärm 2, sida 8"
            />
          </label>
          <label className="space-y-1 text-sm sm:col-span-2">
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
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
      </div>
      <div className="flex shrink-0 justify-end gap-2 border-t border-border pt-3">
        <Button
          type="button"
          variant="outline"
          disabled={saving}
          onClick={close}
        >
          Avbryt
        </Button>
        <Button type="submit" disabled={saving}>
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
  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!saving) onOpenChange(next);
      }}
    >
      <DialogContent className="flex max-h-[90dvh] flex-col overflow-hidden sm:max-w-xl">
        <DialogHeader className="shrink-0 pr-4">
          <DialogTitle>
            {card
              ? "Redigera kort"
              : draft
                ? "Kontrollera skannat kort"
                : "Lägg till kort manuellt"}
          </DialogTitle>
          <DialogDescription>
            {draft
              ? "Kontrollera uppgifterna mot kortet och ange vilka exemplar du vill lägga till."
              : "Registrera dina exemplar och var du förvarar dem. Ändringarna sparas på enheten och synkas när du är inloggad."}
          </DialogDescription>
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
