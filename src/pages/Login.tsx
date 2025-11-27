import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Navigation from "@/components/Navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { Image, Library, LogOut, Scan, Users, User } from "lucide-react";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuth();

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();

    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Utloggad");
      navigate("/");
    }
  };

  const handleLogin = async () => {
    if (!email || !password) {
      toast.error("Fyll i e‑post och lösenord");
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    setLoading(false);

    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Inloggad!");
      navigate("/");
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="container mx-auto px-4 pt-24 pb-16 flex justify-center">
        {user ? (
          <Card className="w-full max-w-4xl">
            <CardHeader className="flex flex-row items-center justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <User className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-2xl font-bold">Din profil</CardTitle>
                  <CardDescription>Inloggad som {user.email}</CardDescription>
                </div>
              </div>
              <Button onClick={handleLogout} variant="outline" className="gap-2">
                <LogOut className="w-4 h-4" />
                Logga ut
              </Button>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid md:grid-cols-2 gap-4">
                {[
                  {
                    title: "Galleri",
                    description: "Se dina uppladdade kort och höjdpunkter",
                    icon: Image,
                    to: "/gallery",
                    cta: "Öppna galleri",
                  },
                  {
                    title: "Samling",
                    description: "Hantera dina kort och följ din statistik",
                    icon: Library,
                    to: "/collection",
                    cta: "Gå till samling",
                  },
                  {
                    title: "Scanna kort",
                    description: "Lägg till nya kort via kameran eller uppladdning",
                    icon: Scan,
                    to: "/scanner",
                    cta: "Starta skanner",
                  },
                  {
                    title: "Vänner",
                    description: "Dela länkar och lägg till andra samlare",
                    icon: Users,
                    to: "/friends",
                    cta: "Öppna vänner",
                  },
                ].map((item) => {
                  const Icon = item.icon;

                  const content = (
                    <div className="p-4 rounded-lg border border-border bg-card hover:shadow-card transition-all duration-300 h-full">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 rounded-md bg-muted flex items-center justify-center">
                          <Icon className="w-5 h-5 text-foreground" />
                        </div>
                        <div>
                          <p className="font-semibold">{item.title}</p>
                          <p className="text-sm text-muted-foreground">{item.description}</p>
                        </div>
                      </div>
                      {item.to ? (
                        <Button variant="secondary" size="sm" className="mt-2">
                          {item.cta}
                        </Button>
                      ) : (
                        <p className="text-xs text-muted-foreground mt-2">Tillgängligt snart</p>
                      )}
                    </div>
                  );

                  return item.to ? (
                    <Link key={item.title} to={item.to} className="block h-full">
                      {content}
                    </Link>
                  ) : (
                    <div key={item.title} className="h-full opacity-80">
                      {content}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle className="text-2xl font-bold">Logga in</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1">
                <Label htmlFor="email">E‑post</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="password">Lösenord</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              <Button
                onClick={handleLogin}
                disabled={loading}
                className="w-full"
              >
                {loading ? "Loggar in..." : "Logga in"}
              </Button>
              <Button
                variant="ghost"
                className="w-full"
                onClick={() => navigate("/signup")}
              >
                Har inget konto? Skapa ett
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default Login;
