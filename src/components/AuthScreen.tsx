import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, Lock, Eye, EyeOff, KeyRound } from 'lucide-react';
import { useReminderStore } from '../store/reminderStore';

export function AuthScreen() {
  const { login } = useReminderStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState<string | null>(null);
  
  // Validation states
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');

  // Forgot Password state
  const [forgotOpen, setForgotOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotSent, setForgotSent] = useState(false);

  const validateEmail = (val: string) => {
    if (!val) {
      return 'Email is required';
    }
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!regex.test(val)) {
      return 'Invalid email format';
    }
    return '';
  };

  const validatePassword = (val: string) => {
    if (!val) {
      return 'Password is required';
    }
    if (val.length < 6) {
      return 'Password must be at least 6 characters';
    }
    return '';
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const emailErr = validateEmail(email);
    const passErr = validatePassword(password);

    setEmailError(emailErr);
    setPasswordError(passErr);

    if (emailErr || passErr) return;

    setLoading('email');
    setTimeout(() => {
      setLoading(null);
      // Auto fill name based on email prefix
      const username = email.split('@')[0];
      const displayName = username.charAt(0).toUpperCase() + username.slice(1);
      login(email, displayName);
    }, 1500);
  };

  const handleGoogleSignIn = () => {
    setLoading('google');
    setTimeout(() => {
      setLoading(null);
      login('rohitshinde@gmail.com', 'Rohit Shinde');
    }, 1200);
  };

  const handleForgotSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const err = validateEmail(forgotEmail);
    if (err) return;
    setLoading('forgot');
    setTimeout(() => {
      setLoading(null);
      setForgotSent(true);
    }, 1000);
  };

  return (
    <div className="flex-1 flex flex-col justify-center px-6 py-10 relative overflow-hidden">
      {/* Decorative floating shapes inside auth page */}
      <div className="absolute top-10 left-10 w-24 h-24 bg-purple-500/10 rounded-full blur-xl animate-float"></div>
      <div className="absolute bottom-20 right-10 w-32 h-32 bg-pink-500/10 rounded-full blur-xl animate-float" style={{ animationDelay: '2s' }}></div>

      {/* Main Glass Panel Card */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, type: 'spring' }}
        className="glass-panel rounded-3xl p-6 relative flex flex-col justify-center overflow-hidden"
      >
        {/* Decorative corner light highlights */}
        <div className="absolute top-0 left-0 w-1/2 h-[1px] bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>
        <div className="absolute bottom-0 right-0 w-1/2 h-[1px] bg-gradient-to-r from-transparent via-white/10 to-transparent"></div>

        {/* Branding Title */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 mb-3 relative flex items-center justify-center">
            <img src="/logo.png" alt="Lumina Logo" className="w-full h-full object-contain filter drop-shadow-[0_0_10px_rgba(139,92,246,0.3)]" />
          </div>
          <h1 className="text-2xl font-bold font-display text-transparent bg-clip-text bg-gradient-to-r from-white via-white/90 to-purple-200">
            Welcome Back 👋
          </h1>
          <p className="text-xs text-white/50 mt-1">Sign in to continue tracking reminders</p>
        </div>

        {/* Google OAuth Button */}
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleGoogleSignIn}
          disabled={loading !== null}
          className="w-full h-12 rounded-xl border border-white/15 bg-white/5 flex items-center justify-center gap-3 text-sm font-semibold text-white/90 hover:bg-white/10 hover:border-white/20 active:bg-white/5 transition duration-200 disabled:opacity-50"
        >
          {loading === 'google' ? (
            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
          ) : (
            <>
              {/* Custom SVG Google Icon */}
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path
                  fill="#EA4335"
                  d="M12.24 10.285V14.4h6.887c-.648 2.41-2.519 4.114-5.136 4.114A5.99 5.99 0 0 1 7.99 12.5a5.99 5.99 0 0 1 6.002-6.014c1.616 0 3.084.62 4.195 1.636l3.079-3.078C19.345 3.208 15.932 2 13.992 2a10.5 10.5 0 0 0-10.5 10.5 10.5 10.5 0 0 0 10.5 10.5c5.78 0 10.514-4.17 10.514-10.5 0-.686-.06-1.354-.18-2.215H12.24Z"
                />
              </svg>
              <span>Continue with Google</span>
            </>
          )}
        </motion.button>

        {/* Separator */}
        <div className="flex items-center my-6">
          <div className="flex-1 h-[1px] bg-white/10"></div>
          <span className="text-[10px] text-white/40 uppercase tracking-widest px-3">or</span>
          <div className="flex-1 h-[1px] bg-white/10"></div>
        </div>

        {/* Form Login */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {/* Email input */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-semibold text-white/60 tracking-wider uppercase ml-1">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/40" size={16} />
              <input
                type="text"
                placeholder="yourmail@gmail.com"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setEmailError('');
                }}
                className={`w-full h-11 pl-10 pr-4 glass-input text-sm ${emailError ? 'border-red-500/50 focus:border-red-500' : ''}`}
              />
            </div>
            {emailError && <span className="text-[10px] text-red-400 font-medium ml-1">{emailError}</span>}
          </div>

          {/* Password input */}
          <div className="flex flex-col gap-1.5">
            <div className="flex justify-between items-center px-1">
              <label className="text-[11px] font-semibold text-white/60 tracking-wider uppercase">Password</label>
              <button
                type="button"
                onClick={() => setForgotOpen(true)}
                className="text-[10px] text-purple-400 hover:text-purple-300 font-semibold focus:outline-none"
              >
                Forgot Password?
              </button>
            </div>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/40" size={16} />
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••••••"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setPasswordError('');
                }}
                className={`w-full h-11 pl-10 pr-11 glass-input text-sm ${passwordError ? 'border-red-500/50 focus:border-red-500' : ''}`}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {passwordError && <span className="text-[10px] text-red-400 font-medium ml-1">{passwordError}</span>}
          </div>

          {/* Submit Button */}
          <motion.button
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.98 }}
            type="submit"
            disabled={loading !== null}
            className="w-full h-12 rounded-xl mt-4 font-semibold text-sm glass-button-primary text-white flex items-center justify-center gap-2"
          >
            {loading === 'email' ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
            ) : (
              <span>Sign In</span>
            )}
          </motion.button>
        </form>

        {/* Footer info */}
        <p className="text-[10px] text-center text-white/40 mt-6">
          Don't have an account? <span className="text-purple-400 hover:underline cursor-pointer font-bold">Sign Up</span>
        </p>
      </motion.div>

      {/* Forgot Password Overlay Modal */}
      <AnimatePresence>
        {forgotOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-md z-50 flex items-end justify-center"
          >
            {/* Click outside to close */}
            <div className="absolute inset-0" onClick={() => { setForgotOpen(false); setForgotSent(false); setForgotEmail(''); }} />

            <motion.div
              initial={{ y: 200 }}
              animate={{ y: 0 }}
              exit={{ y: 200 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="w-full glass-panel-dark rounded-t-[32px] p-6 relative z-10"
            >
              {/* Drag line */}
              <div className="w-12 h-1 bg-white/20 rounded-full mx-auto mb-6"></div>

              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center text-purple-300">
                  <KeyRound size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-lg font-display">Forgot Password</h3>
                  <p className="text-xs text-white/50">Enter email to receive reset link</p>
                </div>
              </div>

              {forgotSent ? (
                <div className="py-6 text-center">
                  <div className="w-12 h-12 bg-green-500/20 border border-green-500/30 text-green-400 rounded-full flex items-center justify-center mx-auto mb-3 animate-bounce">
                    ✓
                  </div>
                  <p className="text-sm font-semibold text-white/90">Reset Instructions Sent!</p>
                  <p className="text-xs text-white/40 mt-1 px-4">
                    If this email exists in our records, you will receive code instructions shortly.
                  </p>
                  <button
                    onClick={() => { setForgotOpen(false); setForgotSent(false); setForgotEmail(''); }}
                    className="mt-6 w-full h-11 rounded-xl glass-button-secondary font-semibold text-sm text-white"
                  >
                    Back to Sign In
                  </button>
                </div>
              ) : (
                <form onSubmit={handleForgotSubmit} className="flex flex-col gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[11px] font-semibold text-white/60 tracking-wider uppercase ml-1">Email Address</label>
                    <div className="relative">
                      <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/40" size={16} />
                      <input
                        type="email"
                        placeholder="yourmail@gmail.com"
                        value={forgotEmail}
                        onChange={(e) => setForgotEmail(e.target.value)}
                        required
                        className="w-full h-11 pl-10 pr-4 glass-input text-sm"
                      />
                    </div>
                  </div>

                  <div className="flex gap-3 mt-4">
                    <button
                      type="button"
                      onClick={() => { setForgotOpen(false); setForgotEmail(''); }}
                      className="flex-1 h-11 rounded-xl glass-button-secondary font-semibold text-sm text-white/80"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={loading !== null}
                      className="flex-1 h-11 rounded-xl glass-button-primary font-semibold text-sm text-white flex items-center justify-center"
                    >
                      {loading === 'forgot' ? (
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      ) : (
                        <span>Send Link</span>
                      )}
                    </button>
                  </div>
                </form>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
export default AuthScreen;
