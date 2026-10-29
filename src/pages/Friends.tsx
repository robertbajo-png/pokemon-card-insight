import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import {
  ArrowRight,
  Copy,
  Link2,
  Monitor,
  Share2,
  UserMinus,
  UserPlus,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import Navigation from "@/components/Navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/AuthContext";
import { isLocalHosting } from "@/lib/hosting";

interface Friend {
  id: string;
  email?: string | null;
}
const STORAGE_KEY = "friends-list";

const Friends = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [friends, setFriends] = useState<Friend[]>([]);
  const [searchParams, setSearchParams] = useSearchParams();
  useEffect(() => {
    const storedFriends = localStorage.getItem(STORAGE_KEY);
    if (storedFriends) {
      try {
        setFriends(JSON.parse(storedFriends) as Friend[]);
      } catch (error) {
        console.error("Failed to parse friends list", error);
      }
    }
  }, []);
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(friends));
  }, [friends]);
  const inviteLink = useMemo(() => {
    if (!user || typeof window === "undefined") return "";
    const params = new URLSearchParams({
      invite: user.id,
      email: user.email ?? "Pokemon-samlare",
    });
    return window.location.origin + "/friends?" + params.toString();
  }, [user]);
  const inviteId = searchParams.get("invite"),
    inviteEmail = searchParams.get("email");
  const isOwnInvite = inviteId && user?.id === inviteId;
  const isAlreadyFriend = inviteId
    ? friends.some((friend) => friend.id === inviteId)
    : false;
  const localAddress =
    isLocalHosting &&
    ["localhost", "127.0.0.1", "[::1]"].includes(window.location.hostname);
  const clearInviteParams = () =>
    setSearchParams((params) => {
      const next = new URLSearchParams(params);
      next.delete("invite");
      next.delete("email");
      return next;
    });
  const handleCopyLink = async () => {
    if (!inviteLink) return;
    try {
      await navigator.clipboard.writeText(inviteLink);
      toast.success("Kontaktlänk kopierad.");
    } catch (error) {
      console.error("Kunde inte kopiera länk", error);
      toast.error("Kunde inte kopiera länken. Försök igen.");
    }
  };
  const handleShareInvite = async () => {
    if (!inviteLink) return;
    try {
      if (navigator.share) {
        await navigator.share({
          title: "En samlarkontakt i Pokemon Card Lens",
          text: "Använd länken för att lägga till mig i din kontaktlista.",
          url: inviteLink,
        });
        return;
      }
      await navigator.clipboard.writeText(inviteLink);
      toast.success("Kontaktlänk kopierad.");
    } catch (error) {
      console.error("Kunde inte dela eller kopiera länk", error);
      toast.error("Kunde inte dela länken. Försök igen.");
    }
  };
  const handleAcceptInvite = () => {
    if (!user) {
      toast.error("Logga in för att lägga till vänner.");
      navigate("/login");
      return;
    }
    if (!inviteId || isOwnInvite) return;
    if (isAlreadyFriend) {
      toast("Kontakten finns redan i din lista.");
      clearInviteParams();
      return;
    }
    setFriends((current) => [...current, { id: inviteId, email: inviteEmail }]);
    toast.success("Kontakten är sparad i din lokala lista.");
    clearInviteParams();
  };
  const handleRemoveFriend = (id: string) => {
    setFriends((current) => current.filter((friend) => friend.id !== id));
    toast.success("Vän borttagen.");
  };
  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <main id="main-content" tabIndex={-1} className="page-shell space-y-8">
        <header>
          <p className="page-eyebrow">Din samlarcirkel</p>
          <h1 className="page-title">Vänner.</h1>
          <p className="page-subtitle">
            Håll kontakten med andra som också älskar kort.
          </p>
        </header>
        {!user ? (
          <section className="surface-panel grid overflow-hidden lg:grid-cols-[1.35fr_1fr]">
            <div className="p-7 sm:p-10">
              <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10 text-primary">
                <Users className="h-7 w-7" />
              </div>
              <h2 className="text-2xl font-semibold tracking-tight">
                Din samlarcirkel börjar här.
              </h2>
              <p className="mt-3 max-w-md text-sm leading-relaxed text-muted-foreground">
                Logga in för att skapa och ta emot väninbjudningar. Kontakterna
                sparas i din egen lista på den här enheten.
              </p>
              <Button onClick={() => navigate("/login")} className="mt-7 gap-2">
                Logga in för att fortsätta
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex flex-col justify-center border-t border-border bg-muted/30 p-7 sm:p-10 lg:border-l lg:border-t-0">
              <p className="page-eyebrow">Bra att veta</p>
              <h3 className="mt-3 text-lg font-semibold">
                En lokal kontaktlista.
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                Vänlistan hör till den här webbläsaren. Den delas inte
                automatiskt med andra, och det finns ännu inga meddelanden eller
                delade samlingar.
              </p>
              <Link
                to="/collection"
                className="mt-5 inline-flex items-center gap-2 text-sm font-medium text-primary"
              >
                Till din samling
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </section>
        ) : (
          <div className="grid items-start gap-6 lg:grid-cols-[1.6fr_1fr]">
            <div className="space-y-6">
              <section className="surface-panel p-6 sm:p-7">
                <div className="mb-6 flex items-start gap-4">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <Link2 className="h-5 w-5" />
                  </span>
                  <div>
                    <h2 className="section-heading">Dela din vänlänk</h2>
                    <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                      Låt en annan samlare lägga till din kontakt.
                    </p>
                  </div>
                </div>
                <label
                  htmlFor="friend-invite-link"
                  className="mb-2 block text-sm font-medium"
                >
                  Din personliga länk
                </label>
                <Input
                  id="friend-invite-link"
                  readOnly
                  value={inviteLink}
                  className="min-w-0 text-xs"
                />
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button onClick={handleCopyLink} className="gap-2">
                    <Copy className="h-4 w-4" />
                    Kopiera
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleShareInvite}
                    className="gap-2"
                  >
                    <Share2 className="h-4 w-4" />
                    Kopiera & dela
                  </Button>
                </div>
                <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
                  Länken innehåller din e-postadress och ditt användar-ID.
                  Mottagaren kan spara dig i sin lokala kontaktlista.
                </p>
                {localAddress && (
                  <p className="mt-4 flex items-start gap-2 rounded-xl border border-border bg-muted/40 p-3 text-xs leading-relaxed text-muted-foreground">
                    <Monitor className="mt-0.5 h-4 w-4 shrink-0" />
                    Den här lokala adressen fungerar bara på datorn som kör
                    appen. Andra enheter behöver en tillgänglig webb-adress för
                    att kunna öppna länken.
                  </p>
                )}
              </section>
              {inviteId && !isOwnInvite && (
                <section className="surface-panel border-primary/35 p-6 sm:p-7">
                  <p className="page-eyebrow">Ny kontakt</p>
                  <h2 className="mt-3 text-xl font-semibold">
                    Du har fått en väninbjudan
                  </h2>
                  <p className="mt-2 break-words text-sm leading-relaxed text-muted-foreground">
                    {inviteEmail
                      ? inviteEmail + " har delat sin kontakt med dig."
                      : "En samlare har delat sin kontakt med dig."}
                  </p>
                  <div className="mt-5 flex flex-wrap gap-3">
                    <Button onClick={handleAcceptInvite} className="gap-2">
                      <UserPlus className="h-4 w-4" />
                      Acceptera vän
                    </Button>
                    <Button variant="outline" onClick={clearInviteParams}>
                      Avböj
                    </Button>
                  </div>
                </section>
              )}
              <section className="surface-panel p-6 sm:p-7">
                <div className="mb-6 flex items-center justify-between gap-3">
                  <h2 className="section-heading">Dina vänner</h2>
                  <span className="rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
                    {friends.length} kontakter
                  </span>
                </div>
                {friends.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-border px-5 py-10 text-center">
                    <Users className="mx-auto h-8 w-8 text-muted-foreground/60" />
                    <h3 className="mt-4 font-semibold">
                      Plats för din första samlarkontakt.
                    </h3>
                    <p className="mx-auto mt-2 max-w-xs text-sm leading-relaxed text-muted-foreground">
                      Öppna en vänlänk och välj Acceptera vän för att spara
                      kontakten här.
                    </p>
                  </div>
                ) : (
                  <div className="divide-y divide-border">
                    {friends.map((friend) => (
                      <div
                        key={friend.id}
                        className="flex items-center gap-3 py-4 first:pt-0 last:pb-0"
                      >
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                          {friend.email?.slice(0, 1).toLocaleUpperCase("sv") ??
                            "S"}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="break-words text-sm font-semibold">
                            {friend.email ?? "Pokemon-vän"}
                          </p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            Lokal kontakt
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="shrink-0 gap-2 text-muted-foreground hover:text-destructive"
                          onClick={() => handleRemoveFriend(friend.id)}
                          aria-label={"Ta bort " + (friend.email ?? "kontakt")}
                        >
                          <UserMinus className="h-4 w-4" />
                          <span className="hidden sm:inline">Ta bort</span>
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </div>
            <aside className="surface-panel p-6 sm:p-7">
              <p className="page-eyebrow">Så fungerar det</p>
              <h2 className="mt-3 text-lg font-semibold">
                Från länk till kontakt.
              </h2>
              <ol className="mt-6 space-y-6">
                {[
                  [
                    "Dela länken",
                    "Kopiera din länk och skicka den själv till en annan samlare.",
                  ],
                  [
                    "Öppna inbjudan",
                    "Mottagaren öppnar länken i appen och loggar in.",
                  ],
                  [
                    "Spara kontakten",
                    "Acceptera vän lägger till kontakten i mottagarens lokala lista.",
                  ],
                ].map(([title, description], index) => (
                  <li key={title} className="flex gap-3">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-primary/25 text-xs font-semibold text-primary">
                      {index + 1}
                    </span>
                    <div>
                      <h3 className="text-sm font-semibold">{title}</h3>
                      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                        {description}
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
              <div className="mt-7 border-t border-border pt-5">
                <p className="text-xs leading-relaxed text-muted-foreground">
                  Listan sparas i den här webbläsaren. Kontakter synkas inte
                  mellan enheter och ger inte åtkomst till dina kort.
                </p>
              </div>
            </aside>
          </div>
        )}
      </main>
    </div>
  );
};
export default Friends;
