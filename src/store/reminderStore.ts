import { useState, useEffect } from 'react';
import { dbSaveReminder, dbDeleteReminder, dbGetAllReminders, dbSaveUser, dbGetUser, dbSaveSettings, dbGetSettings } from './db';
import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';

export interface Reminder {
  id: string;
  title: string;
  description: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:MM
  priority: 'Low' | 'Medium' | 'High';
  category: 'Work' | 'Personal' | 'Health' | 'Study' | 'Other';
  completed: boolean;
  triggered: boolean;
  snoozedCount: number;
}

export interface User {
  email: string;
  name: string;
  avatarUrl?: string;
}

export interface AppSettings {
  toneType: 'Default Tone' | 'Zen Tone' | 'Cosmic Alarm';
  soundOption: 'Ringtone + Notification' | 'Notification Only';
  vibrationEnabled: boolean;
  darkModeEnabled: boolean;
}

interface AppState {
  reminders: Reminder[];
  activeRingingReminder: Reminder | null;
  currentScreen: 'dashboard' | 'calendar' | 'categories' | 'settings' | 'backup';
  user: User | null;
  settings: AppSettings;
}

// Simple state manager listeners
const listeners = new Set<() => void>();

let state: AppState = {
  reminders: JSON.parse(localStorage.getItem('glass_reminders') || '[]'),
  activeRingingReminder: null,
  currentScreen: 'dashboard',
  user: JSON.parse(localStorage.getItem('glass_user') || 'null'),
  settings: JSON.parse(localStorage.getItem('glass_settings') || JSON.stringify({
    toneType: 'Default Tone',
    soundOption: 'Ringtone + Notification',
    vibrationEnabled: true,
    darkModeEnabled: true
  }))
};

function saveToStorage() {
  localStorage.setItem('glass_reminders', JSON.stringify(state.reminders));
  localStorage.setItem('glass_user', JSON.stringify(state.user));
  localStorage.setItem('glass_settings', JSON.stringify(state.settings));
  // Mirror to Dexie IndexedDB
  if (state.user) dbSaveUser(state.user).catch(() => {});
  if (state.settings) dbSaveSettings(state.settings).catch(() => {});
}

function updateState(updates: Partial<AppState> | ((prev: AppState) => Partial<AppState>)) {
  const nextState = typeof updates === 'function' ? updates(state) : updates;
  state = { ...state, ...nextState };
  saveToStorage();
  listeners.forEach(listener => listener());
}

// ─── All IndexedDB operations are handled by Dexie in src/store/db.ts ─────────


function registerBackgroundSync() {
  if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
    navigator.serviceWorker.ready.then(registration => {
      if ('sync' in registration) {
        (registration as any).sync.register('sync-reminders').catch((err: any) => {
          console.warn('Background sync registration failed:', err);
        });
      }
    });
  }
}

function getNotificationId(uuid: string): number {
  let hash = 0;
  for (let i = 0; i < uuid.length; i++) {
    hash = (hash << 5) - hash + uuid.charCodeAt(i);
    hash |= 0; // Convert to 32bit integer
  }
  return Math.abs(hash);
}

function scheduleBackgroundNotification(reminder: Reminder) {
  const triggerTime = new Date(`${reminder.date}T${reminder.time}:00`).getTime();
  if (isNaN(triggerTime) || triggerTime <= Date.now()) return;

  if (Capacitor.isNativePlatform()) {
    // Native local notification via Capacitor
    LocalNotifications.requestPermissions().then(permission => {
      if (permission.display === 'granted') {
        LocalNotifications.schedule({
          notifications: [
            {
              title: `🔔 ${reminder.title}`,
              body: reminder.description && reminder.description.trim() 
                ? reminder.description 
                : 'Task due now!',
              id: getNotificationId(reminder.id),
              schedule: { at: new Date(triggerTime) },
              sound: 'alarm.wav',
              extra: { reminderId: reminder.id },
              smallIcon: 'res://ic_stat_notification',
              iconColor: '#8b5cf6'
            }
          ]
        }).then(() => {
          console.log(`[Capacitor] Scheduled notification: ${reminder.title} at ${reminder.date} ${reminder.time}`);
        }).catch(err => {
          console.error('[Capacitor] Failed to schedule notification:', err);
        });
      }
    });
  } else {
    // PWA Service Worker Fallback
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;
    navigator.serviceWorker.ready.then(registration => {
      const sw = registration.active;
      if (sw) {
        sw.postMessage({ type: 'SCHEDULE_REMINDER', reminder });
      }
      if ('sync' in registration) {
        (registration as any).sync.register('sync-reminders').catch(() => {});
      }
    }).catch(() => {});
  }
}

