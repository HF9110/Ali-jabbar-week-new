import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  BrowserRouter,
  Routes,
  Route,
  useNavigate,
} from 'react-router-dom';
import { initializeApp } from 'firebase/app';
import {
  getAuth,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
} from 'firebase/auth';
import {
  getFirestore,
  collection,
  doc,
  onSnapshot,
  setDoc,
  query,
  limit,
  getDocs,
  getDoc,
  serverTimestamp,
  increment,
  addDoc,
  updateDoc,
} from 'firebase/firestore';
import {
  ChevronDown,
  Crown,
  Search,
  Settings as SettingsIcon,
  X,
  Loader,
  User,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Lock,
  Mail,
  Key,
  CheckCircle,
  Clock,
  Info,
  LogOut,
  Save,
} from 'lucide-react';

// =========================================================================
// 1. CONFIGURATION & CONSTANTS
// =========================================================================

const APP_ID = 'ali-jabbar-week';

// Firebase Paths - Centralized to prevent typos
const PATHS = {
  SETTINGS: `artifacts/${APP_ID}/public/data/settings/config`,
  SUBMISSIONS: `artifacts/${APP_ID}/public/data/submissions`,
};

const FIREBASE_CONFIG = {
  apiKey: "AIzaSyDUxC_2orwmSLL9iEBIkeohZKfH36MjZ4Y",
  authDomain: "ali-jabbar-week.firebaseapp.com",
  projectId: "ali-jabbar-week",
  storageBucket: "ali-jabbar-week.firebasestorage.app",
  messagingSenderId: "642187294882",
  appId: "1:642187294882:web:fe30f0016e5803a5e1bffb",
  measurementId: "G-8XSRK7TE1K",
};

// Initialize Firebase safely
let firebaseApp, db, auth, isFirebaseInitialized = false;
try {
  firebaseApp = initializeApp(FIREBASE_CONFIG);
  db = getFirestore(firebaseApp);
  auth = getAuth(firebaseApp);
  isFirebaseInitialized = true;
  console.log("✅ Firebase initialized successfully.");
} catch (e) {
  console.error("❌ Firebase Initialization Error:", e);
}

// Helper: Retry Operation
const retryOperation = async (operation, maxRetries = 3, delay = 1000) => {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await operation();
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      await new Promise((resolve) => setTimeout(resolve, delay * Math.pow(2, i)));
    }
  }
};

// Constants
const STAGES = {
  Submission: { label: 'استقبال المشاركات', color: 'blue', icon: Clock },
  Voting: { label: 'التصويت مفتوح', color: 'yellow', icon: CheckCircle },
  Paused: { label: 'متوقفة مؤقتاً', color: 'red', icon: AlertTriangle },
  Ended: { label: 'إعلان النتائج', color: 'green', icon: Crown },
};

const COUNTRIES = [
  { name: 'الأردن', code: 'JO', flag: '🇯🇴' },
  { name: 'الإمارات', code: 'AE', flag: '🇦🇪' },
  { name: 'البحرين', code: 'BH', flag: '🇧🇭' },
  { name: 'الجزائر', code: 'DZ', flag: '🇩🇿' },
  { name: 'السعودية', code: 'SA', flag: '🇸🇦' },
  { name: 'السودان', code: 'SD', flag: '🇸🇩' },
  { name: 'العراق', code: 'IQ', flag: '🇮🇶' },
  { name: 'الكويت', code: 'KW', flag: '🇰🇼' },
  { name: 'المغرب', code: 'MA', flag: '🇲🇦' },
  { name: 'اليمن', code: 'YE', flag: '🇾🇪' },
  { name: 'تونس', code: 'TN', flag: '🇹🇳' },
  { name: 'سوريا', code: 'SY', flag: '🇸🇾' },
  { name: 'عُمان', code: 'OM', flag: '🇴🇲' },
  { name: 'فلسطين', code: 'PS', flag: '🇵🇸' },
  { name: 'قطر', code: 'QA', flag: '🇶🇦' },
  { name: 'لبنان', code: 'LB', flag: '🇱🇧' },
  { name: 'ليبيا', code: 'LY', flag: '🇱🇾' },
  { name: 'مصر', code: 'EG', flag: '🇪🇬' },
].sort((a, b) => a.name.localeCompare(b.name, 'ar'));

