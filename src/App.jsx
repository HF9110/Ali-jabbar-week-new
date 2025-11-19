import React, { useState, useEffect, useMemo, useRef } from 'react';
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
  FileText,
  Users,
  Save,
  Type
} from 'lucide-react';

// =========================================================================
// 1. FIREBASE CONFIGURATION & INITIALIZATION
// =========================================================================

const APP_ID = 'ali-jabbar-week';

const userFirebaseConfig = {
  apiKey: "AIzaSyDUxC_2orwmSLL9iEBIkeohZKfH36MjZ4Y",
  authDomain: "ali-jabbar-week.firebaseapp.com",
  projectId: "ali-jabbar-week",
  storageBucket: "ali-jabbar-week.firebasestorage.app",
  messagingSenderId: "642187294882",
  appId: "1:642187294882:web:fe30f0016e5803a5e1bffb",
  measurementId: "G-8XSRK7TE1K",
};

let isFirebaseInitialized = false;
let firebaseApp, db, auth;

try {
  firebaseApp = initializeApp(userFirebaseConfig);
  db = getFirestore(firebaseApp);
  auth = getAuth(firebaseApp);
  isFirebaseInitialized = true;
  console.log("✅ Firebase Initialized Successfully");
} catch (e) {
  console.error('❌ Firebase Initialization Failed:', e);
}

const PATHS = {
  SETTINGS: `artifacts/${APP_ID}/public/data/settings/config`,
  SUBMISSIONS: `artifacts/${APP_ID}/public/data/submissions`,
};

// دالة مساعدة لإعادة المحاولة في حالة ضعف النت
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

// =========================================================================
// 2. CONSTANTS & DATA MODELS
// =========================================================================

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
  termsText: 'الشروط والأحكام:\n- يجب أن يكون التصميم أصلياً.\n- الالتزام بالآداب العامة.',
  whyText: 'لتعزيز المحتوى العربي الإبداعي ودعم المواهب.',
};

// =========================================================================
// 3. UTILITY HOOKS & HELPERS
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

// =========================================================================
// 4. UI COMPONENTS (Cards, Modals, Inputs)
// =========================================================================

const GlassCard = ({ children, className = '', isGlassmorphism = true, color = 'bg-gray-900', onClick }) => {
  const glassClasses = isGlassmorphism
    ? 'bg-opacity-60 backdrop-blur-xl shadow-2xl border border-white/10'
    : 'bg-opacity-100 shadow-xl border border-gray-800';
  
  return (
    <div 
      className={`p-5 rounded-2xl transition-all duration-300 ${color} ${glassClasses} ${className}`}
      onClick={onClick}
    >
      {children}
    </div>
  );
};

const Modal = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm animate-fadeIn" onClick={onClose}>
      <GlassCard 
        className="w-full max-w-2xl max-h-[90vh] overflow-y-auto relative flex flex-col !p-0" 
        color="bg-gray-900" 
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center p-5 border-b border-white/10 bg-white/5 sticky top-0 backdrop-blur-md z-10">
          <h2 className="text-xl font-bold text-white">{title}</h2>
          <button onClick={onClose} className="text-white/70 hover:text-red-500 transition p-1 rounded-full hover:bg-white/10">
            <X className="w-6 h-6" />
          </button>
        </div>
        <div className="p-6 text-white space-y-4 text-lg leading-relaxed">
          {children}
        </div>
      </GlassCard>
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
      className="w-full p-3 rounded-lg bg-black/40 border border-white/10 text-white placeholder-gray-500 focus:ring-2 focus:ring-highlight-color focus:border-transparent transition duration-200 outline-none"
    />
  </div>
);

const AlertBanner = ({ settings }) => {
  const stageInfo = STAGES[settings.stage];
  return (
    <div className="mb-8 relative overflow-hidden rounded-xl shadow-2xl border border-white/10"
         style={{ 
           backgroundColor: stageInfo.color === 'yellow' ? settings.mainColor : 
                            stageInfo.color === 'blue' ? '#2563eb' : 
                            stageInfo.color === 'red' ? '#b91c1c' : '#059669' 
         }}>
      <style>{`
        @keyframes marquee { 0% { transform: translateX(100%); } 100% { transform: translateX(-100%); } }
        .animate-marquee { animation: marquee 25s linear infinite; }
      `}</style>
      <div className="flex items-center p-4 relative z-10 text-white">
        <div className="bg-white/20 p-2 rounded-full ml-4 animate-pulse shrink-0">
          <stageInfo.icon className="w-6 h-6" />
        </div>
        <div className="flex-1 overflow-hidden flex items-center">
          <p className="text-lg font-bold ml-4 whitespace-nowrap">{stageInfo.label}</p>
          <div className="h-6 w-px bg-white/30 mx-4"></div>
          <div className="whitespace-nowrap animate-marquee inline-block text-lg">
            {settings.marqueeText}
          </div>
        </div>
        {settings.logoUrl && <img src={settings.logoUrl} alt="Logo" className="h-10 w-10 rounded-lg ml-4 object-cover bg-white" />}
      </div>
    </div>
  );
};

