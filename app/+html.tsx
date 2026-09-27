import { ScrollViewStyleReset } from 'expo-router/html';
import type { PropsWithChildren } from 'react';

// This file is web-only and used to configure the root HTML for every web page during static render.
export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="fr">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no, viewport-fit=cover" />
        
        {/* PWA Manifest & Colors */}
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#0B2240" />
        <meta name="mobile-web-app-capable" content="yes" />
        
        {/* Apple iOS Web App Tags */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="HTR" />
        <link rel="apple-touch-icon" href="/favicon.ico" />

        {/* Title & Description */}
        <title>Hinov Team Report (HTR)</title>
        <meta name="description" content="Plateforme officielle de reporting hebdomadaire du groupe HINOV" />
        <link rel="apple-touch-icon" href="/icon-192.png" />

        {/* Disable body scrolling on web for native app feel */}
        <ScrollViewStyleReset />

        {/* Immediate PWA Event Interception & Service Worker */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              window.__deferredPrompt = null;
              window.addEventListener('beforeinstallprompt', function(e) {
                e.preventDefault();
                window.__deferredPrompt = e;
                if (window.__onBeforeInstallPromptReady) {
                  window.__onBeforeInstallPromptReady(e);
                }
              });

              if ('serviceWorker' in navigator && window.location.protocol.startsWith('http')) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js').then(function(reg) {
                    console.log('HTR PWA: ServiceWorker active', reg.scope);
                  }).catch(function(err) {
                    console.log('HTR PWA: ServiceWorker registration error', err);
                  });
                });
              }
            `,
          }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
