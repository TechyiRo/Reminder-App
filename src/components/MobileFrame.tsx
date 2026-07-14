import React, { useState, useEffect } from 'react';
import { Wifi, Battery, Signal } from 'lucide-react';

interface MobileFrameProps {
  children: React.ReactNode;
}

export function MobileFrame({ children }: MobileFrameProps) {
  const [time, setTime] = useState('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      let hours = now.getHours();
      const minutes = String(now.getMinutes()).padStart(2, '0');
      const ampm = hours >= 12 ? 'PM' : 'AM';
      hours = hours % 12;
      hours = hours ? hours : 12; // the hour '0' should be '12'
      setTime(`${hours}:${minutes} ${ampm}`);
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-[#06050b] flex items-center justify-center p-0 md:p-6 overflow-hidden select-none">
      {/* Background glowing decorations for desktop */}
      <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-violet-600/10 rounded-full blur-[120px] pointer-events-none hidden md:block"></div>
      <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-pink-600/10 rounded-full blur-[120px] pointer-events-none hidden md:block"></div>

      {/* Main Container / Phone Mockup Frame */}
      <div className="w-full h-screen md:h-[880px] md:w-[412px] md:rounded-[48px] relative md:border-[10px] md:border-[#1a1829] bg-[#0c0a1b] shadow-2xl flex flex-col overflow-hidden animated-mesh-bg animate-mesh-shift">
        
        {/* Specular Highlight Outer Rim */}
        <div className="absolute inset-0 rounded-[38px] border border-white/5 pointer-events-none hidden md:block"></div>

        {/* Android Status Bar */}
        <div className="h-10 px-6 pt-2 flex items-center justify-between text-[11.5px] font-medium text-white/80 z-40 select-none bg-black/10 backdrop-blur-sm">
          <span>{time || '10:00 AM'}</span>
          
          {/* Punch hole camera for Android style */}
          <div className="w-3.5 h-3.5 bg-[#080712] rounded-full border border-white/5 hidden md:block absolute left-1/2 -translate-x-1/2"></div>
          
          <div className="flex items-center gap-1.5">
            <Signal size={12} className="opacity-90" />
            <Wifi size={12} className="opacity-90" />
            <Battery size={13} className="rotate-90 opacity-90" />
          </div>
        </div>

        {/* Scrollable Frame App Content */}
        <div className="flex-1 flex flex-col overflow-y-auto relative z-10">
          {children}
        </div>

        {/* Android Navigation Gesture Indicator Bar (Bottom) */}
        <div className="h-6 w-full flex items-center justify-center bg-black/10 z-40 select-none pb-1.5">
          <div className="w-[120px] h-[4px] bg-white/30 rounded-full"></div>
        </div>
      </div>
    </div>
  );
}
export default MobileFrame;
