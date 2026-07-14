import { useState, useEffect } from 'react';
import { useReminderStore, reminderStore } from './store/reminderStore';
import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';
import { StatusBar, Style } from '@capacitor/status-bar';
import MobileFrame from './components/MobileFrame';
import AuthScreen from './components/AuthScreen';
import Dashboard from './components/Dashboard';
import CalendarView from './components/CalendarView';
import CategoriesView from './components/CategoriesView';
import SettingsView from './components/SettingsView';
import BackupView from './components/BackupView';
import ActiveReminderOverlay from './components/ActiveReminderOverlay';
import AddReminderSheet from './components/AddReminderSheet';

export function App() {
  const { user, currentScreen, activeRingingReminder } = useReminderStore();
  const [isAddOpen, setIsAddOpen] = useState(false);

  // ─── Service Worker & Background Notification Setup ────────────────────────
  useEffect(() => {
    const setupServiceWorker = async () => {
      if (!('serviceWorker' in navigator)) return;

      try {
        const registration = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
        console.log('[App] SW registered:', registration.scope);

        // Wait for SW to be active
        await navigator.serviceWorker.ready;

        // ── Request notification permission immediately on mount ──────────────
        if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
          const perm = await Notification.requestPermission();
          console.log('[App] Notification permission:', perm);
        }

        // ── Register Periodic Background Sync (Android Chrome PWA) ───────────
        // This wakes up the SW every ~15 minutes even when app is closed
        if ('periodicSync' in registration && Notification.permission === 'granted') {
          try {
            await (registration as any).periodicSync.register('periodic-reminder-check', {
              minInterval: 15 * 60 * 1000 // minimum 15 minutes
            });
            console.log('[App] Periodic background sync registered');
          } catch (err) {
            console.warn('[App] Periodic sync not supported:', err);
          }
        }

        // ── Tell SW to check all reminders right now ─────────────────────────
        const sw = registration.active || registration.waiting || registration.installing;
        if (sw) {
          sw.postMessage({ type: 'CHECK_NOW' });
        }

      } catch (err) {
        console.error('[App] SW registration failed:', err);
      }
    };

    setupServiceWorker();

    // ─── Capacitor Native Notifications Click Actions Listener & StatusBar Setup ───
    if (Capacitor.isNativePlatform()) {
      // Configure native status bar to prevent overlap with web layout
      StatusBar.setOverlaysWebView({ overlay: false }).catch(() => {});
      StatusBar.setBackgroundColor({ color: '#0b0a19' }).catch(() => {});
      StatusBar.setStyle({ style: Style.Dark }).catch(() => {});

      LocalNotifications.addListener('localNotificationActionPerformed', (action) => {
        const reminderId = action.notification.extra?.reminderId;
        if (reminderId) {
          console.log('[Capacitor] Notification click action received for reminder:', reminderId);
          const storeState = reminderStore.getState();
          const target = storeState.reminders.find(r => r.id === reminderId);
          if (target) {
            reminderStore.setActiveRingingReminder(target);
          }
        }
      });
      // Request native local notification permission on startup
      LocalNotifications.requestPermissions().then(permission => {
        console.log('[Capacitor] Native local notification permission:', permission.display);
      });
    }
  }, []);

  const renderActiveScreen = () => {
    switch (currentScreen) {
      case 'calendar':
        return <CalendarView onAddClick={() => setIsAddOpen(true)} />;
      case 'categories':
        return <CategoriesView onAddClick={() => setIsAddOpen(true)} />;
      case 'settings':
        return <SettingsView onAddClick={() => setIsAddOpen(true)} />;
      case 'backup':
        return <BackupView onAddClick={() => setIsAddOpen(true)} />;
      case 'dashboard':
      default:
        return <Dashboard onAddClick={() => setIsAddOpen(true)} />;
    }
  };

  return (
    <div className="relative w-full h-full overflow-hidden">
      {/* Active ringing alarm overlay (displays in-app when a reminder triggers) */}
      {activeRingingReminder && <ActiveReminderOverlay />}

      {/* Main app screen wraps */}
      {!user ? (
        <MobileFrame>
          <AuthScreen />
        </MobileFrame>
      ) : (
        <MobileFrame>
          {renderActiveScreen()}
          
          {/* Bottom Add Reminder Sheet Drawer */}
          <AddReminderSheet 
            isOpen={isAddOpen} 
            onClose={() => setIsAddOpen(false)} 
          />
        </MobileFrame>
      )}
    </div>
  );
}

export default App;
