import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Navigation from "@/components/Navigation";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Loader2 } from "lucide-react";
import { TranslatedText } from "@/components/TranslatedText";
import { getAllSets, type PokemonSet } from "@/services/pokemonTcgApi";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

const Gallery = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [filterSeries, setFilterSeries] = useState("all");
  const [sets, setSets] = useState<PokemonSet[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadSets();
  }, []);

  const loadSets = async () => {
    setIsLoading(true);
    try {
      const allSets = await getAllSets();
      setSets(allSets);
    } catch (error) {
      console.error("Error loading sets:", error);
      toast.error("Kunde inte ladda set. Försök igen.");
    } finally {
      setIsLoading(false);
    }
  };

  // Get unique series for filtering
  const uniqueSeries = ["all", ...Array.from(new Set(sets.map(set => set.series)))];

  // Filter sets based on search and series
  const filteredSets = sets.filter(set => {
    const matchesSearch = set.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         set.id.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesSeries = filterSeries === "all" || set.series === filterSeries;
    return matchesSearch && matchesSeries;
  });

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
          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {filteredSets.map((set) => (
                  <Card 
                    key={set.id}
                    className="cursor-pointer hover:shadow-lg transition-all duration-300 hover:scale-105 overflow-hidden"
                    onClick={() => navigate(`/set/${set.id}`)}
                  >
                    <CardHeader className="pb-4">
                      <div className="flex items-center justify-between mb-3">
                        <img 
                          src={set.images.symbol} 
                          alt={`${set.name} symbol`}
                          className="w-8 h-8 object-contain"
                        />
                        <span className="text-xs text-muted-foreground">
                          {new Date(set.releaseDate).getFullYear()}
                        </span>
                      </div>
                      <div className="flex items-center justify-center mb-3 h-16">
                        <img 
                          src={set.images.logo} 
                          alt={set.name}
                          className="max-h-full max-w-full object-contain"
                        />
                      </div>
                      <CardDescription className="text-center">
                        <TranslatedText text={set.series} />
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">
                          <TranslatedText text="Antal kort" />:
                        </span>
                        <span className="font-semibold">{set.total}</span>
                      </div>
                      <div className="mt-2 text-xs text-muted-foreground text-center">
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
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Gallery;
