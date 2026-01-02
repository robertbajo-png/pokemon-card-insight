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
    if (setId) {
      loadSetData();
    }
  }, [setId]);

  const generateCardsWithAI = async (setData: PokemonSet) => {
    setIsGenerating(true);
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const response = await fetch(`${supabaseUrl}/functions/v1/generate-set-cards`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          setId: setData.id,
          setName: setData.name,
          totalCards: setData.total
        })
      });

      if (!response.ok) {
        throw new Error('Failed to generate cards');
      }

      const data = await response.json();
      if (data.data && data.data.length > 0) {
        setCards(data.data);
        setUseAiCards(true);
        toast.success(`${data.data.length} kort genererade med AI!`);
      } else {
        throw new Error('No cards generated');
      }
    } catch (error) {
      console.error('Error generating cards with AI:', error);
      toast.error('Kunde inte generera kort med AI');
    } finally {
      setIsGenerating(false);
    }
  };

  const loadSetData = async () => {
    if (!setId) return;
    
    setIsLoading(true);
    try {
      // Try to fetch set info from API first
      const setData = await getSetById(setId);
      
      if (setData) {
        setSet(setData);
        // Try to fetch cards, but with a short timeout
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 5000);
          
          const cardsData = await getCardsBySet(setId);
          clearTimeout(timeoutId);
          
          if (cardsData.data.length > 0) {
            setCards(cardsData.data);
          } else {
            // No cards from API, generate with AI
            await generateCardsWithAI(setData);
          }
        } catch {
          // Cards fetch failed, generate with AI
          await generateCardsWithAI(setData);
        }
      } else {
        // Fallback to local data if API fails
        const localSet = pokemonSets.find(s => s.id === setId);
        if (localSet) {
          setUseLocalData(true);
          const localSetData: PokemonSet = {
            id: localSet.id,
            name: localSet.name,
            series: localSet.series,
            printedTotal: localSet.totalCards,
            total: localSet.totalCards,
            releaseDate: localSet.releaseDate,
            images: { symbol: "", logo: "" },
            ptcgoCode: localSet.setCode
          };
          setSet(localSetData);
          // Generate cards with AI for local set
          await generateCardsWithAI(localSetData);
        }
      }
    } catch (error) {
      console.error("Error loading set data:", error);
      
      // Fallback to local data
      const localSet = pokemonSets.find(s => s.id === setId);
      if (localSet) {
        setUseLocalData(true);
        const localSetData: PokemonSet = {
          id: localSet.id,
          name: localSet.name,
          series: localSet.series,
          printedTotal: localSet.totalCards,
          total: localSet.totalCards,
          releaseDate: localSet.releaseDate,
          images: { symbol: "", logo: "" },
          ptcgoCode: localSet.setCode
        };
        setSet(localSetData);
        await generateCardsWithAI(localSetData);
      }
    } finally {
      setIsLoading(false);
    }
  };

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
