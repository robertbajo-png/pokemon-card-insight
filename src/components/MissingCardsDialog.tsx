import { useEffect, useRef, useState } from "react";
import {
  CheckCheck,
  ClipboardList,
  Copy,
  Download,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { formatMissingCards } from "@/lib/missingCards";
import type { PokemonCard, PokemonSet } from "@/services/pokemonTcgApi";

export default function MissingCardsDialog({
  set,
  cards,
  disabled = false,
}: {
  set: Pick<PokemonSet, "id" | "name">;
  cards: readonly PokemonCard[];
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [copying, setCopying] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [error, setError] = useState("");
  const generation = useRef({ value: 0 });
  const text = formatMissingCards(set, cards);
  useEffect(() => {
    const counter = generation.current;
    setCopying(false);
    setFeedback("");
    setError("");
    if (disabled) setOpen(false);
    return () => {
      counter.value++;
    };
  }, [text, disabled]);
  const changeOpen = (next: boolean) => {
    generation.current.value++;
    setOpen(next);
    setCopying(false);
    setFeedback("");
    setError("");
  };
  const copy = async () => {
    if (copying || disabled || !cards.length) return;
    const request = ++generation.current.value;
    setCopying(true);
    setFeedback("");
    setError("");
    try {
      await navigator.clipboard.writeText(text);
      if (generation.current.value === request) setFeedback("Listan är kopierad.");
    } catch {
      if (generation.current.value === request)
        setError("Kunde inte kopiera. Ladda ner textfilen i stället.");
    } finally {
      if (generation.current.value === request) setCopying(false);
    }
  };
  const download = () => {
    if (disabled || !cards.length) return;
    setError("");
    setFeedback("");
    let url: string | undefined;
    try {
      const blob = new Blob([text], {
        type: "text/plain;charset=utf-8",
      });
      url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `pokemon-saknade-${set.id.replace(/[^a-zA-Z0-9_-]/g, "-")}.txt`;
      document.body.append(anchor);
      anchor.click();
      anchor.remove();
      setFeedback("Textfilen är klar för nedladdning.");
    } catch {
      setError("Kunde inte ladda ner listan. Försök igen.");
    } finally {
      if (url) {
        const downloadedUrl = url;
        window.setTimeout(() => URL.revokeObjectURL(downloadedUrl), 1000);
      }
    }
  };

  return (
    <Dialog open={open && !disabled} onOpenChange={changeOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          className="w-full gap-2 sm:w-auto"
          disabled={disabled || !cards.length}
        >
          <ClipboardList className="h-4 w-4" />
          Lista att ta med
        </Button>
      </DialogTrigger>
      <DialogContent
        closeLabel="Stäng"
        className="flex max-h-[90dvh] w-[calc(100%_-_1.5rem)] flex-col gap-5 overflow-y-auto rounded-3xl bg-card p-5 sm:max-w-xl sm:p-7"
      >
        <DialogHeader className="shrink-0 pr-5 text-left">
          <span className="mb-3 flex h-11 w-11 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10 text-primary">
            <ClipboardList className="h-5 w-5" />
          </span>
          <p className="page-eyebrow">Till nästa kortjakt</p>
          <DialogTitle className="text-2xl font-semibold tracking-tight">
            Saknade kort
          </DialogTitle>
          <DialogDescription className="pt-1 text-sm leading-relaxed">
            {set.name} · {cards.length} kort saknas. Hela setets lista, oavsett
            sökning och filter.
          </DialogDescription>
        </DialogHeader>
        <div
          role="region"
          aria-label="Saknade kort att ta med"
          tabIndex={0}
          className="max-h-[40dvh] shrink-0 overflow-y-auto rounded-2xl border border-border/70 bg-background/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card"
        >
          {cards.length ? (
            <ol
              aria-label="Alla saknade kort"
              className="divide-y divide-border/60"
            >
              {cards.map((card) => (
                <li
                  key={card.id}
                  className="flex items-start gap-4 px-4 py-3 text-sm"
                >
                  <span className="w-16 shrink-0 break-words font-mono text-xs leading-5 text-muted-foreground">
                    #{card.number}
                  </span>
                  <span className="min-w-0 break-words font-medium">
                    {card.name}
                  </span>
                </li>
              ))}
            </ol>
          ) : (
            <div className="p-7 text-center">
              <CheckCheck className="mx-auto mb-3 h-7 w-7 text-primary" />
              <p className="font-semibold">Setet är komplett!</p>
              <p className="mt-2 text-sm text-muted-foreground">
                Inga kort saknas just nu.
              </p>
            </div>
          )}
        </div>
        <div className="shrink-0 space-y-3 border-t border-border/70 pt-4">
          <p className="text-xs leading-relaxed text-muted-foreground">
            Kopiera listan till en anteckning eller spara den som textfil.
            Listan visar vad som saknas i din samling just nu.
          </p>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button
              className="flex-1 gap-2"
              disabled={copying || !cards.length}
              onClick={() => void copy()}
            >
              {copying ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
              Kopiera lista
            </Button>
            <Button
              variant="outline"
              className="flex-1 gap-2"
              disabled={!cards.length}
              onClick={download}
            >
              <Download className="h-4 w-4" />
              Ladda ner textfil
            </Button>
          </div>
          <p role="status" aria-live="polite" className="text-xs text-primary">
            {feedback}
          </p>
          {error && (
            <p
              role="alert"
              className="text-xs leading-relaxed text-destructive"
            >
              {error}
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
