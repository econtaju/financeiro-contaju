const CACHE_NAME = 'contaju-pwa-v2';
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
          if (req.destination === 'image') {
            return caches.match('/pwa-icon.svg');
          }
        });
      })
    );
    return;
  }

  // Requisições externas: Network First com fallback para cache se houver
  event.respondWith(
    fetch(req).then((networkResponse) => {
      return networkResponse;
    }).catch(() => {
      return caches.match(req);
    })
  );
});

// Suporte a Background Sync
self.addEventListener('sync', (event) => {
  if (event.tag === 'contaju-sync-queue' || event.tag === 'sync-financial-queue') {
    event.waitUntil(
      self.clients.matchAll().then((clients) => {
        clients.forEach((client) => {
          client.postMessage({
            type: 'BACKGROUND_SYNC_TRIGGERED'
          });
        });
      })
    );
  }
});

// Suporte a Notificações Web Push
self.addEventListener('push', (event) => {
  let data = {
    title: 'Contaju Gestão Financeira',
    body: 'Atualização importante nas suas contas.',
    icon: '/pwa-icon.svg',
    badge: '/pwa-icon.svg',
    tag: 'contaju-notification'
  };

  if (event.data) {
    try {
      data = { ...data, ...event.data.json() };
    } catch {
      data.body = event.data.text();
    }
  }

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: data.icon || '/pwa-icon.svg',
      badge: data.badge || '/pwa-icon.svg',
      tag: data.tag || 'contaju-notification',
      data: data.data || { url: '/' }
    })
  );
});

// Clique na Notificação Nativa: Foca ou abre a janela do aplicativo
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = (event.notification.data && event.notification.data.url) || '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) {
          if (client.url.includes(self.location.origin)) {
            client.postMessage({
              type: 'NOTIFICATION_CLICKED',
              target: targetUrl
            });
            return client.focus();
          }
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});

// Comunicação bidirecional com a aplicação
self.addEventListener('message', (event) => {
  if (!event.data) return;

  if (event.data.type === 'SHOW_NOTIFICATION') {
    const { title, options } = event.data;
    self.registration.showNotification(title, {
      icon: '/pwa-icon.svg',
      badge: '/pwa-icon.svg',
      ...options
    });
  }

  if (event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
