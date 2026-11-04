import { useState } from "react";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePwaUpdate } from "@/hooks/usePwaUpdate";
import type { PwaUpdateManager } from "@/services/pwaUpdates";

export default function PwaUpdateNotice({
  manager,
}: {
  manager?: PwaUpdateManager;
}) {
  const { available, blocked, updating, error, updateToken, applyUpdate } =
    usePwaUpdate(manager);
  const [dismissed, setDismissed] = useState<number | null>(null);
  if (!available || dismissed === updateToken) return null;
  return (
    <aside
      aria-labelledby="pwa-update-title"
      className="fixed bottom-[calc(6rem+env(safe-area-inset-bottom))] left-4 right-4 z-40 mx-auto max-w-xl rounded-2xl border border-primary/30 bg-card p-4 shadow-xl xl:bottom-6"
    >
      <div role="status" aria-live="polite">
        <p id="pwa-update-title" className="text-sm font-semibold">
          En ny version av appen finns
        </p>
        <p className="mt-1 text-xs leading-6 text-muted-foreground">
          {blocked
            ? "Spara dina ändringar eller avsluta skanningen innan du uppdaterar."
            : "Uppdatera när du är redo. Den här fliken laddas då om."}
        </p>
      </div>
      {error && (
        <p role="alert" className="mt-2 text-xs leading-6 text-destructive">
          {error}
        </p>
      )}
      <div className="mt-3 flex flex-wrap justify-end gap-2">
        <Button
          variant="ghost"
          size="sm"
          disabled={updating}
          onClick={() => setDismissed(updateToken)}
        >
          Senare
        </Button>
        <Button size="sm" disabled={blocked || updating} onClick={applyUpdate}>
          <RefreshCw
            className={updating ? "h-4 w-4 animate-spin" : "h-4 w-4"}
          />
          {updating ? "Uppdaterar…" : "Uppdatera appen"}
        </Button>
      </div>
    </aside>
  );
}
