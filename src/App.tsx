import { useState, useEffect } from 'react';
import { useReminderStore } from './store/reminderStore';
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

  // Register PWA Service Worker and prompt for notification permissions immediately
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').then(
        (registration) => {
          console.log('ServiceWorker registration successful with scope: ', registration.scope);
        },
        (err) => {
          console.log('ServiceWorker registration failed: ', err);
        }
      );
    }

    if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
      Notification.requestPermission().then((permission) => {
        console.log('Notification permission status:', permission);
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
