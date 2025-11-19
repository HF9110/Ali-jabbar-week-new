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
  increment,
  addDoc,
  updateDoc,
  serverTimestamp,
} from 'firebase/firestore';
import {
  Crown,
  Search,
  Settings as SettingsIcon,
  X,
  Loader,
  AlertTriangle,
  Lock,
  Mail,
  Key,
  CheckCircle,
  Clock,
  LogOut,
  FileText,
  Save,
  Plus,
  Edit3,
  Trash2,
  Filter,
  Play
} from 'lucide-react';

// =========================================================================
// 1. FIREBASE CONFIGURATION
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
} catch (e) {
  console.error('❌ Firebase Initialization Failed:', e);
}

const PATHS = {
  SETTINGS: `artifacts/${APP_ID}/public/data/settings/config`,
  SUBMISSIONS: `artifacts/${APP_ID}/public/data/submissions`,
};

// =========================================================================
// 2. CONSTANTS & STYLES
// =========================================================================

const STAGES = {
  Submission: { label: 'استقبال المشاركات', color: 'blue', icon: Clock },
  Voting: { label: 'التصويت مفتوح', color: 'yellow', icon: CheckCircle },
  Paused: { label: 'متوقفة مؤقتاً', color: 'red', icon: AlertTriangle },
  Ended: { label: 'إعلان النتائج', color: 'green', icon: Crown },
};

const COUNTRIES = [
  { name: 'الكل', code: 'ALL', flag: '🌍' }, // Added for filter
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
].sort((a, b) => a.name === 'الكل' ? -1 : a.name.localeCompare(b.name, 'ar'));

const DEFAULT_ORGANIZERS = [
  { name: 'علي جبار', role: 'المشرف العام', imageUrl: 'https://placehold.co/100x100/fe2c55/25f4ee?text=Ali' },
  { name: 'فريق الإدارة', role: 'التنظيم', imageUrl: 'https://placehold.co/100x100/25f4ee/fe2c55?text=Team' },
];

const DEFAULT_SETTINGS = {
  mainColor: '#fe2c55',
  highlightColor: '#25f4ee',
  appFont: 'Cairo',
  title: 'Ali Jabbar Week',
  logoUrl: 'https://placehold.co/200x60/transparent/white?text=LOGO',
  stage: 'Voting',
  useGlassmorphism: true,
  alertText: 'التصويت مفتوح! شارك في تحديد أفضل تصميم عربي.', // Was marqueeText
  termsText: 'الشروط والأحكام:\n- الالتزام بالآداب العامة.',
  whyText: 'لتعزيز المحتوى العربي الإبداعي.',
  organizers: DEFAULT_ORGANIZERS,
};

// =========================================================================
// 3. UI COMPONENTS (Updated with Animations)
// =========================================================================

const GlassCard = ({ children, className = '', isGlassmorphism = true, color = 'bg-gray-900', onClick }) => {
  const glassClasses = isGlassmorphism
    ? 'bg-opacity-60 backdrop-blur-xl shadow-2xl border border-white/10'
    : 'bg-opacity-100 shadow-xl border border-gray-800';
  return (
    <div 
      className={`p-5 rounded-2xl transition-all duration-300 hover:border-white/20 ${color} ${glassClasses} ${className}`}
      onClick={onClick}
    >
      {children}
    </div>
  );
};

const Modal = ({ isOpen, onClose, title, children, maxWidth = 'max-w-2xl' }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm animate-fadeIn" onClick={onClose}>
      <GlassCard 
        className={`w-full ${maxWidth} max-h-[90vh] overflow-y-auto relative flex flex-col !p-0`} 
        color="bg-gray-900" 
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center p-5 border-b border-white/10 bg-white/5 sticky top-0 backdrop-blur-md z-10">
          <h2 className="text-xl font-bold text-white">{title}</h2>
          <button onClick={onClose} className="text-white/70 hover:text-red-500 transition p-1 rounded-full hover:bg-white/10">
            <X className="w-6 h-6" />
          </button>
        </div>
        <div className="p-6 text-white space-y-4">
          {children}
        </div>
      </GlassCard>
    </div>
  );
};

const InputField = ({ label, id, value, onChange, type = 'text', placeholder = '', required = false }) => (
  <div className="mb-4 w-full group">
    <label htmlFor={id} className="block text-white mb-2 font-medium text-sm opacity-90 group-hover:text-highlight-color transition-colors">
      {label} {required && <span className="text-red-500">*</span>}
    </label>
    <input
      type={type}
      id={id}
      value={value || ''}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full p-3 rounded-lg bg-black/40 border border-white/10 text-white placeholder-gray-500 focus:ring-2 focus:ring-highlight-color focus:border-transparent transition duration-300 outline-none"
    />
  </div>
);