// =========================================================================
// 5. ADMIN PANEL COMPONENTS (THE FIXED VERSION)
// =========================================================================

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
      setError('Firebase is not initialized.');
      setLoading(false);
      return;
    }
    try {
      await signInWithEmailAndPassword(auth, email, password);
      onSuccess();
    } catch (err) {
      setError('فشل الدخول. تأكد من البريد الإلكتروني وكلمة المرور.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/90 backdrop-blur-md p-4">
      <GlassCard className="w-full max-w-md p-8 border-highlight-color" color="bg-gray-900">
        <div className="flex justify-center mb-6">
          <div className="p-4 rounded-full bg-white/5">
            <Lock className="w-8 h-8 text-highlight-color" />
          </div>
        </div>
        <h2 className="text-2xl font-bold text-white text-center mb-6">تسجيل دخول المدير</h2>
        <form onSubmit={handleLogin} className="space-y-4">
          <div className="relative">
            <Mail className="absolute right-3 top-3.5 text-gray-400 w-5 h-5" />
            <input type="email" placeholder="admin@example.com" className="w-full p-3 pr-10 rounded bg-black/50 text-white border border-white/10 focus:border-highlight-color outline-none" value={email} onChange={e => setEmail(e.target.value)} required />
          </div>
          <div className="relative">
            <Key className="absolute right-3 top-3.5 text-gray-400 w-5 h-5" />
            <input type="password" placeholder="********" className="w-full p-3 pr-10 rounded bg-black/50 text-white border border-white/10 focus:border-highlight-color outline-none" value={password} onChange={e => setPassword(e.target.value)} required />
          </div>
          {error && <p className="text-red-400 text-sm text-center bg-red-900/20 p-2 rounded">{error}</p>}
          <button type="submit" disabled={loading} className="w-full bg-highlight-color hover:brightness-110 text-black p-3 rounded font-bold transition mt-4" style={{ backgroundColor: 'var(--main-color-css)' }}>
            {loading ? 'جاري التحقق...' : 'دخول'}
          </button>
          <button type="button" onClick={onClose} className="w-full text-gray-400 hover:text-white text-sm mt-2">إلغاء</button>
        </form>
      </GlassCard>
    </div>
  );
};

