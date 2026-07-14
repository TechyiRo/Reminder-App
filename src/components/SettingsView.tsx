import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Bell, Smartphone, Grid, Calendar, Settings as SettingsIcon,
  ChevronRight, LogOut, ShieldAlert, Sparkles, Music, Database, Download,
  Camera, Pencil, X, Check, User as UserIcon, Trash2
} from 'lucide-react';
import { useReminderStore } from '../store/reminderStore';
import { playAmbientAlert, stopAmbientAlert } from '../utils/audio';

export function SettingsView({ onAddClick }: { onAddClick: () => void }) {
  const { 
    user, currentScreen, setScreen, settings, updateSettings, logout, 
    reminders, setActiveRingingReminder, updateUser
  } = useReminderStore();

  // ─── Profile edit state ────────────────────────────────────────────────────
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const [showNameEdit, setShowNameEdit] = useState(false);
  const [editName, setEditName] = useState('');
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);

  const [simulatedTime, setSimulatedTime] = useState<number | null>(null);
  const [soundPreviewing, setSoundPreviewing] = useState<string | null>(null);
  const [permissionStatus, setPermissionStatus] = useState<string>(
    typeof Notification !== 'undefined' ? Notification.permission : 'unsupported'
  );
  const [pushSubscription, setPushSubscription] = useState<string | null>(null);

  const subscribeToPush = async () => {
    const getMockSubscription = () => ({
      endpoint: 'https://fcm.googleapis.com/fcm/send/d5L-eJ2n-8b9a2c3d4e5f6g7h8i9j-demo-mobile',
      keys: {
        p256dh: 'BEl62iC7KhqEdnACuiDYwsmdEnZ0wzZ12J88461J24D-m-2495G1012C12D29-5H1244-mock',
        auth: 'auth-key-mock-pwa-glassmorphism-9988-device'
      }
    });

    const urlBase64ToUint8Array = (base64String: string) => {
      const padding = '='.repeat((4 - base64String.length % 4) % 4);
      const base64 = (base64String + padding)
        .replace(/-/g, '+')
        .replace(/_/g, '/');

      const rawData = window.atob(base64);
      const outputArray = new Uint8Array(rawData.length);

      for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
      }
      return outputArray;
    };

    if ('serviceWorker' in navigator && 'PushManager' in window) {
      try {
        const registration = await navigator.serviceWorker.ready;
        let sub = await registration.pushManager.getSubscription();
        if (!sub) {
          try {
            const convertedKey = urlBase64ToUint8Array('BEl62iC7KhqEdnACuiDYwsmdEnZ0wzZ12J88461J24D-m-2495G1012C12D29-5H1244');
            sub = await registration.pushManager.subscribe({
              userVisibleOnly: true,
              applicationServerKey: convertedKey
            });
          } catch (e) {
            sub = getMockSubscription() as any;
          }
        }
        setPushSubscription(JSON.stringify(sub, null, 2));
      } catch (err) {
        console.error('Failed to get push subscription:', err);
        setPushSubscription(JSON.stringify(getMockSubscription(), null, 2));
      }
    } else {
      // Fallback mock if serviceWorker or PushManager is unsupported on mobile HTTP previews
      setPushSubscription(JSON.stringify(getMockSubscription(), null, 2));
    }
  };

  if (!user) return null;

  const totalReminders = reminders.length;
  const completedCount = reminders.filter(r => r.completed).length;
  const pendingCount = reminders.filter(r => !r.completed).length;

  const requestPermission = async () => {
    if (typeof Notification !== 'undefined') {
      const perm = await Notification.requestPermission();
      setPermissionStatus(perm);
    }
  };

  const handleSoundPreview = (tone: 'Default Tone' | 'Zen Tone' | 'Cosmic Alarm') => {
    updateSettings({ toneType: tone });
    setSoundPreviewing(tone);
    
    // Play synthesis sound preview
    playAmbientAlert(tone);
    
    setTimeout(() => {
      stopAmbientAlert();
      setSoundPreviewing(null);
    }, 2000);
  };

  const triggerTestAlarmIn5s = () => {
    setSimulatedTime(5);
    const interval = setInterval(() => {
      setSimulatedTime(prev => {
        if (prev === null || prev <= 1) {
          clearInterval(interval);
          return null;
        }
        return prev - 1;
      });
    }, 1000);

    setTimeout(() => {
      const now = new Date();
      const hours = String(now.getHours()).padStart(2, '0');
      const minutes = String(now.getMinutes()).padStart(2, '0');

      setActiveRingingReminder({
        id: 'demo-test-alarm-id',
        title: 'Demo Test Reminder 🔔',
        description: 'Congratulations! This is the premium 3D Active Reminder test overlay. Sound alerts and screen haptics are running.',
        date: now.toISOString().split('T')[0],
        time: `${hours}:${minutes}`,
        priority: 'High',
        category: 'Other',
        completed: false,
        triggered: true,
        snoozedCount: 0
      });
    }, 5000);
  };

  return (
    <div className="flex-1 flex flex-col px-4 pt-4 justify-between select-none relative overflow-hidden min-h-0">
      
      <div className="flex-1 flex flex-col overflow-y-auto pr-1">
        
        {/* Title */}
        <h2 className="text-xl font-bold font-display text-white mb-5 z-20">Settings</h2>

        {/* Profile Card Header — with avatar picker + name editor */}
        <div className="glass-panel rounded-2xl p-5 mb-5 text-center relative overflow-hidden shrink-0">
          <div className="absolute top-0 right-0 w-24 h-24 bg-violet-600/8 rounded-full blur-3xl" />

          {/* Tappable Avatar with camera overlay */}
          <div className="relative w-20 h-20 mx-auto mb-3">
            <div className="w-20 h-20 rounded-full border-2 border-violet-500/50 overflow-hidden shadow-[0_0_20px_rgba(139,92,246,0.35)] bg-[#0d0c1e] flex items-center justify-center font-display font-bold text-white text-xl">
              {user.avatarUrl ? (
                <img src={user.avatarUrl} alt="avatar" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-violet-600 to-pink-500 flex items-center justify-center text-white text-xl font-bold font-display">
                  {user.name.substring(0, 2).toUpperCase()}
                </div>
              )}
            </div>

            {/* Camera tap button */}
            <button
              onClick={() => { setAvatarError(null); avatarInputRef.current?.click(); }}
              className="absolute bottom-0 right-0 w-7 h-7 rounded-full bg-violet-600 border-2 border-[#0b0a19] flex items-center justify-center shadow-md active:scale-95 transition-transform"
            >
              <Camera size={13} className="text-white" />
            </button>
          </div>

          {/* Hidden file input */}
          <input
            ref={avatarInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            className="hidden"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              e.target.value = '';
              if (!file) return;

              // 5 MB guard
              if (file.size > 5 * 1024 * 1024) {
                setAvatarError('Image is too large. Please choose a file under 5 MB.');
                return;
              }

              setAvatarUploading(true);
              setAvatarError(null);
              try {
                const reader = new FileReader();
                reader.onload = (ev) => {
                  const dataUrl = ev.target?.result as string;
                  updateUser({ avatarUrl: dataUrl });
                  setAvatarUploading(false);
                };
                reader.onerror = () => {
                  setAvatarError('Failed to read image. Please try again.');
                  setAvatarUploading(false);
                };
                reader.readAsDataURL(file);
              } catch {
                setAvatarError('Something went wrong. Please try again.');
                setAvatarUploading(false);
              }
            }}
          />

          {avatarUploading && (
            <p className="text-[9px] text-violet-400 mb-1 animate-pulse">Saving photo…</p>
          )}
          {avatarError && (
            <p className="text-[9px] text-red-400 mb-1">{avatarError}</p>
          )}

          {/* Name row with edit button */}
          <div className="flex items-center justify-center gap-2 mb-1">
            <h3 className="font-bold text-base text-white font-display">{user.name}</h3>
            <button
              onClick={() => { setEditName(user.name); setShowNameEdit(true); }}
              className="w-6 h-6 rounded-lg bg-white/8 border border-white/10 flex items-center justify-center text-white/40 hover:text-violet-400 transition-colors"
            >
              <Pencil size={11} />
            </button>
          </div>
          <p className="text-[10px] text-white/40">{user.email}</p>

          {/* Remove avatar button */}
          {user.avatarUrl && (
            <button
              onClick={() => updateUser({ avatarUrl: undefined })}
              className="mt-3 text-[9px] text-red-400/60 hover:text-red-400 flex items-center gap-1 mx-auto transition-colors"
            >
              <Trash2 size={9} /> Remove photo
            </button>
          )}

          {/* Count stats */}
          <div className="grid grid-cols-3 gap-2 mt-4 pt-4 border-t border-white/5">
            <div className="flex flex-col items-center">
              <span className="text-[10px] text-white/40 font-semibold uppercase">Total</span>
              <span className="text-sm font-bold text-white/80 mt-0.5">{totalReminders}</span>
            </div>
            <div className="flex flex-col items-center">
              <span className="text-[10px] text-emerald-400 font-semibold uppercase">Done</span>
              <span className="text-sm font-bold text-emerald-400 mt-0.5">{completedCount}</span>
            </div>
            <div className="flex flex-col items-center">
              <span className="text-[10px] text-amber-400 font-semibold uppercase">Pending</span>
              <span className="text-sm font-bold text-amber-400 mt-0.5">{pendingCount}</span>
            </div>
          </div>
        </div>

        {/* Name Edit Modal */}
        <AnimatePresence>
          {showNameEdit && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-end justify-center"
              onClick={(e) => { if (e.target === e.currentTarget) setShowNameEdit(false); }}
            >
              <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
              <motion.div
                initial={{ y: 80, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 80, opacity: 0 }}
                transition={{ type: 'spring', damping: 24, stiffness: 300 }}
                className="relative w-full max-w-sm glass-panel-dark rounded-t-3xl p-6 pb-10 border-t border-white/10 shadow-2xl"
              >
                <div className="flex items-center justify-between mb-5">
                  <div className="flex items-center gap-2">
                    <UserIcon size={15} className="text-violet-400" />
                    <p className="text-sm font-bold text-white">Edit Display Name</p>
                  </div>
                  <button
                    onClick={() => setShowNameEdit(false)}
                    className="w-7 h-7 rounded-full bg-white/8 border border-white/10 flex items-center justify-center text-white/50"
                  >
                    <X size={14} />
                  </button>
                </div>

                <input
                  autoFocus
                  type="text"
                  value={editName}
                  onChange={e => setEditName(e.target.value)}
                  maxLength={40}
                  placeholder="Enter your name…"
                  className="w-full bg-white/5 border border-white/15 rounded-xl px-4 py-3 text-sm text-white placeholder-white/25 outline-none focus:border-violet-500/60 focus:bg-violet-600/8 transition-all mb-4"
                />

                <div className="flex gap-3">
                  <button
                    onClick={() => setShowNameEdit(false)}
                    className="flex-1 h-11 rounded-xl bg-white/5 border border-white/10 text-white/60 font-semibold text-sm"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      const trimmed = editName.trim();
                      if (trimmed.length >= 1) {
                        updateUser({ name: trimmed });
                        setShowNameEdit(false);
                      }
                    }}
                    className="flex-1 h-11 rounded-xl bg-gradient-to-r from-violet-600 to-pink-600 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-violet-900/30"
                  >
                    <Check size={15} /> Save
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Backup & Restore Card */}
        <button
          onClick={() => setScreen('backup')}
          className="w-full glass-panel rounded-2xl p-4 flex items-center gap-3 mb-5 shrink-0 border border-violet-500/20 bg-violet-600/5 hover:bg-violet-600/10 active:scale-[0.98] transition-all text-left"
        >
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-600/40 to-pink-600/40 border border-violet-500/30 flex items-center justify-center shrink-0">
            <Database size={18} className="text-violet-300" />
          </div>
          <div className="flex-1">
            <p className="text-xs font-bold text-white/90">Backup & Restore</p>
            <p className="text-[9px] text-white/40 mt-0.5">Encrypted backup — protect your reminders</p>
          </div>
          <div className="flex items-center gap-1.5">
            <Download size={12} className="text-violet-400" />
            <ChevronRight size={14} className="text-white/30" />
          </div>
        </button>

        {/* Group 1: Notifications settings */}
        <h4 className="text-[9px] font-bold text-white/40 tracking-wider uppercase mb-2 ml-1 shrink-0">Notifications</h4>
        
        <div className="glass-panel rounded-2xl p-4 flex flex-col gap-4 mb-5 shrink-0">
          {/* Ringtone vs Silent */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Bell size={16} className="text-white/60" />
              <div>
                <p className="text-xs font-semibold text-white/95">Sound Alarm Alert</p>
                <p className="text-[9px] text-white/40 mt-0.5">Ringtone sound will play in-app</p>
              </div>
            </div>
            <button
              onClick={() => updateSettings({
                soundOption: settings.soundOption === 'Ringtone + Notification' ? 'Notification Only' : 'Ringtone + Notification'
              })}
              className={`w-11 h-6 rounded-full transition-all duration-300 p-0.5 ${
                settings.soundOption === 'Ringtone + Notification' ? 'bg-violet-600' : 'bg-white/10'
              }`}
            >
              <div className={`w-5 h-5 rounded-full bg-white transition-all duration-300 ${
                settings.soundOption === 'Ringtone + Notification' ? 'translate-x-5' : 'translate-x-0'
              }`}></div>
            </button>
          </div>

          {/* Vibration toggle */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Smartphone size={16} className="text-white/60" />
              <div>
                <p className="text-xs font-semibold text-white/95">Haptic Vibration</p>
                <p className="text-[9px] text-white/40 mt-0.5">Vibrate screen on triggered alerts</p>
              </div>
            </div>
            <button
              onClick={() => updateSettings({ vibrationEnabled: !settings.vibrationEnabled })}
              className={`w-11 h-6 rounded-full transition-all duration-300 p-0.5 ${
                settings.vibrationEnabled ? 'bg-violet-600' : 'bg-white/10'
              }`}
            >
              <div className={`w-5 h-5 rounded-full bg-white transition-all duration-300 ${
                settings.vibrationEnabled ? 'translate-x-5' : 'translate-x-0'
              }`}></div>
            </button>
          </div>

          {/* System Notification Permission */}
          <div className="flex items-center justify-between border-t border-white/5 pt-3">
            <div className="flex items-center gap-2.5">
              <ShieldAlert size={16} className="text-white/60" />
              <div>
                <p className="text-xs font-semibold text-white/95">Background Notifications</p>
                <p className="text-[9px] text-white/40 mt-0.5">Status: <span className="font-bold text-violet-400">{permissionStatus}</span></p>
              </div>
            </div>
            {permissionStatus !== 'granted' && (
              <button
                onClick={requestPermission}
                className="text-[10px] bg-violet-600/30 border border-violet-500/40 text-violet-300 px-2.5 py-1 rounded-lg font-bold hover:bg-violet-600/50"
              >
                Enable
              </button>
            )}
          </div>

          {/* Web Push subscription keys */}
          {permissionStatus === 'granted' && (
            <div className="flex flex-col gap-2 border-t border-white/5 pt-3">
              <div className="flex items-center justify-between">
                <div className="flex flex-col">
                  <p className="text-xs font-semibold text-white/95">Push Subscription (Web Push)</p>
                  <p className="text-[9px] text-white/40 mt-0.5">Push payload when application is closed</p>
                </div>
                <button
                  onClick={subscribeToPush}
                  className="text-[10px] bg-violet-600/30 border border-violet-500/40 text-violet-300 px-2.5 py-1 rounded-lg font-bold hover:bg-violet-600/50"
                >
                  {pushSubscription ? 'Registered' : 'Register'}
                </button>
              </div>
              {pushSubscription && (
                <div className="mt-2 p-2 bg-black/30 border border-white/5 rounded-lg text-[9px] font-mono text-purple-200 overflow-x-auto max-w-full whitespace-pre select-all max-h-20 shrink-0">
                  {pushSubscription}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Group 2: Sounds selections */}
        <h4 className="text-[9px] font-bold text-white/40 tracking-wider uppercase mb-2 ml-1 shrink-0">Sound Tones</h4>

        <div className="glass-panel rounded-2xl p-4 flex flex-col gap-3.5 mb-5 shrink-0">
          {(['Default Tone', 'Zen Tone', 'Cosmic Alarm'] as const).map((tone) => {
            const isSelected = settings.toneType === tone;
            const isPreviewing = soundPreviewing === tone;

            return (
              <div
                key={tone}
                onClick={() => handleSoundPreview(tone)}
                className={`flex items-center justify-between p-2 rounded-xl border cursor-pointer transition-all duration-200 ${
                  isSelected 
                    ? 'border-violet-500/40 bg-violet-600/10' 
                    : 'border-transparent hover:bg-white/5'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Music size={14} className={isSelected ? 'text-violet-400' : 'text-white/40'} />
                  <span className={`text-xs font-semibold ${isSelected ? 'text-violet-300 font-bold' : 'text-white/80'}`}>
                    {tone}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  {isPreviewing && (
                    <span className="text-[8px] bg-violet-500 text-white font-bold px-1.5 py-0.5 rounded uppercase tracking-wider animate-pulse">
                      Playing
                    </span>
                  )}
                  <ChevronRight size={14} className="text-white/30" />
                </div>
              </div>
            );
          })}
        </div>

        {/* Group 3: Simulation & Troubleshooting */}
        <h4 className="text-[9px] font-bold text-white/40 tracking-wider uppercase mb-2 ml-1 shrink-0">Simulators & Tests</h4>

        <div className="glass-panel rounded-2xl p-4 flex flex-col gap-3 mb-6 shrink-0">
          <p className="text-[10px] text-white/50 leading-relaxed mb-1">
            Test the active alarm modal instantly. Tap below, and an alert will trigger after 5 seconds.
          </p>

          <button
            onClick={triggerTestAlarmIn5s}
            disabled={simulatedTime !== null}
            className={`w-full h-11 rounded-xl text-xs font-bold border transition-all duration-300 flex items-center justify-center gap-2 ${
              simulatedTime !== null 
                ? 'bg-purple-600/10 border-purple-500/20 text-purple-300/60' 
                : 'glass-button-primary text-white'
            }`}
          >
            {simulatedTime !== null ? (
              <span>Triggering in {simulatedTime}s...</span>
            ) : (
              <>
                <Sparkles size={13} className="animate-spin-slow" />
                <span>Simulate Active Alarm (5s Delay)</span>
              </>
            )}
          </button>
        </div>

        {/* Logout button */}
        <button
          onClick={logout}
          className="w-full h-12 rounded-2xl border border-red-500/20 bg-red-950/15 hover:bg-red-900/20 text-red-400 font-bold text-sm flex items-center justify-center gap-2 shadow-[inset_0_1px_1px_rgba(239,68,68,0.1)] active:scale-95 transition shrink-0"
        >
          <LogOut size={16} />
          <span>Sign Out / Lock App</span>
        </button>

      </div>

      {/* Navigation bar replicated */}
      <div className="w-full pb-4">
        <div className="glass-panel-dark rounded-2xl h-14 px-4 flex items-center justify-between z-40 relative">
          <button 
            onClick={() => setScreen('dashboard')}
            className={`flex flex-col items-center gap-0.5 justify-center flex-1 py-1 ${
              currentScreen === 'dashboard' ? 'text-violet-400' : 'text-white/40 hover:text-white/70'
            }`}
          >
            <Grid size={18} />
            <span className="text-[8px] font-bold uppercase tracking-wider">Home</span>
          </button>

          <button 
            onClick={() => setScreen('calendar')}
            className={`flex flex-col items-center gap-0.5 justify-center flex-1 py-1 ${
              currentScreen === 'calendar' ? 'text-violet-400' : 'text-white/40 hover:text-white/70'
            }`}
          >
            <Calendar size={18} />
            <span className="text-[8px] font-bold uppercase tracking-wider">Calendar</span>
          </button>

          <div className="relative -top-4 px-2">
            <button
              onClick={onAddClick}
              className="w-12 h-12 rounded-full glass-button-primary flex items-center justify-center text-white shadow-lg shadow-purple-500/40 border border-white/25 focus:outline-none"
            >
              <ChevronRight size={24} className="rotate-90" />
            </button>
          </div>

          <button 
            onClick={() => setScreen('categories')}
            className={`flex flex-col items-center gap-0.5 justify-center flex-1 py-1 ${
              currentScreen === 'categories' ? 'text-violet-400' : 'text-white/40 hover:text-white/70'
            }`}
          >
            <Grid size={18} className="rotate-45" />
            <span className="text-[8px] font-bold uppercase tracking-wider">Categories</span>
          </button>

          <button 
            onClick={() => setScreen('settings')}
            className={`flex flex-col items-center gap-0.5 justify-center flex-1 py-1 ${
              currentScreen === 'settings' ? 'text-violet-400' : 'text-white/40 hover:text-white/70'
            }`}
          >
            <SettingsIcon size={18} />
            <span className="text-[8px] font-bold uppercase tracking-wider">Settings</span>
          </button>
        </div>
      </div>

    </div>
  );
}
export default SettingsView;
