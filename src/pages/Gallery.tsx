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

  // Filter sets based on search and series, sorted from newest to oldest
  const filteredSets = setsWithLogos
    .filter(set => {
      const matchesSearch = set.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           set.setCode.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesSeries = filterSeries === "all" || set.series === filterSeries;
      return matchesSearch && matchesSeries;
    })
    .sort((a, b) => new Date(b.releaseDate).getTime() - new Date(a.releaseDate).getTime());

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
          <div className="mb-6">
            <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-1">
              <TranslatedText text="Bibliotek" />
            </p>
            <h1 className="text-3xl font-bold tracking-tight">
              <TranslatedText text="Alla set" />
            </h1>
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

          {/* Sets Grid — Collectr style */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {filteredSets.map((set) => (
              <button
                key={set.id}
                onClick={() => handleSelectSet(set)}
                className="group bg-card/60 border border-border/60 rounded-2xl p-4 flex flex-col items-center text-center hover:bg-card hover:border-border transition"
              >
                <div className="w-full aspect-square flex items-center justify-center mb-3 rounded-xl bg-muted/30 p-3">
                  {set.logo ? (
                    <img
                      src={set.logo}
                      alt={set.name}
                      className="max-h-full max-w-full object-contain group-hover:scale-105 transition"
                      loading="lazy"
                      onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                    />
                  ) : (
                    <span className="text-xs font-mono text-muted-foreground">{set.setCode}</span>
                  )}
                </div>
                <h4 className="text-xs font-bold leading-tight line-clamp-2">
                  <TranslatedText text={set.name} />
                </h4>
                <div className="mt-2 flex items-center space-x-2">
                  <span className="text-[10px] text-muted-foreground font-medium">{set.totalCards}</span>
                  <span className="w-1 h-1 bg-border rounded-full" />
                  <span className="text-[10px] text-muted-foreground font-medium">{new Date(set.releaseDate).getFullYear()}</span>
                </div>
              </button>
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