const AdminSettingsPanel = ({ settings, onSaveSettings }) => {
  // 🛑 CRITICAL FIX: Local state management allows typing without re-renders/freezing
  const [localSettings, setLocalSettings] = useState(settings);
  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Sync local state only when global settings change AND user is not typing (clean load)
  useEffect(() => {
    if (settings && !isDirty) {
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
    setIsDirty(false); // Reset dirty flag after successful save
    setIsSaving(false);
  };

  const SectionTitle = ({ icon: Icon, title }) => (
    <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2 border-b border-white/10 pb-2 mt-6 first:mt-0">
      <Icon className="w-5 h-5 text-highlight-color" /> {title}
    </h3>
  );

  return (
    <GlassCard className="p-6 mb-8 animate-slideUp" isGlassmorphism>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-white">⚙️ إعدادات النظام</h2>
        {isDirty && <span className="text-yellow-400 text-sm animate-pulse bg-yellow-400/10 px-3 py-1 rounded-full">● تغييرات غير محفوظة</span>}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* العمود الأول: الهوية */}
        <div>
          <SectionTitle icon={SettingsIcon} title="الهوية البصرية" />
          <InputField label="عنوان المسابقة" id="title" value={localSettings.title} onChange={(v) => handleChange('title', v)} />
          <InputField label="رابط الشعار (Logo URL)" id="logo" value={localSettings.logoUrl} onChange={(v) => handleChange('logoUrl', v)} />
          <InputField label="نوع الخط (Google Font Name)" id="font" value={localSettings.appFont} onChange={(v) => handleChange('appFont', v)} placeholder="e.g. Cairo, Tajawal" />
          
          <div className="flex gap-4 mb-4">
             <div className="flex-1">
               <label className="block text-white mb-2 text-sm">اللون الأساسي</label>
               <div className="flex items-center gap-2 bg-black/30 p-2 rounded-lg border border-white/10">
                 <input type="color" value={localSettings.mainColor} onChange={(e) => handleChange('mainColor', e.target.value)} className="h-8 w-8 rounded cursor-pointer border-0 bg-transparent" />
                 <span className="text-xs text-white/70 font-mono">{localSettings.mainColor}</span>
               </div>
             </div>
             <div className="flex-1">
               <label className="block text-white mb-2 text-sm">لون التوهج</label>
               <div className="flex items-center gap-2 bg-black/30 p-2 rounded-lg border border-white/10">
                 <input type="color" value={localSettings.highlightColor} onChange={(e) => handleChange('highlightColor', e.target.value)} className="h-8 w-8 rounded cursor-pointer border-0 bg-transparent" />
                 <span className="text-xs text-white/70 font-mono">{localSettings.highlightColor}</span>
               </div>
             </div>
          </div>
          
          <div className="flex items-center gap-3 mt-4 bg-black/30 p-3 rounded-lg border border-white/10">
            <input 
              type="checkbox" 
              id="glass" 
              checked={localSettings.useGlassmorphism} 
              onChange={(e) => handleChange('useGlassmorphism', e.target.checked)}
              className="w-5 h-5 rounded border-gray-500 text-blue-600 focus:ring-blue-500 cursor-pointer"
            />
            <label htmlFor="glass" className="text-white select-none cursor-pointer text-sm">تفعيل تأثير الزجاج (Glassmorphism)</label>
          </div>
        </div>

        {/* العمود الثاني: المحتوى */}
        <div>
          <SectionTitle icon={Clock} title="المرحلة والمحتوى" />
          <div className="mb-6">
            <label className="block text-white mb-2 text-sm">المرحلة الحالية</label>
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(STAGES).map(([key, info]) => (
                <button
                  key={key}
                  onClick={() => handleChange('stage', key)}
                  className={`p-2 rounded-lg text-sm font-bold transition-all duration-200 flex items-center justify-center gap-2 border border-transparent
                    ${localSettings.stage === key ? 'shadow-lg scale-[1.02] border-white/20' : 'opacity-60 hover:opacity-100 bg-gray-800'}
                  `}
                  style={{ backgroundColor: localSettings.stage === key ? localSettings.mainColor : '' }}
                >
                  <info.icon className="w-4 h-4" /> {info.label}
                </button>
              ))}
            </div>
          </div>

          <InputField label="نص الشريط المتحرك" id="marquee" value={localSettings.marqueeText} onChange={(v) => handleChange('marqueeText', v)} />
          
          <div className="space-y-4">
             <div>
               <label className="block text-white mb-2 text-sm">لماذا هذه المسابقة؟</label>
               <textarea 
                 rows="3" 
                 value={localSettings.whyText} 
                 onChange={(e) => handleChange('whyText', e.target.value)}
                 className="w-full p-3 rounded-lg bg-black/40 border border-white/10 text-white text-sm focus:ring-2 focus:ring-highlight-color outline-none"
               />
             </div>
             <div>
               <label className="block text-white mb-2 text-sm">الشروط والأحكام</label>
               <textarea 
                 rows="3" 
                 value={localSettings.termsText} 
                 onChange={(e) => handleChange('termsText', e.target.value)}
                 className="w-full p-3 rounded-lg bg-black/40 border border-white/10 text-white text-sm focus:ring-2 focus:ring-highlight-color outline-none"
               />
             </div>
          </div>
        </div>
      </div>

      <div className="mt-8 pt-6 border-t border-white/10 flex justify-end sticky bottom-0 bg-gray-900/90 p-2 -mx-2 rounded-b-lg backdrop-blur-sm">
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="flex items-center gap-2 px-8 py-3 rounded-lg font-bold text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105 active:scale-95 shadow-lg w-full md:w-auto justify-center"
          style={{ backgroundColor: localSettings.mainColor }}
        >
          {isSaving ? <Loader className="animate-spin w-5 h-5" /> : <Save className="w-5 h-5" />}
          {isSaving ? 'جاري الحفظ...' : 'حفظ التغييرات'}
        </button>
      </div>
    </GlassCard>
  );
};

