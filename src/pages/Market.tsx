import { useMemo, useState } from "react";
import Navigation from "@/components/Navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import CameraCapture from "@/components/CameraCapture";
import {
  ArrowRight,
  Camera,
  Clock,
  Gavel,
  Library,
  LockKeyhole,
  ScanLine,
} from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";

const Market = () => {
  const [showCamera, setShowCamera] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [cardName, setCardName] = useState("");
  const [startingBid, setStartingBid] = useState("50");
  const [duration, setDuration] = useState("7 dagar");
  const [description, setDescription] = useState("");
  const auctionPreview = useMemo(
    () => ({
      cardName: cardName || "Ditt kort",
      startingBid,
      duration,
      description,
    }),
    [cardName, startingBid, duration, description],
  );
  const handleCapture = (imageDataUrl: string) => {
    setCapturedImage(imageDataUrl);
    setShowCamera(false);
    toast.success("Foto tillagt i förhandsvisningen");
  };
  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <main id="main-content" tabIndex={-1} className="page-shell space-y-8">
        <header className="flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
          <div>
            <p className="page-eyebrow">Marknadsplats · förhandsvisning</p>
            <h1 className="page-title">Plats för nästa fynd.</h1>
            <p className="page-subtitle max-w-xl">
              Auktioner är på väg. Prova hur en annons kan se ut medan du
              fortsätter bygga din samling.
            </p>
          </div>
          <Button asChild variant="outline" className="gap-2 self-start">
            <Link to="/collection">
              <Library className="h-4 w-4" />
              Se dina kort
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </header>
        <div
          id="auction-preview-notice"
          className="flex items-start gap-3 rounded-2xl border border-primary/20 bg-primary/[0.06] p-4 sm:px-5"
        >
          <LockKeyhole className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
          <p className="text-sm leading-relaxed text-muted-foreground">
            <span className="font-semibold text-foreground">
              Detta är en förhandsvisning.{" "}
            </span>
            Inga annonser publiceras eller sparas. Uppgifterna försvinner när du
            lämnar sidan.
          </p>
        </div>
        <div className="grid items-start gap-6 lg:grid-cols-[1fr_1.05fr]">
          <section className="surface-panel p-6 sm:p-7">
            <div className="mb-7 flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Gavel className="h-5 w-5" />
              </span>
              <div>
                <p className="text-xs text-muted-foreground">Prova flödet</p>
                <h2 className="mt-1 text-lg font-semibold">Fyll i detaljer</h2>
              </div>
            </div>
            <div className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="cardName">Kortnamn</Label>
                <Input
                  id="cardName"
                  placeholder="Till exempel Pikachu EX"
                  value={cardName}
                  onChange={(event) => setCardName(event.target.value)}
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="startBid">Startpris (SEK)</Label>
                  <Input
                    id="startBid"
                    type="number"
                    min={0}
                    value={startingBid}
                    onChange={(event) => setStartingBid(event.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="duration">Auktionstid</Label>
                  <div className="relative">
                    <Clock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="duration"
                      value={duration}
                      onChange={(event) => setDuration(event.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Beskrivning</Label>
                <Textarea
                  id="description"
                  rows={4}
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  placeholder="Berätta om kortets skick, edition och det som gör det speciellt."
                />
              </div>
              <div className="flex flex-col gap-3 rounded-xl border border-dashed border-border p-4 sm:flex-row sm:items-center">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-muted">
                  <Camera className="h-5 w-5 text-primary" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">Låt bilden berätta.</p>
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                    Ta ett foto till din annonsförhandsvisning.
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowCamera(true)}
                  className="gap-2 self-start"
                >
                  <Camera className="h-4 w-4" />
                  {capturedImage ? "Ta om foto" : "Öppna kamera"}
                </Button>
              </div>
              <Button
                size="lg"
                className="w-full gap-2"
                disabled
                aria-describedby="auction-preview-notice"
              >
                <LockKeyhole className="h-4 w-4" />
                Publicering kommer snart
              </Button>
            </div>
          </section>
          <section className="surface-panel overflow-hidden">
            <div className="flex items-center justify-between border-b border-border px-5 py-4 sm:px-7">
              <h2 className="text-sm font-semibold">Din auktionsannons</h2>
              <span className="rounded-full border border-border bg-muted px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                Förhandsvisning
              </span>
            </div>
            <div className="relative flex min-h-80 items-center justify-center bg-primary/[0.025] px-8 py-8">
              {capturedImage ? (
                <img
                  src={capturedImage}
                  alt="Fångat kort"
                  className="max-h-80 max-w-full rounded-xl object-contain shadow-xl"
                />
              ) : (
                <div className="flex aspect-[3/4] h-64 rotate-[-4deg] flex-col items-center justify-center rounded-2xl border border-primary/20 bg-card p-7 text-center shadow-lg">
                  <ScanLine className="h-10 w-10 text-primary/60" />
                  <span className="mt-6 text-sm font-semibold">
                    Ditt nästa byte.
                  </span>
                  <span className="mt-2 max-w-32 text-xs leading-relaxed text-muted-foreground">
                    Ett foto av ditt kort visas här.
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowCamera(true)}
                    className="mt-4 gap-2 text-primary"
                  >
                    <Camera className="h-3.5 w-3.5" />
                    Ta ett foto
                  </Button>
                </div>
              )}
              {capturedImage && (
                <Button
                  variant="outline"
                  size="sm"
                  className="absolute bottom-4 right-4 bg-card"
                  onClick={() => setCapturedImage(null)}
                >
                  Rensa
                </Button>
              )}
            </div>
            <div className="space-y-5 border-t border-border p-6 sm:p-7">
              <div>
                <p className="page-eyebrow">Annonsutkast</p>
                <h3 className="mt-2 break-words text-2xl font-semibold tracking-tight">
                  {auctionPreview.cardName}
                </h3>
                <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-relaxed text-muted-foreground">
                  {auctionPreview.description ||
                    "Din beskrivning visas här. Lägg till skick, edition och annan information som en samlare vill veta."}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-4 border-t border-border pt-5">
                <div>
                  <p className="text-xs text-muted-foreground">
                    Planerat startpris
                  </p>
                  <p className="mt-2 text-xl font-semibold text-primary">
                    {auctionPreview.startingBid || "—"}{" "}
                    <span className="text-sm font-medium">SEK</span>
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Auktionstid</p>
                  <p className="mt-2 text-sm font-medium">
                    {auctionPreview.duration || "Ej angivet"}
                  </p>
                </div>
              </div>
            </div>
          </section>
        </div>
        <section className="flex flex-col justify-between gap-4 rounded-2xl border border-border bg-muted/20 p-6 sm:flex-row sm:items-center">
          <div>
            <h2 className="font-semibold">
              Det finns redan mycket att upptäcka.
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Utforska set, hitta luckorna och planera ditt nästa fynd.
            </p>
          </div>
          <Button
            asChild
            variant="outline"
            className="shrink-0 gap-2 self-start"
          >
            <Link to="/gallery">
              Utforska set
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </section>
      </main>
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
