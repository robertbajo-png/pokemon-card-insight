import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Upload, Camera, Sparkles } from "lucide-react";
import Navigation from "@/components/Navigation";
import CameraCapture from "@/components/CameraCapture";
import { TranslatedText } from "@/components/TranslatedText";
import { toast } from "sonner";
import { useScannedCards } from "@/hooks/useScannedCards";

const Scanner = () => {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [showCamera, setShowCamera] = useState(false);
  const [selectedGrade, setSelectedGrade] = useState<string>('ungraded');
  const { addCard } = useScannedCards();

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setSelectedImage(e.target?.result as string);
        setResult(null);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCameraCapture = (imageDataUrl: string) => {
    setSelectedImage(imageDataUrl);
    setResult(null);
    setShowCamera(false);
  };

  const analyzeCard = async () => {
    if (!selectedImage) {
      toast.error("Ladda upp en bild först");
      return;
    }

    setIsAnalyzing(true);
    
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/analyze-pokemon-card`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            image: selectedImage,
            action: 'analyze'
          }),
        }
      );

      if (!response.ok) {
        throw new Error('Failed to analyze card');
      }

      const data = await response.json();
      setResult(data);
      addCard({
        name: data.name ?? "Okänt kort",
        type: data.type?.toLowerCase?.() ?? "colorless",
        rarity: data.rarity ?? "unknown",
        set: data.set ?? "Okänt set",
        number: data.number?.toString?.() ?? "-",
        condition: data.condition,
        estimatedValue: data.estimatedValue,
        image: selectedImage ?? undefined,
      });
      toast.success("Kort analyserat!");
    } catch (error) {
      console.error('Error analyzing card:', error);
      toast.error("Kunde inte analysera kortet");
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <div className="container mx-auto px-4 pt-24 pb-16">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold mb-4">
              <span className="bg-gradient-hero bg-clip-text text-transparent">
                <TranslatedText text="Scanna Pokemon-kort" />
              </span>
            </h1>
            <p className="text-lg text-muted-foreground">
              <TranslatedText text="Ladda upp en bild av ditt kort för att få detaljerad information" />
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {/* Upload Section */}
            <Card className="p-6">
              <h2 className="text-xl font-bold mb-4">
                <TranslatedText text="Ladda upp kort" />
              </h2>
              
              <div className="space-y-4">
                <div 
                  className="relative aspect-[3/4] border-2 border-dashed border-border rounded-lg overflow-hidden bg-muted/50 hover:bg-muted transition-colors cursor-pointer"
                  onClick={() => document.getElementById("file-upload")?.click()}
                >
                  {selectedImage ? (
                    <img src={selectedImage} alt="Uploaded" className="w-full h-full object-contain" />
                  ) : (
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground">
                      <Upload className="w-12 h-12 mb-2" />
                      <p className="text-sm">
                        <TranslatedText text="Klicka för att ladda upp" />
                      </p>
                    </div>
                  )}
                </div>

                <input
                  id="file-upload"
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => document.getElementById("file-upload")?.click()}
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    <TranslatedText text="Välj fil" />
                  </Button>
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => setShowCamera(true)}
                  >
                    <Camera className="w-4 h-4 mr-2" />
                    <TranslatedText text="Kamera" />
                  </Button>
                </div>

                <Button
                  variant="hero"
                  className="w-full"
                  onClick={analyzeCard}
                  disabled={!selectedImage || isAnalyzing}
                >
                  <Sparkles className="w-4 h-4 mr-2" />
                  <TranslatedText text={isAnalyzing ? "Analyserar..." : "Analysera kort"} />
                </Button>
              </div>
            </Card>

            {/* Results Section */}
            <Card className="p-6">
              <h2 className="text-xl font-bold mb-4">
                <TranslatedText text="Kortinformation" />
              </h2>
              
              {result ? (
                <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2">
                  <div>
                    <h3 className="text-2xl font-bold text-primary">{result.name}</h3>
                    {result.description && (
                      <p className="text-sm text-muted-foreground mt-2">{result.description}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    {result.hp && (
                      <div className="flex justify-between py-2 border-b border-border">
                        <span className="text-muted-foreground">
                          <TranslatedText text="HP:" />
                        </span>
                        <span className="font-medium">{result.hp}</span>
                      </div>
                    )}
                    <div className="flex justify-between py-2 border-b border-border">
                      <span className="text-muted-foreground">
                        <TranslatedText text="Typ:" />
                      </span>
                      <span className="font-medium">{result.type}</span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-border">
                      <span className="text-muted-foreground">
                        <TranslatedText text="Sällsynthet:" />
                      </span>
                      <span className="font-medium">{result.rarity}</span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-border">
                      <span className="text-muted-foreground">
                        <TranslatedText text="Set:" />
                      </span>
                      <span className="font-medium">{result.set}</span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-border">
                      <span className="text-muted-foreground">
                        <TranslatedText text="Nummer:" />
                      </span>
                      <span className="font-medium">{result.number}</span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-border">
                      <span className="text-muted-foreground">
                        <TranslatedText text="Skick:" />
                      </span>
                      <span className="font-medium">{result.condition}</span>
                    </div>

                    {result.attacks && result.attacks.length > 0 && (
                      <div className="py-2 border-b border-border">
                        <span className="text-muted-foreground block mb-2">
                          <TranslatedText text="Attacker:" />
                        </span>
                        <div className="space-y-2 pl-2">
                          {result.attacks.map((attack: any, idx: number) => (
                            <div key={idx} className="space-y-1">
                              <div className="font-medium">{attack.name}</div>
                              {attack.damage && <div className="text-sm text-muted-foreground">Skada: {attack.damage}</div>}
                              {attack.cost && attack.cost.length > 0 && (
                                <div className="text-sm text-muted-foreground">
                                  Kostnad: {attack.cost.join(", ")}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {result.weaknesses && result.weaknesses.length > 0 && (
                      <div className="flex justify-between py-2 border-b border-border">
                        <span className="text-muted-foreground">
                          <TranslatedText text="Svagheter:" />
                        </span>
                        <span className="font-medium">
                          {result.weaknesses.map((w: any) => `${w.type} ${w.value}`).join(", ")}
                        </span>
                      </div>
                    )}

                    {result.resistances && result.resistances.length > 0 && (
                      <div className="flex justify-between py-2 border-b border-border">
                        <span className="text-muted-foreground">
                          <TranslatedText text="Resistanser:" />
                        </span>
                        <span className="font-medium">
                          {result.resistances.map((r: any) => `${r.type} ${r.value}`).join(", ")}
                        </span>
                      </div>
                    )}

                    {result.retreatCost !== undefined && (
                      <div className="flex justify-between py-2 border-b border-border">
                        <span className="text-muted-foreground">
                          <TranslatedText text="Reträttkostnad:" />
                        </span>
                        <span className="font-medium">{result.retreatCost}</span>
                      </div>
                    )}

                    <div className="py-2 border-b border-border">
                      <span className="text-muted-foreground block mb-2">
                        <TranslatedText text="Gradering:" />
                      </span>
                      <select 
                        value={selectedGrade}
                        onChange={(e) => setSelectedGrade(e.target.value)}
                        className="w-full p-2 rounded-md bg-background border border-border text-foreground"
                      >
                        <option value="ungraded">Ograderat</option>
                        <option value="psa1">PSA 1</option>
                        <option value="psa2">PSA 2</option>
                        <option value="psa3">PSA 3</option>
                        <option value="psa4">PSA 4</option>
                        <option value="psa5">PSA 5</option>
                        <option value="psa6">PSA 6</option>
                        <option value="psa7">PSA 7</option>
                        <option value="psa8">PSA 8</option>
                        <option value="psa9">PSA 9</option>
                        <option value="psa10">PSA 10</option>
                      </select>
                    </div>

                    <div className="flex justify-between py-2">
                      <span className="text-muted-foreground">
                        <TranslatedText text="Uppskattat värde:" />
                      </span>
                      <span className="font-bold text-primary text-lg">
                        {result.priceByGrade?.[selectedGrade] || result.estimatedValue || '-'}
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="h-full flex items-center justify-center text-center text-muted-foreground">
                  <p>
                    <TranslatedText text="Ladda upp och analysera ett kort för att se information här" />
                  </p>
                </div>
              )}
            </Card>
          </div>
        </div>
      </div>

      {showCamera && (
        <CameraCapture
          onCapture={handleCameraCapture}
          onClose={() => setShowCamera(false)}
        />
      )}
    </div>
  );
};

export default Scanner;
