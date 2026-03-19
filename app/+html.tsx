import { ScrollViewStyleReset } from 'expo-router/html';
import { type PropsWithChildren } from 'react';

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

        {/* PWA meta tags */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        {/* "black" keeps status bar dark; content renders below it (no overlap) */}
        <meta name="apple-mobile-web-app-status-bar-style" content="black" />
        <meta name="apple-mobile-web-app-title" content="TitanFit" />

        {/* Theme color for Android PWA chrome and iOS task switcher */}
        <meta name="theme-color" content="#09090b" media="(prefers-color-scheme: dark)" />
        <meta name="theme-color" content="#f8fafc" media="(prefers-color-scheme: light)" />

        {/* Expo: resets scroll-view default styles that conflict with safe area */}
        <ScrollViewStyleReset />

        {/*
          Global CSS safe-area helpers.
          On iOS PWA with viewport-fit=cover, these CSS env() values include real device insets.
          Without viewport-fit=cover they are always 0.
        */}
        <style dangerouslySetInnerHTML={{
          __html: `
            :root {
              --sat: env(safe-area-inset-top, 0px);
              --sar: env(safe-area-inset-right, 0px);
              --sab: env(safe-area-inset-bottom, 0px);
              --sal: env(safe-area-inset-left, 0px);
            }
            body {
              background-color: #09090b; /* zinc-950 — matches dark mode app bg */
              overflow: hidden;
            }
          `
        }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
