import { ScrollViewStyleReset } from 'expo-router/html';
import type { PropsWithChildren } from 'react';
import React from 'react';

/**
 * Shell HTML do export web (PWA): metas de iOS standalone, manifest e ícones.
 */
export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="pt-BR">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, shrink-to-fit=no, viewport-fit=cover"
        />
        <title>Tri Atleta</title>
        <meta name="description" content="Acompanhamento pessoal de treinos de força, cardio e provas" />
        <meta name="theme-color" content="#0c0e11" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Tri Atleta" />
        <link rel="manifest" href="/manifest.json" />
        <link rel="apple-touch-icon" href="/icons/icon-180.png" />
        <link rel="icon" type="image/png" sizes="192x192" href="/icons/icon-192.png" />
        <ScrollViewStyleReset />
        <style dangerouslySetInnerHTML={{ __html: 'html,body{background:#0c0e11}' }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