function cancelBackgroundNotification(id: string) {
  if (Capacitor.isNativePlatform()) {
    LocalNotifications.cancel({
      notifications: [{ id: getNotificationId(id) }]
    }).then(() => {
      console.log(`[Capacitor] Cancelled notification: ${id}`);
    }).catch(err => {
      console.error('[Capacitor] Failed to cancel notification:', err);
    });
  } else {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then(registration => {
        registration.getNotifications({ tag: `lumina-${id}` }).then(notifications => {
          notifications.forEach(notification => notification.close());
        });
        registration.getNotifications({ tag: id }).then(notifications => {
          notifications.forEach(notification => notification.close());
        });
      }).catch(() => {});
    }
  }
}

export const reminderStore = {
  getState: () => state,
  subscribe: (listener: () => void) => {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },

  // Actions
  login: (email: string, name: string) => {
    updateState({
      user: { email, name, avatarUrl: undefined },
      currentScreen: 'dashboard'
    });
  },

  logout: () => {
    updateState({ user: null, activeRingingReminder: null });
  },

  updateUser: (updates: Partial<User>) => {
    updateState(prev => ({
      user: prev.user ? { ...prev.user, ...updates } : prev.user
    }));
  },

  setScreen: (screen: AppState['currentScreen']) => {
    updateState({ currentScreen: screen });
  },

  addReminder: (reminder: Omit<Reminder, 'id' | 'completed' | 'triggered' | 'snoozedCount'>) => {
    const newReminder: Reminder = {
      ...reminder,
      id: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 9),
      completed: false,
      triggered: false,
      snoozedCount: 0
    };
    updateState(prev => ({
      reminders: [...prev.reminders, newReminder]
    }));
    dbSaveReminder(newReminder).then(() => registerBackgroundSync()).catch(() => {});
    scheduleBackgroundNotification(newReminder);
  },

  updateReminder: (id: string, updates: Partial<Reminder>) => {
    let updatedReminder: Reminder | undefined;
    updateState(prev => {
      const reminders = prev.reminders.map(r => {
        if (r.id === id) {
          updatedReminder = { ...r, ...updates };
          return updatedReminder;
        }
        return r;
      });
      return { reminders };
    });
    if (updatedReminder) {
      dbSaveReminder(updatedReminder).then(() => registerBackgroundSync()).catch(() => {});
    }
  },

  deleteReminder: (id: string) => {
    cancelBackgroundNotification(id);
    updateState(prev => ({
      reminders: prev.reminders.filter(r => r.id !== id),
      activeRingingReminder: prev.activeRingingReminder?.id === id ? null : prev.activeRingingReminder
    }));
    dbDeleteReminder(id).then(() => registerBackgroundSync()).catch(() => {});
  },

  toggleCompleteReminder: (id: string) => {
    let targetReminder: Reminder | undefined;

    updateState(prev => {
      const updatedReminders = prev.reminders.map(r => {
        if (r.id === id) {
          targetReminder = { ...r, completed: !r.completed, triggered: r.completed ? false : r.triggered };
          return targetReminder;
        }
        return r;
      });
      const isRinging = prev.activeRingingReminder?.id === id;
      return {
        reminders: updatedReminders,
        activeRingingReminder: isRinging ? null : prev.activeRingingReminder
      };
    });

    if (targetReminder) {
      dbSaveReminder(targetReminder).then(() => registerBackgroundSync()).catch(() => {});
      if (targetReminder.completed) {
        cancelBackgroundNotification(id);
      } else {
        scheduleBackgroundNotification(targetReminder);
      }
    }
  },

  snoozeReminder: (id: string) => {
    cancelBackgroundNotification(id);
    let updatedReminder: Reminder | undefined;

    updateState(prev => {
      const timeNow = new Date();
      // Add 5 minutes to local time
      timeNow.setMinutes(timeNow.getMinutes() + 5);
      const year = timeNow.getFullYear();
      const month = String(timeNow.getMonth() + 1).padStart(2, '0');
      const dateStr = String(timeNow.getDate()).padStart(2, '0');
      const hours = String(timeNow.getHours()).padStart(2, '0');
      const minutes = String(timeNow.getMinutes()).padStart(2, '0');

      const nextDate = `${year}-${month}-${dateStr}`;
      const nextTime = `${hours}:${minutes}`;

      const updated = prev.reminders.map(r => {
        if (r.id === id) {
          updatedReminder = { 
            ...r, 
            date: nextDate, 
            time: nextTime, 
            triggered: false, 
            snoozedCount: r.snoozedCount + 1 
          };
          return updatedReminder;
        }
        return r;
      });

      return {
        reminders: updated,
        activeRingingReminder: null
      };
    });

    if (updatedReminder) {
      dbSaveReminder(updatedReminder).then(() => registerBackgroundSync()).catch(() => {});
      scheduleBackgroundNotification(updatedReminder);
    }
  },

  dismissRingingReminder: () => {
    updateState({ activeRingingReminder: null });
  },

  setActiveRingingReminder: (reminder: Reminder | null) => {
    updateState({ activeRingingReminder: reminder });
  },

  updateSettings: (settingsUpdates: Partial<AppSettings>) => {
    updateState(prev => ({
      settings: { ...prev.settings, ...settingsUpdates }
    }));
  },

  triggerReminderImmediately: (id: string) => {
    const reminder = state.reminders.find(r => r.id === id);
    if (reminder) {
      updateState({ activeRingingReminder: reminder });
    }
  }
};

