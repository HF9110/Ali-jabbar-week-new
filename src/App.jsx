import React, { useState, useEffect, useMemo } from 'react';
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
  CheckCircle,
  Clock,
  LogOut,
  Save,
  Plus,
  Edit3,
  Trash2,
  Filter,
  Play,
  User
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
  { name: 'الكل', code: 'ALL', flag: '🌍' },
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

// إعدادات افتراضية قوية لتجنب الشاشة السوداء
const DEFAULT_SETTINGS = {
  mainColor: '#fe2c55',      // TikTok Red
  highlightColor: '#25f4ee', // TikTok Cyan
  appFont: 'Cairo',
  title: 'Ali Jabbar Week',
  logoUrl: 'https://placehold.co/200x60/transparent/white?text=LOGO',
  stage: 'Voting',
  useGlassmorphism: true,
  alertText: 'التصويت مفتوح! شارك في تحديد أفضل تصميم عربي.',
  termsText: 'الشروط والأحكام:\n- الالتزام بالآداب العامة.',
  whyText: 'لتعزيز المحتوى العربي الإبداعي.',
  organizers: [],
};

// =========================================================================
// 3. UI COMPONENTS (FIXED VISIBILITY)
// =========================================================================

const GlassCard = ({ children, className = '', isGlassmorphism = true, color = 'bg-gray-900', onClick }) => {
  // تم تعديل الشفافية لتكون أوضح (bg-opacity-80 بدلاً من 60) وإضافة حدود واضحة
  const glassClasses = isGlassmorphism
    ? 'bg-opacity-80 backdrop-blur-xl shadow-2xl border border-white/10'
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
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/95 backdrop-blur-sm animate-fadeIn" onClick={onClose}>
      <div className="w-full max-w-2xl bg-[#111] border border-white/20 rounded-2xl overflow-hidden flex flex-col shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center p-5 border-b border-white/10 bg-white/5">
          <h2 className="text-xl font-bold text-white">{title}</h2>
          <button onClick={onClose} className="text-white/70 hover:text-red-500 transition"><X /></button>
        </div>
        <div className="p-6 text-white space-y-4 max-h-[80vh] overflow-y-auto">
          {children}
        </div>
      </div>
    </div>
  );
};

// ✅ تصحيح حقول الإدخال: خلفية أفتح (white/5) وحدود واضحة لتظهر فوق الخلفية السوداء
const InputField = ({ label, id, value, onChange, type = 'text', placeholder = '', required = false }) => (
  <div className="mb-4 w-full">
    <label htmlFor={id} className="block text-white mb-2 font-medium text-sm opacity-90">
      {label} {required && <span className="text-red-500">*</span>}
    </label>
    <input
      type={type}
      id={id}
      value={value || ''}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full p-3 rounded-lg bg-white/5 border border-white/20 text-white placeholder-white/30 focus:ring-2 focus:ring-[var(--highlight-color)] focus:border-transparent focus:bg-black transition duration-300 outline-none"
    />
  </div>
);

