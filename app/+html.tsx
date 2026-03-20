import { ScrollViewStyleReset } from 'expo-router/html';
import { type PropsWithChildren } from 'react';

const BUILD_ID = '2026-03-20-pwa-shell-fix';

/**
 * Root HTML document for the Expo web / PWA build.
 * – viewport-fit=cover: required for CSS env(safe-area-inset-*) to return real values on iOS Safari
 * – apple-mobile-web-app-status-bar-style: black → dark status bar, not the white default
 * – theme-color: dark background so the browser chrome matches the app
 */
export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="es">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />

        {/* CRITICAL: viewport-fit=cover allows env(safe-area-inset-*) to work on iOS */}
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, shrink-to-fit=no, viewport-fit=cover"
        />

        {/* PWA manifest – tells the browser this is an installable app */}
        <link rel="manifest" href={`/manifest.json?v=${BUILD_ID}`} />
        <meta httpEquiv="Cache-Control" content="no-store, no-cache, must-revalidate" />
        <meta httpEquiv="Pragma" content="no-cache" />
        <meta name="x-titanfit-build" content={BUILD_ID} />

        {/* iOS PWA meta tags */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        {/* "black-translucent" = fullscreen, content extends behind the status bar */}
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="TitanFit" />

        {/* Touch icon for iOS home screen */}
        <link rel="apple-touch-icon" href="/assets/images/icon.png" />

        {/* Theme color for Android PWA chrome and iOS task switcher */}
        <meta name="theme-color" content="#09090b" />

        {/* Expo: resets scroll-view default styles that conflict with safe area */}
        <ScrollViewStyleReset />

        <style dangerouslySetInnerHTML={{
          __html: `
            html,
            body {
              margin: 0;
              padding: 0;
              width: 100%;
              height: 100%;
              min-height: 100dvh;
              max-height: 100dvh;
              background-color: #09090b;
              overflow: hidden;
              overscroll-behavior: none;
            }
            /* Ensure the Expo web root fills the standalone PWA viewport on iOS */
            body > div:first-child,
            #root,
            [data-expo-root] {
              width: 100%;
              height: 100%;
              min-height: 100dvh;
              max-height: 100dvh;
              display: flex;
              flex-direction: column;
              background-color: #09090b;
            }
          `
        }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
