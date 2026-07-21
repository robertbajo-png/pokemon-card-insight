import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowUpRight, Gavel, Image, Library, Scan, TrendingUp } from "lucide-react";
import Navigation from "@/components/Navigation";
import heroBanner from "@/assets/charizard-base-set.jpg";
import { TranslatedText } from "@/components/TranslatedText";
import { useScannedCards } from "@/hooks/useScannedCards";
import { pokemonSets } from "@/data/pokemonSets";

const Index = () => {
  const { cards } = useScannedCards();
  const totalSets = pokemonSets.length;
  const scannedCount = cards.length;

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <main className="container mx-auto px-4 pt-24 pb-16 max-w-2xl">
        {/* Hero portfolio card */}
        <section className="relative overflow-hidden rounded-3xl border border-border bg-card p-6 mb-6">
          <div className="absolute -top-24 -right-24 w-48 h-48 rounded-full blur-[60px] bg-primary/25" />
          <div className="absolute -bottom-24 -left-24 w-48 h-48 rounded-full blur-[60px] bg-secondary/20" />
          <div className="relative z-10">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-widest mb-1">
              <TranslatedText text="Din samling" />
            </p>
            <h1 className="text-4xl font-bold tracking-tighter">
              {scannedCount} <span className="text-muted-foreground text-2xl font-medium"><TranslatedText text="kort" /></span>
            </h1>
            <div className="mt-3 flex items-center gap-2">
              <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 text-[10px] font-bold rounded-full border border-emerald-500/20 inline-flex items-center gap-1">
                <TrendingUp className="w-3 h-3" /> AI
              </span>
              <span className="text-muted-foreground text-[11px]">
                <TranslatedText text="Skannat med Gemini" />
              </span>
            </div>

            <div className="mt-6 flex justify-center">
              <div className="relative w-40 rounded-xl overflow-hidden ring-1 ring-border shadow-glow">
                <img src={heroBanner} alt="Base Set Charizard" className="w-full h-auto" />
              </div>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-3">
              <Link to="/scanner">
                <Button className="w-full gap-2 rounded-xl bg-primary hover:bg-primary/90">
                  <Scan className="w-4 h-4" />
                  <TranslatedText text="Scanna" />
                </Button>
              </Link>
              <Link to="/gallery">
                <Button variant="outline" className="w-full gap-2 rounded-xl border-border bg-muted/40">
                  <Image className="w-4 h-4" />
                  <TranslatedText text="Galleri" />
                </Button>
              </Link>
            </div>
          </div>
        </section>

        {/* Quick stats */}
        <section className="grid grid-cols-3 gap-3 mb-6">
          <div className="bg-card/60 border border-border rounded-2xl p-4">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Sets</p>
            <p className="text-2xl font-bold mt-1">{totalSets}</p>
          </div>
          <div className="bg-card/60 border border-border rounded-2xl p-4">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              <TranslatedText text="Kort" />
            </p>
            <p className="text-2xl font-bold mt-1">{scannedCount}</p>
          </div>
          <div className="bg-card/60 border border-border rounded-2xl p-4">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">AI</p>
            <p className="text-2xl font-bold mt-1">3 Pro</p>
          </div>
        </section>

        {/* Explore section */}
        <section>
          <div className="flex items-end justify-between mb-4">
            <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
              <TranslatedText text="Utforska" />
            </h2>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {[
              { to: "/market", label: "Marknad", icon: Gavel },
              { to: "/collection", label: "Samling", icon: Library },
            ].map(({ to, label, icon: Icon }) => (
              <Link
                key={to}
                to={to}
                className="group bg-card/60 border border-border rounded-2xl p-4 flex items-center justify-between hover:bg-card transition"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center">
                    <Icon className="w-4 h-4 text-foreground" />
                  </div>
                  <span className="text-sm font-semibold"><TranslatedText text={label} /></span>
                </div>
                <ArrowUpRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition" />
              </Link>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
};

export default Index;
