import { useEffect, useState } from "react";
import { ArrowUpRight, Layers3 } from "lucide-react";
import { cn } from "@/lib/utils";

interface PokemonCardProps {
  id: string;
  name: string;
  image: string;
  type: string;
  rarity: string;
  set?: string;
  number?: string;
  quantity?: number;
  onClick?: () => void;
  className?: string;
}

export default function PokemonCard({
  name,
  image,
  type,
  rarity,
  set,
  number,
  quantity,
  onClick,
  className,
}: PokemonCardProps) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [image]);
  const content = (
    <>
      <span className="relative block bg-muted/30 p-3 sm:p-4">
        <span className="flex aspect-[3/4] items-center justify-center overflow-hidden rounded-lg">
          {image && !failed ? (
            <img
              src={image}
              alt={name}
              loading="lazy"
              onError={() => setFailed(true)}
              className="h-full w-full object-contain drop-shadow-md transition-transform duration-300 group-hover:scale-[1.025]"
            />
          ) : (
            <span className="flex flex-col items-center gap-3 text-muted-foreground">
              <Layers3 className="h-9 w-9 opacity-40" />
              <span className="text-xs">Ingen kortbild</span>
            </span>
          )}
        </span>
        {quantity !== undefined && (
          <span className="absolute right-2 top-2 rounded-md border border-border bg-card/95 px-2 py-1 text-[10px] font-semibold text-foreground">
            {quantity} st
          </span>
        )}
      </span>
      <span className="block p-3 pt-3 sm:p-4">
        <span className="mb-1.5 flex items-center justify-between gap-2 text-[10px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
          <span className="truncate">{set || type}</span>
          {number && <span className="shrink-0">#{number}</span>}
        </span>
        <span className="block truncate text-sm font-semibold tracking-tight">
          {name}
        </span>
        <span className="mt-3 flex items-center justify-between gap-2">
          <span className="truncate text-xs text-muted-foreground">
            {rarity && rarity.toLowerCase() !== "unknown" ? rarity : type}
          </span>
          {onClick && (
            <ArrowUpRight className="h-4 w-4 shrink-0 text-muted-foreground transition-colors group-hover:text-primary" />
          )}
        </span>
      </span>
    </>
  );
  const classes = cn(
    "group block min-w-0 overflow-hidden rounded-2xl border border-border bg-card text-left text-foreground transition-all duration-200",
    onClick &&
      "cursor-pointer hover:-translate-y-0.5 hover:border-primary/35 hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
    className,
  );
  return onClick ? (
    <button
      type="button"
      onClick={onClick}
      aria-label={`Visa ${name}${number ? ` #${number}` : ""}`}
      className={classes}
    >
      {content}
    </button>
  ) : (
    <article className={classes}>{content}</article>
  );
}