const ShinyButton = ({ children, onClick, disabled, className = '', style = {} }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className={`relative overflow-hidden group px-6 py-3 rounded-xl font-bold text-black shadow-lg transform transition hover:-translate-y-1 hover:shadow-2xl disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
    style={style}
  >
    <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/40 to-transparent -translate-x-[150%] group-hover:animate-shine z-10" />
    <span className="relative z-20 flex items-center justify-center gap-2">{children}</span>
  </button>
);

// =========================================================================
// 4. PUBLIC COMPONENTS
// =========================================================================

const SubmissionForm = ({ settings }) => {
  const [form, setForm] = useState({ tiktokUser: '', country: COUNTRIES[1].name, url: '' });
  const [status, setStatus] = useState('idle');

  const handleUserChange = (val) => {
    // إضافة @ تلقائياً إذا لم يكتبها المستخدم
    if (val && !val.startsWith('@')) val = '@' + val;
    setForm({ ...form, tiktokUser: val });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.tiktokUser || !form.url || !form.tiktokUser.startsWith('@')) {
      return alert('تأكد من كتابة اسم المستخدم مع @ ورابط الفيديو.');
    }
    
    setStatus('submitting');
    try {
      const countryData = COUNTRIES.find(c => c.name === form.country);
      // صورة افتراضية ملونة لتجنب المربعات الفارغة
      const defaultProfilePic = `https://ui-avatars.com/api/?name=${form.tiktokUser.substring(1)}&background=random&color=fff&size=128`;
      const defaultThumb = `https://placehold.co/600x900/333/fff?text=Video+Pending`;

      await addDoc(collection(db, PATHS.SUBMISSIONS), {
        tiktokUser: form.tiktokUser,
        participantName: form.tiktokUser,
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
    <GlassCard className="max-w-xl mx-auto p-8 mt-10 border-t-4" style={{ borderTopColor: settings.mainColor }} isGlassmorphism={settings.useGlassmorphism}>
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-white mb-2">🚀 شارك إبداعك</h2>
        <p className="text-white/60">أدخل بياناتك من تيك توك بدقة</p>
      </div>

      {status === 'success' && (
        <div className="bg-green-500/20 border border-green-500 text-green-200 p-4 rounded-lg mb-6 text-center flex items-center justify-center gap-2">
          <CheckCircle className="w-5 h-5" /> تم الإرسال! انتظر الموافقة.
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="flex items-center gap-3 mb-4">
           <div className="w-16 h-16 rounded-full bg-white/10 flex items-center justify-center overflow-hidden border-2 border-white/20 shrink-0">
              {form.tiktokUser.length > 2 ? (
                <img src={`https://ui-avatars.com/api/?name=${form.tiktokUser.substring(1)}&background=random`} alt="Avatar" className="w-full h-full" />
              ) : <User className="w-6 h-6 text-white/50" />}
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
            className="w-full p-3 rounded-lg bg-white/5 border border-white/20 text-white outline-none focus:ring-2 focus:ring-[var(--highlight-color)] appearance-none cursor-pointer"
          >
            {COUNTRIES.filter(c => c.code !== 'ALL').map(c => <option key={c.code} value={c.name} className="bg-gray-900">{c.flag} {c.name}</option>)}
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
          className="w-full text-white"
          style={{ backgroundColor: settings.mainColor }}
        >
          {status === 'submitting' ? <Loader className="animate-spin w-5 h-5 inline" /> : 'إرسال المشاركة'}
        </ShinyButton>
      </form>
    </GlassCard>
  );
};

const Leaderboard = ({ submissions }) => {
  // الفرز حسب الأصوات
  const sorted = [...submissions].sort((a, b) => b.votes - a.votes);
  const top3 = sorted.slice(0, 3);
  const rest = sorted.slice(3);

  if (sorted.length === 0) return null;

  return (
    <div className="mb-12 animate-slideUp">
      {/* Top 3 Podium */}
      <div className="flex justify-center items-end gap-2 md:gap-4 mb-10 min-h-[240px]">
        {/* 2nd Place */}
        {top3[1] && (
          <div className="flex flex-col items-center w-1/3 md:w-auto">
            <div className="relative">
              <img src={top3[1].profilePicUrl} alt="2nd" className="w-16 h-16 md:w-20 md:h-20 rounded-full border-4 border-gray-400 shadow-lg object-cover bg-gray-800" />
              <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 bg-gray-400 text-black text-xs font-bold px-2 py-0.5 rounded-full">#2</div>
            </div>
            <div className="mt-3 text-center mb-1">
              <p className="font-bold text-white text-xs md:text-sm truncate max-w-[80px]">{top3[1].tiktokUser}</p>
              <p className="font-bold text-gray-300 text-sm">{top3[1].votes}</p>
            </div>
            <div className="w-16 md:w-20 h-24 bg-gray-700/50 rounded-t-lg border-t border-gray-500/30"></div>
          </div>
        )}

        {/* 1st Place */}
        {top3[0] && (
          <div className="flex flex-col items-center z-10 w-1/3 md:w-auto">
            <div className="relative">
              <Crown className="absolute -top-8 left-1/2 -translate-x-1/2 text-yellow-400 w-8 h-8 animate-pulse" />
              <img src={top3[0].profilePicUrl} alt="1st" className="w-24 h-24 md:w-28 md:h-28 rounded-full border-4 border-yellow-400 shadow-2xl shadow-yellow-400/20 object-cover bg-gray-800" />
              <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 bg-yellow-400 text-black text-xs font-bold px-3 py-1 rounded-full">#1</div>
            </div>
            <div className="mt-3 text-center mb-1">
              <p className="font-bold text-white text-sm md:text-lg truncate max-w-[100px]">{top3[0].tiktokUser}</p>
              <p className="font-black text-yellow-400 text-xl">{top3[0].votes}</p>
            </div>
            <div className="w-20 md:w-24 h-32 bg-gradient-to-b from-yellow-500/20 to-transparent rounded-t-xl border-t border-yellow-500/30 relative overflow-hidden">
              <div className="absolute inset-0 bg-yellow-400/10 animate-pulse"></div>
            </div>
          </div>
        )}

        {/* 3rd Place */}
        {top3[2] && (
          <div className="flex flex-col items-center w-1/3 md:w-auto">
            <div className="relative">
              <img src={top3[2].profilePicUrl} alt="3rd" className="w-16 h-16 md:w-20 md:h-20 rounded-full border-4 border-orange-700 shadow-lg object-cover bg-gray-800" />
              <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 bg-orange-700 text-white text-xs font-bold px-2 py-0.5 rounded-full">#3</div>
            </div>
            <div className="mt-3 text-center mb-1">
              <p className="font-bold text-white text-xs md:text-sm truncate max-w-[80px]">{top3[2].tiktokUser}</p>
              <p className="font-bold text-orange-400 text-sm">{top3[2].votes}</p>
            </div>
            <div className="w-16 md:w-20 h-16 bg-gray-700/50 rounded-t-lg border-t border-orange-700/30"></div>
          </div>
        )}
      </div>

      {/* Ticker for Rest */}
      {rest.length > 0 && (
        <div className="relative bg-white/5 border-y border-white/10 py-3 overflow-hidden group">
          <div className="flex animate-scroll gap-8 w-max hover:pause">
            {rest.map((sub, i) => (
              <div key={sub.id} className="flex items-center gap-3 px-4 border-l border-white/10 min-w-[200px]">
                <span className="text-white/30 font-mono text-sm">#{i + 4}</span>
                <img src={sub.profilePicUrl} className="w-8 h-8 rounded-full object-cover bg-gray-800" alt="" />
                <span className="text-white font-bold text-sm">{sub.tiktokUser}</span>
                <span className="text-[var(--highlight-color)] font-bold">{sub.votes} صوت</span>
              </div>
            ))}
            {/* Duplicate for Loop */}
            {rest.map((sub, i) => (
              <div key={`dup-${sub.id}`} className="flex items-center gap-3 px-4 border-l border-white/10 min-w-[200px]">
                 <span className="text-white/30 font-mono text-sm">#{i + 4}</span>
                 <img src={sub.profilePicUrl} className="w-8 h-8 rounded-full object-cover bg-gray-800" alt="" />
                 <span className="text-white font-bold text-sm">{sub.tiktokUser}</span>
                 <span className="text-[var(--highlight-color)] font-bold">{sub.votes} صوت</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

const SearchFilterBar = ({ onSearch, onFilter, countries }) => {
  return (
    <div className="flex flex-col md:flex-row gap-4 mb-8 bg-[#111] p-4 rounded-2xl border border-white/20 shadow-lg">
      <div className="flex-1 relative">
        <Search className="absolute right-3 top-3.5 text-white/40 w-5 h-5" />
        <input 
          type="text" 
          placeholder="بحث عن اسم المستخدم..." 
          onChange={(e) => onSearch(e.target.value)}
          className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pr-10 pl-4 text-white focus:border-[var(--highlight-color)] outline-none transition placeholder-white/30"
        />
      </div>
      <div className="relative min-w-[200px]">
        <Filter className="absolute right-3 top-3.5 text-white/40 w-5 h-5 pointer-events-none" />
        <select 
          onChange={(e) => onFilter(e.target.value)}
          className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pr-10 pl-4 text-white appearance-none focus:border-[var(--highlight-color)] outline-none cursor-pointer"
        >
          {countries.map(c => <option key={c.code} value={c.name} className="bg-gray-900">{c.flag} {c.name}</option>)}
        </select>
      </div>
    </div>
  );
};

const VideoCard = ({ submission, settings, onVote, onClick }) => (
  <div 
    onClick={onClick}
    className="group relative aspect-[9/16] rounded-2xl overflow-hidden cursor-pointer transform transition-all duration-500 hover:-translate-y-2 hover:shadow-2xl hover:shadow-[var(--highlight-color)]/20 border border-white/10 bg-[#111]"
  >
    <img 
      src={submission.thumbnailUrl} 
      alt={submission.tiktokUser} 
      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110 opacity-80 group-hover:opacity-100"
      onError={(e) => e.target.src = 'https://placehold.co/600x900/111/fff?text=No+Image'}
    />
    
    <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent flex flex-col justify-end p-4">
      <div className="flex items-center gap-2 mb-3">
        <img src={submission.profilePicUrl} className="w-8 h-8 rounded-full border border-white/50 bg-black" alt="" />
        <div className="overflow-hidden">
          <h3 className="font-bold text-white text-sm truncate shadow-black drop-shadow-md">{submission.tiktokUser}</h3>
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
  const videoId = submission.videoUrl.split('/').pop().split('?')[0];
  const embedUrl = `https://www.tiktok.com/embed/v2/${videoId}`;

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/95 backdrop-blur-xl animate-fadeIn" onClick={onClose}>
      <div className="w-full max-w-5xl h-[85vh] flex flex-col md:flex-row bg-[#0a0a0a] rounded-2xl overflow-hidden shadow-2xl border border-white/10" onClick={e => e.stopPropagation()}>
        {/* Video Area */}
        <div className="w-full md:w-2/3 bg-black relative flex items-center justify-center">
           <iframe src={embedUrl} className="w-full h-full" title="Video" allowFullScreen></iframe>
           <button onClick={onClose} className="absolute top-4 left-4 bg-black/50 p-2 rounded-full text-white hover:bg-red-600 transition z-50"><X /></button>
        </div>

        {/* Sidebar */}
        <div className="w-full md:w-1/3 bg-[#111] p-6 flex flex-col border-l border-white/10">
           <div className="flex flex-col items-center mb-8">
             <img src={submission.profilePicUrl} className="w-20 h-20 rounded-full border-4 border-[var(--highlight-color)] mb-4 object-cover bg-gray-800" alt="" />
             <h2 className="text-xl font-bold text-white text-center">{submission.tiktokUser}</h2>
             <p className="text-white/50 text-sm mt-1">{submission.flag} {submission.country}</p>
           </div>

           <div className="bg-white/5 p-6 rounded-2xl text-center mb-auto border border-white/5">
             <p className="text-white/50 text-sm uppercase tracking-widest mb-2">عدد الأصوات</p>
             <p className="text-5xl font-black text-[var(--highlight-color)]">{submission.votes}</p>
           </div>

           <ShinyButton 
             onClick={() => onVote(submission)}
             className="w-full py-4 text-lg mt-6 text-white"
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
// 5. ADMIN PANEL (FIXED INPUTS)
// =========================================================================

const AdminSettingsPanel = ({ settings, onSaveSettings }) => {
  const [localSettings, setLocalSettings] = useState(settings);
  const [isSaving, setIsSaving] = useState(false);

  // Handlers for Organizers
  const handleOrgChange = (index, field, value) => {
    const newOrgs = [...(localSettings.organizers || [])];
    if(!newOrgs[index]) return;
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
    <GlassCard className="p-6 mb-8 bg-[#111]" isGlassmorphism>
      <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
        <SettingsIcon className="text-[var(--highlight-color)]" /> إعدادات النظام
      </h2>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-4">
          <h3 className="text-lg font-bold text-[var(--highlight-color)] border-b border-white/10 pb-2">الهوية البصرية</h3>
          <InputField label="رابط الشعار (Logo)" id="logo" value={localSettings.logoUrl} onChange={(v) => setLocalSettings({...localSettings, logoUrl: v})} />
          <div className="flex gap-4">
             <div className="flex-1">
                <label className="block text-white mb-2 text-sm">اللون الرئيسي</label>
                <div className="flex items-center gap-2 bg-white/5 p-2 rounded border border-white/10">
                   <input type="color" value={localSettings.mainColor} onChange={e => setLocalSettings({...localSettings, mainColor: e.target.value})} className="w-8 h-8 bg-transparent border-0 cursor-pointer"/>
                   <span className="text-white text-xs">{localSettings.mainColor}</span>
                </div>
             </div>
             <div className="flex-1">
                <label className="block text-white mb-2 text-sm">لون التوهج</label>
                <div className="flex items-center gap-2 bg-white/5 p-2 rounded border border-white/10">
                   <input type="color" value={localSettings.highlightColor} onChange={e => setLocalSettings({...localSettings, highlightColor: e.target.value})} className="w-8 h-8 bg-transparent border-0 cursor-pointer"/>
                   <span className="text-white text-xs">{localSettings.highlightColor}</span>
                </div>
             </div>
          </div>
          
          <h3 className="text-lg font-bold text-[var(--highlight-color)] border-b border-white/10 pb-2 mt-6">شريط التنبيه</h3>
          <InputField label="نص التنبيه (يظهر أعلى الموقع)" id="alert" value={localSettings.alertText} onChange={(v) => setLocalSettings({...localSettings, alertText: v})} />
        </div>

        <div className="space-y-4">
          <h3 className="text-lg font-bold text-[var(--highlight-color)] border-b border-white/10 pb-2">حالة المسابقة</h3>
          <div className="grid grid-cols-2 gap-2">
             {Object.keys(STAGES).map(key => (
               <button 
                 key={key} 
                 onClick={() => setLocalSettings({...localSettings, stage: key})}
                 className={`p-2 rounded-lg text-sm font-bold border transition ${localSettings.stage === key ? 'bg-[var(--highlight-color)] text-black border-[var(--highlight-color)]' : 'bg-white/5 border-white/10 text-white/60'}`}
               >
                 {STAGES[key].label}
               </button>
             ))}
          </div>

          <h3 className="text-lg font-bold text-[var(--highlight-color)] border-b border-white/10 pb-2 mt-6">المنظمون</h3>
          <div className="space-y-2 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
            {(localSettings.organizers || []).map((org, i) => (
              <div key={i} className="flex gap-2 bg-white/5 p-2 rounded-lg items-end border border-white/5">
                <div className="flex-1 space-y-2">
                  <input type="text" placeholder="الاسم" value={org.name} onChange={(e) => handleOrgChange(i, 'name', e.target.value)} className="w-full bg-black/50 border border-white/20 rounded p-1 text-xs text-white" />
                  <input type="text" placeholder="الدور" value={org.role} onChange={(e) => handleOrgChange(i, 'role', e.target.value)} className="w-full bg-black/50 border border-white/20 rounded p-1 text-xs text-white" />
                  <input type="text" placeholder="رابط الصورة" value={org.imageUrl} onChange={(e) => handleOrgChange(i, 'imageUrl', e.target.value)} className="w-full bg-black/50 border border-white/20 rounded p-1 text-xs text-white/50" />
                </div>
                <button onClick={() => removeOrg(i)} className="p-2 bg-red-500/20 text-red-500 rounded hover:bg-red-500 hover:text-white"><Trash2 size={14} /></button>
              </div>
            ))}
            <button onClick={addOrg} className="w-full py-2 bg-white/5 hover:bg-white/10 text-xs rounded border border-dashed border-white/20 flex items-center justify-center gap-1 text-white"><Plus size={14}/> إضافة منظم</button>
          </div>
        </div>
      </div>

      <div className="mt-6 pt-4 border-t border-white/10 text-right">
        <ShinyButton onClick={() => { setIsSaving(true); onSaveSettings(localSettings).then(() => setIsSaving(false)); }} style={{backgroundColor: localSettings.mainColor}} className="text-white">
           {isSaving ? 'جاري الحفظ...' : 'حفظ التغييرات'}
        </ShinyButton>
      </div>
    </GlassCard>
  );
};

const AdminSubmissionsPanel = ({ submissions, onUpdateStatus, onManualAdd }) => {
  const [filter, setFilter] = useState('Pending');
  const [editMode, setEditMode] = useState(null);
  const [editData, setEditData] = useState({});

  const [isAddModalOpen, setAddModal] = useState(false);
  const [newSub, setNewSub] = useState({ tiktokUser: '@', country: 'العراق', url: '' });

  const startEdit = (sub) => { setEditMode(sub.id); setEditData({ ...sub }); };
  const saveEdit = async () => { await updateDoc(doc(db, PATHS.SUBMISSIONS, editMode), editData); setEditMode(null); };
  const handleManualSubmit = async () => { await onManualAdd(newSub); setAddModal(false); setNewSub({ tiktokUser: '@', country: 'العراق', url: '' }); };

  const filtered = submissions.filter(s => s.status === filter);

  return (
    <GlassCard className="p-6 bg-[#111]">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-xl font-bold text-white">إدارة المشاركات</h3>
        <button onClick={() => setAddModal(true)} className="bg-green-600 px-4 py-2 rounded-lg text-white text-sm font-bold flex items-center gap-2 hover:bg-green-500 transition">
          <Plus size={16} /> إضافة يدوية
        </button>
      </div>
      
      <div className="flex gap-2 mb-4 border-b border-white/10 pb-4">
        {['Pending', 'Approved', 'Rejected'].map(s => (
          <button key={s} onClick={() => setFilter(s)} className={`px-4 py-2 rounded-full text-xs font-bold transition ${filter === s ? 'bg-white text-black' : 'bg-white/10 text-white hover:bg-white/20'}`}>
             {s} ({submissions.filter(sub => sub.status === s).length})
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {filtered.length === 0 && <div className="text-center text-white/30 py-10">لا توجد مشاركات هنا</div>}
        {filtered.map(sub => (
          <div key={sub.id} className="bg-white/5 p-4 rounded-xl border border-white/5 flex flex-col md:flex-row gap-4 items-start md:items-center">
            {editMode === sub.id ? (
              <div className="flex-1 grid grid-cols-2 gap-2 w-full">
                 <input value={editData.thumbnailUrl} onChange={e => setEditData({...editData, thumbnailUrl: e.target.value})} placeholder="Thumbnail URL" className="col-span-2 bg-black/50 border border-white/20 rounded p-2 text-white text-sm" />
                 <input value={editData.profilePicUrl} onChange={e => setEditData({...editData, profilePicUrl: e.target.value})} placeholder="Profile URL" className="col-span-2 bg-black/50 border border-white/20 rounded p-2 text-white text-sm" />
                 <div className="col-span-2 flex gap-2 justify-end mt-2">
                   <button onClick={() => setEditMode(null)} className="px-3 py-1 text-xs bg-gray-700 rounded text-white">إلغاء</button>
                   <button onClick={saveEdit} className="px-3 py-1 text-xs bg-green-600 rounded text-white">حفظ</button>
                 </div>
              </div>
            ) : (
              <>
                <img src={sub.thumbnailUrl} className="w-16 h-24 object-cover rounded bg-black border border-white/10" alt="Thumb" onError={e => e.target.src='https://placehold.co/100x150/333/fff?text=?'} />
                <div className="flex-1">
                  <h4 className="font-bold text-white">{sub.tiktokUser}</h4>
                  <p className="text-xs text-white/50">{sub.country} | الأصوات: {sub.votes}</p>
                  <a href={sub.videoUrl} target="_blank" rel="noreferrer" className="text-[var(--highlight-color)] text-xs hover:underline block truncate max-w-[200px]">{sub.videoUrl}</a>
                </div>
                <div className="flex gap-2">
                   <button onClick={() => startEdit(sub)} className="p-2 bg-blue-600/20 text-blue-400 rounded hover:bg-blue-600 hover:text-white"><Edit3 size={16} /></button>
                   {sub.status !== 'Approved' && <button onClick={() => onUpdateStatus(sub.id, 'Approved')} className="p-2 bg-green-600/20 text-green-400 rounded hover:bg-green-600 hover:text-white"><CheckCircle size={16}/></button>}
                   {sub.status !== 'Rejected' && <button onClick={() => onUpdateStatus(sub.id, 'Rejected')} className="p-2 bg-red-600/20 text-red-400 rounded hover:bg-red-600 hover:text-white"><X size={16}/></button>}
                   <button onClick={() => { if(window.confirm('حذف نهائي؟')) onUpdateStatus(sub.id, 'Deleted'); }} className="p-2 bg-gray-800 text-gray-500 rounded hover:text-red-500"><Trash2 size={16}/></button>
                </div>
              </>
            )}
          </div>
        ))}
      </div>

      <Modal isOpen={isAddModalOpen} onClose={() => setAddModal(false)} title="إضافة مشاركة يدوياً">
        <InputField label="اسم المستخدم @" value={newSub.tiktokUser} onChange={v => setNewSub({...newSub, tiktokUser: v})} />
        <InputField label="رابط الفيديو" value={newSub.url} onChange={v => setNewSub({...newSub, url: v})} />
        <div className="mb-4">
           <label className="text-white text-sm block mb-2">البلد</label>
           <select value={newSub.country} onChange={e => setNewSub({...newSub, country: e.target.value})} className="w-full p-3 bg-white/5 border border-white/20 rounded text-white">
             {COUNTRIES.filter(c => c.code !== 'ALL').map(c => <option key={c.code} value={c.name} className="bg-black">{c.name}</option>)}
           </select>
        </div>
        <ShinyButton onClick={handleManualSubmit} className="w-full bg-green-600 text-white">إضافة</ShinyButton>
      </Modal>
    </GlassCard>
  );
};

// =========================================================================
// 6. MAIN APP
// =========================================================================

const ContestApp = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [settings, setSettings] = useState(null);
  const [submissions, setSubmissions] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [countryFilter, setCountryFilter] = useState('الكل');
  
  const [modals, setModals] = useState({ adminAuth: false, voteConfirm: null, videoPlayer: null, info: null });
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (!isFirebaseInitialized) { setSettings(DEFAULT_SETTINGS); return; }
    // استرجاع الإعدادات
    const unsub1 = onSnapshot(doc(db, PATHS.SETTINGS), (s) => {
      if(s.exists()) setSettings(s.data());
      else setDoc(doc(db, PATHS.SETTINGS), DEFAULT_SETTINGS);
    });
    // استرجاع المشاركات
    const unsub2 = onSnapshot(collection(db, PATHS.SUBMISSIONS), (s) => {
      setSubmissions(s.docs.map(d => ({id: d.id, ...d.data()})));
    });
    return () => { unsub1(); unsub2(); };
  }, []);

  // حقن المتغيرات في الـ CSS للجذر
  useEffect(() => {
    if (settings) {
      const root = document.documentElement;
      root.style.setProperty('--highlight-color', settings.highlightColor);
      root.style.setProperty('--main-color', settings.mainColor);
      root.style.fontFamily = `"${settings.appFont}", sans-serif`;
    }
  }, [settings]);

  const processedSubmissions = useMemo(() => {
    let list = submissions.filter(s => s.status === 'Approved');
    if (searchQuery) list = list.filter(s => s.tiktokUser.toLowerCase().includes(searchQuery.toLowerCase()));
    if (countryFilter !== 'الكل') list = list.filter(s => s.country === countryFilter);
    return list.sort((a, b) => b.votes - a.votes);
  }, [submissions, searchQuery, countryFilter]);

  const handleSaveSettings = async (newS) => await setDoc(doc(db, PATHS.SETTINGS), newS, { merge: true });
  const handleStatus = async (id, st) => {
    if(st === 'Deleted') { /* Delete logic if needed */ } 
    else await updateDoc(doc(db, PATHS.SUBMISSIONS, id), { status: st });
  };
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

  function useAuth() {
    const [u, setU] = useState(null);
    useEffect(() => isFirebaseInitialized ? onAuthStateChanged(auth, setU) : null, []);
    return { user: u };
  }

  useEffect(() => { if(cooldown > 0) setTimeout(() => setCooldown(c=>c-1), 1000); }, [cooldown]);

  if (!settings) return <div className="h-screen bg-black flex items-center justify-center gap-3"><Loader className="animate-spin text-red-500"/><span className="text-white">جاري التحميل...</span></div>;

  return (
    <div className="min-h-screen bg-[#050505] text-white font-sans selection:bg-[var(--highlight-color)] selection:text-black">
       <style>{`
         @keyframes shine { 100% { transform: translateX(150%); } }
         .animate-shine { animation: shine 1.5s infinite; }
         @keyframes scroll { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } }
         .animate-scroll { animation: scroll 30s linear infinite; }
         .hover\\:pause:hover { animation-play-state: paused; }
         ::-webkit-scrollbar { width: 6px; } 
         ::-webkit-scrollbar-track { background: #000; } 
         ::-webkit-scrollbar-thumb { background: #333; border-radius: 10px; }
         ::-webkit-scrollbar-thumb:hover { background: var(--main-color); }
       `}</style>

       <Routes>
         {/* ADMIN */}
         <Route path="/admin" element={user ? (
            <div className="container mx-auto px-4 py-8 animate-fadeIn">
              <div className="flex justify-between items-center mb-8 bg-[#111] p-4 rounded-2xl border border-white/10">
                 <img src={settings.logoUrl} className="h-12 object-contain bg-black/20 rounded" alt="Logo"/>
                 <button onClick={() => signOut(auth).then(() => navigate('/'))} className="text-red-400 hover:text-white flex gap-2"><LogOut size={20}/> خروج</button>
              </div>
              <AdminSettingsPanel settings={settings} onSaveSettings={handleSaveSettings} />
              <AdminSubmissionsPanel submissions={submissions} onUpdateStatus={handleStatus} onManualAdd={handleManualAdd} />
            </div>
         ) : <div className="h-screen flex flex-col items-center justify-center gap-4"><AlertTriangle className="w-12 h-12 text-red-500"/><button onClick={() => setModals(p=>({...p, adminAuth: true}))} className="text-white underline">دخول المدير</button></div>} />

         {/* PUBLIC */}
         <Route path="/" element={
           <>
             <header className="sticky top-0 z-40 bg-black/80 backdrop-blur-lg border-b border-white/10">
                <div className="container mx-auto px-4 py-3 flex justify-between items-center">
                   <img src={settings.logoUrl} className="h-10 md:h-12 object-contain" alt="Logo"/>
                   {user && <button onClick={() => navigate('/admin')} className="bg-white/10 px-3 py-1 rounded-full text-xs hover:bg-white/20 transition">الإدارة</button>}
                </div>
             </header>

             <main className="container mx-auto px-4 py-8 min-h-[80vh]">
                {settings.alertText && (
                  <div className="bg-[var(--highlight-color)]/10 border border-[var(--highlight-color)]/30 text-[var(--highlight-color)] p-4 rounded-xl mb-8 flex items-center gap-3 animate-pulse justify-center text-center">
                    <AlertTriangle className="w-5 h-5 shrink-0" />
                    <span className="font-bold text-sm md:text-base">{settings.alertText}</span>
                  </div>
                )}

                {settings.stage === 'Submission' && <SubmissionForm settings={settings} />}
                
                {(settings.stage === 'Voting' || settings.stage === 'Ended') && (
                  <>
                    <Leaderboard submissions={submissions.filter(s => s.status === 'Approved')} />
                    
                    <div className="flex items-center gap-2 mb-6 mt-10">
                      <div className="h-8 w-1 bg-[var(--highlight-color)] rounded-full"></div>
                      <h2 className="text-2xl font-bold">تصفح المشاركات</h2>
                    </div>

                    <SearchFilterBar onSearch={setSearchQuery} onFilter={setCountryFilter} countries={COUNTRIES} />

                    {processedSubmissions.length === 0 ? (
                        <div className="text-center py-20 border border-dashed border-white/10 rounded-xl">
                            <p className="text-white/40">لا توجد مشاركات مطابقة للبحث</p>
                        </div>
                    ) : (
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
                    )}
                  </>
                )}

                {settings.stage === 'Paused' && (
                    <div className="text-center py-32">
                        <h1 className="text-4xl font-bold mb-4 text-white">المسابقة متوقفة حالياً</h1>
                        <p className="text-white/50">نعود قريباً...</p>
                    </div>
                )}
             </main>

             <footer className="bg-[#0a0a0a] border-t border-white/10 py-10 mt-20 text-center text-white/50 text-sm">
               <div className="flex justify-center gap-6 mb-4">
                 {['why','terms','organizers'].map(type => (
                   <button key={type} onClick={() => setModals(p=>({...p, info: type}))} className="hover:text-white capitalize transition">
                     {type === 'why' ? 'عن المسابقة' : type === 'terms' ? 'الشروط' : 'المنظمون'}
                   </button>
                 ))}
               </div>
               <p>&copy; 2025 {settings.title}</p>
               <button onClick={() => setModals(p=>({...p, adminAuth: true}))} className="opacity-10 hover:opacity-50 mt-4 grayscale">🔐</button>
             </footer>
           </>
         } />
       </Routes>

       {/* MODALS */}
       <Modal isOpen={!!modals.voteConfirm} onClose={() => setModals(p=>({...p, voteConfirm: null}))} title="تأكيد التصويت">
          <div className="text-center py-4">
             <img src={modals.voteConfirm?.profilePicUrl} className="w-20 h-20 rounded-full mx-auto mb-4 border-2 border-[var(--highlight-color)] object-cover bg-gray-800" alt=""/>
             <p className="text-lg mb-6">هل تود التصويت لـ <span className="font-bold text-[var(--highlight-color)]">{modals.voteConfirm?.tiktokUser}</span>؟</p>
             <ShinyButton onClick={confirmVote} style={{backgroundColor: settings.mainColor}} className="w-full text-white">تأكيد التصويت</ShinyButton>
          </div>
       </Modal>

       <VideoModal isOpen={!!modals.videoPlayer} submission={modals.videoPlayer} onClose={() => setModals(p=>({...p, videoPlayer: null}))} settings={settings} onVote={(s) => { setModals(p=>({...p, voteConfirm: s, videoPlayer: null})); }} />
       
       {modals.adminAuth && (
         <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/90 p-4 backdrop-blur-sm animate-fadeIn">
            <div className="bg-[#111] p-8 rounded-xl border border-white/10 w-full max-w-md shadow-2xl">
               <div className="flex justify-center mb-6"><SettingsIcon className="w-12 h-12 text-[var(--highlight-color)]"/></div>
               <h2 className="text-white font-bold mb-6 text-center text-xl">تسجيل دخول المدير</h2>
               <form onSubmit={(e) => { e.preventDefault(); signInWithEmailAndPassword(auth, e.target.email.value, e.target.pass.value).then(() => setModals(p=>({...p, adminAuth: false}))).catch(()=>alert('خطأ في البيانات')); }}>
                 <input name="email" placeholder="البريد الإلكتروني" className="w-full p-3 mb-3 bg-black/50 border border-white/10 rounded text-white outline-none focus:border-[var(--highlight-color)]" />
                 <input name="pass" type="password" placeholder="كلمة المرور" className="w-full p-3 mb-6 bg-black/50 border border-white/10 rounded text-white outline-none focus:border-[var(--highlight-color)]" />
                 <button className="w-full bg-[var(--highlight-color)] py-3 rounded font-bold text-black hover:brightness-110 transition">دخول</button>
                 <button type="button" onClick={() => setModals(p=>({...p, adminAuth: false}))} className="w-full mt-4 text-white/50 text-sm hover:text-white">إلغاء</button>
               </form>
            </div>
         </div>
       )}
       
       <Modal isOpen={!!modals.info} onClose={() => setModals(p=>({...p, info: null}))} title="المعلومات">
         {modals.info === 'why' && <p className="text-lg leading-relaxed text-gray-300">{settings.whyText}</p>}
         {modals.info === 'terms' && <p className="text-lg leading-relaxed text-gray-300 whitespace-pre-line">{settings.termsText}</p>}
         {modals.info === 'organizers' && (settings.organizers || []).map((o, i) => (
           <div key={i} className="flex items-center gap-4 bg-white/5 p-3 rounded-xl border border-white/5">
             <img src={o.imageUrl || 'https://placehold.co/100x100/333/fff?text=Org'} className="w-14 h-14 rounded-full bg-black object-cover" alt=""/>
             <div><p className="font-bold text-lg">{o.name}</p><p className="text-sm text-[var(--highlight-color)]">{o.role}</p></div>
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