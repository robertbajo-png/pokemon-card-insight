import { Link } from "react-router-dom";
import { Cloud, CloudOff, RefreshCw } from "lucide-react";
import { useScannedCards } from "@/hooks/useScannedCards";
import { Button } from "@/components/ui/button";
import { GUEST } from "@/services/scannedCardsStorage";
import { toast } from "sonner";
import { isLocalHosting } from "@/lib/hosting";

export default function CollectionSyncStatus() {
  const {
    owner,
    syncStatus,
    syncError,
    pending,
    localCount,
    importLocal,
    syncNow,
    lastSynced,
  } = useScannedCards();
  const local = owner === GUEST;
  const label = local
    ? "Sparat på denna enhet"
    : {
        syncing: "Synkar samlingen...",
        synced: isLocalHosting
          ? "Synkad med din lokala server"
          : "Samlingen är synkad",
        offline: "Väntar på synkning",
        error: isLocalHosting
          ? "Synkningen med din lokala server behöver uppmärksamhet"
          : "Molnsynkning behöver uppmärksamhet",
        conflict: "Välj vilken version du vill behålla",
        local: "Sparat på denna enhet",
      }[syncStatus];
  return (
    <section
      aria-label="Synkning"
      className="rounded-2xl border bg-card p-4 space-y-3"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          {local || syncStatus === "offline" ? (
            <CloudOff className="w-5 h-5 text-muted-foreground" />
          ) : (
            <Cloud className="w-5 h-5 text-primary" />
          )}
          <div>
            <p role="status" className="text-sm font-semibold">
              {label}
            </p>
            <p className="text-xs text-muted-foreground">
              {local
                ? isLocalHosting
                  ? "Logga in för att spara samlingen i den lokala databasen på datorn."
                  : "Logga in för säkerhetskopiering och samma samling på dina andra enheter."
                : pending
                  ? `${pending} ändringar finns sparade på enheten och väntar på ${isLocalHosting ? "din lokala server" : "molnet"}.`
                  : lastSynced
                    ? `Senast synkad ${new Date(lastSynced).toLocaleTimeString("sv-SE", { hour: "2-digit", minute: "2-digit" })}`
                    : "Dina kort är privata för ditt konto."}
            </p>
          </div>
        </div>
        {local ? (
          <Button asChild size="sm" variant="outline">
            <Link to="/login">
              {isLocalHosting
                ? "Logga in för serversparning"
                : "Logga in för molnsparning"}
            </Link>
          </Button>
        ) : (
          <Button
            size="sm"
            variant="outline"
            disabled={syncStatus === "syncing"}
            onClick={syncNow}
          >
            <RefreshCw
              className={`w-4 h-4 mr-2 ${syncStatus === "syncing" ? "animate-spin" : ""}`}
            />
            Synka nu
          </Button>
        )}
      </div>
      {syncError && (
        <p role="alert" className="text-sm text-amber-500">
          {syncError}
        </p>
      )}
      {!local && localCount > 0 && (
        <div className="border-t pt-3 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm">
            Det finns {localCount} lokala kortposter som ännu inte tillhör något
            konto.
          </p>
          <Button
            size="sm"
            variant="secondary"
            onClick={async () => {
              try {
                await importLocal();
                toast.success(
                  "De lokala korten har flyttats till ditt konto på enheten och köats för synkning.",
                );
              } catch (cause) {
                toast.error(
                  cause instanceof Error
                    ? cause.message
                    : "Kunde inte flytta korten.",
                );
              }
            }}
          >
            Flytta korten till mitt konto
          </Button>
        </div>
      )}
    </section>
  );
}
