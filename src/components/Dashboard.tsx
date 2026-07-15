import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  CheckCircle, Bell, BellOff, Trash2, 
  Play, ChevronRight, AlertCircle, Clock
} from 'lucide-react';
import { useReminderStore } from '../store/reminderStore';
import type { Reminder } from '../store/reminderStore';
import confetti from 'canvas-confetti';

export function Dashboard() {
  const { 
    reminders, user, setScreen, toggleCompleteReminder, 
    deleteReminder, triggerReminderImmediately, settings, updateSettings 
  } = useReminderStore();

  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (!user) return null;

  // Filter logic for today
  const getTodayDateStr = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const todayStr = getTodayDateStr();

  // Reminders metrics
  const todayReminders = reminders.filter(r => r.date === todayStr);
  const completedToday = todayReminders.filter(r => r.completed).length;
  const pendingToday = todayReminders.filter(r => !r.completed).length;

  const isOverdue = (r: Reminder) => {
    if (r.completed) return false;
    const now = new Date();
    const [hours, minutes] = r.time.split(':').map(Number);
    const rDate = new Date(r.date);
    rDate.setHours(hours, minutes, 0, 0);
    return rDate < now;
  };

  const overdueToday = todayReminders.filter(r => isOverdue(r)).length;

  // Sound Toggle Control Helper
  const toggleSound = () => {
    updateSettings({
      soundOption: settings.soundOption === 'Ringtone + Notification' ? 'Notification Only' : 'Ringtone + Notification'
    });
  };

  const handleComplete = (id: string, completed: boolean) => {
    toggleCompleteReminder(id);
    if (!completed) {
      // Trigger canvas-confetti animation
      confetti({
        particleCount: 80,
        spread: 60,
        origin: { y: 0.8 },
        colors: ['#a78bfa', '#f472b6', '#38bdf8']
      });
    }
  };

  // Color Mapping for Category Cards/Badges
  const categoryGradients: Record<string, string> = {
    Work: 'from-blue-500/20 to-indigo-500/20 border-blue-500/30 text-blue-300',
    Personal: 'from-green-500/20 to-emerald-500/20 border-green-500/30 text-green-300',
    Health: 'from-teal-500/20 to-cyan-500/20 border-teal-500/30 text-teal-300',
    Study: 'from-purple-500/20 to-pink-500/20 border-purple-500/30 text-purple-300',
    Other: 'from-gray-500/20 to-slate-500/20 border-gray-500/30 text-gray-300',
  };

  const priorityColors = {
    High: 'text-red-400 bg-red-500/10 border-red-500/20 shadow-[0_0_8px_rgba(239,68,68,0.2)]',
    Medium: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
    Low: 'text-sky-400 bg-sky-500/10 border-sky-500/20'
  };

  // Greeting helper
  const getGreeting = () => {
    const hours = new Date().getHours();
    if (hours < 12) return 'Good Morning';
    if (hours < 17) return 'Good Afternoon';
    return 'Good Evening';
  };

  return (
    <div className="flex-1 flex flex-col px-4 pt-safe justify-between select-none relative overflow-hidden min-h-0">
      
      {/* Scrollable Container */}
      <div className="flex-1 flex flex-col overflow-y-auto pr-1">
        
        {/* Top Header Card */}
        <div className="flex items-center justify-between mb-5 z-20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full border border-white/20 overflow-hidden shadow-inner bg-gradient-to-tr from-purple-600 to-pink-500 flex items-center justify-center font-display font-bold text-white text-sm">
              {user.avatarUrl ? (
                <img src={user.avatarUrl} alt="avatar" className="w-full h-full object-cover" />
              ) : (
                user.name.substring(0, 2).toUpperCase()
              )}
            </div>
            <div>
              <p className="text-[10px] text-white/50 tracking-wider uppercase font-semibold">Welcome Back</p>
              <h2 className="text-base font-bold font-display text-white flex items-center gap-1">
                {getGreeting()}, {user.name.split(' ')[0]} ⚡
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Small Logo Badge in Header */}
            <div className="w-8 h-8 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center p-1">
              <img src="/logo.png" alt="Logo" className="w-full h-full object-contain" />
            </div>

            {/* Alert Ringtone Control Selector */}
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={toggleSound}
              className={`w-8 h-8 rounded-xl border flex items-center justify-center transition-all duration-300 ${
                settings.soundOption === 'Ringtone + Notification'
                  ? 'bg-violet-600/20 border-violet-500/40 text-violet-300 shadow-[0_0_12px_rgba(139,92,246,0.3)]'
                  : 'bg-white/5 border-white/10 text-white/50'
              }`}
              title="Global Alarm Sound Mode Toggle"
            >
              {settings.soundOption === 'Ringtone + Notification' ? (
                <Bell size={14} className="animate-pulse" />
              ) : (
                <BellOff size={14} />
              )}
            </motion.button>
          </div>
        </div>

        {/* Dashboard Overview Widget Panel */}
        <div className="glass-panel rounded-2xl p-5 mb-6 relative overflow-hidden shrink-0">
          {/* Subtle decoration glow */}
          <div className="absolute top-0 right-0 w-24 h-24 bg-violet-600/10 rounded-full blur-2xl"></div>

          <p className="text-xs text-white/55 font-medium tracking-wide mb-3">Today's Overview</p>
          
          <div className="flex items-center justify-between">
            {/* Split Metrics Stats */}
            <div className="flex flex-col gap-2.5">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-400"></div>
                <span className="text-[11px] text-white/60">Completed:</span>
                <span className="text-xs font-bold text-emerald-400">{completedToday}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-amber-400"></div>
                <span className="text-[11px] text-white/60">Pending:</span>
                <span className="text-xs font-bold text-amber-400">{pendingToday}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-red-400"></div>
                <span className="text-[11px] text-white/60">Overdue:</span>
                <span className="text-xs font-bold text-red-400">{overdueToday}</span>
              </div>
            </div>

            {/* Circular widget visualization */}
            <div className="relative w-20 h-20 flex items-center justify-center">
              {/* Outer Glow Ring */}
              <div className="absolute inset-0 rounded-full border border-white/5 bg-gradient-to-tr from-purple-500/10 to-pink-500/10 blur-[1px]"></div>
              
              {/* SVG circular progress */}
              <svg className="w-full h-full transform -rotate-90">
                <circle
                  cx="40"
                  cy="40"
                  r="34"
                  className="stroke-white/10"
                  strokeWidth="3.5"
                  fill="transparent"
                />
                <circle
                  cx="40"
                  cy="40"
                  r="34"
                  className="stroke-violet-500"
                  strokeWidth="3.5"
                  fill="transparent"
                  strokeDasharray={`${2 * Math.PI * 34}`}
                  strokeDashoffset={`${
                    2 * Math.PI * 34 * (1 - (todayReminders.length > 0 ? completedToday / todayReminders.length : 0))
                  }`}
                  strokeLinecap="round"
                />
              </svg>
              
              <div className="absolute flex flex-col items-center justify-center">
                <span className="text-lg font-bold font-display leading-none">{todayReminders.length}</span>
                <span className="text-[8px] uppercase tracking-wider text-white/40 font-semibold mt-0.5">Total</span>
              </div>
            </div>
          </div>
        </div>

        {/* Today's Reminders Header */}
        <div className="flex items-center justify-between mb-3.5 shrink-0">
          <h3 className="text-sm font-bold font-display text-white/90 tracking-wide">
            Today's Reminders
          </h3>
          <button 
            onClick={() => setScreen('calendar')}
            className="text-[11px] text-purple-400 hover:text-purple-300 font-bold flex items-center gap-0.5"
          >
            <span>View Calendar</span>
            <ChevronRight size={12} />
          </button>
        </div>

        {/* List of Today's Reminders */}
        <div className="flex flex-col gap-3">
          <AnimatePresence initial={false}>
            {todayReminders.length === 0 ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="glass-panel border-dashed border-white/10 rounded-2xl py-12 flex flex-col items-center justify-center text-center px-6 shrink-0"
              >
                <div className="w-12 h-12 bg-white/5 border border-white/10 rounded-full flex items-center justify-center text-white/40 mb-3">
                  <Clock size={20} />
                </div>
                <p className="text-xs font-semibold text-white/70">No reminders scheduled for today</p>
                <p className="text-[10px] text-white/40 mt-1">Tap the plus button below to create one!</p>
              </motion.div>
            ) : (
              todayReminders.map((reminder) => {
                const isOver = isOverdue(reminder);
                const isExpanded = expandedId === reminder.id;

                return (
                  <motion.div
                    key={reminder.id}
                    layout
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className={`glass-panel rounded-2xl p-4 transition-all duration-300 relative overflow-hidden shrink-0 ${
                      reminder.completed ? 'opacity-55' : ''
                    } ${isOver ? 'border-red-500/20' : ''}`}
                  >
                    {/* Glowing highlight indicator for priority */}
                    <div className={`absolute left-0 top-0 bottom-0 w-[3px] ${
                      reminder.priority === 'High' ? 'bg-red-500' : reminder.priority === 'Medium' ? 'bg-amber-400' : 'bg-sky-400'
                    }`}></div>

                    <div className="flex items-start gap-3 justify-between">
                      {/* Check Circle Button */}
                      <button
                        onClick={() => handleComplete(reminder.id, reminder.completed)}
                        className="mt-0.5 focus:outline-none"
                      >
                        <CheckCircle 
                          size={18} 
                          className={`transition-colors duration-250 ${
                            reminder.completed 
                              ? 'text-emerald-400 fill-emerald-400/20' 
                              : 'text-white/30 hover:text-white/60'
                          }`} 
                        />
                      </button>

                      {/* Reminder Details content */}
                      <div 
                        onClick={() => setExpandedId(isExpanded ? null : reminder.id)}
                        className="flex-1 cursor-pointer"
                      >
                        <h4 className={`text-xs font-bold leading-tight ${reminder.completed ? 'line-through text-white/40' : 'text-white/95'}`}>
                          {reminder.title}
                        </h4>
                        
                        {/* Summary Badges row */}
                        <div className="flex items-center gap-2 mt-2 flex-wrap">
                          <span className="text-[9px] text-white/50 font-semibold flex items-center gap-1">
                            <Clock size={10} />
                            {reminder.time}
                          </span>
                          
                          {/* Priority Badge */}
                          <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded-full border ${priorityColors[reminder.priority]}`}>
                            {reminder.priority}
                          </span>
                          
                          {/* Category Badge */}
                          <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded-full border ${categoryGradients[reminder.category] || categoryGradients['Other']}`}>
                            {reminder.category}
                          </span>
                        </div>
                      </div>

                      {/* Side tools */}
                      <div className="flex items-center gap-1.5 z-10">
                        {/* Instant Simulator Test Button */}
                        {!reminder.completed && (
                          <button
                            onClick={() => triggerReminderImmediately(reminder.id)}
                            className="p-1.5 rounded-lg bg-white/5 border border-white/10 text-violet-400 hover:text-violet-300 hover:bg-white/10"
                            title="Simulate Active Alarm Trigger Now"
                          >
                            <Play size={12} fill="currentColor" />
                          </button>
                        )}
                        <button
                          onClick={() => deleteReminder(reminder.id)}
                          className="p-1.5 rounded-lg bg-white/5 border border-white/10 text-white/40 hover:text-red-400 hover:bg-red-500/10 hover:border-red-500/20"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>

                    {/* Collapsible details pane */}
                    <AnimatePresence>
                      {isExpanded && reminder.description && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="mt-3 pt-3 border-t border-white/5 overflow-hidden"
                        >
                          <p className="text-[11px] leading-relaxed text-white/60 whitespace-pre-wrap">
                            {reminder.description}
                          </p>
                          {isOver && (
                            <div className="flex items-center gap-1 text-[10px] text-red-400 font-semibold mt-2.5 bg-red-500/10 border border-red-500/20 px-2 py-1 rounded-lg">
                              <AlertCircle size={10} />
                              <span>This reminder is overdue!</span>
                            </div>
                          )}
                          {reminder.snoozedCount > 0 && (
                            <p className="text-[9px] text-white/40 mt-2 font-medium">
                              Snoozed {reminder.snoozedCount} time(s).
                            </p>
                          )}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                );
              })
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
export default Dashboard;
