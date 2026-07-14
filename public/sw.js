// Service Worker for Premium Reminder App (Offline and Background Notification management)
const CACHE_NAME = 'glass-reminders-v1';
const ASSETS = [
  '/',
  '/index.html',
  '/src/main.tsx',
  '/src/App.tsx',
  '/src/index.css',
  '/src/store/reminderStore.ts',
  '/src/utils/audio.ts'
];

// Install Event
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS).catch(() => {
        // Safe fallback if some assets fail in dev mode
      });
    })
  );
  self.skipWaiting();
});

// Activate Event
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch Event (Offline capability)
self.addEventListener('fetch', (e) => {
  // Ignore typescript-only build requests or development hot reloads in cache
  if (e.request.url.includes('@vite') || e.request.url.includes('node_modules')) {
    return;
  }
  
  e.respondWith(
    caches.match(e.request).then((cachedResponse) => {
      return cachedResponse || fetch(e.request).catch(() => {
        // Fallback for document navigation
        if (e.request.mode === 'navigate') {
          return caches.match('/index.html');
        }
      });
    })
  );
});

// Background Notification Click Event Handler
self.addEventListener('notificationclick', (e) => {
  const notification = e.notification;
  notification.close();

  e.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Focus existing app tab if open
      for (const client of clientList) {
        if ('focus' in client) {
          return client.focus();
        }
      }
      // Or open a new client window
      if (self.clients.openWindow) {
        return self.clients.openWindow('/');
      }
    })
  );
});

// Background Push Notification Event Handler (Fires when browser/app is closed)
self.addEventListener('push', (e) => {
  let data = {};
  if (e.data) {
    try {
      data = e.data.json();
    } catch (err) {
      data = { body: e.data.text() };
    }
  }

  const title = data.title || 'Lumina Reminder Alert 🔔';
  const options = {
    body: data.body || 'You have an active task reminder!',
    icon: data.icon || '/favicon.svg',
    badge: data.badge || '/favicon.svg',
    tag: data.tag || 'lumina-reminder',
    vibrate: data.vibrate || [200, 100, 200, 100, 400],
    data: {
      url: data.url || '/'
    },
    actions: [
      { action: 'open', title: 'Open App' },
      { action: 'dismiss', title: 'Dismiss' }
    ],
    // Force device sound wakeup priority in Android OS
    renotify: true,
    requireInteraction: true
  };

  e.waitUntil(
    self.registration.showNotification(title, options)
  );
});
