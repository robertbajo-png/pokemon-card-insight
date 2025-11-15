import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, TrendingUp, Star, Loader2 } from "lucide-react";
import Navigation from "@/components/Navigation";
import { getCardById, type PokemonCard as PokemonCardType } from "@/services/pokemonTcgApi";
import { toast } from "sonner";

const CardDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [card, setCard] = useState<PokemonCardType | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (id) {
      loadCard(id);
    }
  }, [id]);

  const loadCard = async (cardId: string) => {
    setIsLoading(true);
    try {
      const data = await getCardById(cardId);
      if (data) {
        setCard(data);
      } else {
        toast.error("Kort hittades inte");
        navigate("/gallery");
      }
    } catch (error) {
      console.error("Error loading card:", error);
      toast.error("Kunde inte ladda kort");
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="container mx-auto px-4 pt-24 pb-16 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (!card) {
    return null;
  }

  const marketValue = card.cardmarket?.prices?.trendPrice 
    ? `${Math.round(card.cardmarket.prices.trendPrice * 11)} kr` 
    : "Pris ej tillgängligt";

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <div className="container mx-auto px-4 pt-24 pb-16">
        <div className="max-w-6xl mx-auto">
          <Button
            variant="ghost"
            onClick={() => navigate("/gallery")}
            className="mb-6"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Tillbaka till galleri
          </Button>

          <div className="grid md:grid-cols-2 gap-8">
            {/* Card Image */}
            <div>
              <Card className="p-6 sticky top-24">
                <div className="aspect-[3/4] overflow-hidden rounded-lg mb-4">
                  <img
                    src={card.images.large}
                    alt={card.name}
                    className="w-full h-full object-contain"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Star className="w-5 h-5 text-secondary" />
                    <span className="font-medium">{card.rarity || "Unknown"}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-primary" />
                    <span className="font-bold text-primary">{marketValue}</span>
                  </div>
                </div>
              </Card>
            </div>

            {/* Card Details */}
            <div className="space-y-6">
              <div>
                <h1 className="text-4xl font-bold mb-2">{card.name}</h1>
                <div className="flex items-center gap-4 flex-wrap">
                  {card.types?.map((type) => (
                    <span key={type} className="px-3 py-1 rounded-lg bg-primary/10 text-primary font-medium">
                      {type}
                    </span>
                  ))}
                  <span className="text-muted-foreground">
                    {card.set.name} • {card.number}
                  </span>
                </div>
              </div>

              <Card className="p-6">
                <h2 className="text-xl font-bold mb-4">Grundläggande info</h2>
                <div className="space-y-3">
                  {card.hp && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">HP:</span>
                      <span className="font-medium">{card.hp}</span>
                    </div>
                  )}
                  {card.weaknesses && card.weaknesses.length > 0 && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Svaghet:</span>
                      <span className="font-medium">
                        {card.weaknesses.map(w => `${w.type} ${w.value}`).join(", ")}
                      </span>
                    </div>
                  )}
                  {card.resistances && card.resistances.length > 0 && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Motstånd:</span>
                      <span className="font-medium">
                        {card.resistances.map(r => `${r.type} ${r.value}`).join(", ")}
                      </span>
                    </div>
                  )}
                  {card.retreatCost && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Reträttskostnad:</span>
                      <span className="font-medium">{card.retreatCost.length} Energy</span>
                    </div>
                  )}
                </div>
              </Card>

              {card.attacks && card.attacks.length > 0 && (
                <Card className="p-6">
                  <h2 className="text-xl font-bold mb-4">Attacker</h2>
                  <div className="space-y-4">
                    {card.attacks.map((attack, index) => (
                      <div key={index} className="border-l-4 border-primary pl-4">
                        <div className="flex justify-between items-start mb-1">
                          <h3 className="font-bold">{attack.name}</h3>
                          <span className="text-primary font-bold">{attack.damage || "—"}</span>
                        </div>
                        <p className="text-sm text-muted-foreground mb-1">
                          {attack.cost.join(", ")}
                        </p>
                        {attack.text && (
                          <p className="text-sm">{attack.text}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </Card>
              )}

              {card.flavorText && (
                <Card className="p-6">
                  <h2 className="text-xl font-bold mb-4">Beskrivning</h2>
                  <p className="text-muted-foreground leading-relaxed">{card.flavorText}</p>
                </Card>
              )}

              <Card className="p-6">
                <h2 className="text-xl font-bold mb-4">Marknadsvärde</h2>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-lg">Estimerat värde:</span>
                    <span className="text-2xl font-bold text-primary">{marketValue}</span>
                  </div>
                  {card.cardmarket?.prices && (
                    <div className="pt-4 border-t border-border">
                      <h3 className="font-medium mb-2">Prisinformation</h3>
                      <div className="space-y-2">
                        {card.cardmarket.prices.averageSellPrice && (
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Genomsnittspris:</span>
                            <span className="font-medium">
                              {Math.round(card.cardmarket.prices.averageSellPrice * 11)} kr
                            </span>
                          </div>
                        )}
                        {card.cardmarket.prices.trendPrice && (
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Trendpris:</span>
                            <span className="font-medium">
                              {Math.round(card.cardmarket.prices.trendPrice * 11)} kr
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CardDetail;
