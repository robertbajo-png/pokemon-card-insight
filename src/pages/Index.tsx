import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Gavel, Image, Library, Scan, Sparkles } from "lucide-react";
import Navigation from "@/components/Navigation";
import heroBanner from "@/assets/charizard-base-set.jpg";
import { TranslatedText } from "@/components/TranslatedText";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      {/* Hero Section */}
      <section className="relative pt-24 pb-16 overflow-hidden">
        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-4xl mx-auto text-center space-y-8">
            <div className="inline-block animate-float">
              <div className="w-20 h-20 bg-gradient-hero rounded-2xl flex items-center justify-center shadow-glow">
                <Scan className="w-10 h-10 text-white" />
              </div>
            </div>

            <h1 className="text-5xl md:text-7xl font-bold">
              <span className="bg-gradient-hero bg-clip-text text-transparent">
                Pokemon Card Lens
              </span>
            </h1>

            <TranslatedText 
              text="Scanna, identifiera och utforska dina Pokemon-kort med AI-kraft"
              className="text-xl md:text-2xl text-muted-foreground max-w-2xl mx-auto"
              as="p"
            />

            {/* Charizard Card Display */}
            <div className="flex justify-center my-8">
              <div className="relative w-64 md:w-80 transform hover:scale-105 transition-transform duration-300">
                <img 
                  src={heroBanner} 
                  alt="Base Set Holo Charizard" 
                  className="w-full h-auto rounded-xl shadow-2xl"
                />
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link to="/scanner">
                <Button variant="hero" size="lg" className="gap-2">
                  <Scan className="w-5 h-5" />
                  <TranslatedText text="Scanna Kort" />
                </Button>
              </Link>
              <Link to="/gallery">
                <Button variant="accent" size="lg" className="gap-2">
                  <Image className="w-5 h-5" />
                  <TranslatedText text="Visa Galleri" />
                </Button>
              </Link>
              <Link to="/market">
                <Button variant="default" size="lg" className="gap-2">
                  <Gavel className="w-5 h-5" />
                  <TranslatedText text="Marknadsplats" />
                </Button>
              </Link>
              <Link to="/collection">
                <Button variant="outline" size="lg" className="gap-2">
                  <Library className="w-5 h-5" />
                  <TranslatedText text="Se samling" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 bg-muted/50">
        <div className="container mx-auto px-4">
          <TranslatedText 
            text="Kraftfulla Funktioner"
            className="text-3xl font-bold text-center mb-12"
            as="h2"
          />

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 max-w-5xl mx-auto">
            <div className="bg-card p-6 rounded-xl border border-border hover:shadow-card transition-all duration-300">
              <div className="w-12 h-12 bg-gradient-primary rounded-lg flex items-center justify-center mb-4">
                <Scan className="w-6 h-6 text-white" />
              </div>
              <TranslatedText text="Scanna Kort" className="text-xl font-bold mb-2" as="h3" />
              <TranslatedText 
                text="Ladda upp eller fotografera dina kort för omedelbar identifiering"
                className="text-muted-foreground"
                as="p"
              />
            </div>

            <div className="bg-card p-6 rounded-xl border border-border hover:shadow-card transition-all duration-300">
              <div className="w-12 h-12 bg-gradient-secondary rounded-lg flex items-center justify-center mb-4">
                <Sparkles className="w-6 h-6 text-foreground" />
              </div>
              <TranslatedText text="Detaljerad Info" className="text-xl font-bold mb-2" as="h3" />
              <TranslatedText
                text="Få fullständig information om sällsynthet, typ och värde"
                className="text-muted-foreground"
                as="p"
              />
            </div>

            <div className="bg-card p-6 rounded-xl border border-border hover:shadow-card transition-all duration-300">
              <div className="w-12 h-12 bg-accent rounded-lg flex items-center justify-center mb-4">
                <Image className="w-6 h-6 text-white" />
              </div>
              <TranslatedText text="Kortgalleri" className="text-xl font-bold mb-2" as="h3" />
              <TranslatedText
                text="Utforska en samling av populära och sällsynta kort"
                className="text-muted-foreground"
                as="p"
              />
            </div>

            <div className="bg-card p-6 rounded-xl border border-border hover:shadow-card transition-all duration-300">
              <div className="w-12 h-12 bg-primary/10 text-primary rounded-lg flex items-center justify-center mb-4">
                <Gavel className="w-6 h-6" />
              </div>
              <TranslatedText text="Marknadsplats" className="text-xl font-bold mb-2" as="h3" />
              <TranslatedText
                text="Sälj och buda på kort via auktioner tillsammans med andra samlare"
                className="text-muted-foreground"
                as="p"
              />
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Index;
