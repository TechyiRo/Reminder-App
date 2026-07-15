import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Shield, Lock, KeyRound, FileText, Search, Plus, Eye, EyeOff, 
  Copy, Trash2, ExternalLink, X, RefreshCw, Key, ChevronDown,
  Mail, Play, Globe, Briefcase, CreditCard, ShoppingBag, ArrowLeft, Folder,
  Music, MessageSquare, Smartphone, Tv,
  Bold, Italic, List, ListTodo, Type, Image, FileEdit
} from 'lucide-react';
import { useReminderStore } from '../store/reminderStore';
import { encryptPassword, decryptPassword, generateStrongPassword } from '../utils/crypto';
import LockScreen from './LockScreen';
import PinSetupScreen from './PinSetupScreen';
import type { VaultEntry } from '../store/db';

// Helper to extract domain from URL for dynamic favicon loading
const getDomainFromUrl = (urlStr?: string) => {
  if (!urlStr) return '';
  try {
    const clean = urlStr.replace(/^(https?:\/\/)?(www\.)?/, '');
    return clean.split('/')[0];
  } catch {
    return '';
  }
};

// Brand helper mapping to provide custom logos, icons, and colors
const getBrandDetails = (categoryName: string, url?: string) => {
  const name = categoryName.toLowerCase();
  const domain = getDomainFromUrl(url).toLowerCase();

  // 1. Gmail / Google
  if (name.includes('gmail') || name.includes('google') || domain.includes('gmail') || domain.includes('google')) {
    return {
      icon: Mail,
      iconColor: 'text-red-400',
      gradient: 'from-red-500/20 to-orange-500/10',
      bgGlow: 'shadow-red-500/10'
    };
  }
  // 2. Netflix
  if (name.includes('netflix') || domain.includes('netflix')) {
    return {
      icon: Tv,
      iconColor: 'text-red-600',
      gradient: 'from-red-600/20 to-red-800/10',
      bgGlow: 'shadow-red-600/10'
    };
  }
  // 3. Facebook
  if (name.includes('facebook') || domain.includes('facebook')) {
    return {
      icon: Globe,
      iconColor: 'text-blue-500',
      gradient: 'from-blue-600/20 to-indigo-600/10',
      bgGlow: 'shadow-blue-500/10'
    };
  }
  // 4. Instagram
  if (name.includes('instagram') || domain.includes('instagram')) {
    return {
      icon: Globe,
      iconColor: 'text-pink-500',
      gradient: 'from-pink-500/20 to-rose-500/10',
      bgGlow: 'shadow-pink-500/10'
    };
  }
  // 5. YouTube
  if (name.includes('youtube') || domain.includes('youtube')) {
    return {
      icon: Play,
      iconColor: 'text-red-500',
      gradient: 'from-red-500/20 to-rose-700/10',
      bgGlow: 'shadow-red-500/10'
    };
  }
  // 6. GitHub
  if (name.includes('github') || domain.includes('github')) {
    return {
      icon: Folder,
      iconColor: 'text-zinc-300',
      gradient: 'from-zinc-600/20 to-zinc-800/10',
      bgGlow: 'shadow-zinc-500/10'
    };
  }
  // 7. Spotify
  if (name.includes('spotify') || domain.includes('spotify')) {
    return {
      icon: Music,
      iconColor: 'text-emerald-400',
      gradient: 'from-green-500/20 to-emerald-600/10',
      bgGlow: 'shadow-emerald-500/10'
    };
  }
  // 8. Apple
  if (name.includes('apple') || name.includes('icloud') || domain.includes('apple') || domain.includes('icloud')) {
    return {
      icon: Smartphone,
      iconColor: 'text-slate-300',
      gradient: 'from-zinc-400/20 to-slate-500/10',
      bgGlow: 'shadow-slate-400/10'
    };
  }
  // 9. Finance & Cards
  if (name.includes('finance') || name.includes('bank') || name.includes('card') || name.includes('crypto') || domain.includes('paypal') || domain.includes('stripe')) {
    return {
      icon: CreditCard,
      iconColor: 'text-amber-400',
      gradient: 'from-amber-500/20 to-yellow-500/10',
      bgGlow: 'shadow-amber-500/10'
    };
  }
  // 10. Social Media General
  if (name.includes('social') || name.includes('twitter') || name.includes('linkedin') || domain.includes('twitter') || domain.includes('linkedin')) {
    return {
      icon: Globe,
      iconColor: 'text-sky-400',
      gradient: 'from-sky-500/20 to-blue-500/10',
      bgGlow: 'shadow-sky-500/10'
    };
  }
  // 11. Shopping General
  if (name.includes('shopping') || name.includes('amazon') || name.includes('ebay') || domain.includes('amazon') || domain.includes('ebay')) {
    return {
      icon: ShoppingBag,
      iconColor: 'text-orange-400',
      gradient: 'from-amber-600/20 to-orange-500/10',
      bgGlow: 'shadow-orange-500/10'
    };
  }
  // 12. Chat / Messaging
  if (name.includes('chat') || name.includes('whatsapp') || name.includes('discord') || name.includes('slack') || domain.includes('whatsapp') || domain.includes('discord')) {
    return {
      icon: MessageSquare,
      iconColor: 'text-emerald-400',
      gradient: 'from-emerald-500/20 to-teal-500/10',
      bgGlow: 'shadow-emerald-500/10'
    };
  }
  // 13. Work / Business
  if (name.includes('work') || name.includes('office') || name.includes('job') || name.includes('corporate')) {
    return {
      icon: Briefcase,
      iconColor: 'text-indigo-400',
      gradient: 'from-indigo-500/20 to-violet-500/10',
      bgGlow: 'shadow-indigo-500/10'
    };
  }
  // 14. Fallback Default Other
  return {
    icon: Key,
    iconColor: 'text-violet-300',
    gradient: 'from-violet-500/20 to-fuchsia-500/10',
    bgGlow: 'shadow-violet-500/10'
  };
};

