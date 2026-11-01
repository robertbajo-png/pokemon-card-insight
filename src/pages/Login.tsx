import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import Navigation from "@/components/Navigation";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  Eye,
  EyeOff,
  Image,
  Library,
  Loader2,
  LogOut,
  Mail,
  Scan,
  User,
  Users,
} from "lucide-react";
import { isLocalHosting } from "@/lib/hosting";
import charizard from "@/assets/charizard-base-set.jpg";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const navigate = useNavigate();
  const { user } = useAuth();
  const onHostComputer = ["localhost", "127.0.0.1", "[::1]"].includes(
    window.location.hostname,
  );

  const handleLogout = async () => {
    if (loggingOut) return;
    setLoggingOut(true);
    try {
      const { error } = await supabase.auth.signOut();
      if (error) toast.error(error.message);
      else {
        toast.success("Utloggad");
        navigate("/");
      }
    } catch {
      toast.error("Kunde inte logga ut. Försök igen.");
    } finally {
      setLoggingOut(false);
    }
  };

  const handleLogin = async (event: FormEvent) => {
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
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) {
        setFormError(error.message);
        toast.error(error.message);
      } else {
        toast.success("Inloggad!");
        navigate("/");
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
        {user ? (
          <div className="mx-auto max-w-5xl space-y-8">
            <header className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="page-eyebrow">Ditt samlarkonto</p>
                <h1 className="page-title">Din profil.</h1>
                <p className="page-subtitle">Allt du samlar, på ett ställe.</p>
              </div>
              <Button
                variant="outline"
                onClick={handleLogout}
                disabled={loggingOut}
                className="gap-2 self-start"
              >
                {loggingOut ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <LogOut className="h-4 w-4" />
                )}
                Logga ut
              </Button>
            </header>
            <section className="surface-panel flex flex-col gap-5 p-6 sm:flex-row sm:items-center sm:p-8">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10 text-primary">
                <User className="h-7 w-7" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                  Inloggad som
                </p>
                <p className="mt-2 break-all text-lg font-semibold">
                  {user.email}
                </p>
              </div>
              <span className="inline-flex w-fit items-center gap-2 rounded-full bg-emerald-500/10 px-3 py-1.5 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                <Check className="h-3.5 w-3.5" />
                Du är inloggad
              </span>
            </section>
            <section>
              <div className="mb-4 flex items-center justify-between">
                <h2 className="section-heading">Vad vill du göra?</h2>
                <span className="text-xs text-muted-foreground">
                  Fortsätt utforska
                </span>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                {[
                  {
                    title: "Skanna kort",
                    description:
                      "Få ett AI-förslag och granska ditt nästa fynd.",
                    icon: Scan,
                    to: "/scanner",
                  },
                  {
                    title: "Min samling",
                    description:
                      "Se dina exemplar, anteckningar och förvaringsplatser.",
                    icon: Library,
                    to: "/collection",
                  },
                  {
                    title: "Utforska set",
                    description: "Hitta ett set och se vilka kort du saknar.",
                    icon: Image,
                    to: "/gallery",
                  },
                  {
                    title: "Vänner",
                    description: "Hantera din lokala lista med andra samlare.",
                    icon: Users,
                    to: "/friends",
                  },
                ].map(({ title, description, icon: Icon, to }) => (
                  <Link
                    key={to}
                    to={to}
                    className="surface-panel group flex items-start gap-4 p-5 transition-colors hover:border-primary/35"
                  >
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-muted text-primary">
                      <Icon className="h-5 w-5" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block font-semibold">{title}</span>
                      <span className="mt-1 block text-sm leading-relaxed text-muted-foreground">
                        {description}
                      </span>
                    </span>
                    <ArrowUpRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                  </Link>
                ))}
              </div>
            </section>
          </div>
        ) : (
          <section className="surface-panel mx-auto grid max-w-5xl overflow-hidden lg:grid-cols-[1.05fr_1fr]">
            <aside className="relative hidden min-h-[620px] flex-col justify-between overflow-hidden border-r border-border bg-primary/[0.045] p-9 lg:flex">
              <div className="relative z-10">
                <p className="page-eyebrow">För kärleken till korten</p>
                <h2 className="mt-4 max-w-xs text-3xl font-semibold leading-tight tracking-tight">
                  En plats för dina favoritkort.
                </h2>
                <p className="mt-4 max-w-xs text-sm leading-relaxed text-muted-foreground">
                  Från ditt första fynd till pärmen du aldrig slutar bläddra i.
                </p>
              </div>
              <div className="relative my-7 flex justify-center">
                <div className="absolute inset-x-8 bottom-2 h-24 rounded-full bg-primary/10 blur-3xl" />
                <img
                  src={charizard}
                  alt="Charizard från Base Set"
                  className="relative h-64 rotate-[-7deg] rounded-xl border border-primary/20 object-contain shadow-2xl transition-transform duration-500 hover:rotate-0"
                />
              </div>
              <div className="relative z-10 flex items-center gap-3 border-t border-border/70 pt-5">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-primary/20 bg-background/50">
                  <Library className="h-4 w-4 text-primary" />
                </span>
                <p className="text-sm text-muted-foreground">
                  Skanna. Samla. Upptäck.
                </p>
              </div>
            </aside>
            <div className="flex flex-col justify-center p-6 sm:p-10">
              <div className="mb-8">
                <p className="page-eyebrow">Ditt konto</p>
                <h1 className="mt-3 text-3xl font-semibold tracking-tight">
                  Välkommen tillbaka.
                </h1>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                  Logga in och fortsätt där du slutade samla.
                </p>
              </div>
              <form onSubmit={handleLogin} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="email">E‑post</Label>
                  <Input
                    id="email"
                    type="email"
                    autoComplete="username"
                    inputMode="email"
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
                      autoComplete="current-password"
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
                  {loading ? "Loggar in..." : "Logga in"}
                </Button>
              </form>
              <div className="mt-7 border-t border-border pt-6 text-center">
                <p className="text-sm text-muted-foreground">Ny här?</p>
                <Link
                  to="/signup"
                  className="mt-2 inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline"
                >
                  Har inget konto? Skapa ett
                  <ArrowUpRight className="h-4 w-4" />
                </Link>
              </div>
              {isLocalHosting && (
                <div className="mt-7 flex items-start gap-3 rounded-xl bg-muted/60 p-4">
                  <Mail className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  <p className="text-xs leading-relaxed text-muted-foreground">
                    Konton och samlingar sparas på datorn som kör appen.{" "}
                    {onHostComputer ? (
                      <>
                        Bekräftelsemejl finns i{" "}
                        <a
                          href="http://127.0.0.1:5225/"
                          target="_blank"
                          rel="noreferrer"
                          className="font-medium text-foreground underline underline-offset-2"
                        >
                          den lokala postlådan
                        </a>
                        .
                      </>
                    ) : (
                      "Bekräftelsemejl för nya appkonton öppnas på värddatorn."
                    )}
                  </p>
                </div>
              )}
            </div>
          </section>
        )}
      </main>
    </div>
  );
};
export default Login;
