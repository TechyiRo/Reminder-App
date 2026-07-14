/**
 * Backup & Restore Utility for Lumina Reminder App
 * - AES-256-GCM encryption using Web Crypto API
 * - ZIP compression using JSZip
 * - Full data export/import including reminders, user, settings
 */
import JSZip from 'jszip';
import { dbGetAllReminders, dbGetUser, dbGetSettings, dbSaveReminder, dbSaveUser, dbSaveSettings, dbSaveBackupMeta } from '../store/db';
import type { Reminder, User, AppSettings } from '../store/reminderStore';

export const BACKUP_VERSION = 2;
export const BACKUP_MAGIC = 'LUMINA_BACKUP';

export interface BackupPayload {
  magic: string;
  version: number;
  createdAt: string;
  profile: User | null;
  reminders: Reminder[];
  settings: AppSettings | null;
  statistics: {
    total: number;
    completed: number;
    pending: number;
  };
}

// ─── AES-256-GCM Helpers ────────────────────────────────────────────────────────

const PASS_SALT = 'LuminaReminderSaltV2';

async function deriveKey(password: string): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    enc.encode(password + PASS_SALT),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );
  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: enc.encode(PASS_SALT),
      iterations: 100000,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

async function encrypt(data: string, password: string): Promise<{ iv: string; data: string }> {
  const key = await deriveKey(password);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const enc = new TextEncoder();
  const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, enc.encode(data));
  return {
    iv: btoa(String.fromCharCode(...iv)),
    data: btoa(String.fromCharCode(...new Uint8Array(encrypted))),
  };
}

async function decrypt(encData: { iv: string; data: string }, password: string): Promise<string> {
  const key = await deriveKey(password);
  const iv = Uint8Array.from(atob(encData.iv), c => c.charCodeAt(0));
  const data = Uint8Array.from(atob(encData.data), c => c.charCodeAt(0));
  const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, data);
  return new TextDecoder().decode(decrypted);
}

// ─── Default password (device-bound, no user input required) ──────────────────

function getDefaultPassword(): string {
  // Use a stable device-bound key based on navigator info
  const agent = navigator.userAgent.slice(0, 32);
  return `LuminaDevice_${agent}_SecureV2`;
}

// ─── Build Payload ─────────────────────────────────────────────────────────────

async function buildPayload(): Promise<BackupPayload> {
  const [reminders, profile, settings] = await Promise.all([
    dbGetAllReminders(),
    dbGetUser(),
    dbGetSettings(),
  ]);

  const completed = reminders.filter(r => r.completed).length;

  return {
    magic: BACKUP_MAGIC,
    version: BACKUP_VERSION,
    createdAt: new Date().toISOString(),
    profile,
    reminders,
    settings,
    statistics: {
      total: reminders.length,
      completed,
      pending: reminders.length - completed,
    },
  };
}

// ─── Create Backup ─────────────────────────────────────────────────────────────

export async function createBackup(password?: string): Promise<Blob> {
  const payload = await buildPayload();
  const jsonStr = JSON.stringify(payload, null, 2);
  const pass = password || getDefaultPassword();

  // Encrypt the JSON payload
  const encrypted = await encrypt(jsonStr, pass);
  const wrapper = {
    magic: BACKUP_MAGIC,
    version: BACKUP_VERSION,
    encrypted: true,
    createdAt: payload.createdAt,
    payload: encrypted,
  };

  // ZIP it
  const zip = new JSZip();
  zip.file('backup.json', JSON.stringify(wrapper, null, 2));
  zip.file('readme.txt', 
    `Lumina Reminder App Backup\n` +
    `Version: ${BACKUP_VERSION}\n` +
    `Created: ${payload.createdAt}\n` +
    `Total Reminders: ${payload.reminders.length}\n\n` +
    `This file was created by Lumina Reminder App.\n` +
    `Import it inside the app to restore your data.\n`
  );

  const blob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE' });

  // Save backup meta to IndexedDB
  await dbSaveBackupMeta({
    version: BACKUP_VERSION,
    createdAt: payload.createdAt,
    label: `Backup ${new Date(payload.createdAt).toLocaleDateString()}`,
    size: blob.size,
    reminderCount: payload.reminders.length,
  });

  return blob;
}

