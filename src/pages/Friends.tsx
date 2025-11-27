import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Copy, Link2, ShieldCheck, UserMinus, UserPlus, Users } from "lucide-react";
import { toast } from "sonner";
import Navigation from "@/components/Navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";

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

    return `${window.location.origin}/friends?${params.toString()}`;
  }, [user]);

  const inviteId = searchParams.get("invite");
  const inviteEmail = searchParams.get("email");

  const isOwnInvite = inviteId && user?.id === inviteId;
  const isAlreadyFriend = inviteId
    ? friends.some((friend) => friend.id === inviteId)
    : false;

  const handleCopyLink = async () => {
    if (!inviteLink) return;

    try {
      await navigator.clipboard.writeText(inviteLink);
      toast.success("Länk kopierad! Skicka den till en vän för att bli vänner.");
    } catch (error) {
      console.error("Kunde inte kopiera länk", error);
      toast.error("Kunde inte kopiera länken. Försök igen.");
    }
  };

  const handleAcceptInvite = () => {
    if (!user) {
      toast.error("Logga in för att lägga till vänner.");
      navigate("/login");
      return;
    }

    if (!inviteId || isOwnInvite) {
      return;
    }

    if (isAlreadyFriend) {
      toast("Ni är redan vänner!");
      clearInviteParams();
      return;
    }

    setFriends((current) => [
      ...current,
      {
        id: inviteId,
        email: inviteEmail,
      },
    ]);

    toast.success(
      inviteEmail
        ? `Du är nu vän med ${inviteEmail}.`
        : "Du har lagt till en ny vän!"
    );
    clearInviteParams();
  };

  const handleRemoveFriend = (id: string) => {
    setFriends((current) => current.filter((friend) => friend.id !== id));
    toast.success("Vän borttagen.");
  };

  const clearInviteParams = () => {
    setSearchParams((params) => {
      const next = new URLSearchParams(params);
      next.delete("invite");
      next.delete("email");
      return next;
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="container mx-auto px-4 pt-24 pb-12">
        {!user ? (
          <Card className="max-w-2xl mx-auto">
            <CardHeader>
              <CardTitle>Vänner</CardTitle>
              <CardDescription>
                Logga in för att skapa och ta emot väninbjudningar.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={() => navigate("/login")} className="w-full">
                Logga in för att fortsätta
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid lg:grid-cols-[2fr,1.2fr] gap-6 items-start">
            <div className="space-y-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between gap-3 flex-wrap">
                  <div>
                    <CardTitle>Dela din vänlänk</CardTitle>
                    <CardDescription>
                      Skicka länken till en vän så kan de lägga till dig med ett klick.
                    </CardDescription>
                  </div>
                  <Badge variant="secondary" className="flex items-center gap-1">
                    <Users className="w-4 h-4" />
                    Vän-läge
                  </Badge>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground flex items-center gap-2">
                      <Link2 className="w-4 h-4" />
                      Din personliga länk
                    </label>
                    <div className="flex flex-col sm:flex-row gap-2">
                      <Input readOnly value={inviteLink} className="flex-1" />
                      <Button onClick={handleCopyLink} className="gap-2">
                        <Copy className="w-4 h-4" />
                        Kopiera
                      </Button>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Länken innehåller ditt användar-ID ({user.id.slice(0, 6)}...).
                      Alla som klickar på den kan skicka dig en vänförfrågan.
                    </p>
                  </div>
                </CardContent>
              </Card>

              {inviteId && !isOwnInvite && (
                <Card className="border-primary/40">
                  <CardHeader className="flex flex-row items-start justify-between gap-3">
                    <div className="space-y-1">
                      <CardTitle>Du har fått en väninbjudan</CardTitle>
                      <CardDescription>
                        {inviteEmail
                          ? `${inviteEmail} vill bli vän med dig.`
                          : "En samlare vill bli vän med dig."}
                      </CardDescription>
                    </div>
                    <Badge variant="outline" className="text-primary border-primary">
                      <ShieldCheck className="w-4 h-4 mr-1" />
                      Inbjudan
                    </Badge>
                  </CardHeader>
                  <CardContent className="flex flex-col sm:flex-row gap-3">
                    <Button onClick={handleAcceptInvite} className="gap-2" size="lg">
                      <UserPlus className="w-4 h-4" />
                      Acceptera vän
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={clearInviteParams}
                      className="gap-2"
                      size="lg"
                    >
                      Avböj
                    </Button>
                  </CardContent>
                </Card>
              )}

              <Card>
                <CardHeader>
                  <CardTitle>Dina vänner</CardTitle>
                  <CardDescription>
                    Hantera de samlare du har anslutit med.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {friends.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      Du har inga vänner ännu. Dela länken ovan för att komma igång!
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {friends.map((friend) => (
                        <div
                          key={friend.id}
                          className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-lg border border-border p-3"
                        >
                          <div>
                            <p className="font-semibold">{friend.email ?? "Pokemon-vän"}</p>
                            <p className="text-xs text-muted-foreground">ID: {friend.id}</p>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            className="gap-2"
                            onClick={() => handleRemoveFriend(friend.id)}
                          >
                            <UserMinus className="w-4 h-4" />
                            Ta bort
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Så funkar vän-länken</CardTitle>
                <CardDescription>
                  Snabba steg för att ansluta med andra samlare.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-muted-foreground">
                <div className="flex gap-3">
                  <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">
                    1
                  </span>
                  <div>
                    <p className="text-foreground font-medium">Kopiera din länk</p>
                    <p>Skicka den till en vän via valfri kanal.</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">
                    2
                  </span>
                  <div>
                    <p className="text-foreground font-medium">Vännen öppnar länken</p>
                    <p>De kommer direkt hit och ser din inbjudan.</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">
                    3
                  </span>
                  <div>
                    <p className="text-foreground font-medium">Bekräfta vänskap</p>
                    <p>Tryck på "Acceptera vän" så sparas kontakten lokalt.</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
};

export default Friends;