const ORGANIZERS = [
  {
    name: 'علي جبار',
    role: 'المشرف العام',
    tiktok: '@AliJabbar',
    imageUrl: 'https://placehold.co/100x100/fe2c55/25f4ee?text=Ali',
  },
  {
    name: 'فريق الإدارة',
    role: 'منسق المسابقة',
    tiktok: '@ContestTeam',
    imageUrl: 'https://placehold.co/100x100/25f4ee/fe2c55?text=Team',
  },
];

const DEFAULT_SETTINGS = {
  mainColor: '#fe2c55',
  highlightColor: '#25f4ee',
  appFont: 'Cairo',
  title: 'Ali Jabbar Week',
  logoUrl: 'https://placehold.co/100x40/fe2c55/25f4ee?text=AJW',
  marqueeText: 'التصويت مفتوح! شارك في تحديد أفضل تصميم عربي.',
  stage: 'Voting',
  useGlassmorphism: true,
  endedAt: null,
  termsText: 'الشروط والأحكام:\n- يجب أن يكون التصميم أصلياً.\n- الالتزام بالآداب العامة.',
  whyText: 'لدعم المحتوى العربي الإبداعي.',
};

// =========================================================================
// 2. SHARED COMPONENTS & UTILS
// =========================================================================

const useAuth = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isFirebaseInitialized) {
      setLoading(false);
      return;
    }
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  return { user, loading, isLoggedIn: !!user };
};

const GlassCard = ({ children, className = '', isGlassmorphism = true, color = 'bg-gray-800' }) => {
  const glassClasses = isGlassmorphism
    ? 'bg-opacity-60 backdrop-blur-xl shadow-xl border border-white/10'
    : 'shadow-lg';
  
  return (
    <div className={`${color} ${glassClasses} rounded-xl ${className}`}>
      {children}
    </div>
  );
};

const InputField = ({ label, id, value, onChange, type = 'text', placeholder = '' }) => (
  <div className="mb-4 w-full">
    <label htmlFor={id} className="block text-white mb-2 font-medium text-sm opacity-90">
      {label}
    </label>
    <input
      type={type}
      id={id}
      value={value || ''}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full p-3 rounded-lg bg-gray-900/60 border border-white/10 text-white placeholder-gray-500 focus:ring-2 focus:ring-highlight-color focus:border-transparent transition duration-200 outline-none"
    />
  </div>
);

const Modal = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <GlassCard className="w-full max-w-2xl max-h-[90vh] overflow-y-auto relative flex flex-col" color="bg-gray-900">
        <div className="flex justify-between items-center p-4 border-b border-white/10 sticky top-0 bg-gray-900/90 z-10">
          <h2 className="text-xl font-bold text-white">{title}</h2>
          <button onClick={onClose} className="text-white/70 hover:text-red-500 transition p-1 rounded-full hover:bg-white/10">
            <X className="w-6 h-6" />
          </button>
        </div>
        <div className="p-6 text-white">
          {children}
        </div>
      </GlassCard>
    </div>
  );
};

// =========================================================================
// 3. ADMIN COMPONENTS (STABLE & FIXED)
// =========================================================================

