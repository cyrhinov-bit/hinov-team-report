import { useState, useEffect, useCallback } from 'react';
import { Platform } from 'react-native';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

export function usePWAInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return;

    // 1. Vérifier si l'application est déjà exécutée en mode Standalone (déjà installée)
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true ||
      (document.referrer && document.referrer.startsWith('android-app://'));

    if (isStandalone) {
      setIsInstalled(true);
      return;
    }

    // 2. Détecter si l'utilisateur est sur iOS (Safari ou Webview)
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
    if (isIosDevice && !isStandalone) {
      setIsIOS(true);
    }

    // 3. Écouter l'événement beforeinstallprompt (Chrome, Edge, Android, Opera)
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    // 4. Écouter l'événement appinstalled
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const promptInstall = useCallback(async (): Promise<'prompted' | 'manual' | 'installed'> => {
    if (isInstalled) return 'installed';

    if (deferredPrompt) {
      try {
        await deferredPrompt.prompt();
        const choiceResult = await deferredPrompt.userChoice;
        if (choiceResult.outcome === 'accepted') {
          setIsInstalled(true);
        }
        setDeferredPrompt(null);
        return 'prompted';
      } catch {
        return 'manual';
      }
    }

    return 'manual';
  }, [deferredPrompt, isInstalled]);

  const dismissBanner = useCallback(() => {
    setIsDismissed(true);
  }, []);

  // Le bouton/bannière peut s'afficher sur le Web tant que l'app n'est pas en standalone
  const canInstall = Platform.OS === 'web' && !isInstalled && !isDismissed;

  return {
    canInstall,
    isInstalled,
    isIOS,
    hasNativePrompt: Boolean(deferredPrompt),
    promptInstall,
    dismissBanner,
  };
}
