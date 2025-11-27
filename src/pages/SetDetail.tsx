import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Navigation from "@/components/Navigation";
import PokemonCard from "@/components/PokemonCard";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2 } from "lucide-react";
import { getCardsBySet, getSetById, type PokemonCard as PokemonCardType, type PokemonSet } from "@/services/pokemonTcgApi";
import { toast } from "sonner";
import { TranslatedText } from "@/components/TranslatedText";

const SetDetail = () => {
  const { setId } = useParams<{ setId: string }>();
  const navigate = useNavigate();
  const [set, setSet] = useState<PokemonSet | null>(null);
  const [cards, setCards] = useState<PokemonCardType[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (setId) {
      loadSetData();
    }
  }, [setId]);

  const loadSetData = async () => {
    if (!setId) return;
    
    setIsLoading(true);
    try {
      const [setData, cardsData] = await Promise.all([
        getSetById(setId),
        getCardsBySet(setId)
      ]);
      
      setSet(setData);
      setCards(cardsData.data);
    } catch (error) {
      console.error("Error loading set data:", error);
      toast.error("Kunde inte ladda set. Försök igen.");
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
            <div className="flex items-center justify-center gap-4 mb-4">
              <img 
                src={set.images.symbol} 
                alt={`${set.name} symbol`}
                className="w-12 h-12 object-contain"
              />
              <img 
                src={set.images.logo} 
                alt={set.name}
                className="max-h-20 object-contain"
              />
            </div>
            
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

          {cards.length === 0 && (
            <div className="text-center py-16 text-muted-foreground">
              <TranslatedText 
                text="Inga kort hittades i detta set"
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
