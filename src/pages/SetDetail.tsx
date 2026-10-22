import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Loader2, RefreshCw } from "lucide-react";
import Navigation from "@/components/Navigation";
import SetChecklist from "@/components/SetChecklist";
import { Button } from "@/components/ui/button";
import {
  getCardsBySet,
  getSetById,
  type PokemonCard,
  type PokemonSet,
} from "@/services/pokemonTcgApi";
import { pokemonSets } from "@/data/pokemonSets";
import { withTimeout } from "@/utils/withTimeout";

export default function SetDetail() {
  const { setId } = useParams<{ setId: string }>();
  const [set, setSet] = useState<PokemonSet | null>(null);
  const [cards, setCards] = useState<PokemonCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    const local = pokemonSets.find((candidate) => candidate.id === setId);
    const fallback: PokemonSet | null = local
      ? {
          id: local.id,
          name: local.name,
          series: local.series,
          printedTotal: local.totalCards,
          total: local.totalCards,
          releaseDate: local.releaseDate,
          images: { symbol: "", logo: "" },
          ptcgoCode: local.setCode,
        }
      : null;
    setLoading(true);
    setCards([]);
    setError(null);
    setSet(fallback);
    const load = async () => {
      try {
        const [remote, result] = await Promise.all([
          withTimeout(
            (signal) => getSetById(setId!, signal),
            controller.signal,
          ).catch(() => fallback),
          withTimeout(
            (signal) => getCardsBySet(setId!, signal),
            controller.signal,
            40000,
          ),
        ]);
        if (controller.signal.aborted) return;
        setSet(remote ?? fallback);
        // A real catalogue is required for an authoritative checklist. Never invent missing cards with AI.
        if (!result.data.length)
          setError(
            "Kortlistan finns inte tillgänglig ännu. Försök igen senare.",
          );
        else {
          setCards(result.data);
          if (!remote && !fallback)
            setSet({
              id: setId!,
              name: result.data[0].set.name,
              series: result.data[0].set.series,
              total: result.totalCount,
              printedTotal: result.totalCount,
              releaseDate: "",
              images: { logo: "", symbol: "" },
            });
        }
      } catch (cause) {
        if (!controller.signal.aborted)
          setError(
            cause instanceof Error
              ? cause.message
              : "Kunde inte hämta kortlistan.",
          );
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };
    void load();
    return () => controller.abort();
  }, [setId, retry]);
  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <main className="container max-w-7xl mx-auto px-4 pt-24 pb-16 space-y-6">
        <Button asChild variant="ghost">
          <Link to="/gallery">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Tillbaka till galleriet
          </Link>
        </Button>
        {set && (
          <header className="flex flex-col sm:flex-row sm:items-center gap-5 rounded-2xl border bg-card p-6">
            {set.images.logo && (
              <img
                src={set.images.logo}
                alt=""
                className="w-36 max-h-20 object-contain"
              />
            )}
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-widest mb-1">
                {set.series}
              </p>
              <h1 className="text-3xl font-bold">{set.name}</h1>
              {set.releaseDate && (
                <p className="text-sm text-muted-foreground mt-2">
                  Utgivet{" "}
                  {new Date(set.releaseDate).toLocaleDateString("sv-SE")}
                </p>
              )}
            </div>
          </header>
        )}
        {loading ? (
          <div
            className="flex items-center justify-center gap-3 py-20"
            role="status"
          >
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
            Hämtar setets kortlista...
          </div>
        ) : error ? (
          <div className="rounded-2xl border p-6 space-y-3">
            <p role="alert">{error}</p>
            <p className="text-sm text-muted-foreground">
              Kompletteringen visas när den riktiga kortlistan kan hämtas. Dina
              sparade kort finns kvar i samlingen.
            </p>
            <Button
              variant="outline"
              onClick={() => setRetry((value) => value + 1)}
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Försök igen
            </Button>
          </div>
        ) : (
          set && <SetChecklist key={set.id} set={set} catalog={cards} />
        )}
      </main>
    </div>
  );
}
