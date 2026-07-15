/**
 * Dexie.js IndexedDB Database for Lumina Reminder App
 * Provides persistent offline-first storage that survives browser refresh, restart, and device reboot.
 */
import Dexie, { type Table } from 'dexie';
import type { Reminder, User, AppSettings } from './reminderStore';

export interface BackupMeta {
  id?: number;
  version: number;
  createdAt: string;
  label: string;
  size: number;
  reminderCount: number;
}

export interface VaultEntry {
  id: string;
  siteName: string;
  username: string;
  encryptedPassword: string; // Base64 ciphertext
  passwordIv: string;        // Base64 IV
  url: string;
  notes: string;
  category?: string;         // Credential category (e.g. Gmail, Netflix, Work)
  createdAt: number;
  updatedAt: number;
}

export interface SecureNote {
  id: string;
  title: string;
  body: string;
  createdAt: number;
  updatedAt: number;
}

export class LuminaDatabase extends Dexie {
  reminders!: Table<Reminder, string>;
  users!: Table<User & { id: string }, string>;
  settings!: Table<AppSettings & { id: string }, string>;
  backups!: Table<BackupMeta, number>;
  vault_entries!: Table<VaultEntry, string>;
  secure_notes!: Table<SecureNote, string>;

  constructor() {
    super('LuminaRemindersDB');
    this.version(3).stores({
      reminders: 'id, date, time, completed, triggered, category, priority',
      users: 'id',
      settings: 'id',
      backups: '++id, createdAt, version',
      vault_entries: 'id, siteName, username, createdAt',
      secure_notes: 'id, title, createdAt'
    });
  }
}

export const db = new LuminaDatabase();

// ─── Reminder helpers ──────────────────────────────────────────────────────────

export async function dbSaveReminder(reminder: Reminder) {
  await db.reminders.put(reminder);
}

export async function dbDeleteReminder(id: string) {
  await db.reminders.delete(id);
}

export async function dbGetAllReminders(): Promise<Reminder[]> {
  return db.reminders.toArray();
}

// ─── User helpers ──────────────────────────────────────────────────────────────

export async function dbSaveUser(user: User) {
  await db.users.put({ ...user, id: 'current' });
}

export async function dbGetUser(): Promise<User | null> {
  const u = await db.users.get('current');
  if (!u) return null;
  const { id: _id, ...rest } = u;
  return rest as User;
}

// ─── Settings helpers ──────────────────────────────────────────────────────────

export async function dbSaveSettings(settings: AppSettings) {
  await db.settings.put({ ...settings, id: 'current' });
}

export async function dbGetSettings(): Promise<AppSettings | null> {
  const s = await db.settings.get('current');
  if (!s) return null;
  const { id: _id, ...rest } = s;
  return rest as AppSettings;
}

// ─── Backup meta helpers ────────────────────────────────────────────────────────

export async function dbSaveBackupMeta(meta: Omit<BackupMeta, 'id'>) {
  const id = await db.backups.add(meta as BackupMeta);
  // Keep only the latest 5
  const all = await db.backups.orderBy('id').toArray();
  if (all.length > 5) {
    const toDelete = all.slice(0, all.length - 5).map(b => b.id!);
    await db.backups.bulkDelete(toDelete);
  }
  return id;
}

export async function dbGetBackupMeta(): Promise<BackupMeta[]> {
  return db.backups.orderBy('id').reverse().toArray();
}

export async function dbDeleteBackupMeta(id: number) {
  await db.backups.delete(id);
}

// ─── Vault helpers ─────────────────────────────────────────────────────────────

export async function dbSaveVaultEntry(entry: VaultEntry) {
  await db.vault_entries.put(entry);
}

export async function dbDeleteVaultEntry(id: string) {
  await db.vault_entries.delete(id);
}

export async function dbGetAllVaultEntries(): Promise<VaultEntry[]> {
  return db.vault_entries.orderBy('createdAt').reverse().toArray();
}

// ─── Secure Notes helpers ──────────────────────────────────────────────────────

export async function dbSaveSecureNote(note: SecureNote) {
  await db.secure_notes.put(note);
}

export async function dbDeleteSecureNote(id: string) {
  await db.secure_notes.delete(id);
}

export async function dbGetAllSecureNotes(): Promise<SecureNote[]> {
  return db.secure_notes.orderBy('createdAt').reverse().toArray();
}

export async function dbClearAllVaultData() {
  await Promise.all([
    db.vault_entries.clear(),
    db.secure_notes.clear()
  ]);
}
