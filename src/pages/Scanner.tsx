import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  Upload,
  Camera,
  Sparkles,
  Check,
  Plus,
  ArrowRight,
  ScanLine,
  ImagePlus,
  ShieldCheck,
  Focus,
  LockKeyhole,
  RotateCcw,
  Info,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import Navigation from "@/components/Navigation";
import CameraCapture from "@/components/CameraCapture";
import CollectionCardEditor from "@/components/CollectionCardEditor";
import { TranslatedText } from "@/components/TranslatedText";
import { toast } from "sonner";
import {
  cardAnalysisSchema,
  cardToScan,
  type CardAnalysis,
  type ScannedCard,
} from "@/lib/cardAnalysis";
import { invokeAi } from "@/services/aiFunctions";
import { prepareCardImage } from "@/utils/cardImage";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";

const ScannerWorkspace = ({ signedIn }: { signedIn: boolean }) => {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isPreparing, setIsPreparing] = useState(false);
  const [result, setResult] = useState<CardAnalysis | null>(null);
  const [showCamera, setShowCamera] = useState(false);
  const [selectedGrade, setSelectedGrade] = useState("ungraded");
  const [reviewOpen, setReviewOpen] = useState(false);
  const [savedCard, setSavedCard] = useState<ScannedCard | null>(null);
  const [dragging, setDragging] = useState(false);
  const imageRequest = useRef(0);
  const analysisRequest = useRef<AbortController | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const busy = isPreparing || isAnalyzing;
  useEffect(
    () => () => {
      imageRequest.current++;
      analysisRequest.current?.abort();
    },
    [],
  );
  const selectImage = async (source: File | string) => {
    const request = ++imageRequest.current;
    setIsPreparing(true);
    try {
      const image = await prepareCardImage(source);
      if (request !== imageRequest.current) return;
      setSelectedImage(image);
      setResult(null);
      setSavedCard(null);
      setReviewOpen(false);
      setSelectedGrade("ungraded");
    } catch (error) {
      if (request === imageRequest.current)
        toast.error(
          error instanceof Error ? error.message : "Bilden kunde inte läsas.",
        );
    } finally {
      if (request === imageRequest.current) setIsPreparing(false);
    }
  };
  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) void selectImage(file);
    event.target.value = "";
  };
  const analyzeCard = async () => {
    if (
      !selectedImage ||
      isPreparing ||
      analysisRequest.current ||
      result ||
      !signedIn
    )
      return;
    const request = new AbortController();
    analysisRequest.current = request;
    setIsAnalyzing(true);
    try {
      const data = cardAnalysisSchema.parse(
        await invokeAi(
          "analyze-pokemon-card",
          { image: selectedImage, action: "analyze" },
          request.signal,
        ),
      );
      if (!request.signal.aborted) setResult(data);
    } catch (error) {
      if (request.signal.aborted) return;
      toast.error(
        error instanceof Error ? error.message : "Kunde inte analysera kortet.",
      );
    } finally {
      analysisRequest.current = null;
      if (!request.signal.aborted) setIsAnalyzing(false);
    }
  };
  const nextCard = () => {
    imageRequest.current++;
    setSelectedImage(null);
    setResult(null);
    setSavedCard(null);
    setSelectedGrade("ungraded");
    setReviewOpen(false);
    setIsPreparing(false);
  };
  const activeStep = result ? 2 : selectedImage ? 1 : 0;
  const facts = result
    ? [
        ["Typ", result.type],
        ["Sällsynthet", result.rarity],
        ["Set", result.set],
        ["Kortnummer", result.number],
        ...(result.hp ? [["HP", result.hp]] : []),
        ...(result.condition ? [["Skick", result.condition]] : []),
      ]
    : [];

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <main id="main-content" tabIndex={-1} className="page-shell">
        <header className="mb-8 flex flex-wrap items-end justify-between gap-6">
          <div>
            <p className="page-eyebrow">Från bild till samling</p>
            <h1 className="page-title">
              <TranslatedText text="Skanna ett kort." />
            </h1>
            <p className="page-subtitle">
              En gammal favorit eller ett nytt fynd? Låt oss ta en närmare titt.
            </p>
          </div>
          <ol
            className="flex items-center gap-4 sm:gap-5"
            aria-label="Skanningssteg"
          >
            {["Välj bild", "Analysera", "Granska & spara"].map(
              (step, index) => (
                <li
                  key={step}
                  aria-current={index === activeStep ? "step" : undefined}
                  className={cn(
                    "scanner-step",
                    index <= activeStep && "scanner-step--active",
                  )}
                >
                  <span>
                    {index < activeStep ? (
                      <Check className="h-3 w-3" />
                    ) : (
                      index + 1
                    )}
                  </span>
                  <span>{step}</span>
                </li>
              ),
            )}
          </ol>
        </header>
        {!signedIn && (
          <aside className="mb-6 flex items-center gap-3 rounded-xl border border-primary/15 bg-primary/5 px-4 py-3 text-xs leading-6">
            <LockKeyhole className="h-4 w-4 shrink-0 text-primary" />
            <p>
              <Link
                className="font-semibold text-primary underline decoration-primary/30 underline-offset-4 hover:decoration-primary"
                to="/login"
              >
                Logga in för att analysera och spara kort.
              </Link>
              <span className="ml-1 text-muted-foreground">
                Du kan välja bilden redan nu.
              </span>
            </p>
          </aside>
        )}
        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <section
            className="surface-panel flex min-w-0 flex-col p-5 sm:p-6"
            aria-labelledby="upload-heading"
          >
            <div className="mb-5 flex items-center justify-between gap-3">
              <div>
                <p className="page-eyebrow mb-1">01 · Kortbild</p>
                <h2 id="upload-heading" className="section-heading">
                  Ladda upp kort
                </h2>
              </div>
              <ImagePlus
                className="h-5 w-5 text-muted-foreground/50"
                strokeWidth={1.5}
              />
            </div>
            <input
              ref={fileInput}
              id="file-upload"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              aria-label="Välj kortbild"
              disabled={busy}
              onChange={handleImageUpload}
              className="hidden"
            />
            <button
              type="button"
              disabled={busy}
              aria-label="Välj kortbild från enheten"
              className={cn(
                "scanner-upload order-2 sm:order-1",
                dragging && "scanner-upload--dragging",
              )}
              onClick={() => fileInput.current?.click()}
              onDragOver={(event) => {
                event.preventDefault();
                if (!busy) setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={(event) => {
                event.preventDefault();
                setDragging(false);
                const file = event.dataTransfer.files[0];
                if (file && !busy) void selectImage(file);
              }}
            >
              {selectedImage ? (
                <img
                  src={selectedImage}
                  alt="Vald kortbild"
                  className="h-full w-full object-contain p-4"
                />
              ) : (
                <div className="pointer-events-none p-7 text-center">
                  <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl border border-primary/20 bg-primary/5">
                    <Upload
                      className="h-6 w-6 text-primary"
                      strokeWidth={1.5}
                    />
                  </div>
                  <p className="text-sm font-bold">
                    <span className="sm:hidden">Välj ett foto av kortet</span>
                    <span className="hidden sm:inline">
                      Dra in ditt kortfoto här
                    </span>
                  </p>
                  <p className="mt-2 text-xs text-muted-foreground">
                    eller välj en bild från din enhet
                  </p>
                  <p className="mt-6 text-[10px] tracking-wide text-muted-foreground/70">
                    JPG, PNG eller WebP
                  </p>
                </div>
              )}
              {isPreparing && (
                <span className="absolute inset-0 flex items-center justify-center bg-background/75 text-xs font-bold backdrop-blur-sm">
                  Förbereder din bild…
                </span>
              )}
            </button>
            <div className="order-1 mb-4 grid grid-cols-2 gap-3 sm:order-2 sm:mb-0 sm:mt-4">
              <Button
                variant="outline"
                disabled={busy}
                onClick={() => fileInput.current?.click()}
              >
                <Upload className="h-4 w-4" />
                <TranslatedText text="Välj fil" />
              </Button>
              <Button
                variant="outline"
                disabled={busy}
                onClick={() => setShowCamera(true)}
              >
                <Camera className="h-4 w-4" />
                <TranslatedText text="Kamera" />
              </Button>
            </div>
            <Button
              variant="hero"
              size="lg"
              className="order-3 mt-4 w-full"
              disabled={!selectedImage || busy || !signedIn || Boolean(result)}
              onClick={analyzeCard}
            >
              <Sparkles className="h-4 w-4" />
              <TranslatedText
                text={
                  isPreparing
                    ? "Bearbetar bild..."
                    : isAnalyzing
                      ? "Analyserar..."
                      : result
                        ? "Analysen är klar"
                        : "Analysera kort"
                }
              />
              {!busy && !result && <ArrowRight className="ml-auto h-4 w-4" />}
            </Button>
            <div className="order-4 mt-5 flex items-start gap-2.5 border-t border-border pt-4 text-[10px] leading-5 text-muted-foreground">
              <Focus className="mt-0.5 h-4 w-4 shrink-0 text-primary/65" />
              <p>
                Fota ett kort åt gången. Se till att hela kortet syns och undvik
                reflexer i ytan.
              </p>
            </div>
          </section>

          <section
            className="surface-panel min-w-0 overflow-hidden"
            aria-labelledby="result-heading"
          >
            <div className="flex items-center justify-between gap-4 border-b border-border px-5 py-5 sm:px-6">
              <div>
                <p className="page-eyebrow mb-1">02 · Din upptäckt</p>
                <h2 id="result-heading" className="section-heading">
                  Kortinformation
                </h2>
              </div>
              {result ? (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/5 px-2.5 py-1 text-[9px] font-bold text-primary">
                  <Check className="h-3 w-3" />
                  {savedCard ? "Sparat" : "Analys klar"}
                </span>
              ) : (
                <ScanLine
                  className="h-5 w-5 text-muted-foreground/50"
                  strokeWidth={1.5}
                />
              )}
            </div>
            {result ? (
              <div className="p-5 sm:p-6">
                <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                  {result.set} · #{result.number}
                </p>
                <h3 className="break-words text-3xl font-bold tracking-[-0.05em]">
                  {result.name}
                </h3>
                {savedCard ? (
                  <div className="mt-5 rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4">
                    <p
                      role="status"
                      className="flex items-start gap-2 text-xs font-semibold leading-6"
                    >
                      <Check className="mt-1 h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                      {savedCard.name} har lagts till i samlingen,{" "}
                      {savedCard.quantity} st.
                    </p>
                    <Button asChild variant="outline" className="mt-3 w-full">
                      <Link to="/collection">
                        Öppna samlingen
                        <ArrowRight className="ml-auto h-4 w-4" />
                      </Link>
                    </Button>
                  </div>
                ) : (
                  <div className="mt-5 rounded-xl border border-primary/20 bg-primary/5 p-4">
                    <p className="text-[11px] leading-6 text-muted-foreground">
                      AI-analysen är ett förslag. Kontrollera kortnamn, set och
                      nummer innan du sparar.
                    </p>
                    <Button
                      className="mt-3 w-full"
                      onClick={() => setReviewOpen(true)}
                    >
                      <Plus className="h-4 w-4" />
                      Kontrollera och spara
                      <ArrowRight className="ml-auto h-4 w-4" />
                    </Button>
                    <p className="mt-2.5 text-center text-[9px] text-muted-foreground">
                      Kortet har inte sparats ännu.
                    </p>
                  </div>
                )}
                <dl className="mt-6 grid grid-cols-2 gap-x-5 gap-y-5">
                  {facts.map(([label, value]) => (
                    <div key={label} className="min-w-0">
                      <dt className="mb-1.5 text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">
                        {label}
                      </dt>
                      <dd className="break-words text-xs font-semibold">
                        {value}
                      </dd>
                    </div>
                  ))}
                </dl>
                {result.description && (
                  <p className="mt-6 border-t border-border pt-5 text-xs leading-7 text-muted-foreground">
                    {result.description}
                  </p>
                )}
                {Boolean(
                  result.attacks.length ||
                    result.weaknesses.length ||
                    result.resistances.length ||
                    result.retreatCost !== undefined,
                ) && (
                  <details className="mt-5 rounded-xl border border-border px-4">
                    <summary className="cursor-pointer py-3.5 text-[11px] font-bold">
                      Attacker & kortdetaljer
                    </summary>
                    <div className="space-y-4 border-t border-border py-4 text-xs">
                      {result.attacks.map((attack, index) => (
                        <div key={index}>
                          <div className="flex items-center justify-between gap-3 font-semibold">
                            <span>{attack.name}</span>
                            <span className="text-primary">
                              {attack.damage}
                            </span>
                          </div>
                          {attack.cost?.length > 0 && (
                            <p className="mt-1 text-[10px] text-muted-foreground">
                              {attack.cost.join(" · ")}
                            </p>
                          )}
                        </div>
                      ))}
                      {result.weaknesses.length > 0 && (
                        <p className="text-muted-foreground">
                          Svagheter:{" "}
                          {result.weaknesses
                            .map((item) => item.type + " " + item.value)
                            .join(", ")}
                        </p>
                      )}
                      {result.resistances.length > 0 && (
                        <p className="text-muted-foreground">
                          Resistanser:{" "}
                          {result.resistances
                            .map((item) => item.type + " " + item.value)
                            .join(", ")}
                        </p>
                      )}
                      {result.retreatCost !== undefined && (
                        <p className="text-muted-foreground">
                          Reträttkostnad: {result.retreatCost}
                        </p>
                      )}
                    </div>
                  </details>
                )}
                <div className="mt-5 rounded-xl bg-muted/40 p-4">
                  <div className="flex items-center gap-2 text-[9px] font-semibold uppercase tracking-widest text-muted-foreground">
                    <Info className="h-3 w-3" />
                    AI-uppskattning
                  </div>
                  <div className="mt-3 flex flex-wrap items-end justify-between gap-3">
                    <div>
                      <label
                        htmlFor="price-grade"
                        className="mb-1.5 block text-[10px] text-muted-foreground"
                      >
                        Visa värde för gradering
                      </label>
                      <select
                        id="price-grade"
                        value={selectedGrade}
                        onChange={(event) =>
                          setSelectedGrade(event.target.value)
                        }
                        className="max-w-full rounded-lg border border-border bg-card px-2.5 py-2 text-[11px]"
                      >
                        <option value="ungraded">Ograderat</option>
                        {Array.from({ length: 10 }, (_, index) => (
                          <option key={index + 1} value={"psa" + (index + 1)}>
                            PSA {index + 1}
                          </option>
                        ))}
                      </select>
                    </div>
                    <p className="text-lg font-bold tracking-tight">
                      {result.priceByGrade?.[selectedGrade] ||
                        result.estimatedValue ||
                        "—"}
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  className="mt-3 w-full text-muted-foreground"
                  onClick={nextCard}
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  Välj nästa kort
                </Button>
              </div>
            ) : (
              <div className="flex min-h-[450px] flex-col items-center justify-center p-7 text-center sm:p-10">
                <div className="scanner-empty-art">
                  <ScanLine className="h-12 w-12" strokeWidth={1} />
                </div>
                <h3 className="text-lg font-bold tracking-tight">
                  {isAnalyzing
                    ? "Ett ögonblick av upptäckt…"
                    : "Här tar kortet form."}
                </h3>
                <p className="mt-3 max-w-[31ch] text-xs leading-7 text-muted-foreground">
                  {isAnalyzing
                    ? "Vi läser bilden och letar efter namn, set och kortnummer."
                    : "Välj en bild och starta analysen. Sedan kan du granska uppgifterna och lägga till kortet i din samling."}
                </p>
                <div className="mt-7 flex items-center gap-2 rounded-full border border-border px-3 py-2 text-[9px] text-muted-foreground">
                  <ShieldCheck className="h-3.5 w-3.5 text-primary/70" />
                  Du väljer vad som sparas
                </div>
              </div>
            )}
          </section>
        </div>
      </main>
      {result && selectedImage && !savedCard && (
        <CollectionCardEditor
          draft={cardToScan(result, selectedImage)}
          open={reviewOpen}
          onOpenChange={setReviewOpen}
          onCreated={(card) => {
            setSavedCard(card);
            setResult(cardAnalysisSchema.parse(card));
          }}
        />
      )}
      {showCamera && (
        <CameraCapture
          onCapture={(image) => {
            setShowCamera(false);
            void selectImage(image);
          }}
          onClose={() => setShowCamera(false)}
        />
      )}
    </div>
  );
};
export default function Scanner() {
  const { user } = useAuth();
  return (
    <ScannerWorkspace
      key={user?.id ?? "guest"}
      signedIn={Boolean(user && !user.is_anonymous)}
    />
  );
}
