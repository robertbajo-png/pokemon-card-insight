import { Link } from "react-router-dom";
import {
  Cloud,
  CloudOff,
  RefreshCw,
  HardDrive,
  CheckCircle2,
  AlertTriangle,
  ArrowUpRight,
  UploadCloud,
} from "lucide-react";
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
  const needsAttention =
    !local && (syncStatus === "error" || syncStatus === "conflict");
  const StatusIcon = local
    ? HardDrive
    : syncStatus === "syncing"
      ? RefreshCw
      : syncStatus === "offline"
        ? CloudOff
        : syncStatus === "synced"
          ? CheckCircle2
          : needsAttention
            ? AlertTriangle
            : Cloud;
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
      className={`surface-panel space-y-4 p-4 sm:p-5 ${needsAttention ? "border-primary/30" : ""}`}
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-start gap-3 sm:items-center">
          <span
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${local || syncStatus === "offline" ? "bg-muted/70 text-muted-foreground" : "bg-primary/10 text-primary"}`}
          >
            <StatusIcon
              className={`h-[18px] w-[18px] ${!local && syncStatus === "syncing" ? "animate-spin" : ""}`}
            />
          </span>
          <div className="min-w-0 space-y-1">
            <p role="status" className="text-sm font-medium text-foreground">
              {label}
            </p>
            <p className="max-w-2xl text-xs leading-relaxed text-muted-foreground">
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
          <Button
            asChild
            size="sm"
            variant="outline"
            className="w-full shrink-0 rounded-full px-4 sm:w-auto"
          >
            <Link to="/login">
              {isLocalHosting
                ? "Logga in för serversparning"
                : "Logga in för molnsparning"}
              <ArrowUpRight className="ml-1 h-3.5 w-3.5" />
            </Link>
          </Button>
        ) : (
          <Button
            size="sm"
            variant="outline"
            className="w-full shrink-0 rounded-full px-4 sm:w-auto"
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
        <p
          role="alert"
          className="rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 text-sm leading-relaxed text-foreground"
        >
          {syncError}
        </p>
      )}
      {!local && localCount > 0 && (
        <div className="flex flex-col gap-3 rounded-2xl border border-border/60 bg-background/50 p-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-3">
            <UploadCloud className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <p className="max-w-xl text-xs leading-relaxed text-muted-foreground">
              Det finns {localCount} lokala kortposter som ännu inte tillhör
              något konto.
            </p>
          </div>
          <Button
            size="sm"
            variant="secondary"
            className="shrink-0"
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
