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

declare global {
  interface Window {
    __pwaPrompt?: BeforeInstallPromptEvent | null;
  }
}

export function usePWAInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return;

    // 1. Enregistrer le Service Worker si supporté
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch((err) => {
        console.warn('SW register error:', err);
      });
    }

    // 2. Vérifier si l'application est déjà exécutée en mode Standalone (déjà installée)
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true ||
      (document.referrer && document.referrer.startsWith('android-app://'));

    if (isStandalone) {
      setIsInstalled(true);
      return;
    }

    // 3. Détecter si l'utilisateur est sur iOS (Safari ou Webview)
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
    if (isIosDevice && !isStandalone) {
      setIsIOS(true);
    }

    // 4. Vérifier si l'événement a déjà été capturé avant le montage du composant
    if (window.__pwaPrompt) {
      setDeferredPrompt(window.__pwaPrompt);
    }

    // 5. Écouter l'événement beforeinstallprompt et l'événement custom pwa-prompt-ready
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      const promptEvent = e as BeforeInstallPromptEvent;
      window.__pwaPrompt = promptEvent;
      setDeferredPrompt(promptEvent);
    };

    const handlePromptReady = () => {
      if (window.__pwaPrompt) {
        setDeferredPrompt(window.__pwaPrompt);
      }
    };

    // 6. Écouter l'événement appinstalled
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
      window.__pwaPrompt = null;
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('pwa-prompt-ready', handlePromptReady);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('pwa-prompt-ready', handlePromptReady);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const promptInstall = useCallback(async (): Promise<'prompted' | 'manual' | 'installed'> => {
    if (isInstalled) return 'installed';

    const promptObj = deferredPrompt || (typeof window !== 'undefined' ? window.__pwaPrompt : null);

    if (promptObj) {
      try {
        await promptObj.prompt();
        const choiceResult = await promptObj.userChoice;
        if (choiceResult.outcome === 'accepted') {
          setIsInstalled(true);
        }
        setDeferredPrompt(null);
        if (typeof window !== 'undefined') {
          window.__pwaPrompt = null;
        }
        return 'prompted';
      } catch (e) {
        console.warn('Install prompt error:', e);
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
    hasNativePrompt: Boolean(deferredPrompt || (typeof window !== 'undefined' && window.__pwaPrompt)),
    promptInstall,
    dismissBanner,
  };
}

