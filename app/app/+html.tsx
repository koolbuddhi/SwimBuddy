import { ScrollViewStyleReset } from 'expo-router/html';
import { type PropsWithChildren } from 'react';

// Top-level HTML shell for the web app. This file is web-only — it has no
// effect on native iOS / Android. We use it to wire the PWA manifest, theme
// colour, apple-touch-icon, and the service-worker registration script.
export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, shrink-to-fit=no, viewport-fit=cover"
        />

        {/* PWA manifest + colours */}
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#0ea5e9" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="SwimBuddy" />

        {/* Home-screen icons */}
        <link rel="icon" type="image/png" sizes="192x192" href="/icons/icon-192.png" />
        <link rel="icon" type="image/png" sizes="512x512" href="/icons/icon-512.png" />
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />

        <title>SwimBuddy</title>

        <ScrollViewStyleReset />

        {/* Register the service worker — fetch handler is required for the
            "Install" prompt and for offline use. Registering eagerly (not
            inside a 'load' handler) because the inline script in <head>
            sometimes runs after the load event already fired. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                navigator.serviceWorker.register('/sw.js').catch((e) => {
                  console.warn('SW registration failed', e);
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
