import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Shield, Lock, KeyRound, FileText, Search, Plus, Eye, EyeOff, 
  Copy, Trash2, ExternalLink, X, RefreshCw, Key, ChevronDown,
  Mail, Play, Globe, Briefcase, CreditCard, ShoppingBag, ArrowLeft, Folder,
  Music, MessageSquare, Smartphone, Tv, Star, Pin, Archive, Trash,
  LockKeyhole, LockKeyholeOpen, Calendar, Image, Mic, SquarePen, Upload
} from 'lucide-react';
import { useReminderStore } from '../store/reminderStore';
import { encryptPassword, decryptPassword, generateStrongPassword } from '../utils/crypto';
import LockScreen from './LockScreen';
import PinSetupScreen from './PinSetupScreen';
import type { VaultEntry } from '../store/db';
import type { SecureNote, Attachment } from '../store/db';
import { hashPin } from '../utils/crypto';

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

// Brand helper mapping to provide custom logos, icons, and colors for credentials
const getBrandDetails = (categoryName: string, url?: string) => {
  const name = categoryName.toLowerCase();
  const domain = getDomainFromUrl(url).toLowerCase();

  if (name.includes('gmail') || name.includes('google') || domain.includes('gmail') || domain.includes('google')) {
    return { icon: Mail, iconColor: 'text-red-400', gradient: 'from-red-500/20 to-orange-500/10', bgGlow: 'shadow-red-500/10' };
  }
  if (name.includes('netflix') || domain.includes('netflix')) {
    return { icon: Tv, iconColor: 'text-red-600', gradient: 'from-red-600/20 to-red-800/10', bgGlow: 'shadow-red-600/10' };
  }
  if (name.includes('facebook') || domain.includes('facebook')) {
    return { icon: Globe, iconColor: 'text-blue-500', gradient: 'from-blue-600/20 to-indigo-600/10', bgGlow: 'shadow-blue-500/10' };
  }
  if (name.includes('instagram') || domain.includes('instagram')) {
    return { icon: Globe, iconColor: 'text-pink-500', gradient: 'from-pink-500/20 to-rose-500/10', bgGlow: 'shadow-pink-500/10' };
  }
  if (name.includes('youtube') || domain.includes('youtube')) {
    return { icon: Play, iconColor: 'text-red-500', gradient: 'from-red-500/20 to-rose-700/10', bgGlow: 'shadow-red-500/10' };
  }
  if (name.includes('github') || domain.includes('github')) {
    return { icon: Folder, iconColor: 'text-zinc-300', gradient: 'from-zinc-600/20 to-zinc-800/10', bgGlow: 'shadow-zinc-500/10' };
  }
  if (name.includes('spotify') || domain.includes('spotify')) {
    return { icon: Music, iconColor: 'text-emerald-400', gradient: 'from-green-500/20 to-emerald-600/10', bgGlow: 'shadow-emerald-500/10' };
  }
  if (name.includes('apple') || name.includes('icloud') || domain.includes('apple') || domain.includes('icloud')) {
    return { icon: Smartphone, iconColor: 'text-slate-300', gradient: 'from-zinc-400/20 to-slate-500/10', bgGlow: 'shadow-slate-400/10' };
  }
  if (name.includes('finance') || name.includes('bank') || name.includes('card') || name.includes('crypto') || domain.includes('paypal') || domain.includes('stripe')) {
    return { icon: CreditCard, iconColor: 'text-amber-400', gradient: 'from-amber-500/20 to-yellow-500/10', bgGlow: 'shadow-amber-500/10' };
  }
  if (name.includes('social') || name.includes('twitter') || name.includes('linkedin') || domain.includes('twitter') || domain.includes('linkedin')) {
    return { icon: Globe, iconColor: 'text-sky-400', gradient: 'from-sky-500/20 to-blue-500/10', bgGlow: 'shadow-sky-500/10' };
  }
  if (name.includes('shopping') || name.includes('amazon') || name.includes('ebay') || domain.includes('amazon') || domain.includes('ebay')) {
    return { icon: ShoppingBag, iconColor: 'text-orange-400', gradient: 'from-amber-600/20 to-orange-500/10', bgGlow: 'shadow-orange-500/10' };
  }
  if (name.includes('chat') || name.includes('whatsapp') || name.includes('discord') || name.includes('slack') || domain.includes('whatsapp') || domain.includes('discord')) {
    return { icon: MessageSquare, iconColor: 'text-emerald-400', gradient: 'from-emerald-500/20 to-teal-500/10', bgGlow: 'shadow-emerald-500/10' };
  }
  if (name.includes('work') || name.includes('office') || name.includes('job') || name.includes('corporate')) {
    return { icon: Briefcase, iconColor: 'text-indigo-400', gradient: 'from-indigo-500/20 to-violet-500/10', bgGlow: 'shadow-indigo-500/10' };
  }
  return { icon: Key, iconColor: 'text-violet-300', gradient: 'from-violet-500/20 to-fuchsia-500/10', bgGlow: 'shadow-violet-500/10' };
};

// Mapped static note categories with custom logos/emojis
const NOTE_CATEGORIES = [
  { name: '🛡️ SonicWall Firewall', icon: Shield, color: 'text-orange-400', gradient: 'from-orange-500/20 to-yellow-500/10', shadow: 'shadow-orange-500/10' },
  { name: '🟦 Sophos Firewall', icon: Shield, color: 'text-blue-400', gradient: 'from-blue-500/20 to-indigo-500/10', shadow: 'shadow-blue-500/10' },
  { name: '🌐 Networking', icon: Globe, color: 'text-teal-400', gradient: 'from-teal-500/20 to-cyan-500/10', shadow: 'shadow-teal-500/10' },
  { name: '🖥 Windows Server', icon: Tv, color: 'text-sky-400', gradient: 'from-sky-500/20 to-indigo-500/10', shadow: 'shadow-sky-500/10' },
  { name: '☁ Microsoft 365', icon: Globe, color: 'text-blue-300', gradient: 'from-blue-400/20 to-sky-400/10', shadow: 'shadow-blue-400/10' },
  { name: '🐧 Linux', icon: Folder, color: 'text-yellow-500', gradient: 'from-yellow-500/20 to-amber-500/10', shadow: 'shadow-yellow-500/10' },
  { name: '🗄 SQL Database', icon: CreditCard, color: 'text-red-400', gradient: 'from-red-500/20 to-pink-500/10', shadow: 'shadow-red-500/10' },
  { name: '💻 Programming', icon: Folder, color: 'text-green-400', gradient: 'from-green-500/20 to-emerald-500/10', shadow: 'shadow-green-500/10' },
  { name: '📂 Projects', icon: Briefcase, color: 'text-purple-400', gradient: 'from-purple-500/20 to-pink-500/10', shadow: 'shadow-purple-500/10' },
  { name: '📑 Documentation', icon: FileText, color: 'text-slate-300', gradient: 'from-zinc-400/20 to-slate-500/10', shadow: 'shadow-slate-400/10' },
  { name: '🔒 Security', icon: Lock, color: 'text-rose-400', gradient: 'from-rose-500/20 to-red-500/10', shadow: 'shadow-rose-500/10' },
  { name: '📚 Study', icon: FileText, color: 'text-violet-400', gradient: 'from-violet-500/20 to-purple-500/10', shadow: 'shadow-violet-500/10' },
  { name: '📝 Personal', icon: MessageSquare, color: 'text-pink-400', gradient: 'from-pink-500/20 to-rose-500/10', shadow: 'shadow-pink-500/10' },
  { name: '💰 Finance', icon: CreditCard, color: 'text-emerald-400', gradient: 'from-emerald-500/20 to-green-500/10', shadow: 'shadow-emerald-500/10' }
];

