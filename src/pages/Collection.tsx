import { useMemo } from "react";
import Navigation from "@/components/Navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TranslatedText } from "@/components/TranslatedText";
import { useScannedCards } from "@/hooks/useScannedCards";
import { convertPriceRange } from "@/utils/currency";
import { useLanguage } from "@/contexts/LanguageContext";
import { Calendar, Scan, Trash2 } from "lucide-react";

const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleString("sv-SE", {
    dateStyle: "medium",
    timeStyle: "short",
  });
};

const Collection = () => {
  const { cards, clearCards } = useScannedCards();
  const { currency } = useLanguage();

  const formattedCards = useMemo(
    () =>
      cards.map((card) => ({
        ...card,
        estimatedValue: card.estimatedValue
          ? convertPriceRange(card.estimatedValue, currency)
          : undefined,
      })),
    [cards, currency]
  );

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <div className="container mx-auto px-4 pt-24 pb-16">
        <div className="max-w-6xl mx-auto space-y-8">
          <div className="text-center space-y-3">
            <h1 className="text-4xl font-bold">
              <span className="bg-gradient-hero bg-clip-text text-transparent">
                <TranslatedText text="Din skannade kortsamling" />
              </span>
            </h1>
            <TranslatedText
              text="Alla kort du har analyserat sparas lokalt på enheten så att du kan hålla koll på din samling."
              className="text-lg text-muted-foreground max-w-3xl mx-auto"
              as="p"
            />
          </div>

          <div className="flex justify-end">
            <Button
              variant="outline"
              onClick={clearCards}
              disabled={cards.length === 0}
              className="gap-2"
            >
              <Trash2 className="w-4 h-4" />
              <TranslatedText text="Rensa samling" />
            </Button>
          </div>

          {cards.length === 0 ? (
            <Card className="p-8 text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
                <Scan className="w-7 h-7 text-muted-foreground" />
              </div>
              <CardTitle className="mb-2">
                <TranslatedText text="Du har inte skannat några kort ännu" />
              </CardTitle>
              <TranslatedText
                text="Besök skannern för att analysera dina kort och se dem dyka upp här."
                className="text-muted-foreground"
                as="p"
              />
            </Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
              {formattedCards.map((card) => (
                <Card key={card.id} className="overflow-hidden">
                  <div className="relative aspect-[3/4] bg-muted">
                    {card.image ? (
                      <img
                        src={card.image}
                        alt={card.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
                        <TranslatedText text="Ingen bild tillgänglig" />
                      </div>
                    )}
                    <div className="absolute top-3 left-3">
                      <Badge variant="secondary" className="flex items-center gap-2">
                        <Calendar className="w-3 h-3" />
                        {formatDate(card.scannedAt)}
                      </Badge>
                    </div>
                  </div>

                  <CardHeader className="space-y-2">
                    <div className="flex items-center justify-between gap-3">
                      <CardTitle className="text-xl">{card.name}</CardTitle>
                      <Badge className="capitalize">{card.type}</Badge>
                    </div>
                    <div className="flex items-center justify-between gap-3 text-sm text-muted-foreground">
                      <span className="font-medium">{card.set}</span>
                      <span>#{card.number}</span>
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-3 pt-0 pb-4">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="capitalize">
                        <TranslatedText text="Sällsynthet" />: {card.rarity}
                      </Badge>
                      {card.condition && (
                        <Badge variant="outline">
                          <TranslatedText text="Skick" />: {card.condition}
                        </Badge>
                      )}
                    </div>

                    {card.estimatedValue && (
                      <div className="text-lg font-semibold text-primary">
                        <TranslatedText text="Uppskattat värde" />: {card.estimatedValue}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Collection;
