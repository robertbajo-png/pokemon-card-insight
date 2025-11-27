import Navigation from "@/components/Navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { TranslatedText } from "@/components/TranslatedText";
import { Coins, Gavel, ShieldCheck, Users } from "lucide-react";
import { Link } from "react-router-dom";

const auctionHighlights = [
  {
    title: "Starta en auktion",
    description: "Skapa en listning, sätt ett utgångspris och låt andra samlares bud avgöra slutpriset.",
    icon: Gavel,
  },
  {
    title: "Trygga affärer",
    description: "Verifierad historik och tydlig budgivning ger en säker upplevelse för både köpare och säljare.",
    icon: ShieldCheck,
  },
  {
    title: "Maximera värdet",
    description: "Se marknadstrender och låt efterfrågan avgöra slutpriset på dina mest eftertraktade kort.",
    icon: Coins,
  },
  {
    title: "Handla med samlare",
    description: "Bygg förtroende i communityn och hitta nya kort genom att köpa och sälja med andra entusiaster.",
    icon: Users,
  },
];

const Market = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <div className="container mx-auto px-4 pt-24 pb-16">
        <div className="max-w-4xl mx-auto text-center space-y-6 mb-12">
          <div className="inline-flex items-center gap-3 bg-primary/10 text-primary px-4 py-2 rounded-full">
            <Gavel className="w-4 h-4" />
            <TranslatedText text="Ny marknadsplats" className="text-sm font-medium" />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold">
            <span className="bg-gradient-hero bg-clip-text text-transparent">
              <TranslatedText text="Sälj och köp kort på auktion" />
            </span>
          </h1>
          <TranslatedText
            text="Anslut till samlarcommunityn och låt marknaden bestämma värdet på dina kort genom trygga auktioner."
            className="text-lg text-muted-foreground max-w-2xl mx-auto"
            as="p"
          />

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button variant="hero" size="lg" className="gap-2">
              <Gavel className="w-5 h-5" />
              <TranslatedText text="Skapa auktion" />
            </Button>
            <Link to="/collection">
              <Button variant="outline" size="lg" className="gap-2">
                <Users className="w-5 h-5" />
                <TranslatedText text="Se dina kort" />
              </Button>
            </Link>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6 max-w-5xl mx-auto">
          {auctionHighlights.map((highlight) => {
            const Icon = highlight.icon;
            return (
              <Card key={highlight.title} className="border-border/80 shadow-card">
                <CardHeader className="space-y-3">
                  <div className="w-12 h-12 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                    <Icon className="w-6 h-6" />
                  </div>
                  <CardTitle>
                    <TranslatedText text={highlight.title} />
                  </CardTitle>
                  <CardDescription>
                    <TranslatedText text={highlight.description} />
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <TranslatedText text="Auktionsstatus" />
                    <span className="font-medium text-primary">
                      <TranslatedText text="Kommer snart" />
                    </span>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default Market;