export default function VaultView() {
  const { 
    settings, vaultEntries, secureNotes, vaultLocked, vaultKeyInMemory,
    addVaultEntry, deleteVaultEntry, addSecureNote, deleteSecureNote, 
    updateSecureNote, duplicateSecureNote, lockVault
  } = useReminderStore();

  const [activeTab, setActiveTab] = useState<'credentials' | 'notes'>('credentials');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Navigation & Category Filtering
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedNoteCategory, setSelectedNoteCategory] = useState<string | null>(null);

  // Folder Navigation for Notes
  const [notesFilter, setNotesFilter] = useState<'active' | 'archive' | 'trash'>('active');

  // Modals / Sheets
  const [isAddEntryOpen, setIsAddEntryOpen] = useState(false);
  const [isAddNoteOpen, setIsAddNoteOpen] = useState(false);
  const [isEditNoteOpen, setIsEditNoteOpen] = useState(false);

  // Drawing Canvas State
  const [isDrawingOpen, setIsDrawingOpen] = useState(false);
  const drawingCanvasRef = useRef<HTMLCanvasElement>(null);
  const [drawingColor, setDrawingColor] = useState('#ff9f0a');
  const [drawingBrushSize, setDrawingBrushSize] = useState(5);
  const [isDrawing, setIsDrawing] = useState(false);

  // Voice Recorder State
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const [recordingSeconds, setRecordingSeconds] = useState(0);

  // Password Reveal (Credentials)
  const [revealedPasswords, setRevealedPasswords] = useState<Record<string, string>>({});
  const [expandedEntryId, setExpandedEntryId] = useState<string | null>(null);

  // Note Lock screen password validation
  const [isNoteLockPromptOpen, setIsNoteLockPromptOpen] = useState(false);
  const [noteToUnlock, setNoteToUnlock] = useState<SecureNote | null>(null);
  const [noteLockPassword, setNoteLockPassword] = useState('');
  const [noteLockError, setNoteLockError] = useState('');

  // Sorting notes state
  const [notesSortOption, setNotesSortOption] = useState<'updated' | 'created' | 'title' | 'favorite'>('updated');

  // New credential inputs
  const [siteName, setSiteName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [url, setUrl] = useState('');
  const [entryNotes, setEntryNotes] = useState('');
  
  // Category settings (Credentials)
  const [categoryType, setCategoryType] = useState<'select' | 'custom'>('select');
  const [selectedCategoryName, setSelectedCategoryName] = useState('Gmail');
  const [customCategoryName, setCustomCategoryName] = useState('');

  // Notes inputs
  const [noteTitle, setNoteTitle] = useState('');
  const [noteBody, setNoteBody] = useState('');
  const [noteDesc, setNoteDesc] = useState('');
  const [noteTagsText, setNoteTagsText] = useState('');
  const [noteColorLabel, setNoteColorLabel] = useState('#3b82f6');
  const [noteAttachments, setNoteAttachments] = useState<Attachment[]>([]);
  const [noteCategorySelect, setNoteCategorySelect] = useState('🛡️ SonicWall Firewall');
  const [noteCategoryType, setNoteCategoryType] = useState<'select' | 'custom'>('select');
  const [noteCustomCategory, setNoteCustomCategory] = useState('');

  // Selected note for editing
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

  // Recording timer
  useEffect(() => {
    let t: any;
    if (isRecording) {
      t = setInterval(() => setRecordingSeconds(s => s + 1), 1000);
    } else {
      setRecordingSeconds(0);
    }
    return () => clearInterval(t);
  }, [isRecording]);

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

  // ─── APPLE SECURE NOTE HANDLERS ────────────────────────────────────────────

  const handleSaveNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteTitle.trim()) {
      showToast('Note requires a title');
      return;
    }

    const finalNoteCat = noteCategoryType === 'select' ? noteCategorySelect : noteCustomCategory.trim();
    if (!finalNoteCat) {
      showToast('Category is required');
      return;
    }

    const tagsArray = noteTagsText.split(',').map(t => t.trim()).filter(Boolean);

    await addSecureNote({
      title: noteTitle,
      body: noteBody,
      category: finalNoteCat,
      description: noteDesc,
      tags: tagsArray,
      isFavorite: false,
      isPinned: false,
      isArchived: false,
      isTrash: false,
      colorLabel: noteColorLabel,
      isLocked: false,
      attachments: noteAttachments
    });

    showToast('Note created successfully!');
    setIsAddNoteOpen(false);
    resetNoteForm();
  };

  const handleUpdateNoteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedNoteId || !noteTitle.trim()) return;

    const finalNoteCat = noteCategoryType === 'select' ? noteCategorySelect : noteCustomCategory.trim();
    const tagsArray = noteTagsText.split(',').map(t => t.trim()).filter(Boolean);

    await updateSecureNote(selectedNoteId, {
      title: noteTitle,
      body: noteBody,
      category: finalNoteCat || '📝 Personal',
      description: noteDesc,
      tags: tagsArray,
      colorLabel: noteColorLabel,
      attachments: noteAttachments
    });

    showToast('Note updated successfully!');
    setIsEditNoteOpen(false);
    resetNoteForm();
  };

  const resetNoteForm = () => {
    setSelectedNoteId(null);
    setNoteTitle('');
    setNoteBody('');
    setNoteDesc('');
    setNoteTagsText('');
    setNoteColorLabel('#3b82f6');
    setNoteAttachments([]);
    setNoteCustomCategory('');
    setNoteCategoryType('select');
  };

  const openEditNote = (note: SecureNote) => {
    if (note.isLocked) {
      setNoteToUnlock(note);
      setIsNoteLockPromptOpen(true);
      return;
    }
    loadNoteForEditing(note);
  };

  const loadNoteForEditing = (note: SecureNote) => {
    setSelectedNoteId(note.id);
    setNoteTitle(note.title);
    setNoteBody(note.body);
    setNoteDesc(note.description || '');
    setNoteTagsText(note.tags ? note.tags.join(', ') : '');
    setNoteColorLabel(note.colorLabel || '#3b82f6');
    setNoteAttachments(note.attachments || []);
    
    // Check if category is standard
    const isStandard = NOTE_CATEGORIES.some(c => c.name === note.category);
    if (isStandard) {
      setNoteCategorySelect(note.category);
      setNoteCategoryType('select');
    } else {
      setNoteCustomCategory(note.category || '');
      setNoteCategoryType('custom');
    }
    setIsEditNoteOpen(true);
  };

  const handleUnlockNoteWithPin = async () => {
    if (!noteToUnlock) return;
    const correctHash = settings.vaultPinHash || '';
    const salt = settings.vaultPinSalt || '';
    const hash = await hashPin(noteLockPassword, salt);
    if (hash === correctHash) {
      setIsNoteLockPromptOpen(false);
      setNoteLockPassword('');
      setNoteLockError('');
      loadNoteForEditing(noteToUnlock);
      setNoteToUnlock(null);
    } else {
      setNoteLockError('Incorrect PIN. Authentication failed.');
    }
  };

  // ─── DRAWING CANVAS HANDLERS ───────────────────────────────────────────────

  const startDrawing = (e: any) => {
    const canvas = drawingCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Coordinate mapping
    const rect = canvas.getBoundingClientRect();
    const clientX = e.clientX ?? e.touches?.[0]?.clientX;
    const clientY = e.clientY ?? e.touches?.[0]?.clientY;
    if (clientX === undefined || clientY === undefined) return;
    
    const x = clientX - rect.left;
    const y = clientY - rect.top;

    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.strokeStyle = drawingColor;
    ctx.lineWidth = drawingBrushSize;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    setIsDrawing(true);
  };

  const draw = (e: any) => {
    if (!isDrawing) return;
    const canvas = drawingCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const clientX = e.clientX ?? e.touches?.[0]?.clientX;
    const clientY = e.clientY ?? e.touches?.[0]?.clientY;
    if (clientX === undefined || clientY === undefined) return;

    const x = clientX - rect.left;
    const y = clientY - rect.top;

    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawingMode = () => {
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = drawingCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  const saveDrawingAttachment = () => {
    const canvas = drawingCanvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL('image/png');
    const newAttach: Attachment = {
      id: crypto.randomUUID(),
      name: `Drawing_${Date.now().toString().slice(-4)}.png`,
      type: 'draw',
      dataUrl
    };
    setNoteAttachments(prev => [...prev, newAttach]);
    setIsDrawingOpen(false);
    showToast('Drawing saved as attachment');
  };

  // ─── VOICE RECORDER HANDLERS ───────────────────────────────────────────────

  const startVoiceRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
        const reader = new FileReader();
        reader.onloadend = () => {
          const dataUrl = reader.result as string;
          const newAttach: Attachment = {
            id: crypto.randomUUID(),
            name: `Audio_Note_${Date.now().toString().slice(-4)}.wav`,
            type: 'voice',
            dataUrl
          };
          setNoteAttachments(prev => [...prev, newAttach]);
          showToast('Voice note added to attachments');
        };
        reader.readAsDataURL(audioBlob);
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      alert("Microphone permission denied or not supported.");
    }
  };

  const stopVoiceRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  // ─── UPLOADS & FILE HANDLING ────────────────────────────────────────────────

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, type: 'image' | 'pdf' | 'file') => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const file = files[0];

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      const newAttach: Attachment = {
        id: crypto.randomUUID(),
        name: file.name,
        type: type,
        dataUrl
      };
      setNoteAttachments(prev => [...prev, newAttach]);
      showToast(`${file.name} attached successfully!`);
    };
    reader.readAsDataURL(file);
  };

  // ─── IMPORT & EXPORT HANDLERS ──────────────────────────────────────────────

  const exportNoteToDisk = (note: SecureNote, format: 'json' | 'txt' | 'md') => {
    let content = '';
    let mimeType = 'text/plain';

    if (format === 'json') {
      content = JSON.stringify(note, null, 2);
      mimeType = 'application/json';
    } else if (format === 'md') {
      content = `# ${note.title}\n\n${note.description ? `*${note.description}*\n\n` : ''}${note.body}`;
      mimeType = 'text/markdown';
    } else {
      content = `Title: ${note.title}\nDescription: ${note.description || 'None'}\n\n${note.body}`;
    }

    const blob = new Blob([content], { type: mimeType });
    const blobUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = `${note.title.replace(/[\s\W]+/g, '_')}.${format}`;
    link.click();
    showToast(`Note exported as ${format.toUpperCase()}`);
  };

  const handleImportNote = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const file = files[0];

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const text = event.target?.result as string;
        if (file.name.endsWith('.json')) {
          const parsed = JSON.parse(text);
          await addSecureNote({
            title: parsed.title || 'Imported JSON Note',
            body: parsed.body || '',
            category: parsed.category || '📝 Personal',
            description: parsed.description || '',
            tags: parsed.tags || [],
            isFavorite: false,
            isPinned: false,
            isArchived: false,
            isTrash: false,
            colorLabel: parsed.colorLabel || '#3b82f6',
            isLocked: false,
            attachments: parsed.attachments || []
          });
        } else {
          // MD or TXT file fallback
          await addSecureNote({
            title: file.name.replace(/\.[^/.]+$/, ""),
            body: text,
            category: '📝 Personal',
            tags: ['imported'],
            isFavorite: false,
            isPinned: false,
            isArchived: false,
            isTrash: false,
            isLocked: false,
            attachments: []
          });
        }
        showToast('Note imported successfully!');
      } catch (err) {
        showToast('Failed to parse and import note');
      }
    };
    reader.readAsText(file);
  };

  // ─── APPLE NOTE CARD RENDER FUNCTION ───────────────────────────────────────
  function renderAppleNoteCard(note: SecureNote) {
    const cleanDate = new Date(note.updatedAt).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric'
    });
    const snippet = note.body ? note.body.slice(0, 70) : 'No content';
    const hasImages = note.attachments?.some(a => a.type === 'image' || a.type === 'draw');
    const hasAudio = note.attachments?.some(a => a.type === 'voice');
    const hasFiles = note.attachments?.some(a => a.type === 'file' || a.type === 'pdf');

    return (
      <motion.div
        layout
        key={note.id}
        whileHover={{ scale: 1.02 }}
        className="glass-panel p-4 rounded-2xl border relative overflow-hidden flex flex-col gap-2 shadow-md group animate-fade-in"
        style={{ 
          background: `linear-gradient(135deg, ${(note.colorLabel || '#ff9f0a')}12, rgba(24, 23, 40, 0.5))`, 
          borderColor: `${(note.colorLabel || '#ff9f0a')}33` 
        }}
      >
        {/* Color accent label line */}
        <div className="absolute top-0 left-0 w-1.5 h-full" style={{ backgroundColor: note.colorLabel || '#ff9f0a' }} />
        
        {/* Card Header title info */}
        <div className="flex justify-between items-start pl-2">
          <div className="flex-1" onClick={() => openEditNote(note)}>
            <h3 
              className="text-xs font-bold leading-snug line-clamp-1 cursor-pointer hover:opacity-85 transition-opacity flex items-center gap-1.5"
              style={{ color: note.colorLabel || '#ffffff' }}
            >
              {note.isLocked && <LockKeyhole size={11} className="text-amber-500 shrink-0" />}
              {note.title}
            </h3>
            {note.description && (
              <p className="text-[10px] text-white/40 mt-0.5 line-clamp-1">{note.description}</p>
            )}
          </div>

          {/* Actions row */}
          <div className="flex items-center gap-1 shrink-0 ml-1">
            {/* Pin button */}
            <button
              onClick={() => updateSecureNote(note.id, { isPinned: !note.isPinned })}
              className={`p-1 hover:text-amber-400 transition-colors ${note.isPinned ? 'text-amber-400' : 'text-white/20'}`}
            >
              <Pin size={10} className="rotate-45" />
            </button>
            {/* Favorite button */}
            <button
              onClick={() => updateSecureNote(note.id, { isFavorite: !note.isFavorite })}
              className={`p-1 hover:text-[#ff9f0a] transition-colors ${note.isFavorite ? 'text-[#ff9f0a]' : 'text-white/20'}`}
            >
              <Star size={10} fill={note.isFavorite ? '#ff9f0a' : 'none'} />
            </button>
            {/* Lock Note */}
            <button
              onClick={() => updateSecureNote(note.id, { isLocked: !note.isLocked })}
              className={`p-1 hover:text-amber-500 transition-colors ${note.isLocked ? 'text-amber-500' : 'text-white/20'}`}
              title={note.isLocked ? "Unlock Note Settings" : "Lock Note"}
            >
              {note.isLocked ? <LockKeyhole size={10} /> : <LockKeyholeOpen size={10} />}
            </button>
          </div>
        </div>

        {/* Note Snippet */}
        <div className="pl-2 pr-1" onClick={() => openEditNote(note)}>
          <p className="text-[10px] text-white/60 leading-normal line-clamp-2 cursor-pointer">{snippet}</p>
        </div>

        {/* Tags and Attachment badges footer */}
        <div className="flex items-center justify-between border-t border-white/5 pt-2 pl-2 text-[9px] text-white/30 shrink-0 font-semibold uppercase">
          <div className="flex items-center gap-1.5 flex-wrap">
            <Calendar size={9} />
            <span>{cleanDate}</span>
            
            {/* Tags mapping */}
            {note.tags && note.tags.slice(0, 3).map(tag => (
              <span key={tag} className="bg-white/5 border border-white/8 text-white/50 px-1.5 py-0.5 rounded text-[8px] font-bold">
                #{tag}
              </span>
            ))}
          </div>

          {/* Attachments preview indicators */}
          <div className="flex items-center gap-2 text-white/40 font-bold shrink-0">
            {hasImages && <Image size={10} className="text-[#ff9f0a]" />}
            {hasAudio && <Mic size={10} className="text-[#ff9f0a]" />}
            {hasFiles && <FileText size={10} className="text-[#ff9f0a]" />}
            
            {/* Delete / Trash actions */}
            {note.isTrash ? (
              <button 
                onClick={() => deleteSecureNote(note.id)}
                className="text-red-400 hover:text-red-300 ml-1 p-0.5 font-bold"
                title="Delete permanently"
              >
                Delete
              </button>
            ) : (
              <div className="flex gap-1.5 items-center">
                <button
                  onClick={() => updateSecureNote(note.id, { isArchived: !note.isArchived })}
                  className="hover:text-[#ff9f0a] px-1 py-0.5 rounded bg-white/3 border border-white/5"
                >
                  {note.isArchived ? 'Unarch' : 'Arch'}
                </button>
                <button
                  onClick={() => updateSecureNote(note.id, { isTrash: true })}
                  className="hover:text-red-400 text-red-500/60 p-0.5"
                  title="Move to Trash"
                >
                  <Trash size={10} />
                </button>
              </div>
            )}
          </div>
        </div>

      </motion.div>
    );
  }

  // ─── DYNAMIC GROUPS & SORTING COMPUTATION ────────────────────────────────────

  // Get credentials dynamically grouped by category
  const categoriesGroup = vaultEntries.reduce<Record<string, VaultEntry[]>>((acc, entry) => {
    const cat = entry.category || 'Other';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(entry);
    return acc;
  }, {});

  const allCategoryNames = Object.keys(categoriesGroup).sort();

  // Search filtering (Credentials)
  const filteredCategoryNames = allCategoryNames.filter(name => {
    const entries = categoriesGroup[name];
    const matchCatName = name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchInnerEntries = entries.some(e => 
      e.siteName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.username.toLowerCase().includes(searchQuery.toLowerCase())
    );
    return matchCatName || matchInnerEntries;
  });

  // Filter notes by directory (Active, Archive, Trash)
  const directoryNotes = secureNotes.filter(n => {
    if (notesFilter === 'trash') return n.isTrash;
    if (notesFilter === 'archive') return n.isArchived && !n.isTrash;
    return !n.isArchived && !n.isTrash;
  });

  // Filter notes by category selection
  const categoryFilteredNotes = selectedNoteCategory 
    ? directoryNotes.filter(n => n.category === selectedNoteCategory)
    : directoryNotes;

  // Search filtering (Notes)
  const filteredNotes = categoryFilteredNotes.filter(note =>
    note.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    note.body.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (note.tags && note.tags.some(t => t.toLowerCase().includes(searchQuery.toLowerCase())))
  );

  // Sorting
  const sortedNotes = [...filteredNotes].sort((a, b) => {
    if (notesSortOption === 'favorite') {
      return (b.isFavorite ? 1 : 0) - (a.isFavorite ? 1 : 0);
    }
    if (notesSortOption === 'title') {
      return a.title.localeCompare(b.title);
    }
    if (notesSortOption === 'created') {
      return b.createdAt - a.createdAt;
    }
    return b.updatedAt - a.updatedAt; // updated default
  });

  // Separate Pinned and Unpinned
  const pinnedNotes = sortedNotes.filter(n => n.isPinned);
  const unpinnedNotes = sortedNotes.filter(n => !n.isPinned);

  // Category statistics computation
  const noteCategoryCounts = NOTE_CATEGORIES.reduce<Record<string, number>>((acc, cat) => {
    acc[cat.name] = secureNotes.filter(n => n.category === cat.name && !n.isTrash && !n.isArchived).length;
    return acc;
  }, {});

  // Identify any custom note categories
  const customNoteCategories = Array.from(new Set(
    secureNotes
      .map(n => n.category)
      .filter(cat => cat && !NOTE_CATEGORIES.some(c => c.name === cat))
  )).sort();

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-[#0a0915] text-white relative">
      {/* Glow Backdrop */}
      <div className="absolute top-0 left-0 w-full h-64 bg-gradient-to-b from-violet-900/10 via-[#0a0915] to-[#0a0915] pointer-events-none z-0" />

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
            onClick={() => { setActiveTab('notes'); setSearchQuery(''); setSelectedNoteCategory(null); }}
            className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
              activeTab === 'notes' 
                ? 'bg-[#ff9f0a] text-black shadow-md shadow-amber-950/30' 
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
                : "Search title, tag, content..."
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
          /* ==================== CREDENTIALS MAIN TAB ==================== */
          selectedCategory === null ? (
            /* CATEGORY GRID LIST VIEW */
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
                      <div className="absolute -top-10 -right-10 w-24 h-24 bg-gradient-to-br from-violet-600/10 to-transparent rounded-full blur-2xl group-hover:scale-125 transition-transform" />
                      
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
            /* ACCORDION LIST FOR SELECTED CATEGORY */
            <div className="flex flex-col gap-3">
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
          /* ==================== SECURE NOTES MODULE REDESIGN ==================== */
          selectedNoteCategory === null ? (
            /* ─── KNOWLEDGE DASHBOARD (Samsung/Keep 3D Glass Category Grid) ─── */
            <div className="flex flex-col gap-4 animate-fade-in">
              
              {/* Directory Filter tabs */}
              <div className="flex items-center gap-2 mb-1 shrink-0 overflow-x-auto pb-1 text-[10px] font-bold">
                <button
                  onClick={() => setNotesFilter('active')}
                  className={`px-3 py-1.5 rounded-lg border transition-all duration-300 flex items-center gap-1.5 ${
                    notesFilter === 'active' 
                      ? 'bg-amber-500/10 border-[#ff9f0a] text-[#ff9f0a]' 
                      : 'bg-white/3 border-white/5 text-white/55 hover:text-white/80'
                  }`}
                >
                  <FileText size={11} />
                  Active Notes
                </button>
                <button
                  onClick={() => setNotesFilter('archive')}
                  className={`px-3 py-1.5 rounded-lg border transition-all duration-300 flex items-center gap-1.5 ${
                    notesFilter === 'archive' 
                      ? 'bg-amber-500/10 border-[#ff9f0a] text-[#ff9f0a]' 
                      : 'bg-white/3 border-white/5 text-white/55 hover:text-white/80'
                  }`}
                >
                  <Archive size={11} />
                  Archive
                </button>
                <button
                  onClick={() => setNotesFilter('trash')}
                  className={`px-3 py-1.5 rounded-lg border transition-all duration-300 flex items-center gap-1.5 ${
                    notesFilter === 'trash' 
                      ? 'bg-amber-500/10 border-[#ff9f0a] text-[#ff9f0a]' 
                      : 'bg-white/3 border-white/5 text-white/55 hover:text-white/80'
                  }`}
                >
                  <Trash size={11} />
                  Trash
                </button>

                {/* Import Notes trigger */}
                <label className="ml-auto px-3 py-1.5 rounded-lg border bg-white/3 border-white/5 text-white/55 hover:text-white/80 cursor-pointer flex items-center gap-1.5">
                  <Upload size={11} />
                  Import
                  <input
                    type="file"
                    accept=".json,.txt,.md"
                    onChange={handleImportNote}
                    className="hidden"
                  />
                </label>
              </div>

              {/* Apple-style 3D Glass Category Grid */}
              <h2 className="text-xs font-bold text-white/40 tracking-wider uppercase mb-1">Knowledge Hub Categories</h2>
              
              <div className="grid grid-cols-2 gap-3.5">
                {NOTE_CATEGORIES.map(cat => {
                  const count = noteCategoryCounts[cat.name] || 0;
                  const Icon = cat.icon;

                  return (
                    <motion.button
                      whileHover={{ scale: 1.03, y: -3 }}
                      whileTap={{ scale: 0.97 }}
                      key={cat.name}
                      onClick={() => setSelectedNoteCategory(cat.name)}
                      className={`glass-panel text-left p-4 rounded-2xl border border-white/8 hover:border-amber-500/20 transition-all flex flex-col justify-between h-36 relative overflow-hidden group shadow-lg ${cat.shadow}`}
                    >
                      {/* Hover Reflection Overlay */}
                      <div className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/2 to-white/0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-out" />
                      
                      <div className="flex justify-between items-start">
                        <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${cat.gradient} border border-white/10 flex items-center justify-center shadow-inner`}>
                          <Icon size={20} className={cat.color} />
                        </div>
                        {count > 0 && (
                          <span className="text-[9px] bg-amber-500/10 border border-[#ff9f0a]/30 text-[#ff9f0a] px-2 py-0.5 rounded-full font-bold">
                            {count}
                          </span>
                        )}
                      </div>

                      <div className="mt-3">
                        <h3 className="text-xs font-bold text-white/95 line-clamp-2 leading-snug">{cat.name.replace(/^[^\s]+\s+/, '')}</h3>
                        <p className="text-[8px] text-white/35 mt-1 font-semibold uppercase tracking-wider">
                          Updated Today
                        </p>
                      </div>
                    </motion.button>
                  );
                })}

                {/* Render Custom categories dynamically */}
                {customNoteCategories.map(catName => {
                  const count = secureNotes.filter(n => n.category === catName && !n.isTrash && !n.isArchived).length;
                  return (
                    <motion.button
                      whileHover={{ scale: 1.03, y: -3 }}
                      whileTap={{ scale: 0.97 }}
                      key={catName}
                      onClick={() => setSelectedNoteCategory(catName)}
                      className="glass-panel text-left p-4 rounded-2xl border border-white/8 hover:border-amber-500/20 transition-all flex flex-col justify-between h-36 relative overflow-hidden group shadow-lg"
                    >
                      <div className="flex justify-between items-start">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500/10 to-fuchsia-500/10 border border-white/10 flex items-center justify-center">
                          <Folder size={18} className="text-violet-400" />
                        </div>
                        {count > 0 && (
                          <span className="text-[9px] bg-amber-500/10 border border-[#ff9f0a]/30 text-[#ff9f0a] px-2 py-0.5 rounded-full font-bold">
                            {count}
                          </span>
                        )}
                      </div>

                      <div className="mt-3">
                        <h3 className="text-xs font-bold text-white/95 line-clamp-2 leading-snug">{catName}</h3>
                        <p className="text-[8px] text-white/35 mt-1 font-semibold uppercase tracking-wider">
                          Custom Folder
                        </p>
                      </div>
                    </motion.button>
                  );
                })}
              </div>
            </div>
          ) : (
            /* ─── DEDICATED CATEGORY DETAIL PAGE (Notion/Samsung List) ─── */
            <div className="flex flex-col gap-3.5 animate-fade-in">
              
              {/* Back breadcrumb and Search sorting header */}
              <div className="flex items-center justify-between mb-2">
                <button
                  onClick={() => setSelectedNoteCategory(null)}
                  className="flex items-center gap-1.5 text-xs font-bold text-[#ff9f0a] hover:underline"
                >
                  <ArrowLeft size={13} />
                  Category Hub
                </button>

                {/* Notes Sorter */}
                <select
                  value={notesSortOption}
                  onChange={(e: any) => setNotesSortOption(e.target.value)}
                  className="bg-white/5 border border-white/8 rounded-lg px-2 py-1 text-[10px] text-white/70 outline-none"
                >
                  <option value="updated">Sort: Edited</option>
                  <option value="created">Sort: Created</option>
                  <option value="title">Sort: Title</option>
                  <option value="favorite">Sort: Favorites</option>
                </select>
              </div>

              <h2 className="text-sm font-bold font-display text-white/90 px-1 flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#ff9f0a] animate-pulse" />
                {selectedNoteCategory}
              </h2>

              {/* Render Notes list grouped by Pinned & Normal (Apple Notes style) */}
              <div className="flex flex-col gap-4">
                
                {/* 1. PINNED SECTION */}
                {pinnedNotes.length > 0 && (
                  <div className="flex flex-col gap-2">
                    <span className="text-[9px] uppercase font-bold text-[#ff9f0a] tracking-wider px-1 flex items-center gap-1">
                      <Pin size={10} className="rotate-45" /> Pinned Notes
                    </span>
                    <div className="flex flex-col gap-3">
                      {pinnedNotes.map(note => renderAppleNoteCard(note))}
                    </div>
                  </div>
                )}

                {/* 2. UNPINNED SECTION */}
                <div className="flex flex-col gap-2">
                  {pinnedNotes.length > 0 && unpinnedNotes.length > 0 && (
                    <span className="text-[9px] uppercase font-bold text-white/30 tracking-wider px-1">Notes</span>
                  )}
                  <div className="flex flex-col gap-3">
                    {unpinnedNotes.length === 0 && pinnedNotes.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-16 text-center">
                        <Folder size={28} className="text-white/20 mb-2" />
                        <p className="text-xs text-white/50 font-semibold">No notes in this category</p>
                      </div>
                    ) : (
                      unpinnedNotes.map(note => renderAppleNoteCard(note))
                    )}
                  </div>
                </div>

              </div>

            </div>
          ))}
      </div>

      {/* Floating Add trigger */}
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
          {activeTab === 'notes' ? <SquarePen size={20} /> : <Plus size={24} />}
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
            <Shield size={12} className="text-violet-400" />
            {toastMessage}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── ADD SECURE NOTE MODAL SHEET ────────────────────────────────────────── */}
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
              className="relative w-full max-w-sm bg-[#1c1c1e] rounded-t-3xl border-t border-white/15 p-5 pb-8 shadow-2xl flex flex-col max-h-[92vh] overflow-y-auto"
            >
              {/* Apple Note Style Header */}
              <div className="flex items-center justify-between mb-4 border-b border-white/5 pb-3 shrink-0">
                <span className="text-xs font-bold text-white/50">Folders / Quick Note</span>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setIsDrawingOpen(true)}
                    className="text-xs font-bold text-[#ff9f0a] hover:underline"
                  >
                    Draw
                  </button>
                  <button
                    onClick={handleSaveNote}
                    className="text-xs font-bold text-[#ff9f0a] hover:text-amber-400 transition-colors"
                  >
                    Done
                  </button>
                </div>
              </div>

              <form onSubmit={handleSaveNote} className="flex flex-col gap-4 text-xs">
                
                {/* Note Title */}
                <input
                  required
                  type="text"
                  value={noteTitle}
                  onChange={e => setNoteTitle(e.target.value)}
                  placeholder="Note Title"
                  className="w-full bg-transparent text-white font-bold text-base placeholder-white/30 outline-none border-none py-1"
                />

                {/* Subtitle / Description */}
                <input
                  type="text"
                  value={noteDesc}
                  onChange={e => setNoteDesc(e.target.value)}
                  placeholder="Subheading / description snippet"
                  className="w-full bg-transparent text-white/50 placeholder-white/20 outline-none border-none pb-1"
                />

                {/* Note Content */}
                <textarea
                  value={noteBody}
                  onChange={e => setNoteBody(e.target.value)}
                  placeholder="Start writing note contents here..."
                  rows={8}
                  className="w-full bg-transparent text-white/80 placeholder-white/20 outline-none border-none resize-none leading-relaxed text-xs py-1 min-h-[120px]"
                />

                {/* Category & Tags Selector */}
                <div className="border-t border-white/5 pt-3 flex flex-col gap-3 shrink-0">
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] uppercase font-bold text-white/40 tracking-wider">Note Category</span>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setNoteCategoryType('select')}
                        className={`px-2.5 py-1 border rounded-lg text-[8px] font-semibold transition-colors ${
                          noteCategoryType === 'select' 
                            ? 'bg-amber-500/10 border-amber-500/40 text-amber-300' 
                            : 'bg-white/2 border-white/5 text-white/60 hover:text-white'
                        }`}
                      >
                        Select Brand
                      </button>
                      <button
                        type="button"
                        onClick={() => setNoteCategoryType('custom')}
                        className={`px-2.5 py-1 border rounded-lg text-[8px] font-semibold transition-colors ${
                          noteCategoryType === 'custom' 
                            ? 'bg-amber-500/10 border-amber-500/40 text-amber-300' 
                            : 'bg-white/2 border-white/5 text-white/60 hover:text-white'
                        }`}
                      >
                        + Custom
                      </button>
                    </div>
                  </div>

                  {noteCategoryType === 'select' ? (
                    <select
                      value={noteCategorySelect}
                      onChange={e => setNoteCategorySelect(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white outline-none focus:border-amber-500/40"
                    >
                      {NOTE_CATEGORIES.map(c => (
                        <option key={c.name} value={c.name}>{c.name}</option>
                      ))}
                    </select>
                  ) : (
                    <input
                      required={noteCategoryType === 'custom'}
                      type="text"
                      value={noteCustomCategory}
                      onChange={e => setNoteCustomCategory(e.target.value)}
                      placeholder="e.g. 🐧 Linux, 🔒 Security"
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white outline-none focus:border-amber-500/40"
                    />
                  )}

                  {/* Note Tags comma separated */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[9px] uppercase font-bold text-white/40 tracking-wider">Tags (comma-separated)</label>
                    <input
                      type="text"
                      value={noteTagsText}
                      onChange={e => setNoteTagsText(e.target.value)}
                      placeholder="e.g. firewall, backup, commands"
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white outline-none focus:border-amber-500/40"
                    />
                  </div>

                  {/* Note Color Picker label line */}
                  <div className="flex items-center justify-between">
                    <label className="text-[9px] uppercase font-bold text-white/40 tracking-wider">Color Label Indicator</label>
                    <div className="flex gap-2">
                      {['#ff9f0a', '#ef4444', '#3b82f6', '#10b981', '#a855f7'].map(color => (
                        <button
                          key={color}
                          type="button"
                          onClick={() => setNoteColorLabel(color)}
                          className={`w-4 h-4 rounded-full border ${noteColorLabel === color ? 'border-white scale-110' : 'border-transparent'}`}
                          style={{ backgroundColor: color }}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Attachments listing */}
                  {noteAttachments.length > 0 && (
                    <div className="flex flex-col gap-1.5">
                      <span className="text-[9px] uppercase font-bold text-white/40 tracking-wider">Attachments ({noteAttachments.length})</span>
                      <div className="grid grid-cols-2 gap-2 max-h-28 overflow-y-auto">
                        {noteAttachments.map(att => (
                          <div key={att.id} className="bg-white/5 border border-white/8 rounded-lg p-1.5 flex items-center justify-between gap-1.5">
                            <span className="text-[9px] text-white/60 line-clamp-1">{att.name}</span>
                            <button
                              type="button"
                              onClick={() => setNoteAttachments(prev => prev.filter(a => a.id !== att.id))}
                              className="text-red-400"
                            >
                              <X size={10} />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Apple Notes styled Mock formatting toolbar at bottom */}
                  <div className="border-t border-white/5 pt-3 mt-1 flex items-center justify-between text-white/40 shrink-0">
                    <div className="flex items-center gap-3">
                      {/* Rich inputs handlers */}
                      <label className="p-1 hover:text-[#ff9f0a] transition-colors cursor-pointer">
                        <Image size={15} />
                        <input
                          type="file"
                          accept="image/*"
                          onChange={e => handleFileUpload(e, 'image')}
                          className="hidden"
                        />
                      </label>
                      <label className="p-1 hover:text-[#ff9f0a] transition-colors cursor-pointer">
                        <FileText size={15} />
                        <input
                          type="file"
                          accept=".pdf"
                          onChange={e => handleFileUpload(e, 'pdf')}
                          className="hidden"
                        />
                      </label>
                      <button 
                        type="button" 
                        onClick={isRecording ? stopVoiceRecording : startVoiceRecording}
                        className={`p-1 hover:text-[#ff9f0a] transition-colors ${isRecording ? 'text-red-500 animate-pulse' : ''}`}
                      >
                        <Mic size={15} />
                      </button>
                    </div>
                    {isRecording && <span className="text-[9px] text-red-500 animate-pulse">Recording ({recordingSeconds}s)</span>}
                    <span className="text-[8px] font-bold text-white/20 uppercase tracking-widest">Apple Notes System</span>
                  </div>

                </div>

              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── EDIT/VIEW SECURE NOTE MODAL SHEET ─────────────────────────────────── */}
      <AnimatePresence>
        {isEditNoteOpen && selectedNoteId && (
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
              className="relative w-full max-w-sm bg-[#1c1c1e] rounded-t-3xl border-t border-white/15 p-5 pb-8 shadow-2xl flex flex-col max-h-[92vh] overflow-y-auto"
            >
              {/* Apple Note Style Header */}
              <div className="flex items-center justify-between mb-4 border-b border-white/5 pb-3 shrink-0">
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const note = secureNotes.find(n => n.id === selectedNoteId);
                      if (note) {
                        duplicateSecureNote(note.id);
                        showToast('Note duplicated');
                        setIsEditNoteOpen(false);
                      }
                    }}
                    className="text-xs font-bold text-[#ff9f0a] hover:underline"
                  >
                    Duplicate
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const note = secureNotes.find(n => n.id === selectedNoteId);
                      if (note) exportNoteToDisk(note, 'json');
                    }}
                    className="text-xs font-bold text-[#ff9f0a] hover:underline"
                  >
                    Export
                  </button>
                </div>

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setIsDrawingOpen(true)}
                    className="text-xs font-bold text-[#ff9f0a] hover:underline"
                  >
                    Draw
                  </button>
                  <button
                    onClick={handleUpdateNoteSubmit}
                    className="text-xs font-bold text-[#ff9f0a] hover:text-amber-400 transition-colors"
                  >
                    Done
                  </button>
                </div>
              </div>

              <form onSubmit={handleUpdateNoteSubmit} className="flex flex-col gap-4 text-xs">
                
                {/* Note Title */}
                <input
                  required
                  type="text"
                  value={noteTitle}
                  onChange={e => setNoteTitle(e.target.value)}
                  placeholder="Note Title"
                  className="w-full bg-transparent text-white font-bold text-base placeholder-white/30 outline-none border-none py-1"
                />

                {/* Subtitle / Description */}
                <input
                  type="text"
                  value={noteDesc}
                  onChange={e => setNoteDesc(e.target.value)}
                  placeholder="Subheading / description snippet"
                  className="w-full bg-transparent text-white/50 placeholder-white/20 outline-none border-none pb-1"
                />

                {/* Note Content */}
                <textarea
                  value={noteBody}
                  onChange={e => setNoteBody(e.target.value)}
                  placeholder="Start writing note contents here..."
                  rows={8}
                  className="w-full bg-transparent text-white/80 placeholder-white/20 outline-none border-none resize-none leading-relaxed text-xs py-1 min-h-[120px]"
                />

                {/* Category & Tags Selector */}
                <div className="border-t border-white/5 pt-3 flex flex-col gap-3 shrink-0">
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] uppercase font-bold text-white/40 tracking-wider">Note Category</span>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setNoteCategoryType('select')}
                        className={`px-2.5 py-1 border rounded-lg text-[8px] font-semibold transition-colors ${
                          noteCategoryType === 'select' 
                            ? 'bg-amber-500/10 border-amber-500/40 text-amber-300' 
                            : 'bg-white/2 border-white/5 text-white/60 hover:text-white'
                        }`}
                      >
                        Select Brand
                      </button>
                      <button
                        type="button"
                        onClick={() => setNoteCategoryType('custom')}
                        className={`px-2.5 py-1 border rounded-lg text-[8px] font-semibold transition-colors ${
                          noteCategoryType === 'custom' 
                            ? 'bg-amber-500/10 border-amber-500/40 text-amber-300' 
                            : 'bg-white/2 border-white/5 text-white/60 hover:text-white'
                        }`}
                      >
                        + Custom
                      </button>
                    </div>
                  </div>

                  {noteCategoryType === 'select' ? (
                    <select
                      value={noteCategorySelect}
                      onChange={e => setNoteCategorySelect(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white outline-none focus:border-amber-500/40"
                    >
                      {NOTE_CATEGORIES.map(c => (
                        <option key={c.name} value={c.name}>{c.name}</option>
                      ))}
                    </select>
                  ) : (
                    <input
                      required={noteCategoryType === 'custom'}
                      type="text"
                      value={noteCustomCategory}
                      onChange={e => setNoteCustomCategory(e.target.value)}
                      placeholder="e.g. 🐧 Linux, 🔒 Security"
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white outline-none focus:border-amber-500/40"
                    />
                  )}

                  {/* Note Tags */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[9px] uppercase font-bold text-white/40 tracking-wider">Tags (comma-separated)</label>
                    <input
                      type="text"
                      value={noteTagsText}
                      onChange={e => setNoteTagsText(e.target.value)}
                      placeholder="e.g. firewall, backup, commands"
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white outline-none focus:border-amber-500/40"
                    />
                  </div>

                  {/* Color Label indicator */}
                  <div className="flex items-center justify-between">
                    <label className="text-[9px] uppercase font-bold text-white/40 tracking-wider">Color Label Indicator</label>
                    <div className="flex gap-2">
                      {['#ff9f0a', '#ef4444', '#3b82f6', '#10b981', '#a855f7'].map(color => (
                        <button
                          key={color}
                          type="button"
                          onClick={() => setNoteColorLabel(color)}
                          className={`w-4 h-4 rounded-full border ${noteColorLabel === color ? 'border-white scale-110' : 'border-transparent'}`}
                          style={{ backgroundColor: color }}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Attachments list with previews */}
                  {noteAttachments.length > 0 && (
                    <div className="flex flex-col gap-1.5">
                      <span className="text-[9px] uppercase font-bold text-white/40 tracking-wider">Attachments ({noteAttachments.length})</span>
                      <div className="flex flex-col gap-2 max-h-48 overflow-y-auto">
                        {noteAttachments.map(att => {
                          const isImage = att.type === 'image' || att.type === 'draw';
                          return (
                            <div key={att.id} className="bg-white/3 border border-white/5 rounded-xl p-2 flex flex-col gap-2">
                              <div className="flex items-center justify-between gap-1.5">
                                <span className="text-[9px] text-white/70 line-clamp-1">{att.name}</span>
                                <button
                                  type="button"
                                  onClick={() => setNoteAttachments(prev => prev.filter(a => a.id !== att.id))}
                                  className="text-red-400 text-[10px]"
                                >
                                  Remove
                                </button>
                              </div>
                              
                              {/* Audio playback */}
                              {att.type === 'voice' && (
                                <audio src={att.dataUrl} controls className="w-full h-8 bg-transparent" />
                              )}

                              {/* Image thumbnail preview */}
                              {isImage && (
                                <img src={att.dataUrl} alt={att.name} className="max-h-24 object-contain rounded border border-white/10" />
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Apple Notes styled Mock formatting toolbar at bottom */}
                  <div className="border-t border-white/5 pt-3 mt-1 flex items-center justify-between text-white/40 shrink-0">
                    <div className="flex items-center gap-3">
                      <label className="p-1 hover:text-[#ff9f0a] transition-colors cursor-pointer">
                        <Image size={15} />
                        <input
                          type="file"
                          accept="image/*"
                          onChange={e => handleFileUpload(e, 'image')}
                          className="hidden"
                        />
                      </label>
                      <label className="p-1 hover:text-[#ff9f0a] transition-colors cursor-pointer">
                        <FileText size={15} />
                        <input
                          type="file"
                          accept=".pdf"
                          onChange={e => handleFileUpload(e, 'pdf')}
                          className="hidden"
                        />
                      </label>
                      <button 
                        type="button" 
                        onClick={isRecording ? stopVoiceRecording : startVoiceRecording}
                        className={`p-1 hover:text-[#ff9f0a] transition-colors ${isRecording ? 'text-red-500 animate-pulse' : ''}`}
                      >
                        <Mic size={15} />
                      </button>
                    </div>
                    {isRecording && <span className="text-[9px] text-red-500 animate-pulse">Recording ({recordingSeconds}s)</span>}
                    <span className="text-[8px] font-bold text-white/20 uppercase tracking-widest">Apple Notes System</span>
                  </div>

                </div>

              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── SKETCHPAD DRAWING CANVAS MODAL OVERLAY ────────────────────────────── */}
      <AnimatePresence>
        {isDrawingOpen && (
          <div className="fixed inset-0 z-50 bg-black/90 flex flex-col justify-between p-4">
            
            {/* Drawing controls header */}
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h4 className="text-xs font-bold text-white">Apple Sketchpad drawing canvas</h4>
              <div className="flex gap-3">
                <button
                  onClick={clearCanvas}
                  className="text-xs font-bold text-red-400"
                >
                  Clear
                </button>
                <button
                  onClick={saveDrawingAttachment}
                  className="text-xs font-bold text-[#ff9f0a]"
                >
                  Save Sketch
                </button>
                <button
                  onClick={() => setIsDrawingOpen(false)}
                  className="text-xs font-bold text-white/40"
                >
                  Cancel
                </button>
              </div>
            </div>

            {/* Main drawing area */}
            <div className="flex-1 my-4 bg-white/2 border border-white/5 rounded-2xl relative overflow-hidden flex items-center justify-center">
              <canvas
                ref={drawingCanvasRef}
                width={360}
                height={480}
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawingMode}
                onMouseLeave={stopDrawingMode}
                onTouchStart={startDrawing}
                onTouchMove={draw}
                onTouchEnd={stopDrawingMode}
                className="bg-transparent touch-none cursor-crosshair"
              />
            </div>

            {/* Brush styling toolbar */}
            <div className="border-t border-white/10 pt-3 flex items-center justify-between">
              {/* Brush size */}
              <div className="flex items-center gap-2">
                <span className="text-[9px] text-white/40 font-bold uppercase">Brush Size</span>
                <input
                  type="range"
                  min="2"
                  max="20"
                  value={drawingBrushSize}
                  onChange={e => setDrawingBrushSize(Number(e.target.value))}
                  className="w-20 accent-[#ff9f0a]"
                />
              </div>

              {/* Color pickers */}
              <div className="flex gap-2">
                {['#ff9f0a', '#ffffff', '#ef4444', '#3b82f6', '#10b981', '#000000'].map(color => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setDrawingColor(color)}
                    className={`w-6 h-6 rounded-full border flex items-center justify-center ${
                      drawingColor === color ? 'border-white scale-110' : 'border-transparent'
                    }`}
                    style={{ backgroundColor: color }}
                  >
                    {color === '#000000' && <span className="text-[8px] text-white">Eraser</span>}
                  </button>
                ))}
              </div>
            </div>

          </div>
        )}
      </AnimatePresence>

      {/* ─── NOTE LOCK PASSWORD PROMPT SCREEN ───────────────────────────────────── */}
      <AnimatePresence>
        {isNoteLockPromptOpen && noteToUnlock && (
          <div className="fixed inset-0 z-50 bg-[#0d0c1e]/95 flex flex-col items-center justify-center p-6 select-none">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-500/20 to-yellow-500/25 border border-amber-500/30 flex items-center justify-center mb-4">
              <LockKeyhole size={28} className="text-[#ff9f0a]" />
            </div>
            <h3 className="text-sm font-bold text-white">Unlock Note</h3>
            <p className="text-[10px] text-white/50 mt-1 max-w-xs text-center">
              This note is password-protected. Enter your 4-digit Master PIN to unlock and view.
            </p>

            <div className="mt-6 flex flex-col gap-3 w-full max-w-xs">
              <input
                type="password"
                maxLength={4}
                value={noteLockPassword}
                onChange={e => setNoteLockPassword(e.target.value)}
                placeholder="4-digit Master PIN"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-center text-lg font-bold outline-none text-white tracking-widest"
              />
              
              {noteLockError && (
                <p className="text-red-400 text-[10px] font-semibold text-center">{noteLockError}</p>
              )}

              <div className="flex gap-2.5 mt-2">
                <button
                  onClick={() => {
                    setIsNoteLockPromptOpen(false);
                    setNoteLockPassword('');
                    setNoteLockError('');
                    setNoteToUnlock(null);
                  }}
                  className="flex-1 py-2.5 rounded-xl border border-white/10 text-white/50 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  onClick={handleUnlockNoteWithPin}
                  className="flex-1 py-2.5 rounded-xl bg-[#ff9f0a] text-black text-xs font-bold shadow-lg"
                >
                  Verify PIN
                </button>
              </div>
            </div>
          </div>
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
              className="relative w-full max-w-sm bg-[#1c1c1e] rounded-t-3xl border-t border-white/10 max-h-[85vh] overflow-y-auto p-5 pb-8 shadow-2xl flex flex-col animate-slide-up"
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
                      className="w-full bg-[#2c2c2e] border border-white/10 rounded-xl px-3.5 py-2.5 text-white outline-none focus:border-violet-500/40"
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

    </div>
  );
}
