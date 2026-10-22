import { useState, type FormEvent } from "react";
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
import { scannedCardSchema, type ScannedCard } from "@/lib/cardAnalysis";
import { resolveSetId } from "@/lib/collection";
import { pokemonSets } from "@/data/pokemonSets";
import { toast } from "sonner";

function CardForm({
  card: initialCard,
  close,
}: {
  card?: ScannedCard;
  close: () => void;
}) {
  const { addCard, updateCard } = useScannedCards();
  // Form values belong to the version opened by the user, even if a background
  // sync changes the parent props while this dialog remains open.
  const [card] = useState(initialCard);
  const [name, setName] = useState(card?.name ?? "");
  const [number, setNumber] = useState(card?.number ?? "");
  const [setId, setSetId] = useState(card ? (resolveSetId(card) ?? "") : "");
  const [customSetName, setCustomSetName] = useState(card?.set ?? "");
  const [quantity, setQuantity] = useState(String(card?.quantity ?? 1));
  const [condition, setCondition] = useState(card?.condition ?? "");
  const [language, setLanguage] = useState(card?.language ?? "en");
  const [variant, setVariant] = useState(card?.variant ?? "normal");
  const [location, setLocation] = useState(card?.location ?? "");
  const [notes, setNotes] = useState(card?.notes ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (saving) return;
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
      card &&
      (name.trim() !== card.name ||
        number.trim() !== card.number ||
        nextSet !== card.set);
    const input = {
      ...(card ?? {}),
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
      catalogId: identityChanged ? undefined : card?.catalogId,
    };
    setSaving(true);
    setError(null);
    try {
      // Validate before writing, including all editable bounds.
      const parsed = scannedCardSchema
        .omit({ id: true, scannedAt: true })
        .parse(input);
      if (card) await updateCard(card.id, parsed, card);
      else await addCard(parsed);
      toast.success("Kortet är sparat i samlingen.");
      close();
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Kunde inte spara kortet.",
      );
    } finally {
      setSaving(false);
    }
  };
  const selectClass =
    "w-full rounded-md border border-input bg-background px-3 py-2 text-sm";
  return (
    <form onSubmit={submit} className="space-y-4">
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
      <div className="flex justify-end gap-2">
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
  open,
  onOpenChange,
}: {
  card?: ScannedCard;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>
            {card ? "Redigera kort" : "Lägg till kort manuellt"}
          </DialogTitle>
          <DialogDescription>
            Registrera dina exemplar och var du förvarar dem. Ändringarna sparas
            på enheten och synkas när du är inloggad.
          </DialogDescription>
        </DialogHeader>
        <CardForm
          key={card?.id ?? "new"}
          card={card}
          close={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  );
}
