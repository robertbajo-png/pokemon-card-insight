import { useState, useEffect } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export const useInstallPrompt = () => {
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isInPreview, setIsInPreview] = useState(false);

  useEffect(() => {
    // Check if in Lovable preview
    const inPreview = window.location.hostname.includes('lovableproject.com');
    setIsInPreview(inPreview);

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
    if (!installPrompt) {
      if (isInPreview) {
        const installUrl = new URL(window.location.href);
        installUrl.searchParams.set('forceHideBadge', 'true');

        window.open(installUrl.toString(), '_blank', 'noopener');
        alert(
          'Öppnade appen i en ny flik. Använd webbläsarens "Installera app" eller "Lägg till på hemskärmen" i den fliken för att installera.',
        );
      }
      return;
    }

    installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;

    if (outcome === 'accepted') {
      setInstallPrompt(null);
    }
  };

  return {
    installPrompt,
    isInstalled,
    handleInstall,
    canInstall: !isInstalled && (isInPreview || !!installPrompt)
  };
};
