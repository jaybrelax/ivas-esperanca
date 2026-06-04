import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Cadeia de Oração | IVAS - Virtude da Esperança',
  description: 'Confirme seu nome na lista de orações semanais. Adicione seu nome à lista de participantes de forma rápida e simples.',
  openGraph: {
    title: 'Cadeia de Oração | IVAS - Virtude da Esperança',
    description: 'Confirme seu nome na lista de orações semanais.',
    url: 'https://esperanca.virtudes.net.br',
    siteName: 'Cadeia de Oração | IVAS',
    images: [
      {
        url: 'https://esperanca.virtudes.net.br/IMG/featured-image2.webp',
        width: 1200,
        height: 630,
        type: 'image/webp',
      },
    ],
    locale: 'pt_BR',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Cadeia de Oração | IVAS - Virtude da Esperança',
    description: 'Confirme seu nome na lista de orações semanais.',
    images: ['https://esperanca.virtudes.net.br/IMG/featured-image2.webp'],
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <head>
        <link rel="icon" type="image/webp" href="/favicon.webp" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=Space+Grotesk:wght@300;400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body suppressHydrationWarning style={{ fontFamily: "'Inter', sans-serif" }}>
        {children}
      </body>
    </html>
  );
}