export default function VaultView() {
  const { 
    settings, vaultEntries, secureNotes, vaultLocked, vaultKeyInMemory,
    addVaultEntry, deleteVaultEntry, addSecureNote, deleteSecureNote, 
    updateSecureNote, lockVault
  } = useReminderStore();

  const [activeTab, setActiveTab] = useState<'credentials' | 'notes'>('credentials');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Categories states
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  // Modals
  const [isAddEntryOpen, setIsAddEntryOpen] = useState(false);
  const [isAddNoteOpen, setIsAddNoteOpen] = useState(false);
  const [isEditNoteOpen, setIsEditNoteOpen] = useState(false);

  // Password Reveal
  const [revealedPasswords, setRevealedPasswords] = useState<Record<string, string>>({});
  const [expandedEntryId, setExpandedEntryId] = useState<string | null>(null);

  // New credential inputs
  const [siteName, setSiteName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [url, setUrl] = useState('');
  const [entryNotes, setEntryNotes] = useState('');
  
  // Category settings
  const [categoryType, setCategoryType] = useState<'select' | 'custom'>('select');
  const [selectedCategoryName, setSelectedCategoryName] = useState('Gmail');
  const [customCategoryName, setCustomCategoryName] = useState('');

  // Notes inputs
  const [noteTitle, setNoteTitle] = useState('');
  const [noteBody, setNoteBody] = useState('');
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);

  // Toast alert
  const [toastMessage, setToastMessage] = useState('');

  // Favicon error handler helper
  const [faviconLoadError, setFaviconLoadError] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (toastMessage) {
      const t = setTimeout(() => setToastMessage(''), 2500);
      return () => clearTimeout(t);
    }
  }, [toastMessage]);

  if (!settings.vaultPinHash) {
    return <PinSetupScreen onSetupSuccess={() => {}} />;
  }

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

    const finalCategory = categoryType === 'select' ? selectedCategoryName : customCategoryName.trim();
    if (!finalCategory) {
      showToast('Category name cannot be empty');
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
        notes: entryNotes,
        category: finalCategory
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
    setCustomCategoryName('');
    setCategoryType('select');
  };

  const handleGeneratePassword = () => {
    const pass = generateStrongPassword(16, true, true);
    setPassword(pass);
    showToast('Strong password generated!');
  };

  // ─── NOTE HANDLERS ──────────────────────────────────────────────────────────

  const handleSaveNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteTitle.trim()) {
      showToast('Note requires a title');
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
    if (!selectedNoteId || !noteTitle.trim()) return;

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

  // ─── CATEGORY & FILTER COMPUTATION ──────────────────────────────────────────

  // Group credentials by category dynamically
  const categoriesGroup = vaultEntries.reduce<Record<string, VaultEntry[]>>((acc, entry) => {
    const cat = entry.category || 'Other';
    if (!acc[cat]) {
      acc[cat] = [];
    }
    acc[cat].push(entry);
    return acc;
  }, {});

  const allCategoryNames = Object.keys(categoriesGroup).sort();

  // Search filtering
  const filteredCategoryNames = allCategoryNames.filter(name => {
    const entries = categoriesGroup[name];
    const matchCatName = name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchInnerEntries = entries.some(e => 
      e.siteName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.username.toLowerCase().includes(searchQuery.toLowerCase())
    );
    return matchCatName || matchInnerEntries;
  });

  const filteredNotes = secureNotes.filter(note =>
    note.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    note.body.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-[#0d0c1e] text-white relative">
      {/* Glow Effects */}
      <div className="absolute top-0 left-0 w-full h-52 bg-gradient-to-b from-purple-950/15 via-[#0d0c1e] to-[#0d0c1e] pointer-events-none z-0" />

      {/* Header section */}
      <div className="p-5 pb-3 pt-8 flex items-center justify-between z-10 shrink-0 select-none">
        <div className="flex items-center gap-2.5">
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

      {/* Segment Selector */}
      <div className="px-5 mb-4 shrink-0 z-10">
        <div className="bg-white/5 border border-white/8 rounded-2xl p-1 flex">
          <button
            onClick={() => { setActiveTab('credentials'); setSearchQuery(''); setSelectedCategory(null); }}
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

      {/* Filter / Search input */}
      <div className="px-5 mb-4 shrink-0 z-10">
        <div className="relative">
          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/35" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={
              activeTab === 'credentials' 
                ? (selectedCategory ? `Search in ${selectedCategory}...` : "Search category or account...") 
                : "Search secure notes..."
            }
            className="w-full bg-white/5 border border-white/8 rounded-2xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-white/30 outline-none focus:border-violet-500/40 focus:bg-violet-600/5 transition-all"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white">
              <X size={12} />
            </button>
          )}
        </div>
      </div>

      {/* View Content area */}
      <div className="flex-1 overflow-y-auto px-5 pb-6 z-10">
        {activeTab === 'credentials' ? (
          /* CREDENTIALS MAIN AREA */
          selectedCategory === null ? (
            /* CATEGORY GRID LIST VIEW (Apple-style 3D Glassmorphism) */
            <div className="grid grid-cols-2 gap-3.5">
              {filteredCategoryNames.length === 0 ? (
                <div className="col-span-2 flex flex-col items-center justify-center py-16 text-center">
                  <Folder size={32} className="text-white/20 mb-3" />
                  <p className="text-xs text-white/50">No password categories</p>
                  <p className="text-[10px] text-white/30 mt-1">Tap the plus button below to create one</p>
                </div>
              ) : (
                filteredCategoryNames.map(name => {
                  const entries = categoriesGroup[name];
                  const domain = entries[0]?.url ? getDomainFromUrl(entries[0].url) : '';
                  const brand = getBrandDetails(name, entries[0]?.url);
                  const IconComponent = brand.icon;
                  const isFaviconWorking = domain && !faviconLoadError[name];

                  return (
                    <motion.button
                      whileHover={{ scale: 1.03, y: -2 }}
                      whileTap={{ scale: 0.97 }}
                      key={name}
                      onClick={() => setSelectedCategory(name)}
                      className="glass-panel text-left p-4 rounded-2xl border border-white/8 hover:border-violet-500/25 active:border-violet-500/30 transition-all flex flex-col justify-between h-32 relative overflow-hidden group shadow-lg"
                    >
                      {/* Interactive Glow Backdrops */}
                      <div className="absolute -top-10 -right-10 w-24 h-24 bg-gradient-to-br from-violet-600/10 to-transparent rounded-full blur-2xl group-hover:scale-125 transition-transform" />
                      
                      {/* Logo Icon Area */}
                      <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${brand.gradient} border border-white/10 flex items-center justify-center shrink-0 shadow-md ${brand.bgGlow}`}>
                        {isFaviconWorking ? (
                          <img
                            src={`https://www.google.com/s2/favicons?sz=128&domain=${domain}`}
                            alt={name}
                            onError={() => setFaviconLoadError(prev => ({ ...prev, [name]: true }))}
                            className="w-6 h-6 rounded object-contain"
                          />
                        ) : (
                          <IconComponent size={18} className={brand.iconColor} />
                        )}
                      </div>

                      {/* Info Meta */}
                      <div className="mt-4">
                        <h3 className="text-xs font-bold text-white/95 line-clamp-1">{name}</h3>
                        <p className="text-[9px] text-white/40 font-semibold mt-0.5 uppercase tracking-wide">
                          {entries.length} {entries.length === 1 ? 'credential' : 'credentials'}
                        </p>
                      </div>
                    </motion.button>
                  );
                })
              )}
            </div>
          ) : (
            /* ACCORDION CREDENTIAL LIST FOR SELECTED CATEGORY */
            <div className="flex flex-col gap-3">
              {/* Back breadcrumb */}
              <button
                onClick={() => { setSelectedCategory(null); setExpandedEntryId(null); }}
                className="self-start flex items-center gap-1.5 text-xs font-bold text-violet-400 hover:text-violet-300 transition-colors mb-2"
              >
                <ArrowLeft size={13} />
                Back to Categories
              </button>

              <h2 className="text-sm font-bold font-display text-white/90 mb-1 px-1">
                Category: {selectedCategory}
              </h2>

              {categoriesGroup[selectedCategory]?.filter(entry => 
                entry.siteName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                entry.username.toLowerCase().includes(searchQuery.toLowerCase())
              ).map(entry => {
                const isExpanded = expandedEntryId === entry.id;
                const decryptedPass = revealedPasswords[entry.id];
                const domain = getDomainFromUrl(entry.url);
                const brand = getBrandDetails(selectedCategory, entry.url);
                const IconComponent = brand.icon;
                const entryFaviconKey = `entry_${entry.id}`;
                const isEntryFaviconWorking = domain && !faviconLoadError[entryFaviconKey];

                return (
                  <motion.div
                    layout
                    key={entry.id}
                    className={`glass-panel rounded-2xl border transition-all duration-300 overflow-hidden ${
                      isExpanded ? 'border-violet-500/30 bg-violet-950/5' : 'border-white/5 bg-white/2'
                    }`}
                  >
                    {/* Header bar click */}
                    <div 
                      onClick={() => setExpandedEntryId(isExpanded ? null : entry.id)}
                      className="p-4 flex items-center justify-between cursor-pointer"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${brand.gradient} border border-white/10 flex items-center justify-center shrink-0`}>
                          {isEntryFaviconWorking ? (
                            <img
                              src={`https://www.google.com/s2/favicons?sz=128&domain=${domain}`}
                              alt={entry.siteName}
                              onError={() => setFaviconLoadError(prev => ({ ...prev, [entryFaviconKey]: true }))}
                              className="w-5 h-5 rounded object-contain"
                            />
                          ) : (
                            <IconComponent size={16} className={brand.iconColor} />
                          )}
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

                    {/* Content Detail Area */}
                    {isExpanded && (
                      <div className="px-4 pb-4 pt-1 border-t border-white/5 flex flex-col gap-3.5 text-xs text-white/70">
                        {entry.url && (
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-[9px] text-white/30 uppercase tracking-wide">Website URL</p>
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

                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-[9px] text-white/30 uppercase tracking-wide">Username or Email</p>
                            <p className="text-white font-medium mt-0.5 select-all">{entry.username}</p>
                          </div>
                          <button
                            onClick={() => handleCopy(entry.username, 'Username')}
                            className="p-1.5 rounded-lg bg-white/5 border border-white/10 text-white/50 hover:text-white"
                          >
                            <Copy size={11} />
                          </button>
                        </div>

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
                              title={decryptedPass ? "Hide" : "Reveal"}
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

                        {entry.notes && (
                          <div className="bg-white/3 border border-white/5 rounded-xl p-3">
                            <p className="text-[9px] text-white/30 uppercase tracking-wide mb-1">Notes</p>
                            <p className="text-[11px] text-white/70 leading-relaxed whitespace-pre-wrap">{entry.notes}</p>
                          </div>
                        )}

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
              })}
            </div>
          )
        ) : (
          /* ─── SECURE NOTES SECTION (Apple Notes Design Style) ─────────────────── */
          <div className="flex flex-col">
            {/* Apple Notes Styled Folder Panel Container */}
            <div className="bg-[#1c1c1e] rounded-2xl overflow-hidden border border-white/5 shadow-xl">
              <div className="px-4 py-3 bg-[#2c2c2e]/40 border-b border-white/5 flex items-center justify-between">
                <span className="text-[10px] uppercase font-bold text-white/40 tracking-wider">Quick Notes</span>
                <span className="text-[10px] font-bold text-[#ff9f0a]">{filteredNotes.length} Notes</span>
              </div>
              
              <div className="divide-y divide-white/5">
                {filteredNotes.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
                    <FileEdit size={28} className="text-white/20 mb-3" />
                    <p className="text-xs text-white/50 font-semibold">No Notes</p>
                    <p className="text-[10px] text-white/30 mt-0.5">Write a new Apple Note using the amber pen button</p>
                  </div>
                ) : (
                  filteredNotes.map((note) => {
                    const cleanDate = new Date(note.updatedAt).toLocaleDateString(undefined, {
                      month: 'numeric',
                      day: 'numeric',
                      year: '2-digit'
                    });
                    const snippet = note.body ? note.body.slice(0, 60) : 'No additional text';

                    return (
                      <motion.button
                        whileTap={{ backgroundColor: 'rgba(255, 255, 255, 0.05)' }}
                        key={note.id}
                        onClick={() => openEditNote(note)}
                        className="w-full p-4 text-left flex flex-col gap-1 transition-colors outline-none"
                      >
                        <h3 className="text-xs font-bold text-white leading-tight line-clamp-1">
                          {note.title}
                        </h3>
                        <div className="flex items-baseline gap-2 text-[10px] leading-relaxed">
                          <span className="text-white/40 font-semibold shrink-0">{cleanDate}</span>
                          <span className="text-white/60 line-clamp-1">{snippet}</span>
                        </div>
                      </motion.button>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Floating Add trigger (Amber accent for Notes tab to match Apple Notes style!) */}
      <div className="absolute bottom-6 right-6 z-20">
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => activeTab === 'credentials' ? setIsAddEntryOpen(true) : setIsAddNoteOpen(true)}
          className={`w-12 h-12 rounded-full flex items-center justify-center shadow-lg border outline-none transition-all duration-300 ${
            activeTab === 'notes'
              ? 'bg-[#ff9f0a] border-amber-400 text-black shadow-amber-500/25 hover:bg-[#e08b00]'
              : 'bg-gradient-to-r from-violet-600 to-pink-600 border-white/20 text-white shadow-violet-500/20 hover:from-violet-500 hover:to-pink-500'
          }`}
        >
          {activeTab === 'notes' ? <FileEdit size={20} /> : <Plus size={24} />}
        </motion.button>
      </div>

      {/* Toasts system alerts */}
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
                
                {/* Category Type Picker */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-white/40 uppercase tracking-wider">Credential Category</label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setCategoryType('select')}
                      className={`flex-1 py-2 border rounded-xl font-semibold text-[10px] transition-colors ${
                        categoryType === 'select' 
                          ? 'bg-violet-600/10 border-violet-500/40 text-violet-300' 
                          : 'bg-white/2 border-white/5 text-white/60 hover:text-white'
                      }`}
                    >
                      Select Brand / Group
                    </button>
                    <button
                      type="button"
                      onClick={() => setCategoryType('custom')}
                      className={`flex-1 py-2 border rounded-xl font-semibold text-[10px] transition-colors ${
                        categoryType === 'custom' 
                          ? 'bg-violet-600/10 border-violet-500/40 text-violet-300' 
                          : 'bg-white/2 border-white/5 text-white/60 hover:text-white'
                      }`}
                    >
                      + Custom Category
                    </button>
                  </div>
                </div>

                {/* Selected Category input fields */}
                {categoryType === 'select' ? (
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold text-white/40 uppercase tracking-wider">Select Brand Category</label>
                    <select
                      value={selectedCategoryName}
                      onChange={e => setSelectedCategoryName(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 text-white outline-none focus:border-violet-500/40"
                    >
                      <option value="Gmail">Gmail / Google</option>
                      <option value="Netflix">Netflix</option>
                      <option value="Facebook">Facebook</option>
                      <option value="Instagram">Instagram</option>
                      <option value="YouTube">YouTube</option>
                      <option value="Spotify">Spotify</option>
                      <option value="GitHub">GitHub</option>
                      <option value="Apple">Apple / iCloud</option>
                      <option value="Finance">Finance & Banking</option>
                      <option value="Social Media">Other Social Media</option>
                      <option value="Shopping">Shopping & Amazon</option>
                      <option value="Other">Other Category</option>
                    </select>
                  </div>
                ) : (
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold text-white/40 uppercase tracking-wider">Custom Category Name *</label>
                    <input
                      required={categoryType === 'custom'}
                      type="text"
                      value={customCategoryName}
                      onChange={e => setCustomCategoryName(e.target.value)}
                      placeholder="e.g. PlayStation, WhatsApp, LinkedIn"
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 text-white outline-none focus:border-violet-500/40"
                    />
                  </div>
                )}

                {/* Site Name */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-white/40 uppercase tracking-wider">Site or App Name *</label>
                  <input
                    required
                    type="text"
                    value={siteName}
                    onChange={e => setSiteName(e.target.value)}
                    placeholder="e.g. Personal Gmail, Family Netflix, Work Account"
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
                    placeholder="e.g. netflix.com"
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

      {/* ─── ADD APPLE SECURE NOTE MODAL SHEET ─────────────────────────────────── */}
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
              className="relative w-full max-w-sm bg-[#1c1c1e] rounded-t-3xl border-t border-white/15 p-5 pb-8 shadow-2xl flex flex-col max-h-[90vh] overflow-y-auto"
            >
              {/* Apple Note Style Header */}
              <div className="flex items-center justify-between mb-4 border-b border-white/5 pb-3">
                <span className="text-xs font-bold text-white/50">Folders / Quick Note</span>
                <button
                  onClick={handleSaveNote}
                  className="text-xs font-bold text-[#ff9f0a] hover:text-amber-400 transition-colors"
                >
                  Done
                </button>
              </div>

              <form onSubmit={handleSaveNote} className="flex flex-col gap-4 text-xs">
                {/* Note Title (Apple Notes style: Borderless, Bold, Large) */}
                <input
                  required
                  type="text"
                  value={noteTitle}
                  onChange={e => setNoteTitle(e.target.value)}
                  placeholder="New Note Title"
                  className="w-full bg-transparent text-white font-bold text-base placeholder-white/30 outline-none border-none py-1"
                />

                {/* Note Content (Apple Notes style: Borderless, spacious) */}
                <textarea
                  value={noteBody}
                  onChange={e => setNoteBody(e.target.value)}
                  placeholder="Start writing note details..."
                  rows={10}
                  className="w-full bg-transparent text-white/80 placeholder-white/20 outline-none border-none resize-none leading-relaxed text-xs py-1 min-h-[150px]"
                />

                {/* Apple Notes styled Mock formatting toolbar at bottom of sheet */}
                <div className="border-t border-white/5 pt-3 mt-2 flex items-center justify-between text-white/40 shrink-0">
                  <div className="flex items-center gap-3">
                    <button type="button" className="p-1 hover:text-[#ff9f0a] transition-colors"><Type size={15} /></button>
                    <button type="button" className="p-1 hover:text-[#ff9f0a] transition-colors"><Bold size={14} /></button>
                    <button type="button" className="p-1 hover:text-[#ff9f0a] transition-colors"><Italic size={14} /></button>
                    <button type="button" className="p-1 hover:text-[#ff9f0a] transition-colors"><List size={14} /></button>
                    <button type="button" className="p-1 hover:text-[#ff9f0a] transition-colors"><ListTodo size={14} /></button>
                    <button type="button" className="p-1 hover:text-[#ff9f0a] transition-colors"><Image size={14} /></button>
                  </div>
                  <span className="text-[8px] font-bold text-white/20 uppercase tracking-widest">Apple Notes System</span>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── EDIT/VIEW APPLE SECURE NOTE MODAL SHEET ───────────────────────────── */}
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
              className="relative w-full max-w-sm bg-[#1c1c1e] rounded-t-3xl border-t border-white/15 p-5 pb-8 shadow-2xl flex flex-col max-h-[90vh] overflow-y-auto"
            >
              {/* Apple Note Style Header */}
              <div className="flex items-center justify-between mb-4 border-b border-white/5 pb-3">
                <button
                  type="button"
                  onClick={() => {
                    if (window.confirm('Delete this secure note permanently?')) {
                      deleteSecureNote(selectedNoteId!);
                      setIsEditNoteOpen(false);
                      showToast('Secure note deleted');
                    }
                  }}
                  className="text-xs font-bold text-red-500/80 hover:text-red-400 transition-colors"
                >
                  Delete
                </button>
                <button
                  onClick={handleUpdateNote}
                  className="text-xs font-bold text-[#ff9f0a] hover:text-amber-400 transition-colors"
                >
                  Done
                </button>
              </div>

              <form onSubmit={handleUpdateNote} className="flex flex-col gap-4 text-xs">
                {/* Note Title */}
                <input
                  required
                  type="text"
                  value={noteTitle}
                  onChange={e => setNoteTitle(e.target.value)}
                  placeholder="Note Title"
                  className="w-full bg-transparent text-white font-bold text-base placeholder-white/30 outline-none border-none py-1"
                />

                {/* Note Content */}
                <textarea
                  value={noteBody}
                  onChange={e => setNoteBody(e.target.value)}
                  placeholder="Write note contents..."
                  rows={10}
                  className="w-full bg-transparent text-white/80 placeholder-white/20 outline-none border-none resize-none leading-relaxed text-xs py-1 min-h-[150px]"
                />

                {/* Apple Notes styled Mock formatting toolbar at bottom */}
                <div className="border-t border-white/5 pt-3 mt-2 flex items-center justify-between text-white/40 shrink-0">
                  <div className="flex items-center gap-3">
                    <button type="button" className="p-1 hover:text-[#ff9f0a] transition-colors"><Type size={15} /></button>
                    <button type="button" className="p-1 hover:text-[#ff9f0a] transition-colors"><Bold size={14} /></button>
                    <button type="button" className="p-1 hover:text-[#ff9f0a] transition-colors"><Italic size={14} /></button>
                    <button type="button" className="p-1 hover:text-[#ff9f0a] transition-colors"><List size={14} /></button>
                    <button type="button" className="p-1 hover:text-[#ff9f0a] transition-colors"><ListTodo size={14} /></button>
                    <button type="button" className="p-1 hover:text-[#ff9f0a] transition-colors"><Image size={14} /></button>
                  </div>
                  <span className="text-[8px] font-bold text-white/20 uppercase tracking-widest text-right">Apple Notes System</span>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
