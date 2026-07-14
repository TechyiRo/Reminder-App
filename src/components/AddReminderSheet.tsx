import { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  X, Calendar, Clock, AlertTriangle, Briefcase, User, Heart, BookOpen, Layers
} from 'lucide-react';
import { useReminderStore } from '../store/reminderStore';
import type { Reminder } from '../store/reminderStore';

interface AddReminderSheetProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AddReminderSheet({ isOpen, onClose }: AddReminderSheetProps) {
  const { addReminder } = useReminderStore();

  // Get current date formatted for min date attribute YYYY-MM-DD
  const getTodayDateString = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };

  // Get current time formatted HH:MM
  const getNextHourString = () => {
    const d = new Date();
    d.setHours(d.getHours() + 1);
    return `${String(d.getHours()).padStart(2, '0')}:00`;
  };

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(getTodayDateString());
  const [time, setTime] = useState(getNextHourString());
  const [priority, setPriority] = useState<Reminder['priority']>('Medium');
  const [category, setCategory] = useState<Reminder['category']>('Work');

  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};

    if (!title.trim()) {
      newErrors.title = 'Title is required';
    }
    if (!date) {
      newErrors.date = 'Date is required';
    }
    if (!time) {
      newErrors.time = 'Time is required';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    addReminder({
      title,
      description,
      date,
      time,
      priority,
      category
    });

    // Reset Form
    setTitle('');
    setDescription('');
    setDate(getTodayDateString());
    setTime(getNextHourString());
    setPriority('Medium');
    setCategory('Work');
    setErrors({});

    onClose();
  };

  if (!isOpen) return null;

  const categories: { name: Reminder['category']; icon: React.ReactNode }[] = [
    { name: 'Work', icon: <Briefcase size={12} /> },
    { name: 'Personal', icon: <User size={12} /> },
    { name: 'Health', icon: <Heart size={12} /> },
    { name: 'Study', icon: <BookOpen size={12} /> },
    { name: 'Other', icon: <Layers size={12} /> }
  ];

  const priorities: Reminder['priority'][] = ['Low', 'Medium', 'High'];

  return (
    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end justify-center">
      {/* Click outside backdrop container */}
      <div className="absolute inset-0" onClick={onClose}></div>

      {/* Slide Up Panel Sheet */}
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 220 }}
        className="w-full glass-panel-dark rounded-t-[32px] border-t border-white/15 p-6 pb-8 relative z-10 max-h-[92%] overflow-y-auto"
      >
        {/* Android Gesture Indicator Line */}
        <div className="w-12 h-1 bg-white/20 rounded-full mx-auto mb-5"></div>

        {/* Top Header Row */}
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-bold text-lg font-display text-white">Add Reminder</h3>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white/50 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Form Elements */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          
          {/* Title */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold text-white/50 uppercase tracking-wider ml-1">Title</label>
            <input
              type="text"
              placeholder="e.g. UI/UX Meeting"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                setErrors(prev => ({ ...prev, title: '' }));
              }}
              className={`h-11 px-4 glass-input text-sm ${errors.title ? 'border-red-500/50' : ''}`}
            />
            {errors.title && <span className="text-[10px] text-red-400 font-semibold ml-1">{errors.title}</span>}
          </div>

          {/* Description */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold text-white/50 uppercase tracking-wider ml-1">Description</label>
            <textarea
              placeholder="Discuss project roadmap and details..."
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="px-4 py-3 glass-input text-sm resize-none"
            />
          </div>

          {/* Date & Time Row */}
          <div className="grid grid-cols-2 gap-4">
            {/* Date Picker */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-white/50 uppercase tracking-wider ml-1">Date</label>
              <div className="relative">
                <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/40" size={14} />
                <input
                  type="date"
                  min={getTodayDateString()}
                  value={date}
                  onChange={(e) => {
                    setDate(e.target.value);
                    setErrors(prev => ({ ...prev, date: '' }));
                  }}
                  className="w-full h-11 pl-10 pr-4 glass-input text-xs"
                />
              </div>
            </div>

            {/* Time Picker */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-white/50 uppercase tracking-wider ml-1">Time</label>
              <div className="relative">
                <Clock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/40" size={14} />
                <input
                  type="time"
                  value={time}
                  onChange={(e) => {
                    setTime(e.target.value);
                    setErrors(prev => ({ ...prev, time: '' }));
                  }}
                  className="w-full h-11 pl-10 pr-4 glass-input text-xs"
                />
              </div>
            </div>
          </div>

          {/* Priority Levels Toggle Selector */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold text-white/50 uppercase tracking-wider ml-1">Priority</label>
            <div className="grid grid-cols-3 gap-2.5">
              {priorities.map((p) => {
                const isActive = priority === p;
                const colors = {
                  Low: isActive ? 'bg-sky-500/25 border-sky-400 text-sky-300' : 'bg-white/5 border-white/10 text-white/60',
                  Medium: isActive ? 'bg-amber-500/25 border-amber-400 text-amber-300' : 'bg-white/5 border-white/10 text-white/60',
                  High: isActive ? 'bg-red-500/25 border-red-400 text-red-300' : 'bg-white/5 border-white/10 text-white/60'
                };
                return (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPriority(p)}
                    className={`h-10 rounded-xl border flex items-center justify-center gap-1.5 text-xs font-semibold transition-all duration-300 ${colors[p]}`}
                  >
                    <AlertTriangle size={12} className={p === 'High' && isActive ? 'animate-bounce' : ''} />
                    <span>{p}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Category Toggle Row */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold text-white/50 uppercase tracking-wider ml-1">Category</label>
            <div className="flex items-center gap-2 overflow-x-auto pb-1 scroll-smooth">
              {categories.map((cat) => {
                const isActive = category === cat.name;
                return (
                  <button
                    key={cat.name}
                    type="button"
                    onClick={() => setCategory(cat.name)}
                    className={`h-9 px-3.5 rounded-xl border flex items-center gap-1.5 text-xs font-semibold whitespace-nowrap shrink-0 transition-all duration-300 ${
                      isActive 
                        ? 'bg-violet-600/25 border-violet-400 text-violet-300 shadow-[0_0_10px_rgba(139,92,246,0.25)]' 
                        : 'bg-white/5 border-white/10 text-white/60 hover:bg-white/8 hover:text-white'
                    }`}
                  >
                    {cat.icon}
                    <span>{cat.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            className="w-full h-12 rounded-xl mt-4 font-bold text-sm glass-button-primary text-white flex items-center justify-center shadow-lg shadow-purple-500/25"
          >
            Save Reminder
          </button>
        </form>
      </motion.div>
    </div>
  );
}
export default AddReminderSheet;
