import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Shield, Lock, KeyRound, FileText, Search, Plus, Eye, EyeOff, 
  Copy, Trash2, ExternalLink, X, RefreshCw, Key, ChevronDown, CheckSquare, Edit3
} from 'lucide-react';
import { useReminderStore } from '../store/reminderStore';
import { encryptPassword, decryptPassword, generateStrongPassword } from '../utils/crypto';
import LockScreen from './LockScreen';
import PinSetupScreen from './PinSetupScreen';

export default function VaultView() {
  const { 
    settings, vaultEntries, secureNotes, vaultLocked, vaultKeyInMemory,
    addVaultEntry, deleteVaultEntry, addSecureNote, deleteSecureNote, 
    updateSecureNote, lockVault
  } = useReminderStore();

  const [activeTab, setActiveTab] = useState<'credentials' | 'notes'>('credentials');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Sheet modals
  const [isAddEntryOpen, setIsAddEntryOpen] = useState(false);
  const [isAddNoteOpen, setIsAddNoteOpen] = useState(false);
  const [isEditNoteOpen, setIsEditNoteOpen] = useState(false);

  // Password Reveal States (id -> decrypted password string)
  const [revealedPasswords, setRevealedPasswords] = useState<Record<string, string>>({});
  const [expandedEntryId, setExpandedEntryId] = useState<string | null>(null);

  // New credential inputs
  const [siteName, setSiteName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [url, setUrl] = useState('');
  const [entryNotes, setEntryNotes] = useState('');

  // Password generator config
  const genLength = 16;
  const genSymbols = true;
  const genNumbers = true;

  // Notes inputs
  const [noteTitle, setNoteTitle] = useState('');
  const [noteBody, setNoteBody] = useState('');
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);

  // Toast feedback state
  const [toastMessage, setToastMessage] = useState('');

  // Auto-dismiss toast
  useEffect(() => {
    if (toastMessage) {
      const t = setTimeout(() => setToastMessage(''), 2500);
      return () => clearTimeout(t);
    }
  }, [toastMessage]);

  // Show PIN Setup if not set up
  if (!settings.vaultPinHash) {
    return <PinSetupScreen onSetupSuccess={() => {}} />;
  }

  // Show Lock Screen if locked
  if (vaultLocked) {
    return <LockScreen onUnlockSuccess={() => {}} />;
  }

  const showToast = (msg: string) => {
    setToastMessage(msg);
  };

  // ─── CREDENTIAL HANDLERS ───────────────────────────────────────────────────

  const handleCopy = (text: string, label: string, isSensitive: boolean = false) => {
    navigator.clipboard.writeText(text);
    showToast(`${label} copied to clipboard!`);

    if (isSensitive) {
      // Clear clipboard after setting timer
      const timeoutSec = settings.vaultClipboardClearTime || 30;
      showToast(`${label} copied! Clipboard clears in ${timeoutSec}s.`);
      setTimeout(() => {
        navigator.clipboard.readText().then(val => {
          if (val === text) {
            navigator.clipboard.writeText('');
            showToast('Secure clipboard cleared.');
          }
        }).catch(() => {
          navigator.clipboard.writeText('');
        });
      }, timeoutSec * 1000);
    }
  };

  const handleRevealPassword = async (entryId: string, enc: string, iv: string) => {
    if (revealedPasswords[entryId]) {
      // Hide
      setRevealedPasswords(prev => {
        const copy = { ...prev };
        delete copy[entryId];
        return copy;
      });
      return;
    }

    try {
      const pin = vaultKeyInMemory || '';
      const salt = settings.vaultPinSalt || '';
      const decrypted = await decryptPassword(enc, iv, pin, salt);
      setRevealedPasswords(prev => ({ ...prev, [entryId]: decrypted }));
    } catch (err) {
      showToast('Decryption failed.');
    }
  };

  const handleSaveEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!siteName || !username || !password) {
      showToast('Please fill all required fields');
      return;
    }

    try {
      const pin = vaultKeyInMemory || '';
      const salt = settings.vaultPinSalt || '';
      const encrypted = await encryptPassword(password, pin, salt);

      await addVaultEntry({
        siteName,
        username,
        encryptedPassword: encrypted.ciphertext,
        passwordIv: encrypted.iv,
        url,
        notes: entryNotes
      });

      showToast('Credential saved securely');
      setIsAddEntryOpen(false);
      resetEntryForm();
    } catch (err) {
      showToast('Failed to encrypt credential');
    }
  };

  const resetEntryForm = () => {
    setSiteName('');
    setUsername('');
    setPassword('');
    setUrl('');
    setEntryNotes('');
  };

  const handleGeneratePassword = () => {
    const pass = generateStrongPassword(genLength, genSymbols, genNumbers);
    setPassword(pass);
    showToast('Strong password generated!');
  };

  // ─── NOTE HANDLERS ──────────────────────────────────────────────────────────

  const handleSaveNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteTitle || !noteBody) {
      showToast('Note requires title and content');
      return;
    }

    await addSecureNote({
      title: noteTitle,
      body: noteBody
    });

    showToast('Secure note saved');
    setIsAddNoteOpen(false);
    setNoteTitle('');
    setNoteBody('');
  };

  const handleUpdateNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedNoteId || !noteTitle || !noteBody) return;

    await updateSecureNote(selectedNoteId, noteTitle, noteBody);
    showToast('Secure note updated');
    setIsEditNoteOpen(false);
    setSelectedNoteId(null);
    setNoteTitle('');
    setNoteBody('');
  };

  const openEditNote = (note: any) => {
    setSelectedNoteId(note.id);
    setNoteTitle(note.title);
    setNoteBody(note.body);
    setIsEditNoteOpen(true);
  };

  // ─── FILTERS ────────────────────────────────────────────────────────────────

  const filteredEntries = vaultEntries.filter(entry => 
    entry.siteName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    entry.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredNotes = secureNotes.filter(note =>
    note.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    note.body.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-[#0a0915] text-white relative">
      {/* Dynamic Background */}
      <div className="absolute top-0 left-0 w-full h-52 bg-gradient-to-b from-purple-900/10 via-[#0a0915] to-[#0a0915] pointer-events-none z-0" />

      {/* Header section */}
      <div className="p-5 pb-3 pt-8 flex items-center justify-between z-10 shrink-0 select-none">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-violet-600/20 border border-violet-500/40 flex items-center justify-center">
            <Shield size={16} className="text-violet-400" />
          </div>
          <div>
            <h1 className="text-lg font-bold font-display text-white">SecureVault</h1>
            <p className="text-[9px] text-white/40">Zero-knowledge local encryption</p>
          </div>
        </div>

        <button 
          onClick={lockVault}
          className="h-8 px-3 rounded-xl bg-white/5 border border-white/10 text-white/60 hover:text-white flex items-center gap-1.5 text-xs font-semibold"
        >
          <Lock size={12} />
          Lock
        </button>
      </div>

      {/* Tab Segment Controls */}
      <div className="px-5 mb-4 shrink-0 z-10">
        <div className="bg-white/5 border border-white/8 rounded-2xl p-1 flex">
          <button
            onClick={() => { setActiveTab('credentials'); setSearchQuery(''); }}
            className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
              activeTab === 'credentials' 
                ? 'bg-violet-600 text-white shadow-md shadow-violet-900/30' 
                : 'text-white/50 hover:text-white/80'
            }`}
          >
            <KeyRound size={13} />
            Credentials
          </button>
          <button
            onClick={() => { setActiveTab('notes'); setSearchQuery(''); }}
            className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
              activeTab === 'notes' 
                ? 'bg-violet-600 text-white shadow-md shadow-violet-900/30' 
                : 'text-white/50 hover:text-white/80'
            }`}
          >
            <FileText size={13} />
            Secure Notes
          </button>
        </div>
      </div>

      {/* Search Filter input */}
      <div className="px-5 mb-4 shrink-0 z-10">
        <div className="relative">
          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/35" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={activeTab === 'credentials' ? "Search credentials..." : "Search secure notes..."}
            className="w-full bg-white/5 border border-white/8 rounded-2xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-white/30 outline-none focus:border-violet-500/40 focus:bg-violet-600/5 transition-all"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white">
              <X size={12} />
            </button>
          )}
        </div>
      </div>

      {/* Main content list */}
      <div className="flex-1 overflow-y-auto px-5 pb-6 z-10">
        {activeTab === 'credentials' ? (
          /* CREDENTIALS TAB LIST */
          <div className="flex flex-col gap-3">
            {filteredEntries.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <KeyRound size={32} className="text-white/20 mb-3" />
                <p className="text-xs text-white/50">No credentials found</p>
                <p className="text-[10px] text-white/30 mt-1">Tap the plus button below to save one</p>
              </div>
            ) : (
              filteredEntries.map(entry => {
                const isExpanded = expandedEntryId === entry.id;
                const decryptedPass = revealedPasswords[entry.id];
                return (
                  <motion.div
                    layout
                    key={entry.id}
                    className={`glass-panel rounded-2xl border transition-all duration-300 overflow-hidden ${
                      isExpanded ? 'border-violet-500/30 bg-violet-950/5' : 'border-white/5 bg-white/2'
                    }`}
                  >
                    {/* Header Row */}
                    <div 
                      onClick={() => setExpandedEntryId(isExpanded ? null : entry.id)}
                      className="p-4 flex items-center justify-between cursor-pointer"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-600/30 to-pink-500/30 border border-white/10 flex items-center justify-center shrink-0">
                          <Key size={16} className="text-violet-300" />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-white/95">{entry.siteName}</p>
                          <p className="text-[9px] text-white/40 mt-0.5">{entry.username}</p>
                        </div>
                      </div>
                      <motion.div
                        animate={{ rotate: isExpanded ? 180 : 0 }}
                        transition={{ duration: 0.2 }}
                      >
                        <ChevronDown size={14} className="text-white/30" />
                      </motion.div>
                    </div>

                    {/* Expandable Details Area */}
                    {isExpanded && (
                      <div className="px-4 pb-4 pt-1 border-t border-white/5 flex flex-col gap-3.5 text-xs text-white/70">
                        {/* URL Row */}
                        {entry.url && (
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-[9px] text-white/30 uppercase tracking-wide">Website / App Link</p>
                              <a 
                                href={entry.url.startsWith('http') ? entry.url : `https://${entry.url}`} 
                                target="_blank" 
                                rel="noreferrer"
                                className="text-violet-400 hover:underline flex items-center gap-1 mt-0.5 font-medium"
                              >
                                {entry.url}
                                <ExternalLink size={10} />
                              </a>
                            </div>
                            <button
                              onClick={() => handleCopy(entry.url, 'URL')}
                              className="p-1.5 rounded-lg bg-white/5 border border-white/10 text-white/50 hover:text-white"
                            >
                              <Copy size={11} />
                            </button>
                          </div>
                        )}

                        {/* Username Copy Row */}
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-[9px] text-white/30 uppercase tracking-wide">Username / Email</p>
                            <p className="text-white font-medium mt-0.5 select-all">{entry.username}</p>
                          </div>
                          <button
                            onClick={() => handleCopy(entry.username, 'Username')}
                            className="p-1.5 rounded-lg bg-white/5 border border-white/10 text-white/50 hover:text-white"
                          >
                            <Copy size={11} />
                          </button>
                        </div>

                        {/* Password Decrypt Row */}
                        <div className="flex items-center justify-between">
                          <div className="flex-1 mr-2">
                            <p className="text-[9px] text-white/30 uppercase tracking-wide">Secure Password</p>
                            <p className="text-white font-mono mt-0.5 text-sm tracking-wider font-semibold select-all">
                              {decryptedPass ? decryptedPass : '••••••••••••'}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleRevealPassword(entry.id, entry.encryptedPassword, entry.passwordIv)}
                              className="p-1.5 rounded-lg bg-white/5 border border-white/10 text-white/50 hover:text-violet-400"
                              title={decryptedPass ? "Hide Password" : "Reveal Password"}
                            >
                              {decryptedPass ? <EyeOff size={11} /> : <Eye size={11} />}
                            </button>
                            <button
                              onClick={async () => {
                                try {
                                  const pin = vaultKeyInMemory || '';
                                  const salt = settings.vaultPinSalt || '';
                                  const decrypted = decryptedPass || await decryptPassword(entry.encryptedPassword, entry.passwordIv, pin, salt);
                                  handleCopy(decrypted, 'Password', true);
                                } catch {
                                  showToast('Copy failed');
                                }
                              }}
                              className="p-1.5 rounded-lg bg-white/5 border border-white/10 text-white/50 hover:text-white"
                            >
                              <Copy size={11} />
                            </button>
                          </div>
                        </div>

                        {/* Notes Row */}
                        {entry.notes && (
                          <div className="bg-white/3 border border-white/5 rounded-xl p-3">
                            <p className="text-[9px] text-white/30 uppercase tracking-wide mb-1">Vault Entry Notes</p>
                            <p className="text-[11px] text-white/70 leading-relaxed whitespace-pre-wrap">{entry.notes}</p>
                          </div>
                        )}

                        {/* Delete Credential button */}
                        <div className="flex justify-end border-t border-white/5 pt-3 mt-1">
                          <button
                            onClick={() => {
                              if (window.confirm('Delete this credential permanently?')) {
                                deleteVaultEntry(entry.id);
                                showToast('Credential deleted');
                              }
                            }}
                            className="text-red-400/70 hover:text-red-400 flex items-center gap-1.5 text-[10px] font-semibold"
                          >
                            <Trash2 size={11} />
                            Remove Entry
                          </button>
                        </div>
                      </div>
                    )}
                  </motion.div>
                );
              })
            )}
          </div>
        ) : (
          /* SECURE NOTES TAB LIST */
          <div className="grid grid-cols-2 gap-3">
            {filteredNotes.length === 0 ? (
              <div className="col-span-2 flex flex-col items-center justify-center py-16 text-center">
                <FileText size={32} className="text-white/20 mb-3" />
                <p className="text-xs text-white/50">No secure notes found</p>
                <p className="text-[10px] text-white/30 mt-1">Tap the plus button below to write one</p>
              </div>
            ) : (
              filteredNotes.map(note => (
                <div
                  key={note.id}
                  onClick={() => openEditNote(note)}
                  className="glass-panel border border-white/5 bg-white/2 hover:bg-white/5 rounded-2xl p-4 flex flex-col justify-between h-36 cursor-pointer text-left active:scale-[0.98] transition-all relative overflow-hidden group"
                >
                  <div className="absolute top-0 right-0 w-12 h-12 bg-gradient-to-bl from-violet-600/5 to-transparent pointer-events-none" />
                  <div>
                    <h3 className="text-xs font-bold text-white/95 line-clamp-1 mb-1.5">{note.title}</h3>
                    <p className="text-[10px] text-white/40 line-clamp-4 leading-normal">{note.body}</p>
                  </div>
                  <span className="text-[8px] text-white/30 tracking-wider shrink-0 mt-3 font-semibold uppercase">
                    {new Date(note.updatedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                  </span>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Floating Add Trigger Button */}
      <div className="absolute bottom-6 right-6 z-20">
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => activeTab === 'credentials' ? setIsAddEntryOpen(true) : setIsAddNoteOpen(true)}
          className="w-12 h-12 rounded-full bg-gradient-to-r from-violet-600 to-pink-600 text-white flex items-center justify-center shadow-lg shadow-violet-500/20 border border-white/20 hover:from-violet-500 hover:to-pink-500 outline-none"
        >
          <Plus size={24} />
        </motion.button>
      </div>

      {/* TOAST SYSTEM ALERTS */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30, scale: 0.95 }}
            className="absolute bottom-20 left-1/2 -translate-x-1/2 bg-black/85 backdrop-blur-md border border-white/10 px-4 py-2.5 rounded-xl z-50 text-[10px] font-bold tracking-wide text-center text-white/90 shadow-2xl flex items-center gap-2 shrink-0 min-w-[200px]"
          >
            <Shield size={12} className="text-violet-400 animate-pulse" />
            {toastMessage}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── ADD CREDENTIAL MODAL SHEET ────────────────────────────────────────── */}
      <AnimatePresence>
        {isAddEntryOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end justify-center"
            onClick={(e) => { if (e.target === e.currentTarget) setIsAddEntryOpen(false); }}
          >
            <div className="absolute inset-0 bg-black/75 backdrop-blur-sm" />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 280 }}
              className="relative w-full max-w-sm glass-panel-dark rounded-t-3xl border-t border-white/10 max-h-[85vh] overflow-y-auto p-5 pb-8 shadow-2xl flex flex-col"
            >
              <div className="flex items-center justify-between mb-4 shrink-0">
                <div className="flex items-center gap-2">
                  <Key size={15} className="text-violet-400" />
                  <h3 className="text-sm font-bold text-white">Add Secure Credential</h3>
                </div>
                <button
                  onClick={() => setIsAddEntryOpen(false)}
                  className="w-7 h-7 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white/50"
                >
                  <X size={14} />
                </button>
              </div>

              <form onSubmit={handleSaveEntry} className="flex flex-col gap-4 text-xs">
                {/* Site Name */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-white/40 uppercase tracking-wider">Site or App Name *</label>
                  <input
                    required
                    type="text"
                    value={siteName}
                    onChange={e => setSiteName(e.target.value)}
                    placeholder="e.g. Google, Netflix, Work Portal"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 text-white outline-none focus:border-violet-500/40"
                  />
                </div>

                {/* Username */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-white/40 uppercase tracking-wider">Username or Email *</label>
                  <input
                    required
                    type="text"
                    value={username}
                    onChange={e => setUsername(e.target.value)}
                    placeholder="e.g. rohit@mail.com"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 text-white outline-none focus:border-violet-500/40"
                  />
                </div>

                {/* Password Input & Generator Toggle */}
                <div className="flex flex-col gap-1.5">
                  <div className="flex justify-between items-center">
                    <label className="text-[10px] font-bold text-white/40 uppercase tracking-wider">Password *</label>
                    <button
                      type="button"
                      onClick={handleGeneratePassword}
                      className="text-[9px] text-violet-400 font-bold hover:underline flex items-center gap-0.5"
                    >
                      <RefreshCw size={8} />
                      Generate Strong
                    </button>
                  </div>
                  <input
                    required
                    type="text"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="Password characters"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 text-white font-mono outline-none focus:border-violet-500/40"
                  />
                </div>

                {/* URL */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-white/40 uppercase tracking-wider">Website URL (Optional)</label>
                  <input
                    type="text"
                    value={url}
                    onChange={e => setUrl(e.target.value)}
                    placeholder="e.g. https://netflix.com"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 text-white outline-none focus:border-violet-500/40"
                  />
                </div>

                {/* Notes */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-white/40 uppercase tracking-wider">Secure Notes (Optional)</label>
                  <textarea
                    value={entryNotes}
                    onChange={e => setEntryNotes(e.target.value)}
                    placeholder="Pin answers, recovery keys, details..."
                    rows={2}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 text-white outline-none focus:border-violet-500/40 resize-none"
                  />
                </div>

                {/* Submit button */}
                <button
                  type="submit"
                  className="mt-2 h-12 w-full rounded-2xl bg-gradient-to-r from-violet-600 to-pink-600 text-white font-bold text-sm shadow-lg shadow-violet-900/30 flex items-center justify-center gap-1.5 active:scale-98 transition-transform"
                >
                  <Lock size={14} />
                  <span>Encrypt & Save Entry</span>
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── ADD SECURE NOTE MODAL SHEET ───────────────────────────────────────── */}
      <AnimatePresence>
        {isAddNoteOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end justify-center"
            onClick={(e) => { if (e.target === e.currentTarget) setIsAddNoteOpen(false); }}
          >
            <div className="absolute inset-0 bg-black/75 backdrop-blur-sm" />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              className="relative w-full max-w-sm glass-panel-dark rounded-t-3xl border-t border-white/10 p-5 pb-8 shadow-2xl flex flex-col"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <FileText size={15} className="text-violet-400" />
                  <h3 className="text-sm font-bold text-white">Add Secure Note</h3>
                </div>
                <button
                  onClick={() => setIsAddNoteOpen(false)}
                  className="w-7 h-7 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white/50"
                >
                  <X size={14} />
                </button>
              </div>

              <form onSubmit={handleSaveNote} className="flex flex-col gap-4 text-xs">
                <input
                  required
                  type="text"
                  value={noteTitle}
                  onChange={e => setNoteTitle(e.target.value)}
                  placeholder="Note Title"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 text-white font-bold outline-none focus:border-violet-500/40"
                />

                <textarea
                  required
                  value={noteBody}
                  onChange={e => setNoteBody(e.target.value)}
                  placeholder="Write note contents here..."
                  rows={6}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 text-white outline-none focus:border-violet-500/40 resize-none leading-relaxed"
                />

                <button
                  type="submit"
                  className="h-12 w-full rounded-2xl bg-gradient-to-r from-violet-600 to-pink-600 text-white font-bold text-sm shadow-lg shadow-violet-900/30 flex items-center justify-center gap-1.5"
                >
                  <CheckSquare size={14} />
                  Save Note
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── EDIT SECURE NOTE MODAL SHEET ──────────────────────────────────────── */}
      <AnimatePresence>
        {isEditNoteOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end justify-center"
            onClick={(e) => { if (e.target === e.currentTarget) setIsEditNoteOpen(false); }}
          >
            <div className="absolute inset-0 bg-black/75 backdrop-blur-sm" />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              className="relative w-full max-w-sm glass-panel-dark rounded-t-3xl border-t border-white/10 p-5 pb-8 shadow-2xl flex flex-col"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Edit3 size={15} className="text-violet-400" />
                  <h3 className="text-sm font-bold text-white">Edit Secure Note</h3>
                </div>
                <button
                  onClick={() => setIsEditNoteOpen(false)}
                  className="w-7 h-7 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white/50"
                >
                  <X size={14} />
                </button>
              </div>

              <form onSubmit={handleUpdateNote} className="flex flex-col gap-4 text-xs">
                <input
                  required
                  type="text"
                  value={noteTitle}
                  onChange={e => setNoteTitle(e.target.value)}
                  placeholder="Note Title"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 text-white font-bold outline-none focus:border-violet-500/40"
                />

                <textarea
                  required
                  value={noteBody}
                  onChange={e => setNoteBody(e.target.value)}
                  placeholder="Write note contents here..."
                  rows={6}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 text-white outline-none focus:border-violet-500/40 resize-none leading-relaxed"
                />

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      if (window.confirm('Delete this secure note permanently?')) {
                        deleteSecureNote(selectedNoteId!);
                        setIsEditNoteOpen(false);
                        showToast('Secure note deleted');
                      }
                    }}
                    className="flex-1 h-12 rounded-2xl border border-red-500/20 bg-red-950/20 text-red-400 font-bold text-sm flex items-center justify-center gap-1.5"
                  >
                    <Trash2 size={14} />
                    Delete
                  </button>

                  <button
                    type="submit"
                    className="flex-2 flex-1 h-12 rounded-2xl bg-gradient-to-r from-violet-600 to-pink-600 text-white font-bold text-sm shadow-lg shadow-violet-900/30 flex items-center justify-center gap-1.5"
                  >
                    <CheckSquare size={14} />
                    Save Note
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
