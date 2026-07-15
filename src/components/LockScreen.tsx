import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, Fingerprint, AlertCircle } from 'lucide-react';
import { useReminderStore } from '../store/reminderStore';
import { NativeBiometric } from '@capgo/capacitor-native-biometric';
import { Capacitor } from '@capacitor/core';

interface LockScreenProps {
  onUnlockSuccess: () => void;
}

export default function LockScreen({ onUnlockSuccess }: LockScreenProps) {
  const { settings, unlockVault, resetVault } = useReminderStore();
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [biometricSupported, setBiometricSupported] = useState(false);

  // Lockout states (persisted in LocalStorage)
  const [failedAttempts, setFailedAttempts] = useState(() => {
    return Number(localStorage.getItem('vault_failed_attempts') || '0');
  });
  const [lockoutUntil, setLockoutUntil] = useState(() => {
    return Number(localStorage.getItem('vault_lockout_until') || '0');
  });
  const [cooldownSeconds, setCooldownSeconds] = useState(0);

  // Cooldown countdown effect
  useEffect(() => {
    if (lockoutUntil > Date.now()) {
      const interval = setInterval(() => {
        const remaining = Math.max(0, Math.round((lockoutUntil - Date.now()) / 1000));
        setCooldownSeconds(remaining);
        if (remaining === 0) {
          clearInterval(interval);
        }
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [lockoutUntil]);

  // Check biometric support and trigger if enabled
  useEffect(() => {
    const checkBiometrics = async () => {
      if (!Capacitor.isNativePlatform()) return;
      try {
        const availability = await NativeBiometric.isAvailable();
        if (availability.isAvailable) {
          setBiometricSupported(true);
          if (settings.vaultBiometricEnabled) {
            triggerBiometricAuth();
          }
        }
      } catch (err) {
        console.error('[Biometrics] Error checking availability:', err);
      }
    };
    checkBiometrics();
  }, [settings.vaultBiometricEnabled]);

  const triggerBiometricAuth = async () => {
    if (lockoutUntil > Date.now()) return;
    try {
      // Trigger native fingerprint / Face ID prompt
      await NativeBiometric.verifyIdentity({
        reason: 'Authenticate to unlock your SecureVault',
        title: 'SecureVault Authentication',
        subtitle: 'Verify identity to continue',
        description: 'Verify your fingerprint or face to retrieve your vault keys.',
        negativeButtonText: 'Cancel'
      });

      // Retrieve PIN credentials from Android Keystore / iOS Keychain
      const credentials = await NativeBiometric.getCredentials({
        server: 'SecureVault'
      });

      if (credentials && credentials.password) {
        const success = await unlockVault(credentials.password);
        if (success) {
          setFailedAttempts(0);
          localStorage.setItem('vault_failed_attempts', '0');
          onUnlockSuccess();
        } else {
          setError('Biometric authentication keys out of sync. Please use PIN.');
        }
      } else {
        setError('No secure credentials found. Please use PIN.');
      }
    } catch (err: any) {
      console.warn('[Biometrics] Auth failed or cancelled:', err);
    }
  };

  const handleKeyPress = (num: string) => {
    if (lockoutUntil > Date.now()) return;
    if (pin.length < 4) {
      const newPin = pin + num;
      setPin(newPin);
      setError('');

      if (newPin.length === 4) {
        // Trigger PIN verification
        submitPin(newPin);
      }
    }
  };

  const handleDelete = () => {
    if (pin.length > 0) {
      setPin(pin.slice(0, -1));
    }
  };

  const submitPin = async (enteredPin: string) => {
    const success = await unlockVault(enteredPin);
    if (success) {
      setFailedAttempts(0);
      localStorage.setItem('vault_failed_attempts', '0');
      onUnlockSuccess();
    } else {
      const nextAttempts = failedAttempts + 1;
      setFailedAttempts(nextAttempts);
      localStorage.setItem('vault_failed_attempts', String(nextAttempts));
      setPin('');

      if (nextAttempts >= 5) {
        const lockoutTime = Date.now() + 30000; // 30 seconds lockout
        setLockoutUntil(lockoutTime);
        localStorage.setItem('vault_lockout_until', String(lockoutTime));
        setError('Too many failed attempts. Locked for 30 seconds.');
      } else {
        setError(`Incorrect PIN. ${5 - nextAttempts} attempts remaining.`);
      }
    }
  };

  const handleForgotPin = () => {
    if (window.confirm("WARNING: Forgot PIN? There is no cloud recovery for offline safety. Resetting the vault will WIPE all credentials and secure notes permanently. Do you wish to proceed?")) {
      resetVault().then(() => {
        alert("Vault has been wiped and reset. You can now configure a new PIN.");
        window.location.reload();
      });
    }
  };

  return (
    <div className="absolute inset-0 bg-[#0d0c1e] z-50 flex flex-col justify-between p-6 select-none">
      {/* Background Orbs */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 h-72 bg-purple-500/10 rounded-full blur-3xl" />
      <div className="absolute bottom-10 left-10 w-48 h-48 bg-pink-500/5 rounded-full blur-3xl" />

      {/* Header Info */}
      <div className="flex flex-col items-center mt-12 shrink-0">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-600/30 to-pink-500/30 border border-violet-500/40 flex items-center justify-center shadow-lg shadow-violet-500/15 mb-4">
          <Shield size={32} className="text-violet-400" />
        </div>
        <h2 className="text-xl font-bold font-display text-white">SecureVault Locked</h2>
        <p className="text-xs text-white/50 mt-1">Authentication required to decrypt data</p>
      </div>

      {/* PIN Dots visualization */}
      <div className="flex flex-col items-center justify-center flex-1 my-4">
        {cooldownSeconds > 0 ? (
          <div className="text-center bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-2.5 max-w-xs">
            <p className="text-xs font-semibold text-red-400">Locked Out</p>
            <p className="text-[10px] text-white/50 mt-0.5">Please wait {cooldownSeconds}s before retrying</p>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-4 mb-4">
              {[0, 1, 2, 3].map((index) => (
                <div
                  key={index}
                  className={`w-3.5 h-3.5 rounded-full border transition-all duration-200 ${
                    index < pin.length
                      ? 'bg-violet-400 border-violet-400 shadow-[0_0_8px_rgba(167,139,250,0.5)] scale-110'
                      : 'border-white/20 bg-white/5'
                  }`}
                />
              ))}
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
          </>
        )}
      </div>

      {/* Grid Keypad layout */}
      <div className="w-full max-w-xs mx-auto mb-6 shrink-0">
        <div className="grid grid-cols-3 gap-3.5">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((num) => (
            <motion.button
              whileTap={{ scale: 0.9 }}
              key={num}
              onClick={() => handleKeyPress(num)}
              disabled={cooldownSeconds > 0}
              className="h-14 rounded-xl bg-white/5 border border-white/8 hover:bg-white/8 hover:border-white/12 active:bg-violet-600/10 text-lg font-bold text-white flex items-center justify-center transition-colors outline-none"
            >
              {num}
            </motion.button>
          ))}

          {/* Biometrics Activation / Dummy spacer */}
          {biometricSupported && settings.vaultBiometricEnabled ? (
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={triggerBiometricAuth}
              disabled={cooldownSeconds > 0}
              className="h-14 rounded-xl bg-violet-600/10 border border-violet-500/20 text-violet-400 flex items-center justify-center outline-none"
            >
              <Fingerprint size={22} />
            </motion.button>
          ) : (
            <div className="h-14" />
          )}

          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => handleKeyPress('0')}
            disabled={cooldownSeconds > 0}
            className="h-14 rounded-xl bg-white/5 border border-white/8 text-lg font-bold text-white flex items-center justify-center outline-none"
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

        {/* Forgot PIN / Reset actions */}
        <button
          onClick={handleForgotPin}
          className="w-full text-center text-[10px] text-white/30 hover:text-red-400/50 mt-6 block transition-colors border-t border-white/5 pt-4"
        >
          Forgot master PIN? Reset Vault
        </button>
      </div>
    </div>
  );
}
