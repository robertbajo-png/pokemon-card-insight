import { useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { ArrowRight, Home, Library, SearchX } from "lucide-react";
import Navigation from "@/components/Navigation";
import { Button } from "@/components/ui/button";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname,
    );
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <main id="main-content" tabIndex={-1} className="page-shell">
        <section className="surface-panel mx-auto grid max-w-5xl overflow-hidden lg:grid-cols-[0.8fr_1.2fr]">
          <div className="relative flex min-h-52 flex-col items-center justify-center border-b border-border bg-primary/[0.045] p-8 sm:min-h-64 lg:min-h-[480px] lg:border-b-0 lg:border-r">
            <span className="text-[88px] font-semibold leading-none tracking-[-0.08em] text-primary/70 sm:text-[120px]">
              404
            </span>
            <span className="mt-5 flex h-11 w-11 items-center justify-center rounded-2xl border border-primary/20 bg-background/60 text-primary">
              <SearchX className="h-5 w-5" aria-hidden="true" />
            </span>
          </div>
          <div className="flex flex-col justify-center p-6 sm:p-10 lg:p-12">
            <p className="page-eyebrow">Sidan saknas</p>
            <h1 className="mt-4 text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">
              Här var det tomt.
            </h1>
            <p className="mt-4 max-w-md text-sm leading-relaxed text-muted-foreground">
              Vi hittar ingen sida på den här adressen. Länken kan vara gammal
              eller adressen felstavad. Fortsätt till startsidan eller ta en
              titt i din samling.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <Button asChild className="gap-2">
                <Link to="/">
                  <Home className="h-4 w-4" aria-hidden="true" />
                  Till startsidan
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
              </Button>
              <Button asChild variant="outline" className="gap-2">
                <Link to="/collection">
                  <Library className="h-4 w-4" aria-hidden="true" />
                  Öppna samlingen
                </Link>
              </Button>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};

export default NotFound;
