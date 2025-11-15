import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Scan, Image, Sparkles } from "lucide-react";
import Navigation from "@/components/Navigation";
import heroBanner from "@/assets/hero-banner.jpg";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      {/* Hero Section */}
      <section className="relative pt-24 pb-16 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-hero opacity-10" />
        <div 
          className="absolute inset-0 bg-cover bg-center opacity-20"
          style={{ backgroundImage: `url(${heroBanner})` }}
        />
        
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

            <p className="text-xl md:text-2xl text-muted-foreground max-w-2xl mx-auto">
              Scanna, identifiera och utforska dina Pokemon-kort med AI-kraft
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link to="/scanner">
                <Button variant="hero" size="lg" className="gap-2">
                  <Scan className="w-5 h-5" />
                  Scanna Kort
                </Button>
              </Link>
              <Link to="/gallery">
                <Button variant="accent" size="lg" className="gap-2">
                  <Image className="w-5 h-5" />
                  Visa Galleri
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 bg-muted/50">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12">
            Kraftfulla Funktioner
          </h2>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            <div className="bg-card p-6 rounded-xl border border-border hover:shadow-card transition-all duration-300">
              <div className="w-12 h-12 bg-gradient-primary rounded-lg flex items-center justify-center mb-4">
                <Scan className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-bold mb-2">Scanna Kort</h3>
              <p className="text-muted-foreground">
                Ladda upp eller fotografera dina kort för omedelbar identifiering
              </p>
            </div>

            <div className="bg-card p-6 rounded-xl border border-border hover:shadow-card transition-all duration-300">
              <div className="w-12 h-12 bg-gradient-secondary rounded-lg flex items-center justify-center mb-4">
                <Sparkles className="w-6 h-6 text-foreground" />
              </div>
              <h3 className="text-xl font-bold mb-2">Detaljerad Info</h3>
              <p className="text-muted-foreground">
                Få fullständig information om sällsynthet, typ och värde
              </p>
            </div>

            <div className="bg-card p-6 rounded-xl border border-border hover:shadow-card transition-all duration-300">
              <div className="w-12 h-12 bg-accent rounded-lg flex items-center justify-center mb-4">
                <Image className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-bold mb-2">Kortgalleri</h3>
              <p className="text-muted-foreground">
                Utforska en samling av populära och sällsynta kort
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Index;
