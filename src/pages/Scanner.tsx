import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Upload, Camera, Sparkles } from "lucide-react";
import Navigation from "@/components/Navigation";
import CameraCapture from "@/components/CameraCapture";
import { toast } from "sonner";

const Scanner = () => {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [showCamera, setShowCamera] = useState(false);

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
                Scanna Pokemon-kort
              </span>
            </h1>
            <p className="text-lg text-muted-foreground">
              Ladda upp en bild av ditt kort för att få detaljerad information
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {/* Upload Section */}
            <Card className="p-6">
              <h2 className="text-xl font-bold mb-4">Ladda upp kort</h2>
              
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
                      <p className="text-sm">Klicka för att ladda upp</p>
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
                    Välj fil
                  </Button>
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => setShowCamera(true)}
                  >
                    <Camera className="w-4 h-4 mr-2" />
                    Kamera
                  </Button>
                </div>

                <Button
                  variant="hero"
                  className="w-full"
                  onClick={analyzeCard}
                  disabled={!selectedImage || isAnalyzing}
                >
                  <Sparkles className="w-4 h-4 mr-2" />
                  {isAnalyzing ? "Analyserar..." : "Analysera kort"}
                </Button>
              </div>
            </Card>

            {/* Results Section */}
            <Card className="p-6">
              <h2 className="text-xl font-bold mb-4">Kortinformation</h2>
              
              {result ? (
                <div className="space-y-4">
                  <div>
                    <h3 className="text-2xl font-bold text-primary">{result.name}</h3>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between py-2 border-b border-border">
                      <span className="text-muted-foreground">Typ:</span>
                      <span className="font-medium">{result.type}</span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-border">
                      <span className="text-muted-foreground">Sällsynthet:</span>
                      <span className="font-medium">{result.rarity}</span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-border">
                      <span className="text-muted-foreground">Set:</span>
                      <span className="font-medium">{result.set}</span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-border">
                      <span className="text-muted-foreground">Nummer:</span>
                      <span className="font-medium">{result.number}</span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-border">
                      <span className="text-muted-foreground">Skick:</span>
                      <span className="font-medium">{result.condition}</span>
                    </div>
                    <div className="flex justify-between py-2">
                      <span className="text-muted-foreground">Uppskattat värde:</span>
                      <span className="font-bold text-primary">{result.estimatedValue}</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="h-full flex items-center justify-center text-center text-muted-foreground">
                  <p>Ladda upp och analysera ett kort för att se information här</p>
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
