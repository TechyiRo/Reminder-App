// ============================================================
// Lumina Reminder App — Production Service Worker v3
// Handles: Offline caching, Background Notifications (closed app),
//          Periodic Sync, Push events, IndexedDB alarm checks
// ============================================================

const CACHE_NAME = 'lumina-reminders-v3';

// Only cache production assets (no /src/ paths — those don't exist in production)
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.svg',
  '/icons.svg',
  '/alarm.wav'
];

// ─── IndexedDB (raw, no Dexie in SW context) ──────────────────────────────────
const DB_NAME = 'LuminaRemindersDB';
const DB_VERSION = 2;
const REMINDERS_STORE = 'reminders';

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(REMINDERS_STORE)) {
        db.createObjectStore(REMINDERS_STORE, { keyPath: 'id' });
      }
      // Dexie creates other stores — leave them alone
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function getAllReminders() {
  return openDB().then(db => new Promise((resolve, reject) => {
    const tx = db.transaction(REMINDERS_STORE, 'readonly');
    const req = tx.objectStore(REMINDERS_STORE).getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  }));
}

function markReminderTriggered(id) {
  return openDB().then(db => new Promise((resolve, reject) => {
    const tx = db.transaction(REMINDERS_STORE, 'readwrite');
    const store = tx.objectStore(REMINDERS_STORE);
    const getReq = store.get(id);
    getReq.onsuccess = () => {
      if (getReq.result) {
        const updated = { ...getReq.result, triggered: true };
        store.put(updated);
      }
      resolve();
    };
    getReq.onerror = () => reject(getReq.error);
  }));
}

// ─── Install ───────────────────────────────────────────────────────────────────
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      // Use individual fetch so one failure doesn't break all
      return Promise.allSettled(
        STATIC_ASSETS.map(url => cache.add(url).catch(() => null))
      );
    })
  );
  self.skipWaiting();
});

// ─── Activate ─────────────────────────────────────────────────────────────────
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.map(key => key !== CACHE_NAME ? caches.delete(key) : null))
    ).then(() => self.clients.claim())
  );
});

// ─── Fetch (Offline / Cache-First) ────────────────────────────────────────────
self.addEventListener('fetch', event => {
  // Skip non-GET, extensions, dev HMR
  if (event.request.method !== 'GET') return;
  if (event.request.url.includes('@vite') || event.request.url.includes('chrome-extension')) return;
  if (!event.request.url.startsWith('http')) return;

  // Google Fonts — network first, cache fallback
  if (event.request.url.includes('fonts.googleapis.com') || event.request.url.includes('fonts.gstatic.com')) {
    event.respondWith(
      fetch(event.request).catch(() => caches.match(event.request))
    );
    return;
  }

  // Everything else — cache first, network fallback, then offline page
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request).then(response => {
        // Cache successful GET responses for static assets
        if (response.ok && event.request.url.includes(self.location.origin)) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      }).catch(() => {
        // Offline fallback: serve index.html for navigation
        if (event.request.mode === 'navigate') {
          return caches.match('/index.html');
        }
      });
    })
  );
});

// ─── Core: Check & Fire Due Reminders ─────────────────────────────────────────
async function checkAndFireReminders() {
  let reminders = [];
  try {
    reminders = await getAllReminders();
  } catch (err) {
    console.warn('[SW] Could not read IndexedDB:', err);
    return;
  }

  const now = Date.now();

  for (const reminder of reminders) {
    if (reminder.completed || reminder.triggered) continue;

    const triggerTime = new Date(`${reminder.date}T${reminder.time}:00`).getTime();
    if (isNaN(triggerTime)) continue;

    const diffMs = triggerTime - now;

    // Fire immediately if overdue (within last 60 minutes to avoid very old ones)
    if (diffMs <= 0 && diffMs > -3600000) {
      await fireNotification(reminder);
      await markReminderTriggered(reminder.id).catch(() => {});
    }
    // Schedule via TimestampTrigger if upcoming within 24h and API is supported
    else if (diffMs > 0 && diffMs <= 86400000) {
      await scheduleNativeNotification(reminder, triggerTime);
    }
  }
}

// ─── Fire a notification immediately ──────────────────────────────────────────
async function fireNotification(reminder) {
  const title = `🔔 ${reminder.title}`;
  const options = {
    body: reminder.description && reminder.description.trim()
      ? reminder.description
      : `Reminder scheduled for ${reminder.time}`,
    icon: '/favicon.svg',
    badge: '/favicon.svg',
    tag: `lumina-${reminder.id}`,
    data: { reminderId: reminder.id, url: '/' },
    actions: [
      { action: 'open',    title: '✅ Open App' },
      { action: 'snooze',  title: '⏰ Snooze 5 min' },
      { action: 'dismiss', title: '✖ Dismiss' }
    ],
    vibrate: [300, 100, 300, 100, 600],
    requireInteraction: true,
    renotify: true,
    silent: false
  };

  try {
    await self.registration.showNotification(title, options);
  } catch (err) {
    console.warn('[SW] showNotification failed:', err);
  }
}

