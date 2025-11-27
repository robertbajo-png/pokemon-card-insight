import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Navigation from "@/components/Navigation";
import PokemonCard from "@/components/PokemonCard";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2 } from "lucide-react";
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
  const [useLocalData, setUseLocalData] = useState(false);

  useEffect(() => {
    if (setId) {
      loadSetData();
    }
  }, [setId]);

  const loadSetData = async () => {
    if (!setId) return;
    
    setIsLoading(true);
    try {
      // Try to fetch from API first
      const setData = await getSetById(setId);
      
      if (setData) {
        setSet(setData);
        // Fetch cards for this set
        const cardsData = await getCardsBySet(setId);
        setCards(cardsData.data);
      } else {
        // Fallback to local data if API fails
        const localSet = pokemonSets.find(s => s.id === setId);
        if (localSet) {
          setUseLocalData(true);
          // Convert local data format to match PokemonSet interface
          setSet({
            id: localSet.id,
            name: localSet.name,
            series: localSet.series,
            printedTotal: localSet.totalCards,
            total: localSet.totalCards,
            releaseDate: localSet.releaseDate,
            images: {
              symbol: "",
              logo: ""
            },
            ptcgoCode: localSet.setCode
          });
        }
      }
    } catch (error) {
      console.error("Error loading set data:", error);
      toast.error("Kunde inte ladda set från API, försöker med lokal data...");
      
      // Fallback to local data
      const localSet = pokemonSets.find(s => s.id === setId);
      if (localSet) {
        setUseLocalData(true);
        setSet({
          id: localSet.id,
          name: localSet.name,
          series: localSet.series,
          printedTotal: localSet.totalCards,
          total: localSet.totalCards,
          releaseDate: localSet.releaseDate,
          images: {
            symbol: "",
            logo: ""
          },
          ptcgoCode: localSet.setCode
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="container mx-auto px-4 pt-24 pb-16">
          <div className="flex items-center justify-center py-32">
            <Loader2 className="w-12 h-12 animate-spin text-primary" />
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
            
            <div className="flex items-center justify-center gap-6 text-sm text-muted-foreground">
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
