import type { CatalogueSource } from "@/services/pokemonTcgApi";

export default function CatalogueNotice({
  source,
}: {
  source?: CatalogueSource;
}) {
  if (source?.kind !== "snapshot") return null;
  const date = new Date(source.updatedAt).toLocaleDateString("sv-SE", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });
  return (
    <p className="rounded-xl border border-border bg-muted/20 px-4 py-3 text-xs leading-6 text-muted-foreground">
      <span className="font-semibold text-foreground">Lokal kortkatalog</span>
      {" · "}Datakopia från {date}. Prisuppgifter ingår inte.
    </p>
  );
}
