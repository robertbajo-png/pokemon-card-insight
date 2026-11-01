import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import Navigation from "@/components/Navigation";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { isLocalHosting } from "@/lib/hosting";
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  Eye,
  EyeOff,
  Library,
  Loader2,
  Mail,
  Scan,
  Sparkles,
} from "lucide-react";
import charizard from "@/assets/charizard-base-set.jpg";

const Signup = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const navigate = useNavigate();
  const handleSignup = async (event: FormEvent) => {
    event.preventDefault();
    if (loading) return;
    setFormError(null);
    if (!email || !password) {
      setFormError("Fyll i e‑post och lösenord");
      toast.error("Fyll i e‑post och lösenord");
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) {
        setFormError(error.message);
        toast.error(error.message);
      } else {
        toast.success(
          isLocalHosting
            ? "Kontot är skapat. Öppna den lokala postlådan för att bekräfta det."
            : "Registreringen lyckades! Kontrollera din e‑post för att verifiera kontot.",
        );
        navigate("/login");
      }
    } catch {
      setFormError("Kunde inte ansluta. Försök igen om en stund.");
    } finally {
      setLoading(false);
    }
  };
  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <main id="main-content" tabIndex={-1} className="page-shell">
        <section className="surface-panel mx-auto grid max-w-5xl overflow-hidden lg:grid-cols-[1.05fr_1fr]">
          <aside className="relative hidden min-h-[660px] flex-col justify-between overflow-hidden border-r border-border bg-primary/[0.045] p-9 lg:flex">
            <div>
              <p className="page-eyebrow">Början på din samling</p>
              <h2 className="mt-4 max-w-xs text-3xl font-semibold leading-tight tracking-tight">
                Små kort.
                <br />
                Stora upptäckter.
              </h2>
              <p className="mt-4 max-w-xs text-sm leading-relaxed text-muted-foreground">
                Ge varje fynd en plats och följ samlingen, ett kort i taget.
              </p>
            </div>
            <div className="relative my-7 flex justify-center">
              <div className="absolute inset-x-8 bottom-2 h-24 rounded-full bg-primary/10 blur-3xl" />
              <img
                src={charizard}
                alt="Charizard från Base Set"
                className="relative h-56 rotate-[7deg] rounded-xl border border-primary/20 object-contain shadow-2xl"
              />
            </div>
            <div className="space-y-3 border-t border-border/70 pt-5">
              {[
                { icon: Scan, text: "Identifiera och granska dina kort" },
                { icon: Library, text: "Håll ordning på varje exemplar" },
                { icon: Sparkles, text: "Se vad som saknas i dina set" },
              ].map(({ icon: Icon, text }) => (
                <div
                  key={text}
                  className="flex items-center gap-3 text-sm text-muted-foreground"
                >
                  <Icon className="h-4 w-4 shrink-0 text-primary" />
                  {text}
                </div>
              ))}
            </div>
          </aside>
          <div className="flex flex-col justify-center p-6 sm:p-10">
            <div className="mb-8">
              <p className="page-eyebrow">Välkommen till Card Lens</p>
              <h1 className="mt-3 text-3xl font-semibold tracking-tight">
                Skapa konto.
              </h1>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                En egen plats för korten du vill hålla koll på.
              </p>
            </div>
            <form onSubmit={handleSignup} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="email">E‑post</Label>
                <Input
                  id="email"
                  type="email"
                  inputMode="email"
                  autoComplete="username"
                  spellCheck={false}
                  required
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="din@epost.se"
                  className="h-12"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Lösenord</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="new-password"
                    required
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    className="h-12 pr-12"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((value) => !value)}
                    aria-label={
                      showPassword ? "Dölj lösenord" : "Visa lösenord"
                    }
                    aria-pressed={showPassword}
                    className="absolute inset-y-0 right-0 flex w-12 items-center justify-center rounded-r-lg text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Välj ett unikt lösenord för ditt konto.
                </p>
              </div>
              {formError && (
                <p
                  role="alert"
                  className="rounded-xl border border-destructive/20 bg-destructive/5 p-3 text-sm text-destructive"
                >
                  {formError}
                </p>
              )}
              <Button
                type="submit"
                disabled={loading}
                className="h-12 w-full gap-2"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <ArrowRight className="h-4 w-4" />
                )}
                {loading ? "Skapar..." : "Skapa konto"}
              </Button>
            </form>
            <div className="mt-6 flex items-start gap-3 rounded-xl border border-border bg-muted/30 p-4">
              <Mail className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <div className="space-y-1 text-xs leading-relaxed">
                <p className="font-medium text-foreground">
                  Bekräfta din e-postadress
                </p>
                <p className="text-muted-foreground">
                  {isLocalHosting
                    ? "Bekräftelsemejlet öppnas i den lokala postlådan på datorn som kör appen."
                    : "Vi skickar ett mejl med en länk för att bekräfta ditt konto."}
                </p>
              </div>
            </div>
            <div className="mt-7 border-t border-border pt-6 text-center">
              <Link
                to="/login"
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline"
              >
                Har redan konto? Logga in
                <ArrowUpRight className="h-4 w-4" />
              </Link>
            </div>
            <p className="mt-5 flex items-center justify-center gap-2 text-xs text-muted-foreground">
              <Check className="h-3.5 w-3.5" />
              En egen plats för din samling.
            </p>
          </div>
        </section>
      </main>
    </div>
  );
};
export default Signup;
