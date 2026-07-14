import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Grid, Calendar, Settings as SettingsIcon,
  Download, Upload, Shield, Clock, Database,
  CheckCircle2, AlertTriangle, Loader2, HardDrive,
  RefreshCw, Trash2, ChevronRight, Info
} from 'lucide-react';
import { useReminderStore } from '../store/reminderStore';
import { dbGetBackupMeta, dbDeleteBackupMeta, type BackupMeta } from '../store/db';
import {
  downloadBackup, restoreFromFile, getStorageInfo,
  formatBytes, BACKUP_VERSION
} from '../utils/backup';

type Status = { type: 'idle' | 'loading' | 'success' | 'error'; message: string };

export function BackupView({ onAddClick }: { onAddClick: () => void }) {
  const { currentScreen, setScreen } = useReminderStore();

  const [backupMetas, setBackupMetas] = useState<BackupMeta[]>([]);
  const [storageInfo, setStorageInfo] = useState({ reminderCount: 0, storageUsedBytes: 0 });
  const [status, setStatus] = useState<Status>({ type: 'idle', message: '' });
  const [restoreStatus, setRestoreStatus] = useState<Status>({ type: 'idle', message: '' });
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const [metas, info] = await Promise.all([
      dbGetBackupMeta(),
      getStorageInfo(),
    ]);
    setBackupMetas(metas);
    setStorageInfo(info);
  };

  const handleCreateBackup = async () => {
    setStatus({ type: 'loading', message: 'Encrypting & compressing backup...' });
    try {
      const { size, date } = await downloadBackup();
      await loadData();
      setStatus({
        type: 'success',
        message: `✓ Backup saved! ${formatBytes(size)} — ${date}`,
      });
    } catch (err) {
      setStatus({ type: 'error', message: `Failed to create backup: ${err instanceof Error ? err.message : 'Unknown error'}` });
    }
    setTimeout(() => setStatus({ type: 'idle', message: '' }), 4000);
  };

  const handleRestoreFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';

    setRestoreStatus({ type: 'loading', message: 'Validating & decrypting backup...' });
    try {
      const result = await restoreFromFile(file);
      if (result.success) {
        setRestoreStatus({ type: 'success', message: result.message });
        await loadData();
        // Reload app after 2 seconds to hydrate restored state
        setTimeout(() => window.location.reload(), 2000);
      } else {
        setRestoreStatus({ type: 'error', message: result.message });
      }
    } catch (err) {
      setRestoreStatus({ type: 'error', message: `Restore error: ${err instanceof Error ? err.message : 'Unknown error'}` });
    }
  };

  const handleDeleteBackupMeta = async (id: number) => {
    await dbDeleteBackupMeta(id);
    await loadData();
    setShowDeleteConfirm(null);
  };

  const latestBackup = backupMetas[0];
  const hasBackup = backupMetas.length > 0;

  return (
    <div className="flex-1 flex flex-col px-4 pt-safe justify-between select-none relative overflow-hidden min-h-0">
      <div className="flex-1 flex flex-col overflow-y-auto pr-1">

        {/* Header */}
        <div className="flex items-center gap-3 mb-5 z-20 shrink-0">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-600 to-pink-500 flex items-center justify-center shadow-[0_0_15px_rgba(139,92,246,0.4)]">
            <Database size={18} className="text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold font-display text-white leading-tight">Backup & Restore</h2>
            <p className="text-[9px] text-white/40 font-medium tracking-wide">All data stored securely on-device</p>
          </div>
        </div>

        {/* Backup Warning if no backup exists */}
        {!hasBackup && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-5 shrink-0 glass-panel rounded-2xl p-4 border border-amber-500/30 bg-amber-500/5"
          >
            <div className="flex items-start gap-3">
              <AlertTriangle size={16} className="text-amber-400 mt-0.5 shrink-0" />
              <div>
                <p className="text-xs font-bold text-amber-300">No Backup Found</p>
                <p className="text-[9px] text-amber-200/60 mt-1 leading-relaxed">
                  Your reminder data is stored only on this device. Before clearing app data or uninstalling, please create a backup to avoid data loss.
                </p>
              </div>
            </div>
          </motion.div>
        )}

        {/* Backup Status Card */}
        <div className="glass-panel rounded-2xl p-5 mb-5 shrink-0 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-violet-600/10 rounded-full blur-3xl" />
          <p className="text-[9px] font-bold text-white/40 tracking-wider uppercase mb-4">Backup Status</p>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white/5 rounded-xl p-3 border border-white/8">
              <div className="flex items-center gap-1.5 mb-1">
                <Clock size={11} className="text-violet-400" />
                <span className="text-[9px] text-white/40 font-semibold uppercase tracking-wider">Last Backup</span>
              </div>
              <p className="text-xs font-bold text-white">
                {latestBackup
                  ? new Date(latestBackup.createdAt).toLocaleDateString()
                  : 'Never'}
              </p>
            </div>
            <div className="bg-white/5 rounded-xl p-3 border border-white/8">
              <div className="flex items-center gap-1.5 mb-1">
                <HardDrive size={11} className="text-pink-400" />
                <span className="text-[9px] text-white/40 font-semibold uppercase tracking-wider">Storage Used</span>
              </div>
              <p className="text-xs font-bold text-white">{formatBytes(storageInfo.storageUsedBytes)}</p>
            </div>
            <div className="bg-white/5 rounded-xl p-3 border border-white/8">
              <div className="flex items-center gap-1.5 mb-1">
                <Database size={11} className="text-emerald-400" />
                <span className="text-[9px] text-white/40 font-semibold uppercase tracking-wider">Reminders</span>
              </div>
              <p className="text-xs font-bold text-white">{storageInfo.reminderCount}</p>
            </div>
            <div className="bg-white/5 rounded-xl p-3 border border-white/8">
              <div className="flex items-center gap-1.5 mb-1">
                <Shield size={11} className="text-cyan-400" />
                <span className="text-[9px] text-white/40 font-semibold uppercase tracking-wider">Backup v</span>
              </div>
              <p className="text-xs font-bold text-white">v{BACKUP_VERSION}</p>
            </div>
          </div>
        </div>

        {/* Create Backup */}
        <h4 className="text-[9px] font-bold text-white/40 tracking-wider uppercase mb-2 ml-1 shrink-0">Create Backup</h4>
        <div className="glass-panel rounded-2xl p-4 mb-5 shrink-0">
          <div className="flex items-start gap-3 mb-4">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-600/30 to-pink-600/30 border border-violet-500/30 flex items-center justify-center shrink-0">
              <Shield size={16} className="text-violet-300" />
            </div>
            <div>
              <p className="text-xs font-bold text-white/90">AES-256 Encrypted</p>
              <p className="text-[9px] text-white/40 mt-0.5 leading-relaxed">
                Encrypted backup file (.reminder) containing all your reminders, settings, and profile. Includes compression.
              </p>
            </div>
          </div>

          <AnimatePresence>
            {status.type !== 'idle' && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className={`rounded-xl p-3 mb-3 text-[10px] font-semibold flex items-center gap-2 ${
                  status.type === 'loading' ? 'bg-violet-500/15 text-violet-300 border border-violet-500/20' :
                  status.type === 'success' ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/20' :
                  'bg-red-500/15 text-red-300 border border-red-500/20'
                }`}
              >
                {status.type === 'loading' && <Loader2 size={12} className="animate-spin shrink-0" />}
                {status.type === 'success' && <CheckCircle2 size={12} className="shrink-0" />}
                {status.type === 'error' && <AlertTriangle size={12} className="shrink-0" />}
                {status.message}
              </motion.div>
            )}
          </AnimatePresence>

          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={handleCreateBackup}
            disabled={status.type === 'loading'}
            className="w-full h-11 rounded-xl bg-gradient-to-r from-violet-600 to-pink-600 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-[0_4px_20px_rgba(139,92,246,0.35)] border border-violet-400/20 disabled:opacity-60 active:scale-95 transition-transform"
          >
            {status.type === 'loading' ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Download size={14} />
            )}
            {status.type === 'loading' ? 'Creating Backup...' : 'Create & Download Backup'}
          </motion.button>
        </div>

        {/* Restore Backup */}
        <h4 className="text-[9px] font-bold text-white/40 tracking-wider uppercase mb-2 ml-1 shrink-0">Restore Backup</h4>
        <div className="glass-panel rounded-2xl p-4 mb-5 shrink-0">
          <div className="flex items-start gap-3 mb-4">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-600/30 to-cyan-600/30 border border-emerald-500/30 flex items-center justify-center shrink-0">
              <Upload size={16} className="text-emerald-300" />
            </div>
            <div>
              <p className="text-xs font-bold text-white/90">Import from File</p>
              <p className="text-[9px] text-white/40 mt-0.5 leading-relaxed">
                Select a .reminder backup file. App will validate, decrypt, and restore all your data automatically.
              </p>
            </div>
          </div>

          <AnimatePresence>
            {restoreStatus.type !== 'idle' && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className={`rounded-xl p-3 mb-3 text-[10px] font-semibold flex items-center gap-2 ${
                  restoreStatus.type === 'loading' ? 'bg-violet-500/15 text-violet-300 border border-violet-500/20' :
                  restoreStatus.type === 'success' ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/20' :
                  'bg-red-500/15 text-red-300 border border-red-500/20'
                }`}
              >
                {restoreStatus.type === 'loading' && <Loader2 size={12} className="animate-spin shrink-0" />}
                {restoreStatus.type === 'success' && <CheckCircle2 size={12} className="shrink-0" />}
                {restoreStatus.type === 'error' && <AlertTriangle size={12} className="shrink-0" />}
                {restoreStatus.message}
              </motion.div>
            )}
          </AnimatePresence>

          <input
            ref={fileInputRef}
            type="file"
            accept=".reminder,.zip,.json"
            className="hidden"
            onChange={handleRestoreFile}
          />
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={() => fileInputRef.current?.click()}
            disabled={restoreStatus.type === 'loading'}
            className="w-full h-11 rounded-xl glass-panel border border-emerald-500/30 bg-emerald-500/10 text-emerald-300 font-bold text-xs flex items-center justify-center gap-2 disabled:opacity-60 active:scale-95 transition-transform"
          >
            {restoreStatus.type === 'loading' ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Upload size={14} />
            )}
            {restoreStatus.type === 'loading' ? 'Restoring...' : 'Select Backup File'}
          </motion.button>

          <div className="mt-3 flex items-start gap-2 bg-white/3 rounded-lg p-2">
            <Info size={10} className="text-white/30 mt-0.5 shrink-0" />
            <p className="text-[9px] text-white/30 leading-relaxed">
              After restore, the app will automatically reload to apply all changes.
            </p>
          </div>
        </div>

        {/* Backup History */}
        {backupMetas.length > 0 && (
          <>
            <h4 className="text-[9px] font-bold text-white/40 tracking-wider uppercase mb-2 ml-1 shrink-0">Backup History (Latest 5)</h4>
            <div className="flex flex-col gap-2 mb-5 shrink-0">
              <AnimatePresence>
                {backupMetas.map((meta, i) => (
                  <motion.div
                    key={meta.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ delay: i * 0.04 }}
                    className="glass-panel rounded-xl p-3 flex items-center gap-3"
                  >
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                      i === 0 ? 'bg-violet-600/20 border border-violet-500/30' : 'bg-white/5 border border-white/10'
                    }`}>
                      <Database size={14} className={i === 0 ? 'text-violet-400' : 'text-white/40'} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="text-[11px] font-bold text-white/90 truncate">{meta.label}</p>
                        {i === 0 && <span className="text-[7px] font-bold bg-violet-500/20 text-violet-300 px-1.5 py-0.5 rounded-full border border-violet-500/30 shrink-0">LATEST</span>}
                      </div>
                      <p className="text-[9px] text-white/40 mt-0.5">
                        {meta.reminderCount} reminders · {formatBytes(meta.size)}
                      </p>
                    </div>
                    {showDeleteConfirm === meta.id ? (
                      <div className="flex gap-1.5">
                        <button
                          onClick={() => handleDeleteBackupMeta(meta.id!)}
                          className="text-[9px] bg-red-500/20 text-red-400 border border-red-500/30 px-2 py-1 rounded-lg font-bold"
                        >
                          Delete
                        </button>
                        <button
                          onClick={() => setShowDeleteConfirm(null)}
                          className="text-[9px] bg-white/5 text-white/40 border border-white/10 px-2 py-1 rounded-lg font-bold"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setShowDeleteConfirm(meta.id!)}
                        className="p-1.5 rounded-lg bg-white/5 border border-white/10 text-white/30 hover:text-red-400 transition-colors"
                      >
                        <Trash2 size={11} />
                      </button>
                    )}
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </>
        )}

        {/* New Device Restore Guide */}
        <h4 className="text-[9px] font-bold text-white/40 tracking-wider uppercase mb-2 ml-1 shrink-0">New Device Guide</h4>
        <div className="glass-panel rounded-2xl p-4 mb-5 shrink-0">
          <div className="flex flex-col gap-2.5">
            {[
              { step: '1', label: 'Create Backup on this device', icon: Download, color: 'text-violet-400' },
              { step: '2', label: 'Share file via WhatsApp, Email, Drive, Bluetooth', icon: RefreshCw, color: 'text-pink-400' },
              { step: '3', label: 'Install app on new device', icon: HardDrive, color: 'text-cyan-400' },
              { step: '4', label: 'Import backup — data fully restored!', icon: CheckCircle2, color: 'text-emerald-400' },
            ].map(({ step, label, icon: Icon, color }) => (
              <div key={step} className="flex items-center gap-3">
                <div className="w-6 h-6 rounded-full bg-white/8 border border-white/10 flex items-center justify-center shrink-0">
                  <span className="text-[9px] font-bold text-white/50">{step}</span>
                </div>
                <Icon size={13} className={`${color} shrink-0`} />
                <p className="text-[10px] text-white/70 font-medium">{label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Security Info */}
        <div className="glass-panel rounded-2xl p-3.5 mb-5 shrink-0 border border-cyan-500/15 bg-cyan-500/5">
          <div className="flex items-start gap-2.5">
            <Shield size={14} className="text-cyan-400 mt-0.5 shrink-0" />
            <div>
              <p className="text-[10px] font-bold text-cyan-300 mb-1">Security</p>
              <p className="text-[9px] text-white/40 leading-relaxed">
                All backups are encrypted with AES-256-GCM using a device-bound key before export. No data is sent to any server.
              </p>
            </div>
          </div>
        </div>

      </div>

      {/* Bottom Navigation */}
      <div className="w-full pb-4 shrink-0">
        <div className="glass-panel-dark rounded-2xl h-14 px-4 flex items-center justify-between z-40 relative">
          <button onClick={() => setScreen('dashboard')} className={`flex flex-col items-center gap-0.5 justify-center flex-1 py-1 ${currentScreen === 'dashboard' ? 'text-violet-400' : 'text-white/40 hover:text-white/70'}`}>
            <Grid size={18} />
            <span className="text-[8px] font-bold uppercase tracking-wider">Home</span>
          </button>
          <button onClick={() => setScreen('calendar')} className={`flex flex-col items-center gap-0.5 justify-center flex-1 py-1 ${currentScreen === 'calendar' ? 'text-violet-400' : 'text-white/40 hover:text-white/70'}`}>
            <Calendar size={18} />
            <span className="text-[8px] font-bold uppercase tracking-wider">Calendar</span>
          </button>
          <div className="relative -top-4 px-2">
            <button onClick={onAddClick} className="w-12 h-12 rounded-full glass-button-primary flex items-center justify-center text-white shadow-lg shadow-purple-500/40 border border-white/25 focus:outline-none">
              <ChevronRight size={24} className="rotate-90" />
            </button>
          </div>
          <button onClick={() => setScreen('categories')} className={`flex flex-col items-center gap-0.5 justify-center flex-1 py-1 ${currentScreen === 'categories' ? 'text-violet-400' : 'text-white/40 hover:text-white/70'}`}>
            <Grid size={18} className="rotate-45" />
            <span className="text-[8px] font-bold uppercase tracking-wider">Categories</span>
          </button>
          <button onClick={() => setScreen('settings')} className={`flex flex-col items-center gap-0.5 justify-center flex-1 py-1 ${currentScreen === 'settings' ? 'text-violet-400' : 'text-white/40 hover:text-white/70'}`}>
            <SettingsIcon size={18} />
            <span className="text-[8px] font-bold uppercase tracking-wider">Settings</span>
          </button>
        </div>
      </div>
    </div>
  );
}

export default BackupView;
