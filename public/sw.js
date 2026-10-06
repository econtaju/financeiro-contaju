const CACHE_NAME = 'contaju-pwa-v1';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/pwa-icon.svg'
];

// Instalação do Service Worker
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    }).then(() => self.skipWaiting())
  );
});

// Ativação e limpeza de versões antigas
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Interceptação de requisições com suporte offline
self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // Apenas métodos GET são cacheados
  if (req.method !== 'GET') {
    return;
  }

  // Ignorar extensões de navegador ou esquemas não-http(s)
  if (!url.protocol.startsWith('http')) {
    return;
  }

  // Para navegação HTML (SPAs)
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req).catch(() => {
        return caches.match('/index.html') || caches.match('/');
      })
    );
    return;
  }

  // Para assets da mesma origem (JS, CSS, Imagens, Fontes): Cache First com fallback para rede
  if (url.origin === self.location.origin) {
    event.respondWith(
      caches.match(req).then((cachedResponse) => {
        if (cachedResponse) {
          // Atualiza o cache em background (Stale-While-Revalidate)
          fetch(req).then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              caches.open(CACHE_NAME).then((cache) => cache.put(req, networkResponse));
            }
          }).catch(() => {/* offline silenciado */});
          return cachedResponse;
        }

        return fetch(req).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(req, responseClone);
            });
          }
          return networkResponse;
        }).catch(() => {
          // Se for imagem, pode retornar ícone padrão
          if (req.destination === 'image') {
            return caches.match('/pwa-icon.svg');
          }
        });
      })
    );
    return;
  }

  // Requisições externas (fontes, APIs): Network First com fallback para cache se houver
  event.respondWith(
    fetch(req).then((networkResponse) => {
      return networkResponse;
    }).catch(() => {
      return caches.match(req);
    })
  );
});
