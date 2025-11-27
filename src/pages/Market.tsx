import { useMemo, useState } from "react";
import Navigation from "@/components/Navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { TranslatedText } from "@/components/TranslatedText";
import CameraCapture from "@/components/CameraCapture";
import { Coins, Gavel, ShieldCheck, Users, Camera, Clock, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";

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
  const [showCamera, setShowCamera] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [cardName, setCardName] = useState("");
  const [startingBid, setStartingBid] = useState("50");
  const [duration, setDuration] = useState("7 dagar");
  const [description, setDescription] = useState("Kortet är fotograferat direkt i appen utan filuppladdning.");

  const auctionPreview = useMemo(
    () => ({
      cardName: cardName || "Ditt kort",
      startingBid,
      duration,
      description,
    }),
    [cardName, startingBid, duration, description]
  );

  const handleCapture = (imageDataUrl: string) => {
    setCapturedImage(imageDataUrl);
    setShowCamera(false);
    toast.success("Foto av kortet sparat för auktionen");
  };

  const handlePublishAuction = () => {
    if (!capturedImage) {
      toast.error("Ta ett foto av kortet först");
      return;
    }

    toast.success("Auktionen är publicerad! Din annons visas för samlarna.");
  };

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
            <Button variant="hero" size="lg" className="gap-2" onClick={() => setShowCamera(true)}>
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

        <div className="grid lg:grid-cols-2 gap-6 max-w-5xl mx-auto mt-12">
          <Card className="p-6 h-fit border-border/80 shadow-card">
            <div className="flex items-center justify-between mb-4">
              <div className="space-y-1">
                <p className="text-sm text-primary font-semibold tracking-wide">Live-auktionsflöde</p>
                <h2 className="text-2xl font-bold">
                  <TranslatedText text="Ta kort på ditt kort" />
                </h2>
                <p className="text-muted-foreground text-sm">
                  <TranslatedText text="Använd kameran direkt i appen för att fånga kortet utan att ladda upp filer." />
                </p>
              </div>
              <Button variant="outline" size="icon" className="rounded-full" onClick={() => setShowCamera(true)}>
                <Camera className="w-5 h-5" />
              </Button>
            </div>

            <div className="aspect-[3/4] rounded-xl bg-muted/40 border border-dashed border-border flex items-center justify-center overflow-hidden">
              {capturedImage ? (
                <img src={capturedImage} alt="Fångat kort" className="w-full h-full object-cover" />
              ) : (
                <div className="text-center space-y-3 px-4">
                  <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                    <Camera className="w-7 h-7" />
                  </div>
                  <div className="space-y-1">
                    <p className="font-semibold">
                      <TranslatedText text="Ingen fil, bara kort" />
                    </p>
                    <p className="text-sm text-muted-foreground">
                      <TranslatedText text="Öppna kameran och ta ett tydligt foto av kortet för att starta auktionen." />
                    </p>
                  </div>
                  <Button variant="hero" className="gap-2" onClick={() => setShowCamera(true)}>
                    <Camera className="w-4 h-4" />
                    <TranslatedText text="Öppna kamera" />
                  </Button>
                </div>
              )}
            </div>

            {capturedImage && (
              <div className="mt-4 flex items-center justify-between gap-3">
                <p className="text-sm text-muted-foreground">
                  <TranslatedText text="Kortet är redo för auktion." />
                </p>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => setShowCamera(true)}>
                    <Camera className="w-4 h-4 mr-2" />
                    <TranslatedText text="Ta om foto" />
                  </Button>
                  <Button variant="secondary" size="sm" onClick={() => setCapturedImage(null)}>
                    <TranslatedText text="Rensa" />
                  </Button>
                </div>
              </div>
            )}
          </Card>

          <Card className="p-6 h-fit border-border/80 shadow-card">
            <div className="flex items-center gap-3 mb-6">
              <Gavel className="w-10 h-10 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">
                  <TranslatedText text="Sälj på auktion" />
                </p>
                <h2 className="text-2xl font-bold">
                  <TranslatedText text="Fyll i detaljer" />
                </h2>
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="cardName">
                  <TranslatedText text="Kortnamn" />
                </Label>
                <Input
                  id="cardName"
                  placeholder="Pikachu EX"
                  value={cardName}
                  onChange={(e) => setCardName(e.target.value)}
                />
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="startBid">
                    <TranslatedText text="Startpris (SEK)" />
                  </Label>
                  <Input
                    id="startBid"
                    type="number"
                    min={0}
                    value={startingBid}
                    onChange={(e) => setStartingBid(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="duration">
                    <TranslatedText text="Auktionstid" />
                  </Label>
                  <div className="flex items-center gap-2 rounded-lg border border-border px-3 py-2">
                    <Clock className="w-4 h-4 text-muted-foreground" />
                    <input
                      id="duration"
                      value={duration}
                      onChange={(e) => setDuration(e.target.value)}
                      className="bg-transparent outline-none text-sm flex-1"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">
                  <TranslatedText text="Beskrivning" />
                </Label>
                <Textarea
                  id="description"
                  rows={4}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Lägg till information om kortets skick och unikitet."
                />
              </div>

              <Card className="p-4 bg-muted/60 border-border/80">
                <div className="flex items-start gap-3">
                  <Sparkles className="w-5 h-5 text-primary mt-0.5" />
                  <div className="space-y-1">
                    <p className="font-semibold">
                      <TranslatedText text="Din auktionsannons" />
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {auctionPreview.cardName} • {auctionPreview.duration} • {auctionPreview.startingBid} SEK
                    </p>
                    <p className="text-sm text-muted-foreground">{auctionPreview.description}</p>
                  </div>
                </div>
              </Card>

              <Button variant="hero" size="lg" className="w-full gap-2" onClick={handlePublishAuction}>
                <Gavel className="w-5 h-5" />
                <TranslatedText text="Publicera auktion" />
              </Button>
            </div>
          </Card>
        </div>
      </div>

      {showCamera && (
        <CameraCapture
          onCapture={handleCapture}
          onClose={() => setShowCamera(false)}
        />
      )}
    </div>
  );
};

export default Market;
