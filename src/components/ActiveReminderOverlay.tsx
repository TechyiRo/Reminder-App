import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence, useMotionValue, useTransform } from 'framer-motion';
import { Bell, Clock, X, ArrowRight, Check } from 'lucide-react';
import { useReminderStore } from '../store/reminderStore';
import { playAmbientAlert, stopAmbientAlert } from '../utils/audio';
import confetti from 'canvas-confetti';

export function ActiveReminderOverlay() {
  const { activeRingingReminder, settings, snoozeReminder, dismissRingingReminder, toggleCompleteReminder } = useReminderStore();
  const [draggedSuccess, setDraggedSuccess] = useState(false);
  const audioStarted = useRef(false);

  if (!activeRingingReminder) return null;

  // Sound trigger on mount
  useEffect(() => {
    if (settings.soundOption === 'Ringtone + Notification' && !audioStarted.current) {
      playAmbientAlert(settings.toneType);
      audioStarted.current = true;
    }

    // Trigger phone vibration mock if supported in client browser
    if (settings.vibrationEnabled && navigator.vibrate) {
      navigator.vibrate([500, 300, 500, 300, 500]);
    }

    return () => {
      stopAmbientAlert();
      audioStarted.current = false;
    };
  }, [activeRingingReminder, settings.soundOption, settings.toneType, settings.vibrationEnabled]);

  const handleSnooze = () => {
    snoozeReminder(activeRingingReminder.id);
  };

  const handleDismiss = () => {
    dismissRingingReminder();
  };

  // Slider gestures logic
  const dragX = useMotionValue(0);
  const containerWidth = 260; // Approximate width of track minus knob
  const knobWidth = 48;
  const dragLimit = containerWidth - knobWidth - 10;

  // Map drag value to slider background progress and opacity
  const opacity = useTransform(dragX, [0, dragLimit], [1, 0]);

  const handleDragEnd = () => {
    const currentX = dragX.get();
    if (currentX >= dragLimit - 5) {
      // Completed drag action successfully!
      setDraggedSuccess(true);
      
      // Stop sound
      stopAmbientAlert();

      // Trigger Confetti fireworks
      confetti({
        particleCount: 120,
        spread: 70,
        origin: { y: 0.6 }
      });

      setTimeout(() => {
        toggleCompleteReminder(activeRingingReminder.id);
      }, 800);
    } else {
      // Snap back knob
      dragX.set(0);
    }
  };

  // Sound Option Checker
  const soundWarningLabel = settings.soundOption === 'Notification Only' ? 'Muted (Notification Only)' : settings.toneType;

  return (
    <div className="absolute inset-0 bg-[#07060f]/85 backdrop-blur-xl z-50 flex flex-col items-center justify-between p-8 text-center select-none">
      
      {/* Top Header Label */}
      <div className="pt-8">
        <span className="text-[10px] bg-purple-500/20 border border-purple-500/30 text-purple-300 font-bold px-3 py-1.5 rounded-full uppercase tracking-wider animate-pulse">
          Active Reminder Alert
        </span>
        <p className="text-[9px] text-white/40 mt-2 flex items-center justify-center gap-1">
          <span>Audio:</span>
          <span className="font-bold text-violet-400">{soundWarningLabel}</span>
        </p>
      </div>

      {/* Centered Glowing Concentric Rings & Oscillating Bell */}
      <div className="relative w-72 h-72 flex items-center justify-center">
        {/* Ring 1 (outermost) */}
        <motion.div 
          animate={{ scale: [1, 1.15, 1], opacity: [0.15, 0.35, 0.15] }}
          transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute w-[240px] h-[240px] rounded-full border border-purple-500/20 bg-purple-500/5 blur-[2px]"
        />
        {/* Ring 2 */}
        <motion.div 
          animate={{ scale: [1, 1.25, 1], opacity: [0.25, 0.55, 0.25] }}
          transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut', delay: 0.3 }}
          className="absolute w-[180px] h-[180px] rounded-full border border-pink-500/25 bg-pink-500/5 blur-[1px]"
        />
        {/* Ring 3 */}
        <motion.div 
          animate={{ scale: [1, 1.3, 1], opacity: [0.35, 0.75, 0.35] }}
          transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut', delay: 0.6 }}
          className="absolute w-[120px] h-[120px] rounded-full border border-violet-500/30 bg-violet-500/5"
        />

        {/* Oscillating Bell Icon */}
        <motion.div
          animate={settings.vibrationEnabled ? {
            rotate: [-6, 6, -6, 6, 0],
            x: [-1, 1, -1, 1, 0]
          } : {
            rotate: [-8, 8, -8, 8, 0]
          }}
          transition={{
            duration: 0.6,
            repeat: Infinity,
            ease: 'linear'
          }}
          className="w-20 h-20 bg-gradient-to-tr from-violet-600 to-pink-500 rounded-3xl flex items-center justify-center shadow-2xl shadow-purple-500/40 border border-white/20 relative z-10"
        >
          <Bell className="text-white filter drop-shadow-[0_2px_10px_rgba(255,255,255,0.4)]" size={36} fill="white" />
        </motion.div>
      </div>

      {/* Reminder Description and details text */}
      <div className="px-4">
        <h2 className="text-xl font-bold font-display text-white tracking-tight">
          {activeRingingReminder.title}
        </h2>
        <p className="text-xs text-white/55 font-medium mt-1">
          Scheduled for {activeRingingReminder.time}
        </p>
        {activeRingingReminder.description && (
          <p className="text-[11px] leading-relaxed text-white/45 mt-3 max-h-24 overflow-y-auto px-2">
            {activeRingingReminder.description}
          </p>
        )}
      </div>

      {/* Interactive controls */}
      <div className="w-full flex flex-col items-center gap-5 pb-8">
        
        {/* Action Buttons Row */}
        {!draggedSuccess && (
          <div className="flex gap-4 w-full px-6">
            {/* Snooze (5 min) */}
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={handleSnooze}
              className="flex-1 h-12 rounded-2xl glass-button-secondary text-white font-semibold text-xs flex items-center justify-center gap-2"
            >
              <Clock size={14} className="text-purple-300" />
              <span>Snooze 5m</span>
            </motion.button>

            {/* Dismiss */}
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={handleDismiss}
              className="flex-1 h-12 rounded-2xl border border-red-500/20 bg-red-950/15 text-red-400 font-semibold text-xs flex items-center justify-center gap-2"
            >
              <X size={14} />
              <span>Dismiss</span>
            </motion.button>
          </div>
        )}

        {/* Gesture Swipe to Complete Slider */}
        <div className="w-[260px] h-12 rounded-full bg-white/5 border border-white/10 relative p-1.5 flex items-center justify-between overflow-hidden shadow-inner">
          <AnimatePresence>
            {!draggedSuccess ? (
              <>
                {/* Swipe Text */}
                <motion.span 
                  style={{ opacity }}
                  className="absolute inset-0 flex items-center justify-center text-[10px] font-bold uppercase tracking-wider text-white/30 pointer-events-none select-none pl-12"
                >
                  Slide to Complete
                </motion.span>

                {/* Slider Knob */}
                <motion.div
                  drag="x"
                  dragConstraints={{ left: 0, right: dragLimit }}
                  dragElastic={0}
                  dragMomentum={false}
                  onDragEnd={handleDragEnd}
                  style={{ x: dragX }}
                  className="slider-thumb absolute left-1 top-1 bottom-1 flex items-center justify-center cursor-grab"
                >
                  <ArrowRight size={14} className="text-white" />
                </motion.div>
              </>
            ) : (
              <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="absolute inset-0 bg-emerald-500/25 border border-emerald-500/40 rounded-full flex items-center justify-center gap-2 text-emerald-400 font-bold text-xs"
              >
                <Check size={14} />
                <span>Task Completed!</span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

    </div>
  );
}
export default ActiveReminderOverlay;