const AdminSubmissionsPanel = ({ submissions, onUpdateStatus }) => {
  const [filter, setFilter] = useState('Pending');
  const filteredSubs = useMemo(() => {
      let list = submissions.filter(s => s.status === filter);
      if (filter === 'Approved') list.sort((a, b) => b.votes - a.votes);
      return list;
  }, [submissions, filter]);

  return (
    <GlassCard isGlassmorphism className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-xl font-bold text-white">إدارة المشاركات</h3>
        <div className="flex bg-black/30 rounded-lg p-1">
          {['Pending', 'Approved', 'Rejected'].map(status => (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className={`px-4 py-2 rounded-md text-sm font-bold transition ${filter === status ? 'bg-gray-700 text-white shadow' : 'text-white/50 hover:text-white'}`}
            >
              {status === 'Pending' ? 'قيد الانتظار' : status === 'Approved' ? 'المقبولة' : 'المرفوضة'} 
              <span className="ml-1 text-xs opacity-70 bg-black/20 px-1.5 rounded-full">{submissions.filter(s => s.status === status).length}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2 max-h-[600px] overflow-y-auto custom-scrollbar pr-2">
        {filteredSubs.length === 0 ? (
           <div className="text-center py-12 text-white/30 border-2 border-dashed border-white/10 rounded-xl">
             <FileText className="w-12 h-12 mx-auto mb-2 opacity-50" />
             <p>لا توجد مشاركات في هذه القائمة</p>
           </div>
        ) : (
           filteredSubs.map(sub => (
             <div key={sub.id} className="flex flex-col md:flex-row items-center gap-4 bg-white/5 p-4 rounded-xl border border-white/5 hover:border-white/10 transition hover:bg-white/10">
                <img src={sub.thumbnailUrl} alt="" className="w-16 h-16 rounded-lg object-cover bg-black" />
                
                <div className="flex-1 text-center md:text-right w-full">
                  <div className="flex items-center justify-center md:justify-start gap-2">
                     <h4 className="font-bold text-white text-lg">{sub.participantName}</h4>
                     <span className="text-xs bg-white/10 px-2 py-0.5 rounded text-white/70">{sub.country} {sub.flag}</span>
                  </div>
                  <a href={sub.videoUrl} target="_blank" rel="noreferrer" className="text-highlight-color text-sm hover:underline truncate block max-w-md mx-auto md:mx-0">
                    {sub.videoUrl}
                  </a>
                  <p className="text-xs text-white/40 mt-1">{new Date(sub.submittedAt?.toDate?.() || Date.now()).toLocaleString('ar-EG')}</p>
                </div>

                <div className="flex items-center gap-4 shrink-0">
                   {filter === 'Approved' && (
                     <div className="text-center bg-black/30 px-4 py-2 rounded-lg">
                       <span className="block text-xs text-white/50">الأصوات</span>
                       <span className="font-bold text-xl text-highlight-color">{sub.votes}</span>
                     </div>
                   )}
                   
                   <div className="flex gap-2">
                     {filter !== 'Approved' && (
                       <button onClick={() => onUpdateStatus(sub.id, 'Approved')} className="p-2 bg-green-600/20 text-green-400 hover:bg-green-600 hover:text-white rounded-lg transition" title="قبول">
                         <CheckCircle size={20} />
                       </button>
                     )}
                     {filter !== 'Rejected' && (
                       <button onClick={() => onUpdateStatus(sub.id, 'Rejected')} className="p-2 bg-red-600/20 text-red-400 hover:bg-red-600 hover:text-white rounded-lg transition" title="رفض">
                         <X size={20} />
                       </button>
                     )}
                     {filter !== 'Pending' && (
                        <button onClick={() => onUpdateStatus(sub.id, 'Pending')} className="p-2 bg-yellow-600/20 text-yellow-400 hover:bg-yellow-600 hover:text-white rounded-lg transition" title="إعادة للانتظار">
                          <Clock size={20} />
                        </button>
                     )}
                   </div>
                </div>
             </div>
           ))
        )}
      </div>
    </GlassCard>
  );
};

// =========================================================================
// 6. PUBLIC PAGE COMPONENTS
// =========================================================================

const SubmissionForm = ({ settings }) => {
  // ✅ FIX: Local state for form inputs ensures they are writable
  const [form, setForm] = useState({ name: '', country: COUNTRIES[0].name, url: '' });
  const [status, setStatus] = useState('idle'); // idle, submitting, success, error

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.url) return alert('الرجاء ملء جميع الحقول');
    
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
    <GlassCard className="max-w-xl mx-auto p-8 mt-10" isGlassmorphism={settings.useGlassmorphism}>
      <div className="text-center mb-8">
        <div className="inline-block p-3 rounded-full bg-white/5 mb-4">
          <Clock className="w-8 h-8 text-blue-400" />
        </div>
        <h2 className="text-3xl font-bold text-white mb-2">استمارة المشاركة</h2>
        <p className="text-white/60">أرسل إبداعك الآن للمنافسة</p>
      </div>

      {status === 'success' && (
        <div className="bg-green-500/20 border border-green-500 text-green-200 p-4 rounded-lg mb-6 text-center flex items-center justify-center gap-2 animate-fadeIn">
          <CheckCircle className="w-5 h-5" /> تم استلام مشاركتك بنجاح! سيتم مراجعتها قريباً.
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <InputField 
          label="الاسم الكامل / اللقب" 
          id="sub-name" 
          value={form.name} 
          onChange={v => setForm({...form, name: v})} 
          placeholder="مثال: أحمد العلي" 
        />
        
        <div className="mb-4">
          <label className="block text-white mb-2 text-sm opacity-90">البلد</label>
          <div className="relative">
            <select 
              value={form.country} 
              onChange={e => setForm({...form, country: e.target.value})}
              className="w-full p-3 pl-10 rounded-lg bg-black/40 border border-white/10 text-white appearance-none focus:ring-2 focus:ring-highlight-color outline-none"
            >
              {COUNTRIES.map(c => <option key={c.code} value={c.name}>{c.flag} {c.name}</option>)}
            </select>
            <ChevronDown className="absolute left-3 top-3.5 w-5 h-5 text-white/50 pointer-events-none" />
          </div>
        </div>

        <InputField 
          label="رابط الفيديو (TikTok)" 
          id="sub-url" 
          value={form.url} 
          onChange={v => setForm({...form, url: v})} 
          placeholder="https://www.tiktok.com/..." 
        />

        <button 
          type="submit" 
          disabled={status === 'submitting'}
          className="w-full py-4 rounded-xl font-bold text-lg transition-all transform hover:-translate-y-1 hover:shadow-xl disabled:opacity-50 disabled:translate-y-0 text-white mt-4"
          style={{ backgroundColor: settings.mainColor }}
        >
          {status === 'submitting' ? <Loader className="animate-spin inline mx-auto" /> : 'إرسال المشاركة 🚀'}
        </button>
      </form>
    </GlassCard>
  );
};

const VideoCard = ({ submission, settings, onVote, onClick }) => {
  return (
    <div 
      onClick={onClick}
      className="group relative aspect-[9/16] rounded-2xl overflow-hidden cursor-pointer transform transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl hover:shadow-highlight-color/20 border border-white/5 bg-gray-800"
    >
      <img 
        src={submission.thumbnailUrl} 
        alt={submission.participantName} 
        className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity duration-500"
        onError={(e) => e.target.src = 'https://placehold.co/600x900/333/fff?text=No+Image'}
      />
      
      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent flex flex-col justify-end p-4">
        <div className="flex justify-between items-end mb-3">
          <div className="overflow-hidden">
            <h3 className="font-bold text-white text-lg truncate shadow-sm">{submission.participantName}</h3>
            <p className="text-white/70 text-sm flex items-center gap-1">{submission.flag} {submission.country}</p>
          </div>
          <div className="text-center bg-white/10 backdrop-blur-md p-2 rounded-lg border border-white/10 shrink-0">
            <p className="text-[10px] text-white/60 uppercase">Votes</p>
            <p className="font-bold text-white text-xl leading-none" style={{ color: settings.highlightColor }}>{submission.votes}</p>
          </div>
        </div>
        
        <button 
          onClick={(e) => { e.stopPropagation(); onVote(submission); }}
          className="w-full py-3 rounded-xl font-bold text-sm bg-white text-black hover:bg-gray-200 transition flex items-center justify-center gap-2 shadow-lg active:scale-95"
        >
          <Crown className="w-4 h-4 text-yellow-600" /> تصويت
        </button>
      </div>
    </div>
  );
};

const VideoModal = ({ isOpen, onClose, submission, settings, onVote }) => {
  if (!isOpen || !submission) return null;
  const videoId = submission.videoUrl.split('/').pop().split('?')[0];
  const embedUrl = `https://www.tiktok.com/embed/v2/${videoId}?lang=ar`;

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md" onClick={onClose}>
      <GlassCard className="w-full max-w-4xl h-[90vh] flex flex-col md:flex-row overflow-hidden !p-0" onClick={e => e.stopPropagation()}>
        {/* Video Player */}
        <div className="w-full md:w-2/3 bg-black flex items-center justify-center relative">
           <iframe src={embedUrl} className="w-full h-full" title="Video" allowFullScreen></iframe>
           <button onClick={onClose} className="absolute top-4 right-4 bg-black/50 p-2 rounded-full text-white hover:bg-red-600 transition md:hidden">
             <X />
           </button>
        </div>

        {/* Sidebar Info */}
        <div className="w-full md:w-1/3 bg-gray-900 p-6 flex flex-col relative">
           <button onClick={onClose} className="absolute top-4 right-4 text-white/50 hover:text-white hidden md:block"><X /></button>
           
           <div className="mt-8 text-center">
             <div className="w-20 h-20 mx-auto rounded-full border-4 border-highlight-color p-1 mb-4">
               <img src={submission.thumbnailUrl} className="w-full h-full rounded-full object-cover" alt="" />
             </div>
             <h2 className="text-2xl font-bold text-white">{submission.participantName}</h2>
             <p className="text-white/50 flex items-center justify-center gap-2 mt-1">{submission.flag} {submission.country}</p>
           </div>

           <div className="mt-8 grid grid-cols-2 gap-4">
              <div className="bg-white/5 p-4 rounded-xl text-center">
                <p className="text-white/50 text-xs">الحالة</p>
                <p className="text-green-400 font-bold">نشط</p>
              </div>
              <div className="bg-white/5 p-4 rounded-xl text-center border border-highlight-color/30">
                <p className="text-white/50 text-xs">الأصوات</p>
                <p className="text-highlight-color font-bold text-2xl">{submission.votes}</p>
              </div>
           </div>

           <div className="mt-auto pt-6">
             <button 
               onClick={() => onVote(submission)}
               className="w-full py-4 rounded-xl font-bold text-lg transition hover:scale-105 active:scale-95 shadow-lg mb-2 text-white"
               style={{ backgroundColor: settings.mainColor }}
             >
               تصويت لهذا المشارك
             </button>
             <p className="text-center text-xs text-white/30">يمكنك التصويت مرة كل 30 ثانية</p>
           </div>
        </div>
      </GlassCard>
    </div>
  );
};

const LiveResultsTicker = ({ submissions, settings }) => {
  const topList = useMemo(() => [...submissions].sort((a,b) => b.votes - a.votes).slice(0, 10), [submissions]);
  if (topList.length === 0) return null;

  return (
    <div className="mb-10">
      <h3 className="text-white/50 text-sm font-bold mb-4 uppercase tracking-wider flex items-center gap-2">
        <div className="w-2 h-2 bg-red-500 rounded-full animate-ping"></div> النتائج المباشرة
      </h3>
      <div className="flex gap-4 overflow-x-auto pb-4 snap-x hide-scrollbar">
        {topList.map((sub, idx) => (
          <div key={sub.id} className="min-w-[160px] snap-start bg-gray-900/50 border border-white/5 p-3 rounded-xl flex flex-col items-center relative group">
             <div className="absolute top-2 right-2 text-xs font-bold text-white/20 group-hover:text-highlight-color">#{idx + 1}</div>
             <img src={sub.thumbnailUrl} className="w-12 h-12 rounded-full border-2 border-white/10 mb-2 group-hover:border-highlight-color transition" alt="" />
             <p className="font-bold text-white text-sm truncate w-full text-center">{sub.participantName}</p>
             <p className="font-black text-lg text-highlight-color">{sub.votes}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

// =========================================================================
// 7. MAIN CONTROLLER (ContestApp)
// =========================================================================

const ContestApp = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  // Global State
  const [settings, setSettings] = useState(null);
  const [submissions, setSubmissions] = useState([]);
  const [loadingData, setLoadingData] = useState(true);
  
  // Modals State
  const [modals, setModals] = useState({
    adminAuth: false,
    voteConfirm: null,
    videoPlayer: null,
    info: null, // for footer links (why, terms, organizers)
  });

  // Cooldown System
  const [cooldown, setCooldown] = useState(0);
  
  // Admin Secret Trigger
  const secretClickRef = useRef(0);
  const secretTimerRef = useRef(null);

  // --- 1. Fetch Data ---
  useEffect(() => {
    if (!isFirebaseInitialized) {
      setSettings(DEFAULT_SETTINGS);
      setLoadingData(false);
      return;
    }

    // Realtime Settings
    const unsubSettings = onSnapshot(doc(db, PATHS.SETTINGS), (docSnap) => {
      if (docSnap.exists()) setSettings(docSnap.data());
      else setDoc(doc(db, PATHS.SETTINGS), DEFAULT_SETTINGS);
      setLoadingData(false);
    });

    // Realtime Submissions
    const unsubSubs = onSnapshot(collection(db, PATHS.SUBMISSIONS), (snap) => {
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setSubmissions(list);
    });

    return () => { unsubSettings(); unsubSubs(); };
  }, []);

  // --- 2. Dynamic Styles ---
  useEffect(() => {
    if (settings) {
      document.documentElement.style.setProperty('--main-color-css', settings.mainColor);
      document.documentElement.style.setProperty('--highlight-color-css', settings.highlightColor);
      document.documentElement.style.fontFamily = `"${settings.appFont}", sans-serif`;
    }
  }, [settings]);

  // --- 3. Actions ---
  const handleSaveSettings = async (newSettings) => {
    try {
      // ✅ FIX: merge: true saves partial updates without overwriting
      await setDoc(doc(db, PATHS.SETTINGS), newSettings, { merge: true });
      alert("✅ تم حفظ الإعدادات بنجاح");
    } catch (e) {
      alert("❌ خطأ في الحفظ: " + e.message);
    }
  };

  const handleUpdateStatus = async (id, status) => {
    await updateDoc(doc(db, PATHS.SUBMISSIONS, id), { status });
  };

  const handleVoteRequest = (sub) => {
    if (cooldown > 0) return alert(`يرجى الانتظار ${cooldown} ثانية`);
    setModals(prev => ({ ...prev, voteConfirm: sub }));
  };

  const confirmVote = async () => {
    const sub = modals.voteConfirm;
    if (!sub) return;
    
    try {
      await updateDoc(doc(db, PATHS.SUBMISSIONS, sub.id), { votes: increment(1) });
      setCooldown(30); // 30 seconds cooldown
      setModals(prev => ({ ...prev, voteConfirm: null }));
    } catch (e) {
      console.error(e);
    }
  };

  // Cooldown Timer
  useEffect(() => {
    if (cooldown > 0) {
      const timer = setInterval(() => setCooldown(c => c - 1), 1000);
      return () => clearInterval(timer);
    }
  }, [cooldown]);

  // Secret Admin Clicker
  const handleSecretClick = () => {
    clearTimeout(secretTimerRef.current);
    secretClickRef.current += 1;
    if (secretClickRef.current === 5) {
      if (user) navigate('/admin');
      else setModals(prev => ({ ...prev, adminAuth: true }));
      secretClickRef.current = 0;
    }
    secretTimerRef.current = setTimeout(() => secretClickRef.current = 0, 2000);
  };

  // --- Loading State ---
  if (loadingData || !settings) return (
    <div className="h-screen bg-black flex flex-col items-center justify-center text-white gap-4">
      <Loader className="w-10 h-10 animate-spin text-red-500" />
      <p className="animate-pulse">جارِ تحميل النظام...</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#050505] text-white font-sans selection:bg-highlight-color selection:text-black">
      {/* Global Styles for CSS Variables */}
      <style>{`
        :root { --highlight-color: ${settings.highlightColor}; }
        .text-highlight-color { color: var(--highlight-color); }
        .border-highlight-color { border-color: var(--highlight-color); }
        .bg-highlight-color { background-color: var(--highlight-color); }
        /* Custom Scrollbar */
        ::-webkit-scrollbar { width: 8px; }
        ::-webkit-scrollbar-track { bg: #111; }
        ::-webkit-scrollbar-thumb { bg: #333; rounded: 4px; }
        ::-webkit-scrollbar-thumb:hover { bg: #555; }
      `}</style>

      <Routes>
        {/* --- ADMIN ROUTE --- */}
        <Route path="/admin" element={
           user ? (
             <div className="container mx-auto px-4 py-8">
               <div className="flex justify-between items-center mb-8 bg-gray-900 p-4 rounded-2xl border border-white/10">
                 <h1 className="text-2xl font-bold flex items-center gap-2">
                   <SettingsIcon className="text-highlight-color" /> لوحة التحكم
                 </h1>
                 <div className="flex gap-3">
                   <button onClick={() => navigate('/')} className="px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-sm transition">الموقع</button>
                   <button onClick={() => signOut(auth).then(() => navigate('/'))} className="px-4 py-2 rounded-lg bg-red-600/20 text-red-400 hover:bg-red-600 hover:text-white text-sm transition flex items-center gap-2">
                     <LogOut size={16} /> خروج
                   </button>
                 </div>
               </div>
               
               <AdminSettingsPanel settings={settings} onSaveSettings={handleSaveSettings} />
               <AdminSubmissionsPanel submissions={submissions} onUpdateStatus={handleUpdateStatus} />
             </div>
           ) : (
             <div className="h-screen flex flex-col items-center justify-center gap-4">
               <AlertTriangle className="w-16 h-16 text-red-500 mb-4" />
               <h2 className="text-2xl font-bold">منطقة محظورة</h2>
               <button onClick={() => setModals(p => ({...p, adminAuth: true}))} className="text-blue-400 hover:underline">تسجيل الدخول</button>
             </div>
           )
        } />

        {/* --- PUBLIC ROUTE --- */}
        <Route path="/" element={
          <>
            {/* Header */}
            <header className="sticky top-0 z-40 bg-black/80 backdrop-blur-lg border-b border-white/10">
               <div className="container mx-auto px-4 py-3 flex justify-between items-center">
                 <div className="flex items-center gap-3 cursor-pointer" onClick={() => window.location.reload()}>
                   {settings.logoUrl && <img src={settings.logoUrl} className="h-10 w-10 rounded-lg object-cover" alt="Logo" />}
                   <h1 className="text-xl font-black tracking-tight">{settings.title}</h1>
                 </div>
                 {user && (
                   <button onClick={() => navigate('/admin')} className="bg-white/10 hover:bg-white/20 px-4 py-2 rounded-full text-xs font-bold transition flex items-center gap-2">
                     <SettingsIcon size={14} /> الإدارة
                   </button>
                 )}
               </div>
            </header>

            <main className="container mx-auto px-4 py-8 min-h-[80vh]">
               <AlertBanner settings={settings} />

               {/* Stage: Submission */}
               {settings.stage === 'Submission' && (
                 <SubmissionForm settings={settings} />
               )}

               {/* Stage: Voting/Ended */}
               {(settings.stage === 'Voting' || settings.stage === 'Ended') && (
                 <div className="animate-slideUp">
                    <LiveResultsTicker submissions={submissions.filter(s => s.status === 'Approved')} settings={settings} />
                    
                    <div className="flex items-center justify-between mb-6 mt-12 border-b border-white/10 pb-4">
                      <h2 className="text-2xl font-bold flex items-center gap-2">
                        <Crown className="text-yellow-500" /> المشاركات
                      </h2>
                      <span className="bg-white/10 px-3 py-1 rounded-full text-xs text-white/60">
                        {submissions.filter(s => s.status === 'Approved').length} فيديو
                      </span>
                    </div>

                    {submissions.filter(s => s.status === 'Approved').length === 0 ? (
                      <div className="text-center py-20 bg-white/5 rounded-2xl border border-dashed border-white/10">
                        <p className="text-white/40">لا توجد مشاركات معتمدة حتى الآن</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                        {submissions
                          .filter(s => s.status === 'Approved')
                          .sort((a,b) => b.votes - a.votes)
                          .map(sub => (
                            <VideoCard 
                              key={sub.id} 
                              submission={sub} 
                              settings={settings} 
                              onVote={handleVoteRequest} 
                              onClick={() => setModals(p => ({...p, videoPlayer: sub}))}
                            />
                          ))
                        }
                      </div>
                    )}
                 </div>
               )}

               {/* Stage: Paused */}
               {settings.stage === 'Paused' && (
                 <div className="text-center py-32">
                   <div className="inline-block p-6 bg-white/5 rounded-full mb-6">
                     <Clock className="w-16 h-16 text-white/30" />
                   </div>
                   <h2 className="text-4xl font-bold mb-4">نعود قريباً</h2>
                   <p className="text-white/50 text-lg">المسابقة متوقفة مؤقتاً للصيانة أو الفرز</p>
                 </div>
               )}
            </main>

            {/* Footer */}
            <footer className="border-t border-white/10 bg-black py-12 mt-20">
              <div className="container mx-auto px-4 text-center">
                <div className="flex justify-center gap-8 mb-8 text-sm font-bold text-white/60">
                  <button onClick={() => setModals(p => ({...p, info: 'why'}))} className="hover:text-highlight-color transition">عن المسابقة</button>
                  <button onClick={() => setModals(p => ({...p, info: 'terms'}))} className="hover:text-highlight-color transition">الشروط</button>
                  <button onClick={() => setModals(p => ({...p, info: 'organizers'}))} className="hover:text-highlight-color transition">المنظمون</button>
                </div>
                <p onClick={handleSecretClick} className="text-white/20 text-xs cursor-pointer hover:text-white/40 transition select-none">
                  &copy; 2025 {settings.title}. All rights reserved.
                </p>
              </div>
            </footer>
          </>
        } />
      </Routes>

      {/* --- GLOBAL MODALS --- */}
      
      <AdminAuthModal 
        isOpen={modals.adminAuth} 
        onClose={() => setModals(p => ({...p, adminAuth: false}))} 
        onSuccess={() => { setModals(p => ({...p, adminAuth: false})); navigate('/admin'); }} 
      />

      <Modal isOpen={!!modals.voteConfirm} onClose={() => setModals(p => ({...p, voteConfirm: null}))} title="تأكيد التصويت">
        <div className="text-center">
          <p className="text-lg mb-6">هل تريد منح صوتك للمشارك <br/><span className="font-bold text-highlight-color text-xl">{modals.voteConfirm?.participantName}</span>؟</p>
          <div className="flex gap-4">
             <button onClick={() => setModals(p => ({...p, voteConfirm: null}))} className="flex-1 py-3 rounded-xl bg-white/10 hover:bg-white/20 font-bold">إلغاء</button>
             <button onClick={confirmVote} className="flex-1 py-3 rounded-xl text-black font-bold hover:brightness-110" style={{ backgroundColor: settings.mainColor }}>تأكيد التصويت</button>
          </div>
        </div>
      </Modal>

      <VideoModal 
        isOpen={!!modals.videoPlayer} 
        submission={modals.videoPlayer} 
        settings={settings} 
        onClose={() => setModals(p => ({...p, videoPlayer: null}))} 
        onVote={handleVoteRequest} 
      />

      <Modal isOpen={!!modals.info} onClose={() => setModals(p => ({...p, info: null}))} title={
        modals.info === 'why' ? 'لماذا المسابقة؟' : modals.info === 'terms' ? 'الشروط والأحكام' : 'المنظمون'
      }>
        {modals.info === 'why' && settings.whyText}
        {modals.info === 'terms' && settings.termsText}
        {modals.info === 'organizers' && (
          <div className="grid gap-4">
            {ORGANIZERS.map((org, i) => (
              <div key={i} className="flex items-center gap-4 bg-white/5 p-3 rounded-xl">
                <img src={org.imageUrl} alt="" className="w-14 h-14 rounded-full object-cover bg-black border-2 border-white/10" />
                <div>
                  <h4 className="font-bold text-lg">{org.name}</h4>
                  <p className="text-white/50 text-sm">{org.role}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </Modal>

    </div>
  );
};

// =========================================================================
// 8. ROOT WRAPPER
// =========================================================================

export default function App() {
  return (
    <BrowserRouter>
      <ContestApp />
    </BrowserRouter>
  );
}