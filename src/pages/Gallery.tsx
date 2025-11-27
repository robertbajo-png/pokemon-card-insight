import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Navigation from "@/components/Navigation";
import PokemonCard from "@/components/PokemonCard";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Loader2 } from "lucide-react";
import { filterCards, type PokemonCard as PokemonCardType } from "@/services/pokemonTcgApi";
import { toast } from "sonner";
import { TranslatedText } from "@/components/TranslatedText";

const Gallery = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [filterRarity, setFilterRarity] = useState("all");
  const [cards, setCards] = useState<PokemonCardType[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadCards();
  }, [searchQuery, filterType, filterRarity]);

  const loadCards = async () => {
    setIsLoading(true);
    try {
      console.log('Loading cards with filters:', { searchQuery, filterType, filterRarity });
      const types = filterType !== "all" ? [filterType] : undefined;
      const rarity = filterRarity !== "all" ? filterRarity : undefined;
      
      const { data } = await filterCards({
        searchQuery: searchQuery || undefined,
        types,
        rarity,
      });
      
      console.log('Cards loaded:', data);
      setCards(data);
    } catch (error) {
      console.error("Error loading cards:", error);
      toast.error("Kunde inte ladda kort. Försök igen.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <div className="container mx-auto px-4 pt-24 pb-16">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold mb-4">
              <span className="bg-gradient-hero bg-clip-text text-transparent">
                <TranslatedText text="Kortgalleri" />
              </span>
            </h1>
            <TranslatedText 
              text="Utforska populära och sällsynta Pokemon-kort"
              className="text-lg text-muted-foreground"
              as="p"
            />
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
                  <SelectItem value="Fire">Fire</SelectItem>
                  <SelectItem value="Water">Water</SelectItem>
                  <SelectItem value="Lightning">Electric</SelectItem>
                  <SelectItem value="Grass">Grass</SelectItem>
                  <SelectItem value="Psychic">Psychic</SelectItem>
                  <SelectItem value="Fighting">Fighting</SelectItem>
                  <SelectItem value="Darkness">Darkness</SelectItem>
                  <SelectItem value="Metal">Metal</SelectItem>
                  <SelectItem value="Dragon">Dragon</SelectItem>
                  <SelectItem value="Fairy">Fairy</SelectItem>
                </SelectContent>
              </Select>

              <Select value={filterRarity} onValueChange={setFilterRarity}>
                <SelectTrigger>
                  <SelectValue placeholder="Filtrera efter sällsynthet" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Alla sällsyntheter</SelectItem>
                  <SelectItem value="Common">Common</SelectItem>
                  <SelectItem value="Uncommon">Uncommon</SelectItem>
                  <SelectItem value="Rare">Rare</SelectItem>
                  <SelectItem value="Rare Holo">Rare Holo</SelectItem>
                  <SelectItem value="Rare Ultra">Ultra Rare</SelectItem>
                  <SelectItem value="Rare Secret">Secret Rare</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Cards Grid */}
          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
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
                    text="Inga kort matchar din sökning"
                    className="text-lg"
                    as="p"
                  />
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Gallery;
