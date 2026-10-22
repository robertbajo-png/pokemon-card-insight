import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Navigation from "@/components/Navigation";
import PokemonCard from "@/components/PokemonCard";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2, Sparkles } from "lucide-react";
import { getCardsBySet, getSetById, type PokemonCard as PokemonCardType, type PokemonSet } from "@/services/pokemonTcgApi";
import { pokemonSets } from "@/data/pokemonSets";
import { toast } from "sonner";
import { TranslatedText } from "@/components/TranslatedText";

import { invokeAi } from "@/services/aiFunctions";
import { withTimeout } from "@/utils/withTimeout";
import { z } from "zod";

const SetDetail = () => {
  const { setId } = useParams<{ setId: string }>();
  const navigate = useNavigate();
  const [set, setSet] = useState<PokemonSet | null>(null);
  const [cards, setCards] = useState<PokemonCardType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [useLocalData, setUseLocalData] = useState(false);
  const [useAiCards, setUseAiCards] = useState(false);

  useEffect(() => {
    if (!setId) return;
    const controller = new AbortController();
    let active = true;
    const local = pokemonSets.find(candidate => candidate.id === setId);
    const fallback: PokemonSet | null = local ? {
      id: local.id, name: local.name, series: local.series, printedTotal: local.totalCards,
      total: local.totalCards, releaseDate: local.releaseDate,
      images: { symbol: "", logo: "" }, ptcgoCode: local.setCode,
    } : null;
    const generate = async (setData: PokemonSet) => {
      if (!active) return;
      setIsGenerating(true);
      const result = await withTimeout(signal => invokeAi("generate-set-cards", {
        setId: setData.id, setName: setData.name, totalCards: setData.total,
      }, signal), controller.signal, 55000);
      const parsed = z.object({ data: z.array(z.object({
        id: z.string(), name: z.string(), number: z.string(),
        images: z.object({ small: z.string().url(), large: z.string().url() }),
        set: z.object({ name: z.string(), series: z.string().default("") }),
        types: z.array(z.string()).optional(), rarity: z.string().optional(), hp: z.string().optional(),
      })) }).parse(result);
      // The runtime schema requires these fields; strictNullChecks is disabled in this project.
      if (active) { setCards(parsed.data as PokemonCardType[]); setUseAiCards(true); }
    };
    const load = async () => {
      setIsLoading(true); setIsGenerating(false); setSet(null); setCards([]);
      setUseLocalData(false); setUseAiCards(false);
      try {
        let data = fallback;
        try {
          const remote = await withTimeout(signal => getSetById(setId, signal), controller.signal);
          if (!active) return;
          if (remote) data = remote;
          else setUseLocalData(true);
        } catch {
          if (!active) return;
          setUseLocalData(true);
        }
        if (!data || !active) return;
        setSet(data);
        let result: Awaited<ReturnType<typeof getCardsBySet>> | null = null;
        try {
          result = await withTimeout(signal => getCardsBySet(setId, signal), controller.signal, 15000);
        } catch { /* An unavailable card API can use the authenticated AI fallback. */ }
        if (!active) return;
        if (result?.data.length) setCards(result.data);
        else await generate(data);
      } catch (error) {
        if (active) toast.error(error instanceof Error ? error.message : "Kunde inte ladda setet.");
      } finally { if (active) { setIsLoading(false); setIsGenerating(false); } }
    };
    void load();
    return () => { active = false; controller.abort(); };
  }, [setId]);

  if (isLoading || isGenerating) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="container mx-auto px-4 pt-24 pb-16">
          <div className="flex flex-col items-center justify-center py-32 gap-4">
            {isGenerating ? (
              <>
                <Sparkles className="w-12 h-12 animate-pulse text-primary" />
                <p className="text-muted-foreground">
                  <TranslatedText text="Genererar kort med AI..." />
                </p>
              </>
            ) : (
              <Loader2 className="w-12 h-12 animate-spin text-primary" />
            )}
          </div>
        </div>
      </div>
    );
  }

  if (!set) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="container mx-auto px-4 pt-24 pb-16">
          <div className="text-center py-16">
            <h1 className="text-2xl font-bold mb-4">
              <TranslatedText text="Set hittades inte" />
            </h1>
            <Button onClick={() => navigate("/gallery")}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              <TranslatedText text="Tillbaka till galleriet" />
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <div className="container mx-auto px-4 pt-24 pb-16">
        <div className="max-w-7xl mx-auto">
          {/* Back Button */}
          <Button 
            variant="ghost" 
            onClick={() => navigate("/gallery")}
            className="mb-6"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            <TranslatedText text="Tillbaka till galleriet" />
          </Button>

          {/* Set Header */}
          <div className="mb-8 text-center">
            {!useLocalData && set.images.logo && (
              <div className="flex items-center justify-center gap-4 mb-4">
                {set.images.symbol && (
                  <img 
                    src={set.images.symbol} 
                    alt={`${set.name} symbol`}
                    className="w-12 h-12 object-contain"
                  />
                )}
                <img 
                  src={set.images.logo} 
                  alt={set.name}
                  className="max-h-20 object-contain"
                />
              </div>
            )}
            
            {useLocalData && (
              <h1 className="text-3xl font-bold mb-4">
                <span className="bg-gradient-hero bg-clip-text text-transparent">
                  <TranslatedText text={set.name} />
                </span>
              </h1>
            )}
            
            <p className="text-lg text-muted-foreground mb-2">
              <TranslatedText text={set.series} />
            </p>
            
            <div className="flex items-center justify-center gap-6 text-sm text-muted-foreground flex-wrap">
              <span>
                <TranslatedText text="Utgivning" />: {new Date(set.releaseDate).toLocaleDateString('sv-SE')}
              </span>
              <span>•</span>
              <span>
                <TranslatedText text="Antal kort" />: {set.total}
              </span>
              {set.ptcgoCode && (
                <>
                  <span>•</span>
                  <span>
                    <TranslatedText text="Kod" />: {set.ptcgoCode}
                  </span>
                </>
              )}
              {useAiCards && (
                <>
                  <span>•</span>
                  <span className="flex items-center gap-1 text-primary">
                    <Sparkles className="w-3 h-3" />
                    <TranslatedText text="AI-genererade kort" />
                  </span>
                </>
              )}
            </div>
          </div>

          {/* Cards Grid */}
          {cards.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {cards.map((card) => (
                <PokemonCard
                  key={card.id}
                  id={card.id}
                  name={card.name}
                  image={card.images.small}
                  type={card.types?.[0]?.toLowerCase() || "normal"}
                  rarity={card.rarity?.toLowerCase() || "common"}
                  set={card.set.name}
                  number={card.number}
                  onClick={() => navigate(`/card/${card.id}`)}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-16 text-muted-foreground">
              <TranslatedText 
                text="Kort för detta set är inte tillgängliga ännu. API:et kan vara överbelastat."
                className="text-lg"
                as="p"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SetDetail;
