import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Briefcase, User, Heart, BookOpen, Layers, Grid, Calendar, Settings, 
  ChevronRight, Clock, CheckCircle, Play, Trash2
} from 'lucide-react';
import { useReminderStore } from '../store/reminderStore';
import type { Reminder } from '../store/reminderStore';
import confetti from 'canvas-confetti';

export function CategoriesView({ onAddClick }: { onAddClick: () => void }) {
  const { 
    reminders, currentScreen, setScreen, toggleCompleteReminder, 
    deleteReminder, triggerReminderImmediately
  } = useReminderStore();

  const [activeCategory, setActiveCategory] = useState<Reminder['category']>('Work');

  const categoriesList: { name: Reminder['category']; icon: React.ReactNode; color: string; gradient: string }[] = [
    { name: 'Work', icon: <Briefcase size={20} />, color: 'text-blue-400 border-blue-500/30', gradient: 'from-blue-500/10 to-indigo-500/10' },
    { name: 'Personal', icon: <User size={20} />, color: 'text-green-400 border-green-500/30', gradient: 'from-green-500/10 to-emerald-500/10' },
    { name: 'Health', icon: <Heart size={20} />, color: 'text-teal-400 border-teal-500/30', gradient: 'from-teal-500/10 to-cyan-500/10' },
    { name: 'Study', icon: <BookOpen size={20} />, color: 'text-purple-400 border-purple-500/30', gradient: 'from-purple-500/10 to-pink-500/10' },
    { name: 'Other', icon: <Layers size={20} />, color: 'text-gray-400 border-gray-500/30', gradient: 'from-gray-500/10 to-slate-500/10' },
  ];

  const getRemindersForCat = (catName: Reminder['category']) => {
    return reminders.filter(r => r.category === catName);
  };

  const activeReminders = getRemindersForCat(activeCategory);

  const handleComplete = (id: string, completed: boolean) => {
    toggleCompleteReminder(id);
    if (!completed) {
      confetti({
        particleCount: 50,
        spread: 45,
        origin: { y: 0.8 },
        colors: ['#a78bfa', '#f472b6', '#38bdf8']
      });
    }
  };

  const priorityColors = {
    High: 'text-red-400 bg-red-500/10 border-red-500/20 shadow-[0_0_8px_rgba(239,68,68,0.2)]',
    Medium: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
    Low: 'text-sky-400 bg-sky-500/10 border-sky-500/20'
  };

  return (
    <div className="flex-1 flex flex-col px-4 pt-4 justify-between select-none relative overflow-hidden min-h-0">
      
      <div className="flex-1 flex flex-col overflow-y-auto pr-1">
        
        {/* Title */}
        <h2 className="text-xl font-bold font-display text-white mb-5 z-20">Categories</h2>

        {/* Categories Grid list */}
        <div className="grid grid-cols-2 gap-3 mb-6 shrink-0">
          {categoriesList.map((cat) => {
            const catReminders = getRemindersForCat(cat.name);
            const total = catReminders.length;
            const completed = catReminders.filter(r => r.completed).length;
            const isSelected = activeCategory === cat.name;

            return (
              <motion.div
                key={cat.name}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setActiveCategory(cat.name)}
                className={`glass-panel rounded-2xl p-4 cursor-pointer relative overflow-hidden transition-all duration-300 ${
                  isSelected 
                    ? 'border-violet-500/50 bg-violet-600/15 shadow-[0_0_15px_rgba(139,92,246,0.2)]' 
                    : 'hover:bg-white/8'
                }`}
              >
                {/* Glowing light highlight overlay */}
                <div className={`absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r ${
                  isSelected ? 'from-violet-500 via-pink-500 to-violet-500' : 'from-transparent'
                }`}></div>

                <div className="flex justify-between items-start mb-3">
                  <div className={`p-2.5 rounded-xl bg-white/5 border ${cat.color}`}>
                    {cat.icon}
                  </div>
                  <span className="text-xs font-bold text-white/40">
                    {completed}/{total}
                  </span>
                </div>

                <h4 className="text-xs font-bold text-white/90 font-display mb-1">{cat.name}</h4>
                <div className="w-full bg-white/10 h-1 rounded-full overflow-hidden mt-2">
                  <div 
                    className="bg-gradient-to-r from-violet-500 to-pink-500 h-full transition-all duration-500"
                    style={{ width: `${total > 0 ? (completed / total) * 100 : 0}%` }}
                  ></div>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Category List Header */}
        <h4 className="text-xs font-bold text-white/55 tracking-wider uppercase mb-3.5 ml-1 shrink-0">
          {activeCategory} Reminders List
        </h4>

        {/* Reminders list filtered by active category */}
        <div className="flex flex-col gap-3">
          <AnimatePresence initial={false}>
            {activeReminders.length === 0 ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="glass-panel border-dashed border-white/10 rounded-2xl py-10 flex flex-col items-center justify-center text-center px-6 shrink-0"
              >
                <p className="text-[11px] font-semibold text-white/60">No reminders in {activeCategory} category</p>
              </motion.div>
            ) : (
              activeReminders.map((reminder) => (
                <motion.div
                  key={reminder.id}
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className={`glass-panel rounded-xl p-3.5 transition-all duration-300 relative overflow-hidden shrink-0 ${
                    reminder.completed ? 'opacity-55' : ''
                  }`}
                >
                  <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-pink-500"></div>

                  <div className="flex items-start gap-3 justify-between">
                    <button
                      onClick={() => handleComplete(reminder.id, reminder.completed)}
                      className="mt-0.5"
                    >
                      <CheckCircle 
                        size={17} 
                        className={reminder.completed ? 'text-emerald-400 fill-emerald-400/20' : 'text-white/30'} 
                      />
                    </button>

                    <div className="flex-1">
                      <h5 className={`text-xs font-bold leading-tight ${reminder.completed ? 'line-through text-white/40' : 'text-white/95'}`}>
                        {reminder.title}
                      </h5>
                      <div className="flex items-center gap-2 mt-1.5">
                        <span className="text-[9px] text-white/40 font-semibold flex items-center gap-1">
                          <Calendar size={9} />
                          {reminder.date}
                        </span>
                        <span className="text-[9px] text-white/40 font-semibold flex items-center gap-1">
                          <Clock size={9} />
                          {reminder.time}
                        </span>
                        <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded-full border ${priorityColors[reminder.priority]}`}>
                          {reminder.priority}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      {!reminder.completed && (
                        <button
                          onClick={() => triggerReminderImmediately(reminder.id)}
                          className="p-1 rounded bg-white/5 border border-white/10 text-violet-400"
                        >
                          <Play size={10} fill="currentColor" />
                        </button>
                      )}
                      <button
                        onClick={() => deleteReminder(reminder.id)}
                        className="p-1 rounded bg-white/5 border border-white/10 text-white/40 hover:text-red-400"
                      >
                        <Trash2 size={10} />
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))
            )}
          </AnimatePresence>
        </div>
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
            <Settings size={18} />
            <span className="text-[8px] font-bold uppercase tracking-wider">Settings</span>
          </button>
        </div>
      </div>

    </div>
  );
}
export default CategoriesView;
