// Premium Audio Synthesizer using Web Audio API
// This allows high-quality sound alerts offline without external file dependancies.

let audioCtx: AudioContext | null = null;
let alarmInterval: number | null = null;
let activeSourceNodes: AudioNode[] = [];

function getAudioContext(): AudioContext {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

// 1. ZEN TONE (Bell/Chime with rich harmonics)
function playZenSound(ctx: AudioContext, time: number) {
  const rootFreq = 440; // A4
  const harmonics = [1, 2, 3, 4.2, 5.4];
  const gains = [0.5, 0.25, 0.12, 0.06, 0.03];

  harmonics.forEach((ratio, index) => {
    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(rootFreq * ratio, time);

    gainNode.gain.setValueAtTime(gains[index], time);
    // Exponential decay to simulate physical bells
    gainNode.gain.exponentialRampToValueAtTime(0.0001, time + 2.5);

    osc.connect(gainNode);
    gainNode.connect(ctx.destination);

    osc.start(time);
    osc.stop(time + 2.6);

    activeSourceNodes.push(osc);
  });
}

// 2. COSMIC SWEEP (Retro-futuristic spaced synth sweep)
function playCosmicSound(ctx: AudioContext, time: number) {
  const osc = ctx.createOscillator();
  const filter = ctx.createBiquadFilter();
  const gainNode = ctx.createGain();

  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(100, time);
  osc.frequency.exponentialRampToValueAtTime(880, time + 0.8);

  filter.type = 'lowpass';
  filter.Q.setValueAtTime(10, time);
  filter.frequency.setValueAtTime(200, time);
  filter.frequency.exponentialRampToValueAtTime(2000, time + 0.8);

  gainNode.gain.setValueAtTime(0.2, time);
  gainNode.gain.exponentialRampToValueAtTime(0.0001, time + 1.2);

  osc.connect(filter);
  filter.connect(gainNode);
  gainNode.connect(ctx.destination);

  osc.start(time);
  osc.stop(time + 1.3);

  activeSourceNodes.push(osc);
}

// 3. DEFAULT CHIME (Clean digital double alert)
function playDefaultSound(ctx: AudioContext, time: number) {
  // Beep 1
  const osc1 = ctx.createOscillator();
  const gain1 = ctx.createGain();
  osc1.type = 'sine';
  osc1.frequency.setValueAtTime(880, time);
  gain1.gain.setValueAtTime(0.3, time);
  gain1.gain.exponentialRampToValueAtTime(0.0001, time + 0.15);
  osc1.connect(gain1);
  gain1.connect(ctx.destination);
  osc1.start(time);
  osc1.stop(time + 0.2);
  activeSourceNodes.push(osc1);

  // Beep 2
  const osc2 = ctx.createOscillator();
  const gain2 = ctx.createGain();
  osc2.type = 'sine';
  osc2.frequency.setValueAtTime(1046.5, time + 0.15); // C6
  gain2.gain.setValueAtTime(0.3, time + 0.15);
  gain2.gain.exponentialRampToValueAtTime(0.0001, time + 0.35);
  osc2.connect(gain2);
  gain2.connect(ctx.destination);
  osc2.start(time + 0.15);
  osc2.stop(time + 0.4);
  activeSourceNodes.push(osc2);
}

export function playAmbientAlert(tone: string = 'Default Tone') {
  try {
    const ctx = getAudioContext();
    // Stop any existing loop first
    stopAmbientAlert();

    const triggerAlert = () => {
      const now = ctx.currentTime;
      if (tone === 'Zen Tone') {
        playZenSound(ctx, now);
      } else if (tone === 'Cosmic Alarm') {
        playCosmicSound(ctx, now);
      } else {
        playDefaultSound(ctx, now);
      }
    };

    // Trigger immediately
    triggerAlert();

    // Loop the alarm sound every 3 seconds
    alarmInterval = window.setInterval(() => {
      triggerAlert();
    }, 3000);
  } catch (error) {
    console.error('Failed to trigger audio synth alarm:', error);
  }
}

export function stopAmbientAlert() {
  if (alarmInterval) {
    clearInterval(alarmInterval);
    alarmInterval = null;
  }
  // Try to stop any actively playing oscillators
  activeSourceNodes.forEach((node) => {
    try {
      (node as any).stop();
    } catch (e) {
      // Ignore nodes that already stopped naturally
    }
  });
  activeSourceNodes = [];
}