// زر بلمعة (Shine Effect)
const ShinyButton = ({ children, onClick, disabled, className = '', style = {} }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className={`relative overflow-hidden group px-6 py-3 rounded-xl font-bold text-white shadow-lg transform transition hover:-translate-y-1 hover:shadow-2xl disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
    style={style}
  >
    <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-[150%] group-hover:animate-shine z-10" />
    <span className="relative z-20 flex items-center justify-center gap-2">{children}</span>
  </button>
);

// =========================================================================
// 4. PUBLIC COMPONENTS (Refactored)
// =========================================================================

const SubmissionForm = ({ settings }) => {
  const [form, setForm] = useState({ tiktokUser: '', country: COUNTRIES[1].name, url: '' });
  const [status, setStatus] = useState('idle');

  const handleUserChange = (val) => {
    if (!val.startsWith('@') && val.length > 0) {
      setForm({ ...form, tiktokUser: '@' + val });
    } else {
      setForm({ ...form, tiktokUser: val });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.tiktokUser || !form.url || !form.tiktokUser.startsWith('@')) {
      return alert('تأكد من كتابة اسم المستخدم مع @ ورابط الفيديو.');
    }
    
    setStatus('submitting');
    try {
      const countryData = COUNTRIES.find(c => c.name === form.country);
      
      // NOTE: Real fetching requires backend. Here we set defaults.
      const defaultProfilePic = `https://ui-avatars.com/api/?name=${form.tiktokUser.substring(1)}&background=random`;
      const defaultThumb = `https://placehold.co/600x900/111/fff?text=Video+Thumbnail`;

      await addDoc(collection(db, PATHS.SUBMISSIONS), {
        tiktokUser: form.tiktokUser,
        participantName: form.tiktokUser, // Backward compatibility
        profilePicUrl: defaultProfilePic,
        country: form.country,
        flag: countryData.flag,
        videoUrl: form.url,
        thumbnailUrl: defaultThumb,
        status: 'Pending',
        votes: 0,
        submittedAt: serverTimestamp(),
      });
      setStatus('success');
      setForm({ tiktokUser: '', country: COUNTRIES[1].name, url: '' });
    } catch (err) {
      console.error(err);
      setStatus('error');
    }
  };

  return (
    <GlassCard className="max-w-xl mx-auto p-8 mt-10" isGlassmorphism={settings.useGlassmorphism}>
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-white mb-2">🚀 شارك إبداعك</h2>
        <p className="text-white/60">أدخل بياناتك من تيك توك بدقة</p>
      </div>

      {status === 'success' && (
        <div className="bg-green-500/20 border border-green-500 text-green-200 p-4 rounded-lg mb-6 text-center flex items-center justify-center gap-2 animate-fadeIn">
          <CheckCircle className="w-5 h-5" /> تم الإرسال! انتظر الموافقة.
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="flex items-center gap-3 mb-4">
           <div className="w-16 h-16 rounded-full bg-white/10 flex items-center justify-center overflow-hidden border-2 border-white/20">
              {form.tiktokUser.length > 2 ? (
                <img src={`https://ui-avatars.com/api/?name=${form.tiktokUser.substring(1)}`} alt="Avatar" className="w-full h-full" />
              ) : <Loader className="w-6 h-6 animate-spin opacity-50" />}
           </div>
           <div className="flex-1">
             <InputField 
                label="اسم المستخدم في تيك توك" 
                id="tiktok" 
                value={form.tiktokUser} 
                onChange={handleUserChange} 
                placeholder="@username"
              />
           </div>
        </div>
        
        <div className="mb-4">
          <label className="block text-white mb-2 text-sm opacity-90">البلد</label>
          <select 
            value={form.country} 
            onChange={e => setForm({...form, country: e.target.value})}
            className="w-full p-3 rounded-lg bg-black/40 border border-white/10 text-white outline-none focus:ring-2 focus:ring-highlight-color"
          >
            {COUNTRIES.filter(c => c.code !== 'ALL').map(c => <option key={c.code} value={c.name}>{c.flag} {c.name}</option>)}
          </select>
        </div>

        <InputField 
          label="رابط الفيديو" 
          id="sub-url" 
          value={form.url} 
          onChange={v => setForm({...form, url: v})} 
          placeholder="https://www.tiktok.com/@user/video/..." 
        />

        <ShinyButton 
          type="submit" 
          disabled={status === 'submitting'}
          className="w-full"
          style={{ backgroundColor: settings.mainColor }}
        >
          {status === 'submitting' ? <Loader className="animate-spin w-5 h-5" /> : 'إرسال المشاركة'}
        </ShinyButton>
      </form>
    </GlassCard>
  );
};

// --- Podium & Ticker ---
const Leaderboard = ({ submissions, settings }) => {
  const sorted = [...submissions].sort((a, b) => b.votes - a.votes);
  const top3 = sorted.slice(0, 3);
  const rest = sorted.slice(3);

  if (sorted.length === 0) return null;

  return (
    <div className="mb-12 animate-slideUp">
      {/* Top 3 Podium */}
      <div className="flex justify-center items-end gap-4 mb-10 min-h-[220px]">
        {/* 2nd Place */}
        {top3[1] && (
          <div className="flex flex-col items-center animate-bounce-slow delay-100">
            <div className="relative">
              <img src={top3[1].profilePicUrl} alt="2nd" className="w-20 h-20 rounded-full border-4 border-gray-300 shadow-lg object-cover" />
              <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 bg-gray-300 text-black text-xs font-bold px-2 py-0.5 rounded-full">#2</div>
            </div>
            <div className="mt-3 text-center">
              <p className="font-bold text-white text-sm">{top3[1].tiktokUser}</p>
              <p className="font-bold text-gray-300 text-lg">{top3[1].votes}</p>
            </div>
            <div className="w-20 h-24 bg-gray-800/50 mt-2 rounded-t-lg border-t border-gray-500/30"></div>
          </div>
        )}

        {/* 1st Place */}
        {top3[0] && (
          <div className="flex flex-col items-center z-10 animate-bounce-slow">
            <div className="relative">
              <Crown className="absolute -top-8 left-1/2 -translate-x-1/2 text-yellow-400 w-8 h-8 animate-pulse" />
              <img src={top3[0].profilePicUrl} alt="1st" className="w-28 h-28 rounded-full border-4 border-yellow-400 shadow-2xl shadow-yellow-400/20 object-cover" />
              <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 bg-yellow-400 text-black text-xs font-bold px-3 py-1 rounded-full">#1</div>
            </div>
            <div className="mt-3 text-center">
              <p className="font-bold text-white text-lg">{top3[0].tiktokUser}</p>
              <p className="font-black text-yellow-400 text-2xl">{top3[0].votes}</p>
            </div>
            <div className="w-24 h-32 bg-gradient-to-b from-yellow-500/20 to-transparent mt-2 rounded-t-xl border-t border-yellow-500/30"></div>
          </div>
        )}

        {/* 3rd Place */}
        {top3[2] && (
          <div className="flex flex-col items-center animate-bounce-slow delay-200">
            <div className="relative">
              <img src={top3[2].profilePicUrl} alt="3rd" className="w-20 h-20 rounded-full border-4 border-orange-700 shadow-lg object-cover" />
              <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 bg-orange-700 text-white text-xs font-bold px-2 py-0.5 rounded-full">#3</div>
            </div>
            <div className="mt-3 text-center">
              <p className="font-bold text-white text-sm">{top3[2].tiktokUser}</p>
              <p className="font-bold text-orange-400 text-lg">{top3[2].votes}</p>
            </div>
            <div className="w-20 h-16 bg-gray-800/50 mt-2 rounded-t-lg border-t border-orange-700/30"></div>
          </div>
        )}
      </div>

      {/* Ticker for the Rest */}
      {rest.length > 0 && (
        <div className="relative bg-black/30 border-y border-white/5 py-3 overflow-hidden group">
          <div className="flex animate-scroll gap-8 w-max hover:pause">
            {rest.map((sub, i) => (
              <div key={sub.id} className="flex items-center gap-3 px-4 border-l border-white/10">
                <span className="text-white/30 font-mono text-sm">#{i + 4}</span>
                <img src={sub.profilePicUrl} className="w-8 h-8 rounded-full object-cover" alt="" />
                <span className="text-white font-bold text-sm">{sub.tiktokUser}</span>
                <span className="text-highlight-color font-bold">{sub.votes} صوت</span>
              </div>
            ))}
            {/* Duplicate for infinite loop illusion */}
            {rest.map((sub, i) => (
              <div key={`dup-${sub.id}`} className="flex items-center gap-3 px-4 border-l border-white/10">
                 <span className="text-white/30 font-mono text-sm">#{i + 4}</span>
                 <img src={sub.profilePicUrl} className="w-8 h-8 rounded-full object-cover" alt="" />
                 <span className="text-white font-bold text-sm">{sub.tiktokUser}</span>
                 <span className="text-highlight-color font-bold">{sub.votes} صوت</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// --- Search & Filter ---
const SearchFilterBar = ({ onSearch, onFilter, countries }) => {
  return (
    <div className="flex flex-col md:flex-row gap-4 mb-8 bg-white/5 p-4 rounded-2xl border border-white/10 backdrop-blur-sm">
      <div className="flex-1 relative">
        <Search className="absolute right-3 top-3.5 text-white/40 w-5 h-5" />
        <input 
          type="text" 
          placeholder="بحث عن اسم المستخدم..." 
          onChange={(e) => onSearch(e.target.value)}
          className="w-full bg-black/30 border border-white/10 rounded-xl py-3 pr-10 pl-4 text-white focus:border-highlight-color outline-none transition"
        />
      </div>
      <div className="relative min-w-[200px]">
        <Filter className="absolute right-3 top-3.5 text-white/40 w-5 h-5 pointer-events-none" />
        <select 
          onChange={(e) => onFilter(e.target.value)}
          className="w-full bg-black/30 border border-white/10 rounded-xl py-3 pr-10 pl-4 text-white appearance-none focus:border-highlight-color outline-none cursor-pointer"
        >
          {countries.map(c => <option key={c.code} value={c.name}>{c.flag} {c.name}</option>)}
        </select>
      </div>
    </div>
  );
};

// --- Video Components ---
const VideoCard = ({ submission, settings, onVote, onClick }) => (
  <div 
    onClick={onClick}
    className="group relative aspect-[9/16] rounded-2xl overflow-hidden cursor-pointer transform transition-all duration-500 hover:-translate-y-2 hover:shadow-2xl border border-white/5 bg-gray-800"
  >
    {/* Thumbnail with fallback */}
    <img 
      src={submission.thumbnailUrl} 
      alt={submission.tiktokUser} 
      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
      onError={(e) => e.target.src = 'https://placehold.co/600x900/333/fff?text=No+Image'}
    />
    <div className="absolute inset-0 bg-black/20 group-hover:bg-transparent transition duration-300" />
    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition duration-300">
      <div className="bg-white/20 backdrop-blur-md p-4 rounded-full">
        <Play className="w-8 h-8 text-white fill-white" />
      </div>
    </div>
    
    <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent flex flex-col justify-end p-4">
      <div className="flex items-center gap-2 mb-3">
        <img src={submission.profilePicUrl} className="w-8 h-8 rounded-full border border-white/50" alt="" />
        <div className="overflow-hidden">
          <h3 className="font-bold text-white text-sm truncate">{submission.tiktokUser}</h3>
          <p className="text-white/70 text-xs">{submission.flag} {submission.country}</p>
        </div>
      </div>
      
      <ShinyButton 
        onClick={(e) => { e.stopPropagation(); onVote(submission); }}
        className="w-full py-2 text-sm bg-white text-black hover:bg-gray-200"
      >
        <Crown className="w-4 h-4 text-yellow-600" /> تصويت ({submission.votes})
      </ShinyButton>
    </div>
  </div>
);

const VideoModal = ({ isOpen, onClose, submission, settings, onVote }) => {
  if (!isOpen || !submission) return null;
  
  // Extract Video ID logic specific to TikTok URLs (simplified)
  const videoId = submission.videoUrl.split('/video/')[1]?.split('?')[0] || submission.videoUrl.split('/').pop();
  const embedUrl = `https://www.tiktok.com/embed/v2/${videoId}`;

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/95 backdrop-blur-xl animate-fadeIn" onClick={onClose}>
      <div className="w-full max-w-6xl h-[90vh] flex flex-col md:flex-row bg-gray-900 rounded-2xl overflow-hidden shadow-2xl border border-white/10" onClick={e => e.stopPropagation()}>
        {/* Full Width Video Area */}
        <div className="w-full md:w-3/4 bg-black relative">
           <iframe 
              src={embedUrl} 
              className="w-full h-full object-contain" 
              title="Video" 
              allowFullScreen
           ></iframe>
           <button onClick={onClose} className="absolute top-4 left-4 bg-black/50 p-2 rounded-full text-white hover:bg-red-600 transition z-50">
             <X />
           </button>
        </div>

        {/* Sidebar */}
        <div className="w-full md:w-1/4 bg-gray-900 p-6 flex flex-col border-l border-white/10 relative">
           <div className="flex flex-col items-center mb-8">
             <img src={submission.profilePicUrl} className="w-24 h-24 rounded-full border-4 border-highlight-color mb-4 object-cover" alt="" />
             <h2 className="text-xl font-bold text-white text-center">{submission.tiktokUser}</h2>
             <p className="text-white/50 text-sm mt-1">{submission.flag} {submission.country}</p>
           </div>

           <div className="bg-white/5 p-6 rounded-2xl text-center mb-auto border border-white/5">
             <p className="text-white/50 text-sm uppercase tracking-widest mb-2">عدد الأصوات</p>
             <p className="text-5xl font-black text-highlight-color">{submission.votes}</p>
           </div>

           <ShinyButton 
             onClick={() => onVote(submission)}
             className="w-full py-4 text-lg mt-6"
             style={{ backgroundColor: settings.mainColor }}
           >
             تصويت للمشارك
           </ShinyButton>
        </div>
      </div>
    </div>
  );
};

// =========================================================================
// 5. ADMIN PANEL (Enhanced)
// =========================================================================

const AdminSettingsPanel = ({ settings, onSaveSettings }) => {
  const [localSettings, setLocalSettings] = useState(settings);
  const [isSaving, setIsSaving] = useState(false);

  // Handlers for Organizers
  const handleOrgChange = (index, field, value) => {
    const newOrgs = [...localSettings.organizers];
    newOrgs[index][field] = value;
    setLocalSettings({ ...localSettings, organizers: newOrgs });
  };
  const addOrg = () => setLocalSettings({ 
    ...localSettings, 
    organizers: [...(localSettings.organizers || []), { name: '', role: '', imageUrl: '' }] 
  });
  const removeOrg = (index) => {
    const newOrgs = localSettings.organizers.filter((_, i) => i !== index);
    setLocalSettings({ ...localSettings, organizers: newOrgs });
  };

  return (
    <GlassCard className="p-6 mb-8" isGlassmorphism>
      <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
        <SettingsIcon /> إعدادات النظام
      </h2>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-4">
          <h3 className="text-lg font-bold text-highlight-color border-b border-white/10 pb-2">الهوية البصرية</h3>
          <InputField label="رابط الشعار (Logo)" id="logo" value={localSettings.logoUrl} onChange={(v) => setLocalSettings({...localSettings, logoUrl: v})} />
          <div className="flex gap-4">
             <InputField label="لون رئيسي" type="color" value={localSettings.mainColor} onChange={v => setLocalSettings({...localSettings, mainColor: v})} />
             <InputField label="لون التوهج" type="color" value={localSettings.highlightColor} onChange={v => setLocalSettings({...localSettings, highlightColor: v})} />
          </div>
          
          <h3 className="text-lg font-bold text-highlight-color border-b border-white/10 pb-2 mt-6">شريط التنبيه</h3>
          <InputField label="نص التنبيه (يظهر أعلى الموقع)" id="alert" value={localSettings.alertText} onChange={(v) => setLocalSettings({...localSettings, alertText: v})} />
        </div>

        <div className="space-y-4">
          <h3 className="text-lg font-bold text-highlight-color border-b border-white/10 pb-2">حالة المسابقة</h3>
          <div className="grid grid-cols-2 gap-2">
             {Object.keys(STAGES).map(key => (
               <button 
                 key={key} 
                 onClick={() => setLocalSettings({...localSettings, stage: key})}
                 className={`p-2 rounded-lg text-sm font-bold border transition ${localSettings.stage === key ? 'bg-highlight-color text-black border-highlight-color' : 'bg-black/40 border-white/10 text-white/60'}`}
               >
                 {STAGES[key].label}
               </button>
             ))}
          </div>

          <h3 className="text-lg font-bold text-highlight-color border-b border-white/10 pb-2 mt-6">المنظمون</h3>
          <div className="space-y-2 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
            {(localSettings.organizers || []).map((org, i) => (
              <div key={i} className="flex gap-2 bg-white/5 p-2 rounded-lg items-end">
                <div className="flex-1 space-y-2">
                  <input type="text" placeholder="الاسم" value={org.name} onChange={(e) => handleOrgChange(i, 'name', e.target.value)} className="w-full bg-black/30 border border-white/10 rounded p-1 text-xs text-white" />
                  <input type="text" placeholder="الدور" value={org.role} onChange={(e) => handleOrgChange(i, 'role', e.target.value)} className="w-full bg-black/30 border border-white/10 rounded p-1 text-xs text-white" />
                </div>
                <button onClick={() => removeOrg(i)} className="p-2 bg-red-500/20 text-red-500 rounded hover:bg-red-500 hover:text-white"><Trash2 size={14} /></button>
              </div>
            ))}
            <button onClick={addOrg} className="w-full py-2 bg-white/5 hover:bg-white/10 text-xs rounded border border-dashed border-white/20 flex items-center justify-center gap-1"><Plus size={14}/> إضافة منظم</button>
          </div>
        </div>
      </div>

      <div className="mt-6 pt-4 border-t border-white/10 text-right">
        <ShinyButton onClick={() => { setIsSaving(true); onSaveSettings(localSettings).then(() => setIsSaving(false)); }} style={{backgroundColor: localSettings.mainColor}}>
           {isSaving ? 'جاري الحفظ...' : 'حفظ التغييرات'}
        </ShinyButton>
      </div>
    </GlassCard>
  );
};

const AdminSubmissionsPanel = ({ submissions, onUpdateStatus, onManualAdd }) => {
  const [filter, setFilter] = useState('Pending');
  const [editMode, setEditMode] = useState(null); // ID of submission being edited
  const [editData, setEditData] = useState({});

  const startEdit = (sub) => {
    setEditMode(sub.id);
    setEditData({ ...sub });
  };

  const saveEdit = async () => {
    await updateDoc(doc(db, PATHS.SUBMISSIONS, editMode), editData);
    setEditMode(null);
  };

  // Logic to manually add submission
  const [isAddModalOpen, setAddModal] = useState(false);
  const [newSub, setNewSub] = useState({ tiktokUser: '@', country: 'العراق', url: '' });

  const handleManualSubmit = async () => {
     await onManualAdd(newSub);
     setAddModal(false);
     setNewSub({ tiktokUser: '@', country: 'العراق', url: '' });
  };

  const filtered = submissions.filter(s => s.status === filter);

  return (
    <GlassCard className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-xl font-bold text-white">إدارة المشاركات</h3>
        <button onClick={() => setAddModal(true)} className="bg-green-600 px-4 py-2 rounded-lg text-white text-sm font-bold flex items-center gap-2 hover:bg-green-500 transition">
          <Plus size={16} /> إضافة يدوية
        </button>
      </div>
      
      <div className="flex gap-2 mb-4 border-b border-white/10 pb-4">
        {['Pending', 'Approved', 'Rejected'].map(s => (
          <button key={s} onClick={() => setFilter(s)} className={`px-4 py-2 rounded-full text-xs font-bold ${filter === s ? 'bg-white text-black' : 'bg-white/10 text-white'}`}>
             {s} ({submissions.filter(sub => sub.status === s).length})
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {filtered.map(sub => (
          <div key={sub.id} className="bg-white/5 p-4 rounded-xl border border-white/5 flex flex-col md:flex-row gap-4 items-start md:items-center">
            {editMode === sub.id ? (
              <div className="flex-1 grid grid-cols-2 gap-2 w-full">
                <div className="col-span-2">
                  <label className="text-xs text-white/50">رابط الصورة المصغرة</label>
                  <input value={editData.thumbnailUrl} onChange={e => setEditData({...editData, thumbnailUrl: e.target.value})} className="w-full bg-black/50 border border-white/20 rounded p-2 text-white text-sm" />
                </div>
                <div className="col-span-2">
                   <label className="text-xs text-white/50">رابط صورة البروفايل</label>
                   <input value={editData.profilePicUrl} onChange={e => setEditData({...editData, profilePicUrl: e.target.value})} className="w-full bg-black/50 border border-white/20 rounded p-2 text-white text-sm" />
                </div>
                <div className="col-span-2 flex gap-2 justify-end mt-2">
                  <button onClick={() => setEditMode(null)} className="px-3 py-1 text-xs bg-gray-700 rounded text-white">إلغاء</button>
                  <button onClick={saveEdit} className="px-3 py-1 text-xs bg-green-600 rounded text-white">حفظ</button>
                </div>
              </div>
            ) : (
              <>
                <img src={sub.thumbnailUrl} className="w-16 h-24 object-cover rounded bg-black" alt="Thumb" />
                <div className="flex-1">
                  <h4 className="font-bold text-white">{sub.tiktokUser}</h4>
                  <p className="text-xs text-white/50">{sub.country} | الأصوات: {sub.votes}</p>
                  <a href={sub.videoUrl} target="_blank" rel="noreferrer" className="text-highlight-color text-xs hover:underline block truncate max-w-[200px]">{sub.videoUrl}</a>
                </div>
                <div className="flex gap-2">
                   <button onClick={() => startEdit(sub)} className="p-2 bg-blue-600/20 text-blue-400 rounded hover:bg-blue-600 hover:text-white"><Edit3 size={16} /></button>
                   {sub.status !== 'Approved' && <button onClick={() => onUpdateStatus(sub.id, 'Approved')} className="p-2 bg-green-600/20 text-green-400 rounded hover:bg-green-600 hover:text-white"><CheckCircle size={16}/></button>}
                   {sub.status !== 'Rejected' && <button onClick={() => onUpdateStatus(sub.id, 'Rejected')} className="p-2 bg-red-600/20 text-red-400 rounded hover:bg-red-600 hover:text-white"><X size={16}/></button>}
                   <button onClick={() => { if(window.confirm('حذف نهائي؟')) { /* Delete Logic Not Implemented in props but easy to add */ } }} className="p-2 bg-gray-800 text-gray-500 rounded hover:text-red-500"><Trash2 size={16}/></button>
                </div>
              </>
            )}
          </div>
        ))}
      </div>

      {/* Manual Add Modal */}
      <Modal isOpen={isAddModalOpen} onClose={() => setAddModal(false)} title="إضافة مشاركة يدوياً">
        <InputField label="اسم المستخدم @" value={newSub.tiktokUser} onChange={v => setNewSub({...newSub, tiktokUser: v})} />
        <InputField label="رابط الفيديو" value={newSub.url} onChange={v => setNewSub({...newSub, url: v})} />
        <div className="mb-4">
           <label className="text-white text-sm block mb-2">البلد</label>
           <select value={newSub.country} onChange={e => setNewSub({...newSub, country: e.target.value})} className="w-full p-3 bg-black/40 border border-white/10 rounded text-white">
             {COUNTRIES.filter(c => c.code !== 'ALL').map(c => <option key={c.code} value={c.name}>{c.name}</option>)}
           </select>
        </div>
        <ShinyButton onClick={handleManualSubmit} className="w-full bg-green-600">إضافة</ShinyButton>
      </Modal>
    </GlassCard>
  );
};

// =========================================================================
// 6. MAIN APP CONTROLLER
// =========================================================================

const ContestApp = () => {
  const navigate = useNavigate();
  const { user } = useAuth(); // Assuming useAuth is same as before
  const [settings, setSettings] = useState(null);
  const [submissions, setSubmissions] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [countryFilter, setCountryFilter] = useState('الكل');
  
  // Modals & State
  const [modals, setModals] = useState({ adminAuth: false, voteConfirm: null, videoPlayer: null, info: null });
  const [cooldown, setCooldown] = useState(0);

  // Load Data
  useEffect(() => {
    if (!isFirebaseInitialized) { setSettings(DEFAULT_SETTINGS); return; }
    const unsub1 = onSnapshot(doc(db, PATHS.SETTINGS), (s) => setSettings(s.exists() ? s.data() : DEFAULT_SETTINGS));
    const unsub2 = onSnapshot(collection(db, PATHS.SUBMISSIONS), (s) => setSubmissions(s.docs.map(d => ({id: d.id, ...d.data()}))));
    return () => { unsub1(); unsub2(); };
  }, []);

  // Filter Logic
  const processedSubmissions = useMemo(() => {
    let list = submissions.filter(s => s.status === 'Approved');
    if (searchQuery) list = list.filter(s => s.tiktokUser.toLowerCase().includes(searchQuery.toLowerCase()));
    if (countryFilter !== 'الكل') list = list.filter(s => s.country === countryFilter);
    return list.sort((a, b) => b.votes - a.votes);
  }, [submissions, searchQuery, countryFilter]);

  // Handlers
  const handleSaveSettings = async (newS) => await setDoc(doc(db, PATHS.SETTINGS), newS, { merge: true });
  const handleStatus = async (id, st) => await updateDoc(doc(db, PATHS.SUBMISSIONS, id), { status: st });
  const handleManualAdd = async (data) => {
     const countryData = COUNTRIES.find(c => c.name === data.country);
     await addDoc(collection(db, PATHS.SUBMISSIONS), {
       tiktokUser: data.tiktokUser,
       country: data.country,
       flag: countryData.flag,
       videoUrl: data.url,
       profilePicUrl: `https://ui-avatars.com/api/?name=${data.tiktokUser.substring(1)}&background=random`,
       thumbnailUrl: 'https://placehold.co/600x900/222/fff?text=Video',
       status: 'Approved',
       votes: 0,
       submittedAt: serverTimestamp()
     });
  };
  
  const confirmVote = async () => {
    if (modals.voteConfirm) {
      await updateDoc(doc(db, PATHS.SUBMISSIONS, modals.voteConfirm.id), { votes: increment(1) });
      setCooldown(30);
      setModals(p => ({...p, voteConfirm: null}));
    }
  };

  // CSS Vars
  useEffect(() => {
    if (settings) {
      document.documentElement.style.setProperty('--highlight-color', settings.highlightColor);
      document.documentElement.style.setProperty('--main-color', settings.mainColor);
    }
  }, [settings]);

  // Cooldown timer
  useEffect(() => { if(cooldown > 0) setTimeout(() => setCooldown(c=>c-1), 1000); }, [cooldown]);

  // Auth Hook (Internal)
  function useAuth() {
    const [u, setU] = useState(null);
    useEffect(() => isFirebaseInitialized ? onAuthStateChanged(auth, setU) : null, []);
    return { user: u };
  }

  if (!settings) return <div className="h-screen bg-black flex items-center justify-center"><Loader className="animate-spin text-white"/></div>;

  return (
    <div className="min-h-screen bg-[#050505] text-white font-sans selection:bg-highlight-color selection:text-black">
       <style>{`
         @keyframes shine { 100% { transform: translateX(150%); } }
         .animate-shine { animation: shine 1.5s infinite; }
         .animate-bounce-slow { animation: bounce 3s infinite; }
         @keyframes scroll { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } }
         .animate-scroll { animation: scroll 30s linear infinite; }
         .hover\\:pause:hover { animation-play-state: paused; }
         ::-webkit-scrollbar { width: 6px; } ::-webkit-scrollbar-track { background: #000; } ::-webkit-scrollbar-thumb { background: #333; border-radius: 10px; }
       `}</style>

       <Routes>
         {/* ADMIN */}
         <Route path="/admin" element={user ? (
            <div className="container mx-auto px-4 py-8">
              <div className="flex justify-between items-center mb-8 bg-gray-900 p-4 rounded-2xl border border-white/10">
                 <img src={settings.logoUrl} className="h-12 object-contain" alt="Logo"/>
                 <button onClick={() => signOut(auth).then(() => navigate('/'))} className="text-red-400 hover:text-white flex gap-2"><LogOut size={20}/> خروج</button>
              </div>
              <AdminSettingsPanel settings={settings} onSaveSettings={handleSaveSettings} />
              <AdminSubmissionsPanel submissions={submissions} onUpdateStatus={handleStatus} onManualAdd={handleManualAdd} />
            </div>
         ) : <div className="h-screen flex items-center justify-center"><button onClick={() => setModals(p=>({...p, adminAuth: true}))} className="text-white">دخول المدير</button></div>} />

         {/* PUBLIC */}
         <Route path="/" element={
           <>
             <header className="sticky top-0 z-40 bg-black/80 backdrop-blur-lg border-b border-white/10">
                <div className="container mx-auto px-4 py-3 flex justify-between items-center">
                   <img src={settings.logoUrl} className="h-12 object-contain" alt="Logo"/>
                   {user && <button onClick={() => navigate('/admin')} className="bg-white/10 px-3 py-1 rounded-full text-xs">Admin</button>}
                </div>
             </header>

             <main className="container mx-auto px-4 py-8">
                {/* Alert Bar */}
                {settings.alertText && (
                  <div className="bg-highlight-color/10 border border-highlight-color/20 text-highlight-color p-4 rounded-xl mb-8 flex items-center gap-3 animate-pulse">
                    <AlertTriangle className="w-5 h-5" />
                    <span className="font-bold">{settings.alertText}</span>
                  </div>
                )}

                {settings.stage === 'Submission' && <SubmissionForm settings={settings} />}
                
                {(settings.stage === 'Voting' || settings.stage === 'Ended') && (
                  <>
                    <Leaderboard submissions={submissions.filter(s => s.status === 'Approved')} settings={settings} />
                    
                    <div className="flex items-center gap-2 mb-6">
                      <div className="h-8 w-1 bg-highlight-color rounded-full"></div>
                      <h2 className="text-2xl font-bold">تصفح المشاركات</h2>
                    </div>

                    <SearchFilterBar onSearch={setSearchQuery} onFilter={setCountryFilter} countries={COUNTRIES} />

                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                       {processedSubmissions.map(sub => (
                         <VideoCard 
                           key={sub.id} 
                           submission={sub} 
                           settings={settings} 
                           onVote={(s) => { if(cooldown > 0) return alert(`انتظر ${cooldown}s`); setModals(p=>({...p, voteConfirm: s})) }} 
                           onClick={() => setModals(p=>({...p, videoPlayer: sub}))} 
                         />
                       ))}
                    </div>
                  </>
                )}
             </main>

             <footer className="bg-black border-t border-white/10 py-10 mt-20 text-center text-white/50 text-sm">
               <div className="flex justify-center gap-6 mb-4">
                 {['why','terms','organizers'].map(type => (
                   <button key={type} onClick={() => setModals(p=>({...p, info: type}))} className="hover:text-white capitalize transition">
                     {type === 'why' ? 'عن المسابقة' : type === 'terms' ? 'الشروط' : 'المنظمون'}
                   </button>
                 ))}
               </div>
               <p>&copy; 2025 {settings.title}</p>
               <button onClick={() => setModals(p=>({...p, adminAuth: true}))} className="opacity-10 hover:opacity-50 mt-4">🔐</button>
             </footer>
           </>
         } />
       </Routes>

       {/* MODALS */}
       <Modal isOpen={!!modals.voteConfirm} onClose={() => setModals(p=>({...p, voteConfirm: null}))} title="تأكيد التصويت">
          <div className="text-center py-4">
             <img src={modals.voteConfirm?.profilePicUrl} className="w-20 h-20 rounded-full mx-auto mb-4 border-2 border-highlight-color" alt=""/>
             <p className="text-lg mb-6">هل تود التصويت لـ <span className="font-bold text-highlight-color">{modals.voteConfirm?.tiktokUser}</span>؟</p>
             <ShinyButton onClick={confirmVote} style={{backgroundColor: settings.mainColor}} className="w-full">تأكيد التصويت</ShinyButton>
          </div>
       </Modal>

       <VideoModal isOpen={!!modals.videoPlayer} submission={modals.videoPlayer} onClose={() => setModals(p=>({...p, videoPlayer: null}))} settings={settings} onVote={(s) => { setModals(p=>({...p, voteConfirm: s, videoPlayer: null})); }} />
       
       {/* Admin Login Modal omitted for brevity, use same logic as before */}
       {modals.adminAuth && (
         <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/90 p-4">
            <div className="bg-gray-900 p-8 rounded-xl border border-white/10 w-full max-w-md">
               <h2 className="text-white font-bold mb-4">تسجيل دخول المدير</h2>
               <form onSubmit={(e) => { e.preventDefault(); signInWithEmailAndPassword(auth, e.target.email.value, e.target.pass.value).then(() => setModals(p=>({...p, adminAuth: false}))); }}>
                 <input name="email" placeholder="Email" className="w-full p-3 mb-3 bg-black rounded text-white" />
                 <input name="pass" type="password" placeholder="Password" className="w-full p-3 mb-4 bg-black rounded text-white" />
                 <button className="w-full bg-highlight-color py-3 rounded font-bold">دخول</button>
                 <button type="button" onClick={() => setModals(p=>({...p, adminAuth: false}))} className="w-full mt-2 text-white/50">إلغاء</button>
               </form>
            </div>
         </div>
       )}
       
       <Modal isOpen={!!modals.info} onClose={() => setModals(p=>({...p, info: null}))} title="المعلومات">
         {modals.info === 'why' && settings.whyText}
         {modals.info === 'terms' && settings.termsText}
         {modals.info === 'organizers' && (settings.organizers || []).map((o, i) => (
           <div key={i} className="flex items-center gap-3 bg-white/5 p-2 rounded mb-2">
             <img src={o.imageUrl || 'https://placehold.co/50'} className="w-10 h-10 rounded-full bg-black" alt=""/>
             <div><p className="font-bold">{o.name}</p><p className="text-xs text-white/50">{o.role}</p></div>
           </div>
         ))}
       </Modal>
    </div>
  );
};

export default function App() {
  return (
    <BrowserRouter>
      <ContestApp />
    </BrowserRouter>
  );
}