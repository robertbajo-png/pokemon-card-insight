import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, TrendingUp, Star } from "lucide-react";
import Navigation from "@/components/Navigation";
import charizardImg from "@/assets/card-charizard.jpg";
import pikachuImg from "@/assets/card-pikachu.jpg";
import blastoiseImg from "@/assets/card-blastoise.jpg";

const CardDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  // Mock data - skulle normalt komma från API eller state
  const cardData: Record<string, any> = {
    "1": {
      name: "Charizard",
      image: charizardImg,
      type: "Fire",
      rarity: "Ultra Rare",
      set: "Base Set",
      number: "4/102",
      hp: "120",
      attacks: [
        { name: "Fire Spin", damage: "100", cost: "4 Energy" },
        { name: "Flamethrower", damage: "90", cost: "3 Energy" },
      ],
      weakness: "Water",
      resistance: "Fighting",
      retreatCost: "3",
      description: "En kraftfull Fire-typ Pokemon som spyr intensiv eldflammor som kan smälta allt.",
      marketValue: "1200-1500 kr",
      priceHistory: [
        { date: "2024-01", value: 900 },
        { date: "2024-04", value: 1100 },
        { date: "2024-08", value: 1350 },
      ],
    },
  };

  const card = cardData[id || "1"] || cardData["1"];

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
                    src={card.image}
                    alt={card.name}
                    className="w-full h-full object-contain"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Star className="w-5 h-5 text-secondary" />
                    <span className="font-medium">{card.rarity}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-primary" />
                    <span className="font-bold text-primary">{card.marketValue}</span>
                  </div>
                </div>
              </Card>
            </div>

            {/* Card Details */}
            <div className="space-y-6">
              <div>
                <h1 className="text-4xl font-bold mb-2">{card.name}</h1>
                <div className="flex items-center gap-4">
                  <span className="px-3 py-1 rounded-lg bg-primary/10 text-primary font-medium">
                    {card.type}
                  </span>
                  <span className="text-muted-foreground">
                    {card.set} • {card.number}
                  </span>
                </div>
              </div>

              <Card className="p-6">
                <h2 className="text-xl font-bold mb-4">Grundläggande info</h2>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">HP:</span>
                    <span className="font-medium">{card.hp}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Svaghet:</span>
                    <span className="font-medium">{card.weakness}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Motstånd:</span>
                    <span className="font-medium">{card.resistance}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Reträttskostnad:</span>
                    <span className="font-medium">{card.retreatCost} Energy</span>
                  </div>
                </div>
              </Card>

              <Card className="p-6">
                <h2 className="text-xl font-bold mb-4">Attacker</h2>
                <div className="space-y-4">
                  {card.attacks.map((attack: any, index: number) => (
                    <div key={index} className="border-l-4 border-primary pl-4">
                      <div className="flex justify-between items-start mb-1">
                        <h3 className="font-bold">{attack.name}</h3>
                        <span className="text-primary font-bold">{attack.damage}</span>
                      </div>
                      <p className="text-sm text-muted-foreground">{attack.cost}</p>
                    </div>
                  ))}
                </div>
              </Card>

              <Card className="p-6">
                <h2 className="text-xl font-bold mb-4">Beskrivning</h2>
                <p className="text-muted-foreground leading-relaxed">{card.description}</p>
              </Card>

              <Card className="p-6 bg-gradient-hero text-white">
                <h2 className="text-xl font-bold mb-2">Marknadsvärde</h2>
                <p className="text-3xl font-bold mb-2">{card.marketValue}</p>
                <p className="text-sm opacity-90">Baserat på senaste försäljningar och marknadstrender</p>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CardDetail;
