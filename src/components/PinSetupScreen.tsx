import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Lock, CheckCircle2, Fingerprint, AlertCircle } from 'lucide-react';
import { useReminderStore } from '../store/reminderStore';
import { NativeBiometric, AccessControl } from '@capgo/capacitor-native-biometric';
import { Capacitor } from '@capacitor/core';

interface PinSetupScreenProps {
  onSetupSuccess: () => void;
}

export default function PinSetupScreen({ onSetupSuccess }: PinSetupScreenProps) {
  const { setupVaultPin, updateSettings } = useReminderStore();
  const [step, setStep] = useState<'enter' | 'confirm' | 'biometrics'>('enter');
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [error, setError] = useState('');
  const [biometricSupported, setBiometricSupported] = useState(false);

  // Check biometric support on mount
  useEffect(() => {
    const checkBiometrics = async () => {
      if (!Capacitor.isNativePlatform()) return;
      try {
        const availability = await NativeBiometric.isAvailable();
        if (availability.isAvailable) {
          setBiometricSupported(true);
        }
      } catch (err) {
        console.error('[Biometrics] Support check error:', err);
      }
    };
    checkBiometrics();
  }, []);

  const handleKeyPress = (num: string) => {
    setError('');
    if (step === 'enter') {
      if (pin.length < 4) {
        const next = pin + num;
        setPin(next);
        if (next.length === 4) {
          setTimeout(() => setStep('confirm'), 250);
        }
      }
    } else if (step === 'confirm') {
      if (confirmPin.length < 4) {
        const next = confirmPin + num;
        setConfirmPin(next);
        if (next.length === 4) {
          setTimeout(() => verifyAndSubmit(next), 250);
        }
      }
    }
  };

  const handleDelete = () => {
    if (step === 'enter' && pin.length > 0) {
      setPin(pin.slice(0, -1));
    } else if (step === 'confirm' && confirmPin.length > 0) {
      setConfirmPin(confirmPin.slice(0, -1));
    }
  };

  const verifyAndSubmit = async (enteredConfirm: string) => {
    if (pin !== enteredConfirm) {
      setError('PINs do not match. Please try again.');
      setConfirmPin('');
      setStep('enter');
      setPin('');
      return;
    }

    // Save PIN hash in store
    await setupVaultPin(pin);

    // If biometrics supported, proceed to biometrics query
    if (biometricSupported) {
      setStep('biometrics');
    } else {
      // Complete setup
      onSetupSuccess();
    }
  };

  const enableBiometrics = async () => {
    try {
      // Store credentials securely in keystore
      await NativeBiometric.setCredentials({
        username: 'vault',
        password: pin,
        server: 'SecureVault',
        accessControl: AccessControl.BIOMETRY_ANY
      });
      // Save setting
      updateSettings({ vaultBiometricEnabled: true });
    } catch (err) {
      console.error('[Biometrics] Error storing credentials:', err);
    } finally {
      onSetupSuccess();
    }
  };

  const skipBiometrics = () => {
    updateSettings({ vaultBiometricEnabled: false });
    onSetupSuccess();
  };

  return (
    <div className="absolute inset-0 bg-[#0d0c1e] z-50 flex flex-col justify-between p-6 select-none">
      {/* Background decoration */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 h-72 bg-violet-500/10 rounded-full blur-3xl" />

      {step !== 'biometrics' ? (
        <>
          {/* Header */}
          <div className="flex flex-col items-center mt-12 shrink-0">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-600/30 to-pink-500/30 border border-violet-500/40 flex items-center justify-center mb-4">
              <Lock size={28} className="text-violet-400" />
            </div>
            <h2 className="text-xl font-bold font-display text-white">
              {step === 'enter' ? 'Create Master PIN' : 'Confirm Master PIN'}
            </h2>
            <p className="text-xs text-white/50 mt-1 max-w-xs text-center leading-relaxed">
              {step === 'enter' 
                ? 'Set a 4-digit PIN fallback to encrypt and secure your vault.' 
                : 'Enter your 4-digit PIN again to confirm.'}
            </p>
          </div>

          {/* Verification Dots */}
          <div className="flex flex-col items-center justify-center flex-1 my-4">
            <div className="flex items-center gap-4 mb-4">
              {[0, 1, 2, 3].map((index) => {
                const target = step === 'enter' ? pin : confirmPin;
                return (
                  <div
                    key={index}
                    className={`w-3.5 h-3.5 rounded-full border transition-all duration-200 ${
                      index < target.length
                        ? 'bg-violet-400 border-violet-400 shadow-[0_0_8px_rgba(167,139,250,0.5)] scale-110'
                        : 'border-white/20 bg-white/5'
                    }`}
                  />
                );
              })}
            </div>
            
            <AnimatePresence mode="wait">
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -5 }}
                  className="flex items-center gap-1.5 text-red-400 text-[10px] font-medium"
                >
                  <AlertCircle size={11} />
                  <span>{error}</span>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Numeric Keypad */}
          <div className="w-full max-w-xs mx-auto mb-6 shrink-0">
            <div className="grid grid-cols-3 gap-3.5">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((num) => (
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  key={num}
                  onClick={() => handleKeyPress(num)}
                  className="h-14 rounded-xl bg-white/5 border border-white/8 text-lg font-bold text-white flex items-center justify-center outline-none hover:bg-white/8 active:bg-violet-600/10 transition-colors"
                >
                  {num}
                </motion.button>
              ))}
              <div className="h-14" />
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={() => handleKeyPress('0')}
                className="h-14 rounded-xl bg-white/5 border border-white/8 text-lg font-bold text-white flex items-center justify-center outline-none hover:bg-white/8"
              >
                0
              </motion.button>
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={handleDelete}
                className="h-14 rounded-xl bg-white/5 border border-white/8 text-xs font-semibold text-white/60 flex items-center justify-center outline-none"
              >
                Delete
              </motion.button>
            </div>
          </div>
        </>
      ) : (
        /* Biometric Setup Step */
        <div className="flex-1 flex flex-col justify-between items-center py-10 w-full text-center">
          <div className="flex-1 flex flex-col justify-center items-center px-4">
            <div className="w-20 h-20 rounded-full bg-violet-600/15 border border-violet-500/30 flex items-center justify-center mb-6 shadow-[0_0_24px_rgba(139,92,246,0.2)] animate-pulse">
              <Fingerprint size={42} className="text-violet-400" />
            </div>
            <h3 className="text-lg font-bold text-white font-display mb-2">Enable Fingerprint / Face ID?</h3>
            <p className="text-xs text-white/50 leading-relaxed max-w-xs">
              Would you like to use your device's biometric sensors to unlock the SecureVault instantly without typing your PIN?
            </p>
          </div>

          <div className="w-full flex flex-col gap-3 max-w-xs mt-auto">
            <motion.button
              whileTap={{ scale: 0.96 }}
              onClick={enableBiometrics}
              className="h-12 w-full rounded-2xl bg-gradient-to-r from-violet-600 to-pink-600 hover:from-violet-500 hover:to-pink-500 text-white font-bold text-sm shadow-lg shadow-violet-900/35 flex items-center justify-center gap-2 outline-none"
            >
              <CheckCircle2 size={16} />
              <span>Enable Biometrics</span>
            </motion.button>

            <motion.button
              whileTap={{ scale: 0.96 }}
              onClick={skipBiometrics}
              className="h-12 w-full rounded-2xl bg-white/5 border border-white/10 text-white/70 font-semibold text-sm hover:bg-white/8 active:bg-white/5 outline-none"
            >
              Skip, use PIN only
            </motion.button>
          </div>
        </div>
      )}
    </div>
  );
}
