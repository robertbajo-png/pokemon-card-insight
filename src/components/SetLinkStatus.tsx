import { CircleHelp, Library } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { setLinkStatus } from "@/lib/collection";
import type { ScannedCard } from "@/lib/cardAnalysis";

export default function SetLinkStatus({
  card,
  onReview,
  showDescription = false,
}: {
  card: Pick<ScannedCard, "name" | "set" | "setId" | "setCode" | "catalogId">;
  onReview?: () => void;
  showDescription?: boolean;
}) {
  const status = setLinkStatus(card);
  if (status === "linked") return null;
  const review = status === "unlinked";
  const Icon = review ? CircleHelp : Library;
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <Badge
          variant="outline"
          className={
            review
              ? "gap-1.5 border-primary/25 bg-primary/5 text-primary"
              : "gap-1.5 border-border text-muted-foreground"
          }
        >
          <Icon className="h-3 w-3" aria-hidden="true" />
          {review ? "Kontrollera set" : "Utanför katalogen"}
        </Badge>
        {review && onReview && (
          <Button
            type="button"
            variant="link"
            size="sm"
            className="h-auto px-0 py-1 text-xs"
            aria-label={`Kontrollera set för ${card.name}`}
            onClick={onReview}
          >
            Välj set
          </Button>
        )}
      </div>
      {showDescription && (
        <p className="max-w-xl text-sm leading-relaxed text-muted-foreground">
          {review
            ? "Kortet är sparat men räknas inte i setens checklistor än. Välj rätt set för att koppla det."
            : "Kortet är sparat i din samling. Setet finns inte i katalogen och ingår därför inte i checklistorna."}
        </p>
      )}
    </div>
  );
}