// ─── Download Backup ───────────────────────────────────────────────────────────

export async function downloadBackup(password?: string): Promise<{ size: number; date: string }> {
  const blob = await createBackup(password);
  const date = new Date().toISOString().slice(0, 10);
  const filename = `LuminaBackup_${date}.reminder`;

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);

  return { size: blob.size, date };
}

// ─── Validate & Restore ────────────────────────────────────────────────────────

export interface RestoreResult {
  success: boolean;
  message: string;
  stats?: {
    reminders: number;
    settings: boolean;
    profile: boolean;
  };
}

export async function restoreFromFile(file: File, password?: string): Promise<RestoreResult> {
  try {
    // Load ZIP
    const zip = await JSZip.loadAsync(file);
    const backupFile = zip.file('backup.json');
    if (!backupFile) {
      return { success: false, message: 'Invalid backup file: missing backup.json inside archive.' };
    }

    const rawJson = await backupFile.async('string');
    const wrapper = JSON.parse(rawJson);

    // Validate magic header
    if (wrapper.magic !== BACKUP_MAGIC) {
      return { success: false, message: 'Invalid backup file: not a Lumina backup.' };
    }

    // Version compatibility
    if (wrapper.version > BACKUP_VERSION) {
      return {
        success: false,
        message: `Backup version ${wrapper.version} is newer than this app supports (v${BACKUP_VERSION}). Please update the app.`,
      };
    }

    // Decrypt
    let payload: BackupPayload;
    if (wrapper.encrypted && wrapper.payload) {
      const pass = password || getDefaultPassword();
      try {
        const decrypted = await decrypt(wrapper.payload, pass);
        payload = JSON.parse(decrypted);
      } catch {
        return { success: false, message: 'Decryption failed. Wrong password or corrupted file.' };
      }
    } else {
      // Legacy unencrypted backup
      payload = wrapper.payload || wrapper;
    }

    // Validate structure
    if (!Array.isArray(payload.reminders)) {
      return { success: false, message: 'Backup data is corrupted: invalid reminders format.' };
    }

    // Restore to IndexedDB (deduplicated by id)
    const seen = new Set<string>();
    for (const reminder of payload.reminders) {
      if (reminder.id && !seen.has(reminder.id)) {
        seen.add(reminder.id);
        await dbSaveReminder(reminder);
      }
    }

    if (payload.profile) {
      await dbSaveUser(payload.profile);
    }

    if (payload.settings) {
      await dbSaveSettings(payload.settings);
    }

    // Sync to localStorage for immediate state hydration
    if (payload.reminders) {
      localStorage.setItem('glass_reminders', JSON.stringify(payload.reminders));
    }
    if (payload.profile) {
      localStorage.setItem('glass_user', JSON.stringify(payload.profile));
    }
    if (payload.settings) {
      localStorage.setItem('glass_settings', JSON.stringify(payload.settings));
    }

    return {
      success: true,
      message: `Restore complete! ${payload.reminders.length} reminders, settings, and profile restored.`,
      stats: {
        reminders: payload.reminders.length,
        settings: !!payload.settings,
        profile: !!payload.profile,
      },
    };
  } catch (err) {
    console.error('Restore error:', err);
    return { success: false, message: `Restore failed: ${err instanceof Error ? err.message : 'Unknown error'}` };
  }
}

// ─── Get backup info from current DB ──────────────────────────────────────────

export async function getStorageInfo(): Promise<{
  reminderCount: number;
  storageUsedBytes: number;
}> {
  const reminders = await dbGetAllReminders();
  const jsonSize = JSON.stringify(reminders).length;
  return {
    reminderCount: reminders.length,
    storageUsedBytes: jsonSize,
  };
}

export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
}
