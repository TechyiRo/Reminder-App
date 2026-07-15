import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useReminderStore, reminderStore } from './store/reminderStore';
import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';
import { StatusBar, Style } from '@capacitor/status-bar';
import { Grid, Calendar, Lock, Settings, Plus } from 'lucide-react';
import MobileFrame from './components/MobileFrame';
import AuthScreen from './components/AuthScreen';
import Dashboard from './components/Dashboard';
import CalendarView from './components/CalendarView';
import CategoriesView from './components/CategoriesView';
import SettingsView from './components/SettingsView';
import BackupView from './components/BackupView';
import VaultView from './components/VaultView';
import ActiveReminderOverlay from './components/ActiveReminderOverlay';
import AddReminderSheet from './components/AddReminderSheet';

export function App() {
  const { user, currentScreen, activeRingingReminder, setScreen, lockVault, settings } = useReminderStore();
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
      // Configure native status bar to overlay the webview (edge-to-edge)
      StatusBar.setOverlaysWebView({ overlay: true }).catch(() => {});
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

  // ─── Background Auto-Lock on Resume ───────────────────────────────────────
  useEffect(() => {
    let backgroundTime: number | null = null;

    const handleAppStateChange = () => {
      if (document.hidden) {
        // App went to background
        backgroundTime = Date.now();
      } else {
        // App returned to foreground
        if (backgroundTime && settings.vaultPinHash) {
          const elapsedMs = Date.now() - backgroundTime;
          const autoLockConfig = settings.vaultAutoLockTime || '1m';
          
          let shouldLock = false;
          if (autoLockConfig === 'immediate') {
            shouldLock = true;
          } else if (autoLockConfig === '1m' && elapsedMs > 60000) {
            shouldLock = true;
          } else if (autoLockConfig === '5m' && elapsedMs > 300000) {
            shouldLock = true;
          }

          if (shouldLock) {
            console.log('[AutoLock] Locking vault due to background timeout');
            lockVault();
          }
        }
        backgroundTime = null;
      }
    };

    document.addEventListener('visibilitychange', handleAppStateChange);
    return () => {
      document.removeEventListener('visibilitychange', handleAppStateChange);
    };
  }, [settings.vaultAutoLockTime, settings.vaultPinHash, lockVault]);

  const renderActiveScreen = () => {
    switch (currentScreen) {
      case 'calendar':
        return <CalendarView />;
      case 'categories':
        return <CategoriesView />;
      case 'settings':
        return <SettingsView />;
      case 'backup':
        return <BackupView />;
      case 'vault':
        return <VaultView />;
      case 'dashboard':
      default:
        return <Dashboard />;
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

          {/* Bottom Sticky Glass Navigation Bar */}
          <div className="w-full pb-4 px-4 select-none shrink-0 z-40 relative">
            <div className="glass-panel-dark rounded-2xl h-14 px-4 flex items-center justify-between">
              {/* Dashboard Tab */}
              <button 
                onClick={() => setScreen('dashboard')}
                className={`flex flex-col items-center gap-0.5 justify-center flex-1 py-1 ${
                  currentScreen === 'dashboard' ? 'text-violet-400' : 'text-white/40 hover:text-white/70'
                }`}
              >
                <Grid size={18} />
                <span className="text-[8px] font-bold uppercase tracking-wider">Home</span>
              </button>

              {/* Calendar Tab */}
              <button 
                onClick={() => setScreen('calendar')}
                className={`flex flex-col items-center gap-0.5 justify-center flex-1 py-1 ${
                  currentScreen === 'calendar' ? 'text-violet-400' : 'text-white/40 hover:text-white/70'
                }`}
              >
                <Calendar size={18} />
                <span className="text-[8px] font-bold uppercase tracking-wider">Calendar</span>
              </button>

              {/* Centred Big Add Plus Button */}
              <div className="relative -top-4 px-2">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.93 }}
                  onClick={() => setIsAddOpen(true)}
                  className="w-12 h-12 rounded-full glass-button-primary flex items-center justify-center text-white shadow-lg shadow-purple-500/40 border border-white/25 focus:outline-none"
                >
                  <Plus size={24} />
                </motion.button>
              </div>

              {/* SecureVault Tab */}
              <button 
                onClick={() => setScreen('vault')}
                className={`flex flex-col items-center gap-0.5 justify-center flex-1 py-1 ${
                  currentScreen === 'vault' ? 'text-violet-400' : 'text-white/40 hover:text-white/70'
                }`}
              >
                <Lock size={18} />
                <span className="text-[8px] font-bold uppercase tracking-wider">Vault</span>
              </button>

              {/* Settings Tab */}
              <button 
                onClick={() => setScreen('settings')}
                className={`flex flex-col items-center gap-0.5 justify-center flex-1 py-1 ${
                  currentScreen === 'settings' ? 'text-violet-400' : 'text-white/40 hover:text-white/70'
                }`}
              >
                <Settings size={18} />
                <span className="text-[8px] font-bold uppercase tracking-wider">Settings</span>
              </button>
            </div>
          </div>
          
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
