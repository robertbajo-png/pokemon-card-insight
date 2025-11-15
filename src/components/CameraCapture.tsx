import { useRef, useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Camera, X, RotateCcw } from "lucide-react";
import { toast } from "sonner";

interface CameraCaptureProps {
  onCapture: (imageDataUrl: string) => void;
  onClose: () => void;
}

const CameraCapture = ({ onCapture, onClose }: CameraCaptureProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [facingMode, setFacingMode] = useState<"user" | "environment">("environment");
  const [hasMultipleCameras, setHasMultipleCameras] = useState(false);

  useEffect(() => {
    startCamera();
    checkMultipleCameras();

    return () => {
      stopCamera();
    };
  }, [facingMode]);

  const checkMultipleCameras = async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter(device => device.kind === "videoinput");
      setHasMultipleCameras(videoDevices.length > 1);
    } catch (error) {
      console.error("Error checking cameras:", error);
    }
  };

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: facingMode,
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
      });

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        setStream(mediaStream);
      }
    } catch (error) {
      console.error("Error accessing camera:", error);
      toast.error("Kunde inte komma åt kameran. Kontrollera behörigheter.");
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      const context = canvas.getContext("2d");
      if (context) {
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        const imageDataUrl = canvas.toDataURL("image/jpeg", 0.9);
        
        stopCamera();
        onCapture(imageDataUrl);
        toast.success("Foto taget!");
      }
    }
  };

  const switchCamera = () => {
    setFacingMode(prev => prev === "user" ? "environment" : "user");
  };

  return (
    <Card className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm flex flex-col">
      <div className="flex items-center justify-between p-4 border-b border-border">
        <h2 className="text-xl font-bold">Ta foto av kort</h2>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="w-5 h-5" />
        </Button>
      </div>

      <div className="flex-1 relative overflow-hidden bg-black">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          className="w-full h-full object-cover"
        />
        
        {/* Camera guide overlay */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-[80%] max-w-md aspect-[3/4] border-4 border-primary/50 rounded-xl">
            <div className="absolute top-2 left-2 right-2 text-center">
              <span className="text-white text-sm bg-black/50 px-3 py-1 rounded-full">
                Placera kortet i ramen
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-4">
        <div className="flex items-center justify-center gap-4">
          {hasMultipleCameras && (
            <Button
              variant="outline"
              size="icon"
              onClick={switchCamera}
              className="rounded-full w-14 h-14"
            >
              <RotateCcw className="w-6 h-6" />
            </Button>
          )}

          <Button
            variant="hero"
            size="icon"
            onClick={capturePhoto}
            className="rounded-full w-16 h-16"
          >
            <Camera className="w-8 h-8" />
          </Button>

          <div className="w-14 h-14" />
        </div>

        <p className="text-center text-sm text-muted-foreground">
          Tryck på kameraknappen för att ta ett foto
        </p>
      </div>

      <canvas ref={canvasRef} className="hidden" />
    </Card>
  );
};

export default CameraCapture;
