import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Navigation from "@/components/Navigation";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Search } from "lucide-react";
import { TranslatedText } from "@/components/TranslatedText";
import { pokemonSets } from "@/data/pokemonSets";
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import PokemonCard from "@/components/PokemonCard";
import { useScannedCards } from "@/hooks/useScannedCards";
import { getAllSets, getCardsBySet, type PokemonCard as PokemonCardType } from "@/services/pokemonTcgApi";
import type { PokemonSet as LocalPokemonSet } from "@/data/pokemonSets";

const Gallery = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [filterSeries, setFilterSeries] = useState("all");
  const [setsWithLogos, setSetsWithLogos] = useState(pokemonSets);
  const [selectedSet, setSelectedSet] = useState<LocalPokemonSet | null>(null);
  const [setCards, setSetCards] = useState<PokemonCardType[]>([]);
  const [isLoadingCards, setIsLoadingCards] = useState(false);
  const { cards: scannedCards } = useScannedCards();

  // Load logos in background after initial render
  useEffect(() => {
    const fetchLogos = async () => {
      try {
        const apiSets = await getAllSets();
        const mergedSets = pokemonSets.map(localSet => {
          const apiSet = apiSets.find(s => s.id === localSet.id);
          return {
            ...localSet,
            logo: apiSet?.images?.logo || `https://images.pokemontcg.io/${localSet.id}/logo.png`,
            symbol: apiSet?.images?.symbol || `https://images.pokemontcg.io/${localSet.id}/symbol.png`,
          };
        });
        setSetsWithLogos(mergedSets);
      } catch (error) {
        console.log("Could not fetch logos from API", error);
      }
    };

    fetchLogos();
  }, []);

  // Get unique series for filtering
  const uniqueSeries = ["all", ...Array.from(new Set(pokemonSets.map(set => set.series)))];

  // Filter sets based on search and series
  const filteredSets = setsWithLogos.filter(set => {
    const matchesSearch = set.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         set.setCode.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesSeries = filterSeries === "all" || set.series === filterSeries;
    return matchesSearch && matchesSeries;
  });

  const ownedCardsForSelectedSet = useMemo(() => {
    if (!selectedSet) return [];

    const normalizedName = selectedSet.name.toLowerCase();
    const normalizedCode = selectedSet.setCode.toLowerCase();

    return scannedCards.filter(card => {
      const normalizedSet = card.set.toLowerCase();
      return normalizedSet === normalizedName || normalizedSet === normalizedCode || normalizedSet.includes(normalizedName);
    });
  }, [scannedCards, selectedSet]);

  const handleSelectSet = async (set: LocalPokemonSet) => {
    setSelectedSet(set);
    setIsLoadingCards(true);
    setSetCards([]);

    try {
      const { data } = await getCardsBySet(set.id);
      setSetCards(data);
    } catch (error) {
      console.error("Failed to load cards for set", error);
    } finally {
      setIsLoadingCards(false);
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
                <TranslatedText text="Pokemon TCG Set Galleri" />
              </span>
            </h1>
            <TranslatedText 
              text="Utforska alla Pokemon kort-set från Base Set till Phantasmal Flames"
              className="text-lg text-muted-foreground"
              as="p"
            />
          </div>

          {/* Filters */}
          <div className="mb-8 space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Sök efter set..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            <div className="w-full">
              <Select value={filterSeries} onValueChange={setFilterSeries}>
                <SelectTrigger>
                  <SelectValue placeholder="Filtrera efter serie" />
                </SelectTrigger>
                <SelectContent>
                  {uniqueSeries.map((series) => (
                    <SelectItem key={series} value={series}>
                      {series === "all" ? "Alla serier" : series}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Sets Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredSets.map((set) => (
              <Card
                key={set.id}
                className="cursor-pointer hover:shadow-lg transition-all duration-300 hover:scale-105"
                onClick={() => handleSelectSet(set)}
              >
                <CardHeader>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-mono text-muted-foreground">{set.setCode}</span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(set.releaseDate).getFullYear()}
                    </span>
                  </div>
                  {/* Set Logo */}
                  {set.logo ? (
                    <div className="w-full h-24 flex items-center justify-center mb-4">
                      <img 
                        src={set.logo} 
                        alt={set.name}
                        className="max-h-20 w-auto object-contain"
                        loading="lazy"
                      />
                    </div>
                  ) : (
                    <div className="text-lg font-semibold mb-2">
                      <TranslatedText text={set.name} />
                    </div>
                  )}
                  <CardDescription>
                    <TranslatedText text={set.series} />
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">
                      <TranslatedText text="Antal kort" />:
                    </span>
                    <span className="font-semibold">{set.totalCards}</span>
                  </div>
                  <div className="mt-2 text-xs text-muted-foreground">
                    <TranslatedText text="Utgivning" />: {new Date(set.releaseDate).toLocaleDateString('sv-SE')}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {filteredSets.length === 0 && (
            <div className="text-center py-16 text-muted-foreground">
              <TranslatedText
                text="Inga set matchar din sökning"
                className="text-lg"
                as="p"
              />
            </div>
          )}

          {selectedSet && (
            <div className="mt-12 space-y-6">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div className="flex items-center gap-4">
                  {selectedSet.symbol && (
                    <img
                      src={selectedSet.symbol}
                      alt={`${selectedSet.name} symbol`}
                      className="w-10 h-10 object-contain"
                    />
                  )}
                  <div>
                    <h2 className="text-2xl font-bold flex items-center gap-2">
                      {selectedSet.logo ? (
                        <img
                          src={selectedSet.logo}
                          alt={selectedSet.name}
                          className="max-h-10 object-contain"
                        />
                      ) : (
                        <TranslatedText text={selectedSet.name} />
                      )}
                      <Badge variant="secondary">{selectedSet.setCode}</Badge>
                    </h2>
                    <p className="text-muted-foreground">
                      <TranslatedText text="Utgivning" />: {new Date(selectedSet.releaseDate).toLocaleDateString("sv-SE")}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Badge variant="outline" className="text-sm">
                    <TranslatedText text="Kort skannade i detta set" />: {ownedCardsForSelectedSet.length}
                  </Badge>
                  <Badge variant="outline" className="text-sm">
                    <TranslatedText text="Totalt antal kort" />: {selectedSet.totalCards}
                  </Badge>
                  <Button variant="outline" onClick={() => navigate(`/set/${selectedSet.id}`)}>
                    <TranslatedText text="Öppna setdetalj" />
                  </Button>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <TranslatedText text="Dina kort i setet" />
                  <Badge variant="secondary">{ownedCardsForSelectedSet.length}</Badge>
                </h3>
                {ownedCardsForSelectedSet.length > 0 ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                    {ownedCardsForSelectedSet.map((card) => (
                      <PokemonCard
                        key={card.id}
                        id={card.id}
                        name={card.name}
                        image={card.image || selectedSet.logo || selectedSet.symbol || `https://images.pokemontcg.io/${selectedSet.id}/logo.png`}
                        type={card.type}
                        rarity={card.rarity}
                        set={card.set}
                        number={card.number}
                        onClick={() => navigate(`/card/${card.id}`)}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="text-sm text-muted-foreground">
                    <TranslatedText text="Du har inte skannat några kort från detta set ännu." />
                  </div>
                )}
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-semibold">
                    <TranslatedText text="Alla kort i setet" />
                  </h3>
                  {isLoadingCards && <Loader2 className="w-4 h-4 animate-spin text-primary" />}
                  {!isLoadingCards && setCards.length > 0 && (
                    <Badge variant="secondary">{setCards.length}</Badge>
                  )}
                </div>

                {isLoadingCards ? (
                  <div className="flex items-center justify-center py-12 text-muted-foreground">
                    <TranslatedText text="Laddar kort från setet..." />
                  </div>
                ) : setCards.length > 0 ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                    {setCards.map((card) => (
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
                  <div className="text-sm text-muted-foreground">
                    <TranslatedText text="Korten i detta set kunde inte hämtas just nu." />
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Gallery;
