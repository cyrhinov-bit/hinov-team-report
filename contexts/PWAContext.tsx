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
        Boolean(document.referrer && document.referrer.includes('android-app://'));
      setIsInstalled(Boolean(isStandalone));
    };

    checkIsStandalone();

    // Check if beforeinstallprompt was already captured in +html.tsx early inline script
    const globalPrompt = (window as any).__deferredPrompt;
    if (globalPrompt) {
      setDeferredPrompt(globalPrompt);
      setIsInstallable(true);
    }

    (window as any).__onBeforeInstallPromptReady = (e: BeforeInstallPromptEvent) => {
      setDeferredPrompt(e);
      setIsInstallable(true);
    };

    // Listen for beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      const promptEvent = e as BeforeInstallPromptEvent;
      (window as any).__deferredPrompt = promptEvent;
      setDeferredPrompt(promptEvent);
      setIsInstallable(true);
    };

    // Listen for appinstalled
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setIsInstallable(false);
      setDeferredPrompt(null);
      (window as any).__deferredPrompt = null;
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
      (window as any).__onBeforeInstallPromptReady = null;
    };
  }, []);

  const promptInstall = useCallback(async (): Promise<boolean> => {
    const activePrompt = deferredPrompt || (typeof window !== 'undefined' ? (window as any).__deferredPrompt : null);

    if (activePrompt && typeof activePrompt.prompt === 'function') {
      try {
        await activePrompt.prompt();
        const choiceResult = await activePrompt.userChoice;
        if (choiceResult && choiceResult.outcome === 'accepted') {
          setIsInstalled(true);
          setIsInstallable(false);
          setDeferredPrompt(null);
          if (typeof window !== 'undefined') (window as any).__deferredPrompt = null;
          return true;
        }
        return false;
      } catch (err) {
        console.warn('PWA prompt execution error:', err);
        return false;
      }
    }

    return false;
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