const AdminSettingsPanel = ({ settings, onSaveSettings }) => {
  // 🟢 FIX: Use local state to prevent input jumping while typing
  const [localSettings, setLocalSettings] = useState(settings);
  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Sync with props only if not dirty (user hasn't started typing yet)
  useEffect(() => {
    if (!isDirty && settings) {
      setLocalSettings(settings);
    }
  }, [settings, isDirty]);

  const handleChange = (field, value) => {
    setIsDirty(true);
    setLocalSettings((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    await onSaveSettings(localSettings);
    setIsDirty(false);
    setIsSaving(false);
  };

  // Helper for sections
  const SectionHeader = ({ title }) => (
    <h4 className="text-lg font-bold mt-6 mb-4 border-b border-white/10 pb-2" style={{ color: localSettings.highlightColor }}>
      {title}
    </h4>
  );

  return (
    <GlassCard className="p-6 mb-8 animate-slideUp">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-xl font-bold text-white flex items-center gap-2">
          <SettingsIcon className="w-6 h-6" /> إعدادات النظام
        </h3>
        {isDirty && <span className="text-yellow-400 text-sm animate-pulse">● تغييرات غير محفوظة</span>}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Visual Identity */}
        <div>
          <SectionHeader title="الهوية البصرية" />
          <InputField label="عنوان المسابقة" id="title" value={localSettings.title} onChange={(v) => handleChange('title', v)} />
          <InputField label="رابط الشعار (Logo URL)" id="logo" value={localSettings.logoUrl} onChange={(v) => handleChange('logoUrl', v)} />
          
          <div className="flex gap-4 mb-4">
             <div className="flex-1">
               <label className="block text-white mb-2 text-sm">اللون الأساسي</label>
               <div className="flex items-center gap-2">
                 <input type="color" value={localSettings.mainColor} onChange={(e) => handleChange('mainColor', e.target.value)} className="h-10 w-10 rounded cursor-pointer border-0" />
                 <input type="text" value={localSettings.mainColor} onChange={(e) => handleChange('mainColor', e.target.value)} className="bg-gray-800 text-white text-sm rounded p-2 w-full border border-white/10" />
               </div>
             </div>
             <div className="flex-1">
               <label className="block text-white mb-2 text-sm">لون التوهج</label>
               <div className="flex items-center gap-2">
                 <input type="color" value={localSettings.highlightColor} onChange={(e) => handleChange('highlightColor', e.target.value)} className="h-10 w-10 rounded cursor-pointer border-0" />
                 <input type="text" value={localSettings.highlightColor} onChange={(e) => handleChange('highlightColor', e.target.value)} className="bg-gray-800 text-white text-sm rounded p-2 w-full border border-white/10" />
               </div>
             </div>
          </div>
          
          <div className="flex items-center gap-2 mt-4 bg-gray-900/50 p-3 rounded-lg">
            <input 
              type="checkbox" 
              id="glass" 
              checked={localSettings.useGlassmorphism} 
              onChange={(e) => handleChange('useGlassmorphism', e.target.checked)}
              className="w-5 h-5 rounded border-gray-500 text-blue-600 focus:ring-blue-500"
            />
            <label htmlFor="glass" className="text-white select-none cursor-pointer">تفعيل تأثير الزجاج (Glassmorphism)</label>
          </div>
        </div>

        {/* Stage & Content */}
        <div>
          <SectionHeader title="المرحلة والمحتوى" />
          <div className="mb-6">
            <label className="block text-white mb-2 text-sm">المرحلة الحالية</label>
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(STAGES).map(([key, info]) => (
                <button
                  key={key}
                  onClick={() => handleChange('stage', key)}
                  className={`p-2 rounded-lg text-sm font-bold transition-all duration-200 flex items-center justify-center gap-2
                    ${localSettings.stage === key ? 'ring-2 ring-white scale-[1.02]' : 'opacity-60 hover:opacity-100'}
                  `}
                  style={{ backgroundColor: localSettings.stage === key ? localSettings.mainColor : '#374151', color: 'white' }}
                >
                  <info.icon className="w-4 h-4" /> {info.label}
                </button>
              ))}
            </div>
          </div>

          <InputField label="نص الشريط المتحرك" id="marquee" value={localSettings.marqueeText} onChange={(v) => handleChange('marqueeText', v)} />
          
          <div className="mb-4">
            <label className="block text-white mb-2 text-sm">الشروط والأحكام</label>
            <textarea 
              rows="4" 
              value={localSettings.termsText} 
              onChange={(e) => handleChange('termsText', e.target.value)}
              className="w-full p-3 rounded-lg bg-gray-900/60 border border-white/10 text-white text-sm"
            />
          </div>
        </div>
      </div>

      <div className="mt-8 pt-6 border-t border-white/10 flex justify-end">
        <button
          onClick={handleSave}
          disabled={isSaving || !isDirty}
          className="flex items-center gap-2 px-8 py-3 rounded-lg font-bold text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105 active:scale-95 shadow-lg"
          style={{ backgroundColor: localSettings.mainColor }}
        >
          {isSaving ? <Loader className="animate-spin w-5 h-5" /> : <Save className="w-5 h-5" />}
          {isSaving ? 'جاري الحفظ...' : 'حفظ التغييرات'}
        </button>
      </div>
    </GlassCard>
  );
};

const AdminAuthModal = ({ isOpen, onClose, onSuccess }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    if (!isFirebaseInitialized) {
      setError('Firebase not connected.');
      setLoading(false);
      return;
    }
    try {
      await signInWithEmailAndPassword(auth, email, password);
      onSuccess();
    } catch (err) {
      setError('فشل الدخول. تأكد من البيانات.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/90 backdrop-blur-md p-4">
      <GlassCard className="w-full max-w-md p-8" color="bg-gray-900">
        <h2 className="text-2xl font-bold text-white text-center mb-6">🔐 دخول المدير</h2>
        <form onSubmit={handleLogin} className="space-y-4">
          <div className="relative">
            <Mail className="absolute right-3 top-3.5 text-gray-400 w-5 h-5" />
            <input type="email" placeholder="البريد الإلكتروني" className="w-full p-3 pr-10 rounded bg-gray-800 text-white border border-gray-700 focus:border-blue-500 outline-none" value={email} onChange={e => setEmail(e.target.value)} required />
          </div>
          <div className="relative">
            <Key className="absolute right-3 top-3.5 text-gray-400 w-5 h-5" />
            <input type="password" placeholder="كلمة المرور" className="w-full p-3 pr-10 rounded bg-gray-800 text-white border border-gray-700 focus:border-blue-500 outline-none" value={password} onChange={e => setPassword(e.target.value)} required />
          </div>
          {error && <p className="text-red-500 text-sm text-center bg-red-900/20 p-2 rounded">{error}</p>}
          <button type="submit" disabled={loading} className="w-full bg-blue-600 hover:bg-blue-700 text-white p-3 rounded font-bold transition">
            {loading ? 'جاري التحقق...' : 'دخول'}
          </button>
          <button type="button" onClick={onClose} className="w-full text-gray-400 hover:text-white text-sm mt-2">إلغاء</button>
        </form>
      </GlassCard>
    </div>
  );
};

// =========================================================================
// 4. PUBLIC COMPONENTS (Home, Submission, Cards)
// =========================================================================

const AlertBanner = ({ settings }) => {
  const stageInfo = STAGES[settings.stage];
  return (
    <div className="mb-8 relative overflow-hidden rounded-xl shadow-2xl border border-white/10"
         style={{ backgroundColor: stageInfo.color === 'yellow' ? settings.mainColor : 
                  stageInfo.color === 'blue' ? '#2563eb' : 
                  stageInfo.color === 'red' ? '#b91c1c' : '#059669' }}>
      <div className="flex items-center p-4 relative z-10 text-white">
        <div className="bg-white/20 p-2 rounded-full ml-4 animate-pulse">
          <stageInfo.icon className="w-6 h-6" />
        </div>
        <div className="flex-1 overflow-hidden">
          <p className="text-lg font-bold mb-1">{stageInfo.label}</p>
          <div className="whitespace-nowrap animate-marquee inline-block">
            {settings.marqueeText}
          </div>
        </div>
      </div>
      {/* Background decorative blur */}
      <div className="absolute -top-10 -left-10 w-32 h-32 bg-white/20 blur-3xl rounded-full" />
    </div>
  );
};

const SubmissionForm = ({ settings }) => {
  const [form, setForm] = useState({ name: '', country: COUNTRIES[0].name, url: '' });
  const [status, setStatus] = useState('idle'); // idle, submitting, success, error

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.url.includes('tiktok.com')) {
      alert('يرجى إدخال رابط تيك توك صحيح');
      return;
    }
    setStatus('submitting');
    try {
      const countryData = COUNTRIES.find(c => c.name === form.country);
      await addDoc(collection(db, PATHS.SUBMISSIONS), {
        participantName: form.name,
        country: form.country,
        flag: countryData.flag,
        videoUrl: form.url,
        status: 'Pending',
        votes: 0,
        submittedAt: serverTimestamp(),
        thumbnailUrl: `https://placehold.co/600x900/222/fff?text=${encodeURIComponent(form.country)}`,
      });
      setStatus('success');
      setForm({ name: '', country: COUNTRIES[0].name, url: '' });
    } catch (err) {
      console.error(err);
      setStatus('error');
    }
  };

  return (
    <GlassCard className="max-w-xl mx-auto p-8" isGlassmorphism={settings.useGlassmorphism}>
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-white mb-2">شارك إبداعك</h2>
        <p className="text-white/60">أرسل الفيديو الخاص بك للمراجعة والدخول في المسابقة</p>
      </div>

      {status === 'success' && (
        <div className="bg-green-500/20 border border-green-500 text-green-200 p-4 rounded-lg mb-6 text-center flex items-center justify-center gap-2">
          <CheckCircle className="w-5 h-5" /> تم استلام مشاركتك بنجاح! سيتم مراجعتها قريباً.
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <InputField label="الاسم الكامل / اللقب" id="sub-name" value={form.name} onChange={v => setForm({...form, name: v})} placeholder="مثال: أحمد العلي" />
        
        <div className="mb-4">
          <label className="block text-white mb-2 text-sm">البلد</label>
          <div className="relative">
            <select 
              value={form.country} 
              onChange={e => setForm({...form, country: e.target.value})}
              className="w-full p-3 pl-10 rounded-lg bg-gray-900/60 border border-white/10 text-white appearance-none focus:ring-2 focus:ring-highlight-color outline-none"
            >
              {COUNTRIES.map(c => <option key={c.code} value={c.name}>{c.flag} {c.name}</option>)}
            </select>
            <ChevronDown className="absolute left-3 top-3.5 w-5 h-5 text-white/50 pointer-events-none" />
          </div>
        </div>

        <InputField label="رابط الفيديو (TikTok)" id="sub-url" value={form.url} onChange={v => setForm({...form, url: v})} placeholder="https://www.tiktok.com/..." />

        <button 
          type="submit" 
          disabled={status === 'submitting'}
          className="w-full py-4 rounded-xl font-bold text-lg transition-all transform hover:-translate-y-1 hover:shadow-xl disabled:opacity-50 disabled:translate-y-0"
          style={{ backgroundColor: settings.mainColor, color: 'white' }}
        >
          {status === 'submitting' ? 'جاري الإرسال...' : 'إرسال المشاركة 🚀'}
        </button>
      </form>
    </GlassCard>
  );
};

const VideoCard = ({ submission, settings, onVote }) => {
  return (
    <div className="group relative aspect-[9/16] rounded-2xl overflow-hidden cursor-pointer transform transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl hover:shadow-highlight-color/20 border border-white/5 bg-gray-800">
      <img 
        src={submission.thumbnailUrl} 
        alt={submission.participantName} 
        className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity"
        onError={(e) => e.target.src = 'https://placehold.co/600x900/333/fff?text=No+Image'}
      />
      
      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent flex flex-col justify-end p-4">
        <div className="flex justify-between items-end mb-3">
          <div>
            <h3 className="font-bold text-white text-lg truncate max-w-[150px]">{submission.participantName}</h3>
            <p className="text-white/70 text-sm flex items-center gap-1">{submission.flag} {submission.country}</p>
          </div>
          <div className="text-center bg-white/10 backdrop-blur-sm p-2 rounded-lg border border-white/10">
            <p className="text-xs text-white/60">الأصوات</p>
            <p className="font-bold text-white text-xl" style={{ color: settings.highlightColor }}>{submission.votes}</p>
          </div>
        </div>
        
        <button 
          onClick={(e) => { e.stopPropagation(); onVote(submission); }}
          className="w-full py-3 rounded-xl font-bold text-sm bg-white text-black hover:bg-gray-200 transition flex items-center justify-center gap-2 shadow-lg active:scale-95"
        >
          <Crown className="w-4 h-4" /> تصويت
        </button>
      </div>
    </div>
  );
};

// =========================================================================
// 5. MAIN APP LOGIC
// =========================================================================

const ContestApp = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  
  // App State
  const [settings, setSettings] = useState(null);
  const [submissions, setSubmissions] = useState([]);
  const [loadingData, setLoadingData] = useState(true);
  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);
  const [secretCount, setSecretCount] = useState(0); // Secret click counter
  const secretTimer = useRef(null);

  // --- Data Fetching ---
  useEffect(() => {
    if (!isFirebaseInitialized) {
      setSettings(DEFAULT_SETTINGS);
      setLoadingData(false);
      return;
    }

    // 1. Listen to Settings
    const unsubSettings = onSnapshot(doc(db, PATHS.SETTINGS), (docSnap) => {
      if (docSnap.exists()) {
        setSettings(docSnap.data());
      } else {
        // Initialize default if missing
        setDoc(doc(db, PATHS.SETTINGS), DEFAULT_SETTINGS).then(() => setSettings(DEFAULT_SETTINGS));
      }
      setLoadingData(false);
    }, (err) => console.error("Settings Error:", err));

    // 2. Listen to Submissions
    const q = query(collection(db, PATHS.SUBMISSIONS));
    const unsubSub = onSnapshot(q, (snap) => {
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setSubmissions(list);
    }, (err) => console.error("Subs Error:", err));

    return () => {
      unsubSettings();
      unsubSub();
    };
  }, []);

  // --- Actions ---
  const handleSaveSettings = async (newSettings) => {
    try {
      // 🟢 FIX: Use merge: true to update only changed fields safely
      await setDoc(doc(db, PATHS.SETTINGS), newSettings, { merge: true });
      alert("تم حفظ الإعدادات بنجاح ✅");
    } catch (e) {
      alert("خطأ في الحفظ: " + e.message);
    }
  };

  const handleVote = async (sub) => {
    if (settings.stage !== 'Voting') return alert('التصويت مغلق حالياً');
    try {
      const ref = doc(db, PATHS.SUBMISSIONS, sub.id);
      await updateDoc(ref, { votes: increment(1) });
    } catch (e) {
      console.error(e);
    }
  };

  // Secret Admin Trigger
  const handleSecretClick = () => {
    clearTimeout(secretTimer.current);
    setSecretCount(prev => prev + 1);
    if (secretCount + 1 >= 5) {
      setSecretCount(0);
      if (user) navigate('/admin');
      else setIsAdminModalOpen(true);
    }
    secretTimer.current = setTimeout(() => setSecretCount(0), 2000);
  };

  // CSS Variables Update
  useEffect(() => {
    if (settings) {
      document.documentElement.style.setProperty('--highlight-color', settings.highlightColor);
    }
  }, [settings]);

  // --- Loading Screen ---
  if (loadingData || !settings) return (
    <div className="h-screen bg-black flex flex-col items-center justify-center text-white">
      <Loader className="w-12 h-12 animate-spin mb-4 text-red-500" />
      <p className="animate-pulse">جارِ تحميل البيانات...</p>
    </div>
  );

  // --- Routing Render ---
  return (
    <div className="min-h-screen bg-black text-white font-sans" 
         style={{ fontFamily: settings.appFont, backgroundColor: '#000000', backgroundImage: 'radial-gradient(circle at 50% 0%, #1a1a1a 0%, #000 70%)' }}>
      
      {/* Header */}
      <header className="sticky top-0 z-50 backdrop-blur-md border-b border-white/10 bg-black/50">
        <div className="container mx-auto px-4 py-3 flex justify-between items-center">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate('/')}>
            <img src={settings.logoUrl} alt="Logo" className="h-10 rounded-md" onError={e => e.target.style.display = 'none'} />
            <h1 className="text-xl font-black tracking-tighter">{settings.title}</h1>
          </div>
          {user ? (
             <div className="flex items-center gap-4">
               <button onClick={() => navigate('/admin')} className="text-sm font-bold text-white hover:text-highlight-color">الإعدادات</button>
               <button onClick={() => signOut(auth)} className="bg-red-500/20 hover:bg-red-500 text-red-200 hover:text-white px-3 py-1.5 rounded-lg text-xs transition flex items-center gap-1">
                 <LogOut className="w-3 h-3" /> خروج
               </button>
             </div>
          ) : (
            <button onClick={() => setIsAdminModalOpen(true)} className="opacity-50 hover:opacity-100"><Lock className="w-4 h-4" /></button>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8 pb-24">
        <Routes>
          <Route path="/" element={
            <>
              <AlertBanner settings={settings} />
              
              {settings.stage === 'Submission' && <SubmissionForm settings={settings} />}
              
              {(settings.stage === 'Voting' || settings.stage === 'Ended') && (
                <div className="space-y-8 animate-fadeIn">
                  <div className="flex justify-between items-end">
                     <h2 className="text-2xl font-bold border-r-4 border-highlight-color pr-3">المشاركات المتنافسة</h2>
                     <p className="text-white/50 text-sm">{submissions.filter(s => s.status === 'Approved').length} مشاركة</p>
                  </div>

                  {submissions.filter(s => s.status === 'Approved').length === 0 ? (
                    <div className="text-center py-20 bg-gray-900/30 rounded-xl border border-white/5">
                      <p className="text-white/40 text-lg">لا توجد مشاركات متاحة للعرض حالياً</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
                      {submissions
                        .filter(s => s.status === 'Approved')
                        .sort((a, b) => b.votes - a.votes) // Sort by votes desc
                        .map(sub => (
                        <VideoCard key={sub.id} submission={sub} settings={settings} onVote={handleVote} />
                      ))}
                    </div>
                  )}
                </div>
              )}

              {settings.stage === 'Paused' && (
                 <div className="flex flex-col items-center justify-center py-20 text-center">
                   <AlertTriangle className="w-20 h-20 text-yellow-500 mb-4" />
                   <h2 className="text-3xl font-bold">المسابقة متوقفة مؤقتاً</h2>
                   <p className="mt-2 text-white/60">نعود إليكم قريباً..</p>
                 </div>
              )}
            </>
          } />
          
          <Route path="/admin" element={
             user ? (
               <AdminSettingsPanel settings={settings} onSaveSettings={handleSaveSettings} />
             ) : (
               <div className="text-center py-20">
                 <h2 className="text-2xl text-red-500">غير مصرح لك بالدخول</h2>
                 <button onClick={() => setIsAdminModalOpen(true)} className="mt-4 underline">تسجيل الدخول</button>
               </div>
             )
          } />
        </Routes>
      </main>

      {/* Footer */}
      <footer className="fixed bottom-0 w-full bg-black/80 backdrop-blur-lg border-t border-white/10 py-4 z-40 text-center text-xs text-white/40">
        <p onClick={handleSecretClick} className="cursor-pointer select-none">
          © 2024 {settings.title}. Developed with ❤️. 
          <span className="opacity-0 hover:opacity-100 ml-2 transition">v2.0 Stable</span>
        </p>
      </footer>

      {/* Modals */}
      <AdminAuthModal 
        isOpen={isAdminModalOpen} 
        onClose={() => setIsAdminModalOpen(false)} 
        onSuccess={() => { setIsAdminModalOpen(false); navigate('/admin'); }} 
      />

    </div>
  );
};

// =========================================================================
// 6. ROOT WRAPPER
// =========================================================================

export default function App() {
  return (
    <BrowserRouter>
      <ContestApp />
    </BrowserRouter>
  );
}