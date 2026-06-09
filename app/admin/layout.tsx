import type { Metadata, Viewport } from 'next';

export const metadata: Metadata = {
  title: 'Admin — Cadeia de Oração IVAS',
  description: 'Painel administrativo da Cadeia de Oração - IVAS Virtude da Esperança',
  manifest: '/admin-manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Admin IVAS',
    startupImage: '/icons/admin-icon-512.png',
  },
  icons: {
    apple: '/icons/admin-icon-192.png',
    icon: '/icons/admin-icon-512.png',
  },
};

export const viewport: Viewport = {
  themeColor: '#6366f1',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {/* Registro do Service Worker */}
      <script
        dangerouslySetInnerHTML={{
          __html: `
            if ('serviceWorker' in navigator) {
              window.addEventListener('load', function() {
                navigator.serviceWorker.register('/admin-sw.js', { scope: '/admin' })
                  .then(function(reg) {
                    console.log('[PWA] Service Worker registrado, scope:', reg.scope);
                  })
                  .catch(function(err) {
                    console.warn('[PWA] Falha ao registrar Service Worker:', err);
                  });
              });
            }
          `,
        }}
      />

      {children}
    </>
  );
}
