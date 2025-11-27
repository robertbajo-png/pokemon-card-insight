import { useState, useEffect } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export const useInstallPrompt = () => {
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isInPreview, setIsInPreview] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isMacSafari, setIsMacSafari] = useState(false);

  useEffect(() => {
    // Check if in Lovable preview
    const inPreview = window.location.hostname.includes('lovableproject.com');
    setIsInPreview(inPreview);

    // Detect iOS
    const iOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    setIsIOS(iOS);

    // Detect Mac Safari (doesn't support beforeinstallprompt)
    const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
    const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
    setIsMacSafari(isMac && isSafari);

    // Check if already installed
    if (
      window.matchMedia('(display-mode: standalone)').matches ||
      // iOS Safari
      ('standalone' in window.navigator && (window.navigator as any).standalone)
    ) {
      setIsInstalled(true);
      return;
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e as BeforeInstallPromptEvent);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setInstallPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstall = async () => {
    if (installPrompt) {
      // Chrome/Edge with native prompt
      installPrompt.prompt();
      const { outcome } = await installPrompt.userChoice;
      if (outcome === 'accepted') {
        setInstallPrompt(null);
      }
    } else if (isIOS) {
      alert(
        'För att installera på iOS:\n\n1. Tryck på "Dela"-knappen (ruta med pil uppåt)\n2. Välj "Lägg till på hemskärmen"'
      );
    } else if (isMacSafari) {
      alert(
        'Safari på Mac stöder inte PWA-installation.\n\nAnvänd Chrome eller Edge för att installera appen.'
      );
    } else if (isInPreview) {
      const installUrl = new URL(window.location.href);
      installUrl.searchParams.set('forceHideBadge', 'true');
      window.open(installUrl.toString(), '_blank', 'noopener');
      alert(
        'Öppnade appen i en ny flik. Använd webbläsarens "Installera app"-knapp (vanligtvis i adressfältet) för att installera.'
      );
    } else {
      // Generic fallback for browsers that support PWA but didn't fire the event
      alert(
        'För att installera appen:\n\n• Chrome/Edge: Klicka på installera-ikonen i adressfältet (eller menyknappen → "Installera app")\n• Firefox: Stöder tyvärr inte PWA-installation på desktop'
      );
    }
  };

  // Show install option if not installed and either: has native prompt, is in preview, or is iOS/Safari (to show instructions)
  const canInstall = !isInstalled && (!!installPrompt || isInPreview || isIOS || isMacSafari);

  return {
    installPrompt,
    isInstalled,
    handleInstall,
    canInstall
  };
};
