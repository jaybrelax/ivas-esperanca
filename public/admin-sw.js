// Admin Service Worker — IVAS Esperança
// Estratégia: Network First com fallback de cache para /admin

const CACHE_NAME = 'admin-ivas-v1';

const PRECACHE_URLS = [
  '/admin',
  '/admin-manifest.json',
  '/icons/admin-icon-192.png',
  '/icons/admin-icon-512.png',
];

// Instalação: precache dos assets essenciais
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_URLS).catch((err) => {
        console.warn('[SW] Falha no precache:', err);
      });
    })
  );
  self.skipWaiting();
});

// Ativação: limpa caches antigos
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) =>
      Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      )
    )
  );
  self.clients.claim();
});

// Fetch: Network First — tenta a rede, cai no cache se falhar
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Só intercepta requests do mesmo origin no scope /admin
  if (url.origin !== self.location.origin) return;
  if (!url.pathname.startsWith('/admin') && !url.pathname.startsWith('/icons') && !url.pathname.startsWith('/_next')) return;

  // Ignora métodos não-GET
  if (event.request.method !== 'GET') return;

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Clona e armazena no cache se for uma resposta válida
        if (response && response.status === 200 && response.type !== 'opaque') {
          const cloned = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, cloned);
          });
        }
        return response;
      })
      .catch(() => {
        // Fallback para o cache
        return caches.match(event.request).then((cached) => {
          if (cached) return cached;
          // Fallback final: retorna a página /admin do cache
          if (url.pathname.startsWith('/admin')) {
            return caches.match('/admin');
          }
        });
      })
  );
});
