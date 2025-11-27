import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Upload, Camera, Sparkles, ChevronDown } from "lucide-react";
import Navigation from "@/components/Navigation";
import CameraCapture from "@/components/CameraCapture";
import { TranslatedText } from "@/components/TranslatedText";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/contexts/LanguageContext";
import { convertPriceRange } from "@/utils/currency";
import { useScannedCards } from "@/hooks/useScannedCards";

const Scanner = () => {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [showCamera, setShowCamera] = useState(false);
  const { currency, setCurrency } = useLanguage();
  const { addCard } = useScannedCards();

  const convertPrice = (priceInSEK: string): string =>
    convertPriceRange(priceInSEK, currency);

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
                <div className="space-y-4">
                  <div>
                    <h3 className="text-2xl font-bold text-primary">{result.name}</h3>
                  </div>

                  <div className="space-y-2">
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
                    <div className="flex justify-between py-2">
                      <span className="text-muted-foreground">
                        <TranslatedText text="Uppskattat värde:" />
                      </span>
                      <Popover>
                        <PopoverTrigger asChild>
                          <button className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-accent transition-colors cursor-pointer">
                            <span className="font-bold text-primary">
                              {result.estimatedValue ? convertPrice(result.estimatedValue) : result.estimatedValue}
                            </span>
                            <ChevronDown className="w-4 h-4 text-primary" />
                          </button>
                        </PopoverTrigger>
                        <PopoverContent className="w-48 p-3 bg-card border border-border shadow-lg z-[100]" align="end" sideOffset={8}>
                          <div className="space-y-1">
                            <button
                              onClick={() => {
                                console.log('Changing currency to SEK');
                                setCurrency("SEK");
                              }}
                              className={cn(
                                "w-full text-left px-3 py-2 rounded-md transition-colors text-sm font-medium",
                                currency === "SEK" 
                                  ? "bg-primary text-primary-foreground" 
                                  : "hover:bg-accent text-foreground"
                              )}
                            >
                              SEK (kr)
                            </button>
                            <button
                              onClick={() => {
                                console.log('Changing currency to USD');
                                setCurrency("USD");
                              }}
                              className={cn(
                                "w-full text-left px-3 py-2 rounded-md transition-colors text-sm font-medium",
                                currency === "USD" 
                                  ? "bg-primary text-primary-foreground" 
                                  : "hover:bg-accent text-foreground"
                              )}
                            >
                              USD ($)
                            </button>
                            <button
                              onClick={() => {
                                console.log('Changing currency to EUR');
                                setCurrency("EUR");
                              }}
                              className={cn(
                                "w-full text-left px-3 py-2 rounded-md transition-colors text-sm font-medium",
                                currency === "EUR" 
                                  ? "bg-primary text-primary-foreground" 
                                  : "hover:bg-accent text-foreground"
                              )}
                            >
                              EUR (€)
                            </button>
                            <button
                              onClick={() => {
                                console.log('Changing currency to JPY');
                                setCurrency("JPY");
                              }}
                              className={cn(
                                "w-full text-left px-3 py-2 rounded-md transition-colors text-sm font-medium",
                                currency === "JPY" 
                                  ? "bg-primary text-primary-foreground" 
                                  : "hover:bg-accent text-foreground"
                              )}
                            >
                              JPY (¥)
                            </button>
                          </div>
                        </PopoverContent>
                      </Popover>
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
