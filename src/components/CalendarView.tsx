import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ChevronLeft, ChevronRight, 
  Clock, CheckCircle, Play, Trash2, CalendarDays
} from 'lucide-react';
import { useReminderStore } from '../store/reminderStore';
import confetti from 'canvas-confetti';

export function CalendarView() {
  const { 
    reminders, toggleCompleteReminder, 
    deleteReminder, triggerReminderImmediately
  } = useReminderStore();

  const [currentDate, setCurrentDate] = useState(new Date());
  
  const formatDateString = (year: number, month: number, day: number) => {
    return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  };

  const getTodayDateString = () => {
    const d = new Date();
    return formatDateString(d.getFullYear(), d.getMonth(), d.getDate());
  };

  const [selectedDateStr, setSelectedDateStr] = useState(getTodayDateString());

  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth();

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  // Calendar generation helpers
  const getDaysInMonth = (year: number, month: number) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (year: number, month: number) => {
    return new Date(year, month, 1).getDay();
  };

  const daysInMonth = getDaysInMonth(currentYear, currentMonth);
  const firstDay = getFirstDayOfMonth(currentYear, currentMonth);

  // Generate days array (with padding for previous month days)
  const daysArray: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) {
    daysArray.push(null);
  }
  for (let i = 1; i <= daysInMonth; i++) {
    daysArray.push(i);
  }

  const prevMonth = () => {
    setCurrentDate(new Date(currentYear, currentMonth - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentYear, currentMonth + 1, 1));
  };

  const handleDayClick = (day: number | null) => {
    if (!day) return;
    setSelectedDateStr(formatDateString(currentYear, currentMonth, day));
  };

  const selectedReminders = reminders.filter(r => r.date === selectedDateStr);

  const getDayReminders = (day: number | null) => {
    if (!day) return [];
    const dateStr = formatDateString(currentYear, currentMonth, day);
    return reminders.filter(r => r.date === dateStr);
  };

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

  const formatHeaderDate = (dateStr: string) => {
    const [y, m, d] = dateStr.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    return date.toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' });
  };

  return (
    <div className="flex-1 flex flex-col px-4 pt-safe justify-between select-none relative overflow-hidden min-h-0">
      
      <div className="flex-1 flex flex-col overflow-y-auto pr-1">
        
        {/* Header Title */}
        <div className="flex items-center justify-between mb-5 z-20">
          <h2 className="text-xl font-bold font-display text-white">Calendar</h2>
        </div>

        {/* Month Selector Panel */}
        <div className="glass-panel rounded-2xl p-4 mb-4 relative shrink-0">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold font-display text-white/90">
              {months[currentMonth]} {currentYear}
            </h3>
            <div className="flex items-center gap-1">
              <button
                onClick={prevMonth}
                className="w-7 h-7 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-white/60 hover:text-white hover:bg-white/10"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                onClick={nextMonth}
                className="w-7 h-7 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-white/60 hover:text-white hover:bg-white/10"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>

          {/* Days of Week Row */}
          <div className="grid grid-cols-7 gap-1 text-center mb-2">
            {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, index) => (
              <span key={index} className="text-[10px] font-bold text-white/40 uppercase">
                {d}
              </span>
            ))}
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7 gap-1.5 text-center">
            {daysArray.map((day, index) => {
              const dayReminders = getDayReminders(day);
              const dateStr = day ? formatDateString(currentYear, currentMonth, day) : '';
              const isSelected = selectedDateStr === dateStr;
              const isToday = getTodayDateString() === dateStr;

              // Check if reminders are pending or high priority
              const hasHigh = dayReminders.some(r => r.priority === 'High' && !r.completed);
              const hasMedium = dayReminders.some(r => r.priority === 'Medium' && !r.completed);
              const hasLow = dayReminders.some(r => r.priority === 'Low' && !r.completed);

              return (
                <div
                  key={index}
                  onClick={() => handleDayClick(day)}
                  className={`aspect-square flex flex-col items-center justify-center rounded-xl text-xs font-semibold cursor-pointer relative transition-all duration-200 ${
                    !day ? 'pointer-events-none opacity-0' : ''
                  } ${
                    isSelected 
                      ? 'bg-violet-600/30 border border-violet-500/50 text-white shadow-[0_0_12px_rgba(139,92,246,0.25)]' 
                      : isToday 
                        ? 'bg-white/10 border border-white/20 text-white' 
                        : 'hover:bg-white/5 border border-transparent text-white/80'
                  }`}
                >
                  <span>{day}</span>
                  
                  {/* Indicator Dot Badges */}
                  {dayReminders.length > 0 && (
                    <div className="flex gap-0.5 absolute bottom-1.5">
                      {hasHigh && <span className="w-1 h-1 rounded-full bg-red-400"></span>}
                      {hasMedium && <span className="w-1 h-1 rounded-full bg-amber-400"></span>}
                      {hasLow && <span className="w-1 h-1 rounded-full bg-sky-400"></span>}
                      {dayReminders.every(r => r.completed) && <span className="w-1 h-1 rounded-full bg-emerald-400"></span>}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Selected Day Agenda Headers */}
        <h4 className="text-xs font-bold text-white/55 tracking-wider uppercase mb-3 ml-1 shrink-0">
          Agenda: {formatHeaderDate(selectedDateStr)}
        </h4>

        {/* Selected Day Reminders List */}
        <div className="flex flex-col gap-3">
          <AnimatePresence initial={false}>
            {selectedReminders.length === 0 ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="glass-panel border-dashed border-white/10 rounded-2xl py-8 flex flex-col items-center justify-center text-center px-6 shrink-0"
              >
                <div className="w-10 h-10 bg-white/5 border border-white/10 rounded-full flex items-center justify-center text-white/30 mb-2">
                  <CalendarDays size={18} />
                </div>
                <p className="text-[11px] font-semibold text-white/70">No reminders scheduled for this date</p>
              </motion.div>
            ) : (
              selectedReminders.map((reminder) => (
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
                  <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-violet-500"></div>
                  
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
    </div>
  );
}
export default CalendarView;