// React hook to access and subscribe to store
export function useReminderStore() {
  const [currentState, setCurrentState] = useState<AppState>(reminderStore.getState());

  useEffect(() => {
    const unsubscribe = reminderStore.subscribe(() => {
      setCurrentState(reminderStore.getState());
    });
    return () => {
      unsubscribe();
    };
  }, []);

  return {
    ...currentState,
    login: reminderStore.login,
    logout: reminderStore.logout,
    setScreen: reminderStore.setScreen,
    addReminder: reminderStore.addReminder,
    updateReminder: reminderStore.updateReminder,
    deleteReminder: reminderStore.deleteReminder,
    toggleCompleteReminder: reminderStore.toggleCompleteReminder,
    snoozeReminder: reminderStore.snoozeReminder,
    dismissRingingReminder: reminderStore.dismissRingingReminder,
    setActiveRingingReminder: reminderStore.setActiveRingingReminder,
    updateSettings: reminderStore.updateSettings,
    triggerReminderImmediately: reminderStore.triggerReminderImmediately,
    updateUser: reminderStore.updateUser,
  };
}

// Background scheduler daemon (Timer checking every second)
if (typeof window !== 'undefined') {
  setInterval(() => {
    const current = state;
    if (!current.user) return; // User not signed in

    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');

    const curDateStr = `${year}-${month}-${day}`;
    const curTimeStr = `${hours}:${minutes}`;

    current.reminders.forEach(reminder => {
      if (!reminder.completed && !reminder.triggered) {
        if (reminder.date === curDateStr && reminder.time === curTimeStr) {
          // Trigger in-app active alarm overlay
          reminderStore.setActiveRingingReminder(reminder);
          reminderStore.updateReminder(reminder.id, { triggered: true });

          // Send PWA service worker background notification if background state is needed
          if (Notification.permission === 'granted') {
            const title = `Reminder: ${reminder.title}`;
            const options = {
              body: reminder.description || `Task set for today at ${reminder.time}`,
              icon: '/android-chrome-192x192.png',
              tag: reminder.id,
              requireInteraction: true,
              silent: current.settings.soundOption === 'Notification Only'
            };
            
            // Try to trigger via service worker
            if (navigator.serviceWorker && navigator.serviceWorker.controller) {
              navigator.serviceWorker.ready.then(registration => {
                registration.showNotification(title, options);
              });
            } else {
              // Fallback directly to Web Notification
              new Notification(title, options);
            }
          }
        }
      }
    });
  }, 1000);

  // Load from IndexedDB (Dexie) on startup – hydrate all state
  Promise.all([dbGetAllReminders(), dbGetUser(), dbGetSettings()]).then(([dbReminders, dbUser, dbSettings]) => {
    const updates: Partial<typeof state> = {};
    if (dbReminders && dbReminders.length > 0) {
      updates.reminders = dbReminders;
      // Reschedule all upcoming reminders to ensure native Android/PWA alarms are active
      const now = Date.now();
      dbReminders.forEach(reminder => {
        if (!reminder.completed && !reminder.triggered) {
          const triggerTime = new Date(`${reminder.date}T${reminder.time}:00`).getTime();
          if (!isNaN(triggerTime) && triggerTime > now) {
            scheduleBackgroundNotification(reminder);
          }
        }
      });
    }
    if (dbUser) updates.user = dbUser;
    if (dbSettings) updates.settings = dbSettings;
    if (Object.keys(updates).length > 0) updateState(updates);
  }).catch(err => {
    console.warn('Failed to load initial state from IndexedDB:', err);
  });
}
