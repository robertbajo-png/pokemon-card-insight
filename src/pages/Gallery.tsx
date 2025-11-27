import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Navigation from "@/components/Navigation";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search } from "lucide-react";
import { TranslatedText } from "@/components/TranslatedText";
import { pokemonSets } from "@/data/pokemonSets";
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card";

const Gallery = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [filterSeries, setFilterSeries] = useState("all");

  // Get unique series for filtering
  const uniqueSeries = ["all", ...Array.from(new Set(pokemonSets.map(set => set.series)))];

  // Filter sets based on search and series
  const filteredSets = pokemonSets.filter(set => {
    const matchesSearch = set.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         set.setCode.toLowerCase().includes(searchQuery.toLowerCase());
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredSets.map((set) => (
              <Card 
                key={set.id}
                className="cursor-pointer hover:shadow-lg transition-all duration-300 hover:scale-105"
                onClick={() => navigate(`/set/${set.id}`)}
              >
                <CardHeader>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-mono text-muted-foreground">{set.setCode}</span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(set.releaseDate).getFullYear()}
                    </span>
                  </div>
                  <div className="text-lg font-semibold mb-2">
                    <TranslatedText text={set.name} />
                  </div>
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
        </div>
      </div>
    </div>
  );
};

export default Gallery;
