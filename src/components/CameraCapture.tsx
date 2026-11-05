import {
  useRef,
  useState,
  useEffect,
  useCallback,
  type ChangeEvent,
} from "react";
import { Button } from "@/components/ui/button";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { Camera, X, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { prepareCardImage } from "@/utils/cardImage";
import { useLanguage } from "@/contexts/LanguageContext";

interface CameraCaptureProps {
  onCapture: (imageDataUrl: string) => void;
  onClose: () => void;
}

const CameraCapture = ({ onCapture, onClose }: CameraCaptureProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [facingMode, setFacingMode] = useState<"user" | "environment">(
    "environment",
  );
  const [hasMultipleCameras, setHasMultipleCameras] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [cameraReady, setCameraReady] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);
  const { t } = useLanguage();

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setCameraReady(false);
    if (videoRef.current) videoRef.current.srcObject = null;
  }, []);

  useEffect(() => {
    let cancelled = false;
    let ownedStream: MediaStream | null = null;
    const start = async () => {
      try {
        if (!navigator.mediaDevices?.getUserMedia)
          throw new Error("Kameran stöds inte i denna webbläsare.");
        setCameraError(null);
        setCameraReady(false);
        const media = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: {
            facingMode,
            width: { ideal: 1600 },
            height: { ideal: 1200 },
          },
        });
        if (cancelled || !videoRef.current) {
          media.getTracks().forEach((track) => track.stop());
          return;
        }
        ownedStream = media;
        streamRef.current = media;
        videoRef.current.srcObject = media;
        if (!navigator.mediaDevices.enumerateDevices) return;
        const devices = await navigator.mediaDevices
          .enumerateDevices()
          .catch(() => []);
        if (!cancelled)
          setHasMultipleCameras(
            devices.filter((device) => device.kind === "videoinput").length > 1,
          );
      } catch (error) {
        if (!cancelled) {
          if (ownedStream) stopCamera();
          setCameraError(
            "Kunde inte komma åt kameran. Kontrollera behörigheter eller använd filuppladdning.",
          );
          console.error("Camera error:", error);
        }
      }
    };
    void start();
    return () => {
      cancelled = true;
      if (streamRef.current === ownedStream) stopCamera();
    };
  }, [facingMode, stopCamera]);

  const capturePhoto = () => {
    if (
      videoRef.current?.videoWidth &&
      videoRef.current.videoHeight &&
      canvasRef.current
    ) {
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
    setFacingMode((prev) => (prev === "user" ? "environment" : "user"));
  };

  const handleFileUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    try {
      const image = await prepareCardImage(file);
      stopCamera();
      onCapture(image);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Bilden kunde inte läsas.",
      );
    }
  };

  const triggerFileUpload = () => {
    fileInputRef.current?.click();
  };

  return (
    <DialogPrimitive.Root
      open
      onOpenChange={(open) => {
        if (!open) {
          stopCamera();
          onClose();
        }
      }}
    >
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-[100] bg-background/95" />
        <DialogPrimitive.Content
          aria-modal="true"
          className="fixed inset-0 z-[100] h-[100dvh] rounded-none border bg-background/95 text-card-foreground shadow-sm backdrop-blur-sm outline-none flex flex-col"
          onOpenAutoFocus={() => {
            returnFocusRef.current =
              document.activeElement instanceof HTMLElement
                ? document.activeElement
                : null;
          }}
          onCloseAutoFocus={(event) => {
            // This conditional camera has no Radix Trigger of its own.
            event.preventDefault();
            if (returnFocusRef.current?.isConnected)
              returnFocusRef.current.focus({ preventScroll: true });
          }}
        >
          <div className="flex shrink-0 items-center justify-between p-4 pt-[max(1rem,env(safe-area-inset-top))] border-b border-border">
            <DialogPrimitive.Title className="text-xl font-bold">
              {t("takePhotoOfCard")}
            </DialogPrimitive.Title>
            <DialogPrimitive.Close asChild>
              <Button aria-label="Stäng kameran" variant="ghost" size="icon">
                <X className="w-5 h-5" />
              </Button>
            </DialogPrimitive.Close>
          </div>

          <div className="flex-1 min-h-0 relative overflow-hidden bg-black">
            {!cameraError ? (
              <>
                <video
                  ref={videoRef}
                  autoPlay
                  muted
                  playsInline
                  onLoadedData={() => setCameraReady(true)}
                  className="w-full h-full object-cover"
                />

                {/* Camera guide overlay */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="w-[80%] max-w-md aspect-[3/4] border-4 border-primary/50 rounded-xl">
                    <div className="absolute top-2 left-2 right-2 text-center">
                      <span className="text-white text-sm bg-black/50 px-3 py-1 rounded-full">
                        {t("placeCardInFrame")}
                      </span>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 px-4 text-center bg-background">
                <div className="w-16 h-16 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                  <Camera className="w-8 h-8" />
                </div>
                <p className="text-lg font-semibold">{cameraError}</p>
                <p className="text-sm text-muted-foreground max-w-sm">
                  Ladda upp ett foto direkt från mobilen för att fortsätta.
                </p>
                <Button
                  variant="hero"
                  className="gap-2"
                  onClick={triggerFileUpload}
                >
                  <Camera className="w-4 h-4" />
                  <span>Välj eller ta foto</span>
                </Button>
              </div>
            )}
          </div>

          <div className="shrink-0 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] space-y-4">
            <div className="flex items-center justify-center gap-4">
              {hasMultipleCameras && !cameraError && (
                <Button
                  variant="outline"
                  size="icon"
                  aria-label="Växla kamera"
                  onClick={switchCamera}
                  className="rounded-full w-14 h-14"
                >
                  <RotateCcw className="w-6 h-6" />
                </Button>
              )}

              <Button
                variant="hero"
                size="icon"
                aria-label={cameraError ? "Välj eller ta foto" : "Ta foto"}
                disabled={!cameraError && !cameraReady}
                onClick={cameraError ? triggerFileUpload : capturePhoto}
                className="rounded-full w-16 h-16"
              >
                <Camera className="w-8 h-8" />
              </Button>

              <div className="w-14 h-14" />
            </div>

            <DialogPrimitive.Description className="text-center text-sm text-muted-foreground">
              {cameraError
                ? "Alternativ: ladda upp ett foto via mobilen"
                : t("pressToTakePhoto")}
            </DialogPrimitive.Description>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            capture="environment"
            hidden
            className="hidden"
            onChange={handleFileUpload}
          />

          <canvas ref={canvasRef} className="hidden" />
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
};

export default CameraCapture;
