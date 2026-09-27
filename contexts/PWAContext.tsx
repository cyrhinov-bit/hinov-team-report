import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Platform } from 'react-native';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

interface PWAContextType {
  isInstallable: boolean;
  isInstalled: boolean;
  promptInstall: () => Promise<boolean>;
}

const PWAContext = createContext<PWAContextType>({
  isInstallable: false,
  isInstalled: false,
  promptInstall: async () => false,
});

export const PWAProvider: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState<boolean>(false);
  const [isInstallable, setIsInstallable] = useState<boolean>(false);

  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return;

    // Check if app is already running as standalone PWA
    const checkIsStandalone = () => {
      const isStandalone =
        window.matchMedia('(display-mode: standalone)').matches ||
        (window.navigator as any).standalone === true ||
        document.referrer.includes('android-app://');
      setIsInstalled(Boolean(isStandalone));
    };

    checkIsStandalone();

    // Listen for beforeinstallprompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setIsInstallable(true);
    };

    // Listen for appinstalled
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setIsInstallable(false);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const promptInstall = useCallback(async (): Promise<boolean> => {
    if (!deferredPrompt) {
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        const ua = navigator.userAgent || '';
        const isIOS = /iPad|iPhone|iPod/.test(ua) && !(window as any).MSStream;
        const isAndroid = /Android/.test(ua);

        if (isIOS) {
          alert("📱 Installation sur iPhone / iPad :\n\n1. Touchez le bouton de partage (icône avec une flèche vers le haut).\n2. Faites défiler et sélectionnez « Sur l'écran d'accueil ».\n3. Touchez « Ajouter ».");
        } else if (isAndroid) {
          alert("📱 Installation sur Android :\n\n1. Touchez les 3 points verticaux (⋮) en haut à droite du navigateur.\n2. Sélectionnez « Ajouter à l'écran d'accueil » ou « Installer l'application ».");
        } else {
          alert("💻 Installation sur Ordinateur (Chrome / Edge / Brave) :\n\n1. Cliquez sur l'icône d'installation (⊕ ou écran avec flèche) située tout à droite dans la barre d'adresse du navigateur.\n2. Ou cliquez sur le menu (⋮) > « Installer Hinov Team Report ».");
        }
      }
      return false;
    }

    try {
      await deferredPrompt.prompt();
      const choiceResult = await deferredPrompt.userChoice;
      if (choiceResult.outcome === 'accepted') {
        setIsInstalled(true);
        setIsInstallable(false);
        setDeferredPrompt(null);
        return true;
      }
      return false;
    } catch (err) {
      console.warn('PWA prompt error:', err);
      return false;
    }
  }, [deferredPrompt]);

  return (
    <PWAContext.Provider
      value={{
        isInstallable,
        isInstalled,
        promptInstall,
      }}
    >
      {children}
    </PWAContext.Provider>
  );
};

export const usePWA = () => useContext(PWAContext);