// ─── Schedule future notification via TimestampTrigger or fallback timer ───────
async function scheduleNativeNotification(reminder, triggerTime) {
  const title = `🔔 ${reminder.title}`;
  const options = {
    body: reminder.description && reminder.description.trim()
      ? reminder.description
      : `Reminder scheduled for ${reminder.time}`,
    icon: '/favicon.svg',
    badge: '/favicon.svg',
    tag: `lumina-${reminder.id}`,
    data: { reminderId: reminder.id, url: '/' },
    actions: [
      { action: 'open',    title: '✅ Open App' },
      { action: 'snooze',  title: '⏰ Snooze 5 min' },
      { action: 'dismiss', title: '✖ Dismiss' }
    ],
    vibrate: [300, 100, 300, 100, 600],
    requireInteraction: true,
    renotify: true,
    silent: false
  };

  // Best method: Notification Trigger API (Chrome 80+ on Android)
  if (typeof TimestampTrigger !== 'undefined') {
    try {
      options.showTrigger = new TimestampTrigger(triggerTime);
      await self.registration.showNotification(title, options);
      console.log(`[SW] Scheduled via TimestampTrigger: ${reminder.title} @ ${reminder.time}`);
      return;
    } catch (err) {
      console.warn('[SW] TimestampTrigger failed, using fallback:', err);
    }
  }

  // Fallback: in-memory setTimeout (works when SW stays alive — short reminders)
  const delay = triggerTime - Date.now();
  if (delay > 0 && delay <= 600000) { // Up to 10 min
    setTimeout(async () => {
      await self.registration.showNotification(title, options);
      await markReminderTriggered(reminder.id).catch(() => {});
    }, delay);
    console.log(`[SW] Scheduled via setTimeout (${Math.round(delay / 1000)}s): ${reminder.title}`);
  }
}

// ─── Background Sync ───────────────────────────────────────────────────────────
// Fires when SW wakes up due to Background Sync API registration
self.addEventListener('sync', event => {
  if (event.tag === 'sync-reminders') {
    console.log('[SW] Background sync triggered');
    event.waitUntil(checkAndFireReminders());
  }
});

// ─── Periodic Background Sync ──────────────────────────────────────────────────
// Chrome Android PWA: wakes up every ~15 minutes to check reminders
self.addEventListener('periodicsync', event => {
  if (event.tag === 'periodic-reminder-check') {
    console.log('[SW] Periodic sync triggered');
    event.waitUntil(checkAndFireReminders());
  }
});

// ─── Message from App (manual reminder scheduling) ────────────────────────────
self.addEventListener('message', event => {
  const { type, reminder } = event.data || {};

  if (type === 'SCHEDULE_REMINDER' && reminder) {
    const triggerTime = new Date(`${reminder.date}T${reminder.time}:00`).getTime();
    if (!isNaN(triggerTime)) {
      scheduleNativeNotification(reminder, triggerTime).catch(err =>
        console.warn('[SW] Failed to schedule from message:', err)
      );
    }
  }

  if (type === 'CHECK_NOW') {
    checkAndFireReminders().catch(err =>
      console.warn('[SW] Manual check failed:', err)
    );
  }
});

// ─── Push Notification (Web Push API — server-initiated) ──────────────────────
self.addEventListener('push', event => {
  let data = {};
  if (event.data) {
    try { data = event.data.json(); } catch { data = { body: event.data.text() }; }
  }

  const title  = data.title  || '🔔 Lumina Reminder';
  const options = {
    body:               data.body    || 'You have a pending reminder!',
    icon:               data.icon    || '/favicon.svg',
    badge:              data.badge   || '/favicon.svg',
    tag:                data.tag     || 'lumina-push',
    data:               { url: data.url || '/' },
    vibrate:            [300, 100, 300, 100, 600],
    requireInteraction: true,
    renotify:           true,
    silent:             false,
    actions: [
      { action: 'open',    title: '✅ Open App' },
      { action: 'dismiss', title: '✖ Dismiss' }
    ]
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// ─── Notification Click Handler ───────────────────────────────────────────────
self.addEventListener('notificationclick', event => {
  const { action } = event;
  const notification = event.notification;
  const reminderId = notification.data?.reminderId;

  notification.close();

  if (action === 'dismiss') return;

  if (action === 'snooze' && reminderId) {
    // Snooze: re-schedule 5 minutes from now
    event.waitUntil(
      (async () => {
        const snoozeTime = Date.now() + 5 * 60 * 1000;
        const snoozeDate = new Date(snoozeTime);
        const pad = n => String(n).padStart(2, '0');
        const fakeDateStr = `${snoozeDate.getFullYear()}-${pad(snoozeDate.getMonth() + 1)}-${pad(snoozeDate.getDate())}`;
        const fakeTimeStr = `${pad(snoozeDate.getHours())}:${pad(snoozeDate.getMinutes())}`;

        try {
          const reminders = await getAllReminders();
          const reminder = reminders.find(r => r.id === reminderId);
          if (reminder) {
            await scheduleNativeNotification(
              { ...reminder, date: fakeDateStr, time: fakeTimeStr, triggered: false },
              snoozeTime
            );
          }
        } catch (err) {
          console.warn('[SW] Snooze scheduling failed:', err);
        }
      })()
    );
    return;
  }

  // Default / 'open': focus or open app tab
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clients => {
      for (const client of clients) {
        if (client.url.startsWith(self.registration.scope) && 'focus' in client) {
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow('/');
      }
    })
  );
});
