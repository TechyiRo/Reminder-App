// Service Worker for Premium Reminder App (Offline and Background Notification management)
const CACHE_NAME = 'glass-reminders-v1';
const ASSETS = [
  '/',
  '/index.html',
  '/src/main.tsx',
  '/src/App.tsx',
  '/src/index.css',
  '/src/store/reminderStore.ts',
  '/src/utils/audio.ts',
  '/alarm.wav'
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
    sound: '/alarm.wav',
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

// ==========================================
// IndexedDB Persistence & Background Sync
// ==========================================

const DB_NAME = 'LuminaRemindersDB';
const DB_VERSION = 1;
const STORE_NAME = 'reminders';

function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = (e) => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function getAllReminders() {
  return openDB().then((db) => {
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  });
}

function saveReminder(reminder) {
  return openDB().then((db) => {
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.put(reminder);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  });
}

// Listen to Background Sync event (wakes up Service Worker on connectivity or manual sync call)
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-reminders') {
    event.waitUntil(syncRemindersAndSchedule());
  }
});

// Periodic background wakeup trigger (optional fallback sync check)
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'sync-reminders') {
    event.waitUntil(syncRemindersAndSchedule());
  }
});

async function syncRemindersAndSchedule() {
  try {
    const reminders = await getAllReminders();
    const now = Date.now();
    const activeNotifications = await self.registration.getNotifications();

    for (const reminder of reminders) {
      if (reminder.completed) {
        const active = activeNotifications.find(n => n.tag === reminder.id);
        if (active) active.close();
        continue;
      }

      const triggerTime = new Date(`${reminder.date}T${reminder.time}`).getTime();
      
      if (triggerTime <= now) {
        // Trigger immediately if overdue and not previously triggered
        if (!reminder.triggered) {
          await triggerImmediateNotification(reminder);
        }
      } else {
        // Schedule local alarm natively using TimestampTrigger if supported by browser
        await scheduleLocalNotification(reminder, triggerTime);
      }
    }
  } catch (err) {
    console.error('Error in background sync reminders handler:', err);
  }
}

async function triggerImmediateNotification(reminder) {
  const title = `Reminder: ${reminder.title}`;
  const options = {
    body: reminder.description || 'Task due now!',
    icon: '/favicon.svg',
    badge: '/favicon.svg',
    tag: reminder.id,
    vibrate: [200, 100, 200, 100, 400],
    sound: '/alarm.wav',
    data: {
      url: '/'
    },
    actions: [
      { action: 'open', title: 'Open App' },
      { action: 'dismiss', title: 'Dismiss' }
    ],
    renotify: true,
    requireInteraction: true
  };

  await self.registration.showNotification(title, options);
  
  // Persist triggered state to DB
  reminder.triggered = true;
  await saveReminder(reminder);
}

async function scheduleLocalNotification(reminder, triggerTime) {
  const title = `Reminder: ${reminder.title}`;
  const options = {
    body: reminder.description || 'Task due now!',
    icon: '/favicon.svg',
    badge: '/favicon.svg',
    tag: reminder.id,
    vibrate: [200, 100, 200, 100, 400],
    sound: '/alarm.wav',
    data: {
      url: '/'
    },
    actions: [
      { action: 'open', title: 'Open App' },
      { action: 'dismiss', title: 'Dismiss' }
    ],
    renotify: true,
    requireInteraction: true
  };

  if ('showTrigger' in Notification.prototype) {
    // Chromium experimental support
    options.showTrigger = new TimestampTrigger(triggerTime);
    await self.registration.showNotification(title, options);
  } else {
    // Best-effort background timer fallback
    const delay = triggerTime - Date.now();
    if (delay > 0 && delay < 600000) { // 10 minute threshold
      setTimeout(() => {
        self.registration.showNotification(title, options);
      }, delay);
    }
  }
}
