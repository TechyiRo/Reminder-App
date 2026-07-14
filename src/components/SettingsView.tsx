import { useState } from 'react';
import { 
  Bell, Smartphone, Grid, Calendar, Settings as SettingsIcon,
  ChevronRight, LogOut, ShieldAlert, Sparkles, Music
} from 'lucide-react';
import { useReminderStore } from '../store/reminderStore';
import { playAmbientAlert, stopAmbientAlert } from '../utils/audio';

export function SettingsView({ onAddClick }: { onAddClick: () => void }) {
  const { 
    user, currentScreen, setScreen, settings, updateSettings, logout, 
    reminders, setActiveRingingReminder 
  } = useReminderStore();

  const [simulatedTime, setSimulatedTime] = useState<number | null>(null);
  const [soundPreviewing, setSoundPreviewing] = useState<string | null>(null);
  const [permissionStatus, setPermissionStatus] = useState<string>(
    typeof Notification !== 'undefined' ? Notification.permission : 'unsupported'
  );

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

        {/* Profile Card Header */}
        <div className="glass-panel rounded-2xl p-5 mb-5 text-center relative overflow-hidden shrink-0">
          <div className="w-16 h-16 rounded-full border-2 border-violet-500/50 overflow-hidden mx-auto mb-3 shadow-[0_0_15px_rgba(139,92,246,0.3)] bg-[#0d0c1e] flex items-center justify-center font-display font-bold text-white text-lg">
            {user.avatarUrl ? (
              <img src={user.avatarUrl} alt="avatar" className="w-full h-full object-cover" />
            ) : (
              user.name.substring(0, 2).toUpperCase()
            )}
          </div>
          <h3 className="font-bold text-base text-white font-display">{user.name}</h3>
          <p className="text-[10px] text-white/40 mt-0.5">{user.email}</p>

          {/* Small count stats splits */}
          <div className="grid grid-cols-3 gap-2 mt-4 pt-4 border-t border-white/5">
            <div className="flex flex-col items-center">
              <span className="text-[10px] text-white/40 font-semibold uppercase">Total</span>
              <span className="text-sm font-bold text-white/80 mt-0.5">{totalReminders}</span>
            </div>
            <div className="flex flex-col items-center">
              <span className="text-[10px] text-emerald-400 font-semibold uppercase">Completed</span>
              <span className="text-sm font-bold text-emerald-400 mt-0.5">{completedCount}</span>
            </div>
            <div className="flex flex-col items-center">
              <span className="text-[10px] text-amber-400 font-semibold uppercase">Pending</span>
              <span className="text-sm font-bold text-amber-400 mt-0.5">{pendingCount}</span>
            </div>
          </div>
        </div>

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
