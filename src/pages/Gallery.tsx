import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Navigation from "@/components/Navigation";
import PokemonCard from "@/components/PokemonCard";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search } from "lucide-react";
import charizardImg from "@/assets/card-charizard.jpg";
import pikachuImg from "@/assets/card-pikachu.jpg";
import blastoiseImg from "@/assets/card-blastoise.jpg";

const Gallery = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [filterRarity, setFilterRarity] = useState("all");

  const cards = [
    {
      id: "1",
      name: "Charizard",
      image: charizardImg,
      type: "fire",
      rarity: "ultra",
      set: "Base Set",
      number: "4/102",
    },
    {
      id: "2",
      name: "Pikachu",
      image: pikachuImg,
      type: "electric",
      rarity: "rare",
      set: "Base Set",
      number: "58/102",
    },
    {
      id: "3",
      name: "Blastoise",
      image: blastoiseImg,
      type: "water",
      rarity: "ultra",
      set: "Base Set",
      number: "2/102",
    },
    {
      id: "4",
      name: "Venusaur",
      image: charizardImg,
      type: "grass",
      rarity: "rare",
      set: "Base Set",
      number: "15/102",
    },
    {
      id: "5",
      name: "Mewtwo",
      image: pikachuImg,
      type: "psychic",
      rarity: "ultra",
      set: "Base Set",
      number: "10/102",
    },
    {
      id: "6",
      name: "Gyarados",
      image: blastoiseImg,
      type: "water",
      rarity: "rare",
      set: "Base Set",
      number: "6/102",
    },
  ];

  const filteredCards = cards.filter((card) => {
    const matchesSearch = card.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = filterType === "all" || card.type === filterType;
    const matchesRarity = filterRarity === "all" || card.rarity === filterRarity;
    return matchesSearch && matchesType && matchesRarity;
  });

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <div className="container mx-auto px-4 pt-24 pb-16">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold mb-4">
              <span className="bg-gradient-hero bg-clip-text text-transparent">
                Kortgalleri
              </span>
            </h1>
            <p className="text-lg text-muted-foreground">
              Utforska populära och sällsynta Pokemon-kort
            </p>
          </div>

          {/* Filters */}
          <div className="mb-8 space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Sök efter kort..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger>
                  <SelectValue placeholder="Filtrera efter typ" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Alla typer</SelectItem>
                  <SelectItem value="fire">Fire</SelectItem>
                  <SelectItem value="water">Water</SelectItem>
                  <SelectItem value="electric">Electric</SelectItem>
                  <SelectItem value="grass">Grass</SelectItem>
                  <SelectItem value="psychic">Psychic</SelectItem>
                </SelectContent>
              </Select>

              <Select value={filterRarity} onValueChange={setFilterRarity}>
                <SelectTrigger>
                  <SelectValue placeholder="Filtrera efter sällsynthet" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Alla sällsyntheter</SelectItem>
                  <SelectItem value="common">Common</SelectItem>
                  <SelectItem value="uncommon">Uncommon</SelectItem>
                  <SelectItem value="rare">Rare</SelectItem>
                  <SelectItem value="ultra">Ultra Rare</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredCards.map((card) => (
              <PokemonCard
                key={card.id}
                {...card}
                onClick={() => navigate(`/card/${card.id}`)}
              />
            ))}
          </div>

          {filteredCards.length === 0 && (
            <div className="text-center py-16 text-muted-foreground">
              <p className="text-lg">Inga kort matchar din sökning</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Gallery;
