import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface PokemonCardProps {
  id: string;
  name: string;
  image: string;
  type: string;
  rarity: string;
  set?: string;
  number?: string;
  onClick?: () => void;
  className?: string;
}

const PokemonCard = ({ name, image, type, rarity, onClick, className }: PokemonCardProps) => {
  const typeColors: Record<string, string> = {
    fire: "from-orange-500 to-red-500",
    water: "from-blue-500 to-cyan-500",
    lightning: "from-yellow-400 to-yellow-600",
    electric: "from-yellow-400 to-yellow-600",
    grass: "from-green-500 to-emerald-500",
    psychic: "from-purple-500 to-pink-500",
    fighting: "from-red-600 to-orange-600",
    darkness: "from-gray-800 to-purple-900",
    metal: "from-gray-400 to-slate-600",
    dragon: "from-indigo-600 to-purple-600",
    fairy: "from-pink-400 to-rose-500",
    colorless: "from-gray-400 to-gray-500",
  };

  const rarityBadgeColors: Record<string, string> = {
    common: "bg-muted text-muted-foreground",
    uncommon: "bg-accent text-accent-foreground",
    rare: "bg-secondary text-secondary-foreground",
    "rare holo": "bg-gradient-primary text-primary-foreground",
    "rare ultra": "bg-gradient-primary text-primary-foreground",
    "rare secret": "bg-gradient-primary text-primary-foreground",
    ultra: "bg-gradient-primary text-primary-foreground",
  };

  return (
    <Card
      onClick={onClick}
      className={cn(
        "group relative overflow-hidden cursor-pointer transition-all duration-300 hover:scale-105 hover:shadow-card",
        className
      )}
    >
      <div className={cn("absolute inset-0 bg-gradient-to-br opacity-10", typeColors[type] || "from-gray-500 to-gray-700")} />
      
      <div className="relative p-4">
        <div className="aspect-[3/4] overflow-hidden rounded-lg mb-3">
          <img
            src={image}
            alt={name}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
          />
        </div>

        <div className="space-y-2">
          <h3 className="font-bold text-lg text-foreground">{name}</h3>
          
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm capitalize px-2 py-1 rounded-md bg-muted text-muted-foreground">
              {type}
            </span>
            <span className={cn("text-xs capitalize px-2 py-1 rounded-md font-medium", rarityBadgeColors[rarity])}>
              {rarity}
            </span>
          </div>
        </div>
      </div>
    </Card>
  );
};

export default PokemonCard;
