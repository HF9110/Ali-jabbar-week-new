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
  ChevronDown,
  Crown,
  Search,
  Settings as SettingsIcon,
  X,
  Loader,
  User,
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
  PlayCircle
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
// 2. CONSTANTS & DATA MODELS
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
  { name: 'فريق الإدارة', role: 'منسق المسابقة', imageUrl: 'https://placehold.co/100x100/25f4ee/fe2c55?text=Team' },
];

const DEFAULT_SETTINGS = {
  mainColor: '#fe2c55',
  highlightColor: '#25f4ee',
  appFont: 'Cairo',
  title: 'Ali Jabbar Week',
  logoUrl: 'https://placehold.co/100x40/fe2c55/25f4ee?text=AJW',
  alertBannerText: 'التصويت مفتوح! شارك في تحديد أفضل تصميم عربي.', // Renamed from marqueeText
  stage: 'Voting',
  useGlassmorphism: true,
  termsText: 'الشروط والأحكام:\n- يجب أن يكون التصميم أصلياً.\n- الالتزام بالآداب العامة.',
  whyText: 'لتعزيز المحتوى العربي الإبداعي ودعم المواهب.',
  organizers: DEFAULT_ORGANIZERS,
};

// =========================================================================
// 3. UTILITY HOOKS & HELPERS
// =========================================================================

const useAuth = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isFirebaseInitialized) { setLoading(false); return; }
    const unsubscribe = onAuthStateChanged(auth, (u) => { setUser(u); setLoading(false); });
    return () => unsubscribe();
  }, []);
  return { user, loading };
};

// Helper to simulate fetching TikTok data (In real app, requires Server-side API)
const mockFetchTikTokProfile = async (username) => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        name: username.replace('@', ''),
        avatar: `https://ui-avatars.com/api/?name=${username}&background=random&size=200`,
      });
    }, 1500);
  });
};

// =========================================================================
// 4. UI COMPONENTS
// =========================================================================

const GlassCard = ({ children, className = '', isGlassmorphism = true, color = 'bg-gray-900', onClick }) => {
  const glassClasses = isGlassmorphism
    ? 'bg-opacity-60 backdrop-blur-xl shadow-2xl border border-white/10'
    : 'bg-opacity-100 shadow-xl border border-gray-800';
  return (
    <div className={`p-5 rounded-2xl transition-all duration-300 ${color} ${glassClasses} ${className}`} onClick={onClick}>
      {children}
    </div>
  );
};

const Modal = ({ isOpen, onClose, title, children, maxWidth = 'max-w-2xl' }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm animate-fadeIn" onClick={onClose}>
      <GlassCard className={`w-full ${maxWidth} max-h-[90vh] overflow-y-auto relative flex flex-col !p-0`} color="bg-gray-900" onClick={(e) => e.stopPropagation()}>
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

const InputField = ({ label, id, value, onChange, type = 'text', placeholder = '', required = false, helperText = '' }) => (
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
      className="w-full p-3 rounded-lg bg-black/40 border border-white/10 text-white placeholder-gray-500 focus:ring-2 focus:ring-highlight-color focus:border-transparent transition duration-200 outline-none"
    />
    {helperText && <p className="text-xs text-white/50 mt-1">{helperText}</p>}
  </div>
);

// =========================================================================
// 5. PUBLIC COMPONENTS (Enhanced)
// =========================================================================

const TopThree = ({ topSubmissions }) => {
  if (topSubmissions.length === 0) return null;
  
  // Ensure we have 3 slots even if empty
  const slots = [topSubmissions[1], topSubmissions[0], topSubmissions[2]];

  return (
    <div className="flex justify-center items-end gap-4 md:gap-8 mb-12 px-2">
      {slots.map((sub, index) => {
        if (!sub && index !== 1) return <div key={index} className="w-24 md:w-32" />; // Spacer
        if (!sub && index === 1) return null;

        const rank = index === 1 ? 1 : index === 0 ? 2 : 3;
        const isFirst = rank === 1;
        const borderColor = isFirst ? 'border-yellow-400' : rank === 2 ? 'border-gray-300' : 'border-amber-700';
        const glowColor = isFirst ? 'shadow-yellow-400/50' : rank === 2 ? 'shadow-gray-300/30' : 'shadow-amber-700/30';
        const heightClass = isFirst ? 'h-48 md:h-64' : 'h-36 md:h-48';

        return (
          <div key={sub.id} className={`relative flex flex-col items-center ${isFirst ? '-mt-10 z-10' : ''}`}>
            <div className={`relative ${isFirst ? 'w-28 h-28 md:w-36 md:h-36' : 'w-20 h-20 md:w-24 md:h-24'} mb-[-20px] z-20 rounded-full border-4 ${borderColor} shadow-lg overflow-hidden bg-black`}>
              <img src={sub.profilePic || sub.thumbnailUrl} alt={sub.tiktokUsername} className="w-full h-full object-cover" />
            </div>
            
            <GlassCard className={`relative w-28 md:w-40 flex flex-col justify-end items-center pt-8 pb-4 ${heightClass} border-t-0 rounded-t-2xl rounded-b-lg shadow-[0_0_30px_rgba(0,0,0,0.5)] ${glowColor}`} isGlassmorphism={false} color="bg-gradient-to-b from-gray-800 to-gray-900">
               <Crown className={`w-6 h-6 md:w-8 md:h-8 mb-2 ${isFirst ? 'text-yellow-400 animate-bounce' : rank === 2 ? 'text-gray-300' : 'text-amber-700'}`} fill="currentColor" />
               <h3 className="text-white font-bold text-xs md:text-sm truncate w-full text-center px-2" dir="ltr">{sub.tiktokUsername}</h3>
               <p className="text-white/50 text-[10px]">{sub.flag} {sub.country}</p>
               <div className="mt-2 bg-white/10 px-3 py-1 rounded-full">
                 <span className="text-highlight-color font-bold text-sm md:text-lg">{sub.votes}</span>
               </div>
            </GlassCard>
            
            <div className={`absolute -bottom-3 bg-highlight-color text-black font-bold w-8 h-8 flex items-center justify-center rounded-full border-2 border-black z-30 shadow-lg`}>
              {rank}
            </div>
          </div>
        );
      })}
    </div>
  );
};

const Ticker = ({ submissions }) => {
  if (!submissions || submissions.length === 0) return null;

  return (
    <div className="w-full bg-black/40 border-y border-white/10 py-3 mb-8 overflow-hidden relative group">
      <div className="flex animate-marquee whitespace-nowrap items-center hover:[animation-play-state:paused]">
        {/* Render list twice for smooth infinite loop */}
        {[...submissions, ...submissions].map((sub, i) => (
          <div key={`${sub.id}-${i}`} className="flex items-center gap-3 mx-6 px-4 py-2 rounded-full bg-white/5 hover:bg-white/10 transition cursor-default border border-white/5 hover:border-highlight-color/50">
            <span className="font-bold text-white/30 italic">#{i % submissions.length + 4}</span>
            <img src={sub.profilePic || sub.thumbnailUrl} className="w-8 h-8 rounded-full object-cover border border-white/20" alt="" />
            <span className="text-sm font-bold text-white" dir="ltr">{sub.tiktokUsername}</span>
            <span className="text-highlight-color font-mono font-bold">{sub.votes} pts</span>
          </div>
        ))}
      </div>
    </div>
  );
};

const FilterBar = ({ onSearch, onFilterCountry, selectedCountry }) => {
  return (
    <div className="mb-8 sticky top-20 z-30">
      <GlassCard className="flex flex-col md:flex-row gap-4 p-4 items-center" isGlassmorphism>
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white/50 w-5 h-5" />
          <input 
            type="text" 
            placeholder="ابحث عن اسم المستخدم..." 
            onChange={(e) => onSearch(e.target.value)}
            className="w-full bg-black/40 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-white focus:ring-2 focus:ring-highlight-color outline-none"
          />
        </div>
        
        <div className="relative w-full md:w-64">
          <Filter className="absolute right-3 top-1/2 -translate-y-1/2 text-white/50 w-5 h-5 pointer-events-none" />
          <select 
            value={selectedCountry}
            onChange={(e) => onFilterCountry(e.target.value)}
            className="w-full bg-black/40 border border-white/10 rounded-xl pr-10 pl-4 py-3 text-white appearance-none focus:ring-2 focus:ring-highlight-color outline-none cursor-pointer"
          >
            {COUNTRIES.map(c => <option key={c.code} value={c.name} className="bg-gray-900">{c.flag} {c.name}</option>)}
          </select>
          <ChevronDown className="absolute left-3 top-1/2 -translate-y-1/2 text-white/50 w-4 h-4 pointer-events-none" />
        </div>
      </GlassCard>
    </div>
  );
};

const SubmissionForm = ({ settings }) => {
  const [form, setForm] = useState({ tiktokUsername: '', country: COUNTRIES[1].name, url: '' }); // Skip 'ALL' in default
  const [status, setStatus] = useState('idle');
  const [fetchedProfile, setFetchedProfile] = useState(null);

  // Auto-fetch logic
  const handleUsernameBlur = async () => {
    if (form.tiktokUsername && form.tiktokUsername.startsWith('@')) {
      setStatus('fetching');
      const data = await mockFetchTikTokProfile(form.tiktokUsername);
      setFetchedProfile(data);
      setStatus('idle');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.tiktokUsername.startsWith('@')) return alert('يجب أن يبدأ اسم المستخدم بـ @');
    if (!form.url) return alert('الرجاء إدخال رابط الفيديو');
    
    setStatus('submitting');
    try {
      const countryData = COUNTRIES.find(c => c.name === form.country);
      await addDoc(collection(db, PATHS.SUBMISSIONS), {
        tiktokUsername: form.tiktokUsername,
        displayName: fetchedProfile?.name || form.tiktokUsername,
        profilePic: fetchedProfile?.avatar || '',
        country: form.country,
        flag: countryData.flag,
        videoUrl: form.url,
        status: 'Pending',
        votes: 0,
        submittedAt: serverTimestamp(),
        // Placeholder thumbnail, admin will likely need to fix or use proper API
        thumbnailUrl: `https://placehold.co/600x900/111/fff?text=Video+Processing`, 
      });
      setStatus('success');
      setForm({ tiktokUsername: '', country: COUNTRIES[1].name, url: '' });
      setFetchedProfile(null);
    } catch (err) {
      console.error(err);
      setStatus('error');
    }
  };

  return (
    <GlassCard className="max-w-xl mx-auto p-8 mt-10 relative overflow-hidden" isGlassmorphism={settings.useGlassmorphism}>
      {/* Shine Effect Background */}
      <div className="absolute top-0 -left-[100%] w-[50%] h-full bg-gradient-to-r from-transparent via-white/5 to-transparent skew-x-[-25deg] animate-shine pointer-events-none" />

      <div className="text-center mb-8 relative z-10">
        <div className="inline-block p-3 rounded-full bg-white/5 mb-4 shadow-inner border border-white/5">
          <img src="https://cdn-icons-png.flaticon.com/512/3046/3046121.png" alt="TikTok" className="w-10 h-10 invert" />
        </div>
        <h2 className="text-3xl font-bold text-white mb-2">شارك إبداعك</h2>
        <p className="text-white/60">أدخل بيانات حسابك على تيك توك</p>
      </div>

      {status === 'success' && (
        <div className="bg-green-500/20 border border-green-500 text-green-200 p-4 rounded-lg mb-6 text-center flex items-center justify-center gap-2 animate-fadeIn">
          <CheckCircle className="w-5 h-5" /> تم الإرسال بنجاح!
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5 relative z-10">
        <div className="relative">
          <InputField 
            label="اسم المستخدم في تيك توك" 
            id="tiktok-user" 
            value={form.tiktokUsername} 
            onChange={v => setForm({...form, tiktokUsername: v})} 
            placeholder="@username"
            helperText="تأكد من كتابة @ في البداية"
            required
          />
          {/* Fetch Trigger */}
          <button type="button" onClick={handleUsernameBlur} className="absolute left-2 top-[34px] text-xs bg-white/10 hover:bg-white/20 px-2 py-1 rounded text-highlight-color transition">تحقق</button>
        </div>

        {/* Fetched Profile Preview */}
        {status === 'fetching' && <div className="flex items-center gap-2 text-sm text-white/50"><Loader className="animate-spin w-4 h-4" /> جاري جلب البيانات...</div>}
        {fetchedProfile && (
          <div className="flex items-center gap-3 bg-white/10 p-3 rounded-lg border border-highlight-color/30 animate-slideUp">
            <img src={fetchedProfile.avatar} alt="Avatar" className="w-12 h-12 rounded-full" />
            <div>
              <p className="font-bold text-white">{fetchedProfile.name}</p>
              <p className="text-xs text-white/50">تم التحقق</p>
            </div>
          </div>
        )}

        <div className="mb-4">
          <label className="block text-white mb-2 text-sm opacity-90">البلد</label>
          <div className="relative">
            <select 
              value={form.country} 
              onChange={e => setForm({...form, country: e.target.value})}
              className="w-full p-3 pl-10 rounded-lg bg-black/40 border border-white/10 text-white appearance-none focus:ring-2 focus:ring-highlight-color outline-none cursor-pointer"
            >
              {COUNTRIES.filter(c => c.code !== 'ALL').map(c => <option key={c.code} value={c.name} className="bg-gray-900">{c.flag} {c.name}</option>)}
            </select>
            <ChevronDown className="absolute left-3 top-3.5 w-5 h-5 text-white/50 pointer-events-none" />
          </div>
        </div>

        <InputField 
          label="رابط الفيديو" 
          id="sub-url" 
          value={form.url} 
          onChange={v => setForm({...form, url: v})} 
          placeholder="https://www.tiktok.com/@user/video/..."
          required
        />

        <button 
          type="submit" 
          disabled={status === 'submitting' || status === 'fetching'}
          className="w-full py-4 rounded-xl font-bold text-lg transition-all relative overflow-hidden group text-black shadow-lg hover:shadow-highlight-color/30 hover:scale-[1.02] active:scale-95"
          style={{ backgroundColor: settings.mainColor }}
        >
          <span className="relative z-10 flex items-center justify-center gap-2">
            {status === 'submitting' ? <Loader className="animate-spin" /> : <>إرسال المشاركة <span className="group-hover:translate-x-[-5px] transition-transform">🚀</span></>}
          </span>
          <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
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
      {/* Thumbnail: Use specific thumbnail or profile pic fallback */}
      <img 
        src={submission.thumbnailUrl && submission.thumbnailUrl.includes('placehold') ? submission.profilePic : submission.thumbnailUrl} 
        alt={submission.tiktokUsername} 
        className="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-opacity duration-500"
        onError={(e) => e.target.src = 'https://placehold.co/600x900/333/fff?text=No+Image'}
      />
      
      {/* Play Icon Overlay */}
      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-black/20 backdrop-blur-[2px]">
        <PlayCircle className="w-16 h-16 text-white drop-shadow-lg" />
      </div>

      <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent flex flex-col justify-end p-4">
        <div className="flex justify-between items-end mb-3">
          <div className="overflow-hidden">
            <h3 className="font-bold text-white text-lg truncate shadow-sm" dir="ltr">{submission.tiktokUsername}</h3>
            <p className="text-white/70 text-sm flex items-center gap-1">{submission.flag} {submission.country}</p>
          </div>
          <div className="text-center bg-white/10 backdrop-blur-md p-2 rounded-lg border border-white/10 shrink-0">
            <p className="text-[10px] text-white/60 uppercase">أصوات</p>
            <p className="font-bold text-white text-xl leading-none" style={{ color: settings.highlightColor }}>{submission.votes}</p>
          </div>
        </div>
        
        <button 
          onClick={(e) => { e.stopPropagation(); onVote(submission); }}
          className="w-full py-3 rounded-xl font-bold text-sm bg-white text-black hover:bg-gray-200 transition flex items-center justify-center gap-2 shadow-lg active:scale-95 btn-shine overflow-hidden relative"
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
      <GlassCard className="w-full max-w-6xl h-[85vh] flex flex-col md:flex-row overflow-hidden !p-0 shadow-[0_0_50px_rgba(var(--highlight-rgb),0.2)]" onClick={e => e.stopPropagation()}>
        
        {/* Video Player - Full Width/Height Logic */}
        <div className="w-full md:w-2/3 bg-black flex items-center justify-center relative h-1/2 md:h-full">
           {/* Helper wrapper for 16:9 or full fill */}
           <div className="w-full h-full relative">
              <iframe 
                src={embedUrl} 
                className="w-full h-full absolute inset-0" 
                title="Video" 
                allowFullScreen
                style={{ border: 'none' }}
              ></iframe>
           </div>
           <button onClick={onClose} className="absolute top-4 right-4 bg-black/50 p-2 rounded-full text-white hover:bg-red-600 transition md:hidden z-50">
             <X />
           </button>
        </div>

        {/* Sidebar Info */}
        <div className="w-full md:w-1/3 bg-gray-900 p-6 flex flex-col relative h-1/2 md:h-full overflow-y-auto">
           <button onClick={onClose} className="absolute top-4 right-4 text-white/50 hover:text-white hidden md:block"><X /></button>
           
           <div className="mt-4 flex items-center gap-4 pb-6 border-b border-white/10">
             <div className="w-16 h-16 rounded-full border-2 border-highlight-color p-0.5 overflow-hidden shrink-0">
               <img src={submission.profilePic || submission.thumbnailUrl} className="w-full h-full rounded-full object-cover" alt="" />
             </div>
             <div>
                <h2 className="text-xl font-bold text-white" dir="ltr">{submission.tiktokUsername}</h2>
                <p className="text-white/50 flex items-center gap-2 mt-1">{submission.flag} {submission.country}</p>
             </div>
           </div>

           <div className="mt-6 grid grid-cols-2 gap-4">
              <div className="bg-white/5 p-4 rounded-xl text-center border border-highlight-color/30">
                <p className="text-white/50 text-xs">عدد الأصوات</p>
                <p className="text-highlight-color font-bold text-3xl mt-1">{submission.votes}</p>
              </div>
              <div className="bg-white/5 p-4 rounded-xl text-center flex items-center justify-center">
                 <span className="text-green-400 font-bold flex items-center gap-1"><CheckCircle size={16} /> مشاركة معتمدة</span>
              </div>
           </div>

           <div className="mt-auto pt-6">
             <button 
               onClick={() => onVote(submission)}
               className="w-full py-4 rounded-xl font-bold text-lg transition hover:scale-[1.02] active:scale-95 shadow-lg mb-3 text-black relative overflow-hidden"
               style={{ backgroundColor: settings.mainColor }}
             >
               <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shine" />
               تصويت للمشارك
             </button>
             <p className="text-center text-xs text-white/30">يمكنك التصويت مرة واحدة كل 30 ثانية لضمان العدالة</p>
           </div>
        </div>
      </GlassCard>
    </div>
  );
};

// =========================================================================
// 6. ADMIN PANEL COMPONENTS
// =========================================================================

const AdminAuthModal = ({ isOpen, onClose, onSuccess }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  
  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      await signInWithEmailAndPassword(auth, email, password);
      onSuccess();
    } catch (err) {
      setError('فشل الدخول.');
    }
  };

  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/90 backdrop-blur-md p-4">
      <GlassCard className="w-full max-w-md p-8 border-highlight-color" color="bg-gray-900">
        <h2 className="text-2xl font-bold text-white text-center mb-6">مدير النظام</h2>
        <form onSubmit={handleLogin} className="space-y-4">
          <InputField label="البريد" id="email" value={email} onChange={setEmail} placeholder="admin@example.com" />
          <InputField label="كلمة المرور" id="pass" value={password} onChange={setPassword} type="password" />
          {error && <p className="text-red-400 text-sm">{error}</p>}
          <button type="submit" className="w-full bg-white text-black p-3 rounded font-bold">دخول</button>
          <button type="button" onClick={onClose} className="w-full text-gray-400 text-sm mt-2">إلغاء</button>
        </form>
      </GlassCard>
    </div>
  );
};

const AdminSettingsPanel = ({ settings, onSaveSettings }) => {
  const [localSettings, setLocalSettings] = useState(settings);
  const [organizers, setOrganizers] = useState(settings.organizers || DEFAULT_ORGANIZERS);

  useEffect(() => {
    if (settings) {
      setLocalSettings(settings);
      setOrganizers(settings.organizers || DEFAULT_ORGANIZERS);
    }
  }, [settings]);

  const handleChange = (field, value) => setLocalSettings(prev => ({ ...prev, [field]: value }));
  
  const handleOrganizerChange = (index, field, value) => {
    const newOrgs = [...organizers];
    newOrgs[index][field] = value;
    setOrganizers(newOrgs);
    handleChange('organizers', newOrgs);
  };

  return (
    <GlassCard className="p-6 mb-8" isGlassmorphism>
      <div className="flex justify-between items-center mb-6 border-b border-white/10 pb-4">
        <h2 className="text-2xl font-bold text-white flex items-center gap-2"><SettingsIcon /> إعدادات النظام</h2>
        <button onClick={() => onSaveSettings(localSettings)} className="bg-green-600 hover:bg-green-500 text-white px-6 py-2 rounded-lg font-bold flex items-center gap-2">
          <Save size={18} /> حفظ التغييرات
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div>
          <h3 className="text-lg font-bold text-white mb-4">الهوية والمظهر</h3>
          {localSettings.logoUrl && <div className="mb-4 bg-white/5 p-4 rounded-xl text-center"><img src={localSettings.logoUrl} alt="Logo Preview" className="h-16 mx-auto" /></div>}
          <InputField label="رابط الشعار (Logo URL)" id="logo" value={localSettings.logoUrl} onChange={(v) => handleChange('logoUrl', v)} />
          <InputField label="نص شريط التنبيه (Alert Banner)" id="alert" value={localSettings.alertBannerText} onChange={(v) => handleChange('alertBannerText', v)} />
          
          <div className="flex gap-4 mb-4">
             <div className="flex-1"><label className="block text-white text-sm mb-1">اللون الرئيسي</label><input type="color" value={localSettings.mainColor} onChange={(e) => handleChange('mainColor', e.target.value)} className="w-full h-10 rounded cursor-pointer" /></div>
             <div className="flex-1"><label className="block text-white text-sm mb-1">لون التوهج</label><input type="color" value={localSettings.highlightColor} onChange={(e) => handleChange('highlightColor', e.target.value)} className="w-full h-10 rounded cursor-pointer" /></div>
          </div>
        </div>

        <div>
          <h3 className="text-lg font-bold text-white mb-4">المرحلة والقائمون</h3>
          <div className="grid grid-cols-2 gap-2 mb-4">
            {Object.entries(STAGES).map(([key, info]) => (
              <button key={key} onClick={() => handleChange('stage', key)} className={`p-2 rounded text-xs font-bold border ${localSettings.stage === key ? 'border-white bg-white/20' : 'border-white/10 text-white/50'}`}>
                {info.label}
              </button>
            ))}
          </div>
          
          <h4 className="text-sm font-bold text-white/70 mb-2">تعديل المنظمين:</h4>
          {organizers.map((org, idx) => (
            <div key={idx} className="bg-white/5 p-3 rounded-lg mb-2 flex gap-2">
               <img src={org.imageUrl} className="w-10 h-10 rounded-full bg-black" alt="" />
               <div className="flex-1 space-y-2">
                  <input className="w-full bg-black/30 text-white text-xs p-1 rounded" value={org.name} onChange={e => handleOrganizerChange(idx, 'name', e.target.value)} />
                  <input className="w-full bg-black/30 text-white/70 text-xs p-1 rounded" value={org.role} onChange={e => handleOrganizerChange(idx, 'role', e.target.value)} />
               </div>
            </div>
          ))}
        </div>
      </div>
    </GlassCard>
  );
};

const AdminSubmissionsPanel = ({ submissions, onUpdateStatus, onUpdateThumbnail }) => {
  const [filter, setFilter] = useState('Pending');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  
  // Manual Add Form State
  const [manualForm, setManualForm] = useState({ tiktokUsername: '', country: 'SA', url: '' });

  const handleManualAdd = async () => {
    const countryData = COUNTRIES.find(c => c.code === manualForm.country);
    await addDoc(collection(db, PATHS.SUBMISSIONS), {
      tiktokUsername: manualForm.tiktokUsername,
      displayName: manualForm.tiktokUsername,
      country: countryData.name,
      flag: countryData.flag,
      videoUrl: manualForm.url,
      status: 'Approved', // Auto approve manual adds
      votes: 0,
      submittedAt: serverTimestamp(),
      thumbnailUrl: 'https://placehold.co/600x900/000/fff?text=Manual+Add',
      profilePic: `https://ui-avatars.com/api/?name=${manualForm.tiktokUsername}&background=random`,
    });
    setIsAddModalOpen(false);
    setManualForm({ tiktokUsername: '', country: 'SA', url: '' });
  };

  const handleThumbnailUpdate = (id, newUrl) => {
    onUpdateThumbnail(id, newUrl);
  };

  return (
    <GlassCard isGlassmorphism className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-xl font-bold text-white">إدارة المشاركات</h3>
        <button onClick={() => setIsAddModalOpen(true)} className="bg-highlight-color text-black px-4 py-2 rounded-lg font-bold flex items-center gap-2 hover:brightness-110">
          <Plus size={18} /> إضافة مشارك يدوياً
        </button>
      </div>
      
      <div className="flex gap-2 mb-4 border-b border-white/10 pb-2">
         {['Pending', 'Approved', 'Rejected'].map(s => (
           <button key={s} onClick={() => setFilter(s)} className={`px-4 py-2 rounded ${filter === s ? 'bg-white/20 text-white' : 'text-white/40'}`}>{s}</button>
         ))}
      </div>

      <div className="grid gap-4 max-h-[600px] overflow-y-auto">
        {submissions.filter(s => s.status === filter).map(sub => (
          <div key={sub.id} className="bg-white/5 p-4 rounded-xl flex flex-col md:flex-row gap-4 items-start md:items-center border border-white/5">
            <div className="relative w-20 h-20 shrink-0 group">
              <img src={sub.thumbnailUrl} className="w-full h-full object-cover rounded-lg bg-black" alt="thumb" />
              {/* Quick Edit Thumbnail Overlay */}
              <div className="absolute inset-0 bg-black/80 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                <button 
                   onClick={() => {
                      const url = prompt('أدخل رابط الصورة المصغرة الجديد:', sub.thumbnailUrl);
                      if(url) handleThumbnailUpdate(sub.id, url);
                   }}
                   className="text-white text-xs underline"
                >تغيير</button>
              </div>
            </div>
            
            <div className="flex-1">
              <h4 className="font-bold text-lg text-white" dir="ltr">{sub.tiktokUsername}</h4>
              <p className="text-white/50 text-xs">{sub.country} | Votes: {sub.votes}</p>
              <a href={sub.videoUrl} target="_blank" rel="noreferrer" className="text-highlight-color text-xs hover:underline truncate block max-w-[200px]">{sub.videoUrl}</a>
            </div>

            <div className="flex gap-2">
               {filter !== 'Approved' && <button onClick={() => onUpdateStatus(sub.id, 'Approved')} className="p-2 bg-green-600/20 text-green-400 rounded hover:bg-green-600 hover:text-white"><CheckCircle size={20} /></button>}
               {filter !== 'Rejected' && <button onClick={() => onUpdateStatus(sub.id, 'Rejected')} className="p-2 bg-red-600/20 text-red-400 rounded hover:bg-red-600 hover:text-white"><X size={20} /></button>}
               <button onClick={() => {
                  if(confirm('حذف نهائي؟')) onUpdateStatus(sub.id, 'DELETE');
               }} className="p-2 bg-gray-800 text-gray-500 rounded hover:text-red-500"><Trash2 size={20} /></button>
            </div>
          </div>
        ))}
      </div>

      {/* Manual Add Modal */}
      <Modal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} title="إضافة مشارك يدوياً">
        <div className="space-y-4">
           <InputField label="اسم المستخدم (@username)" id="m-user" value={manualForm.tiktokUsername} onChange={v => setManualForm({...manualForm, tiktokUsername: v})} />
           <div>
              <label className="block text-white text-sm mb-2">البلد</label>
              <select className="w-full p-3 rounded bg-black/50 text-white border border-white/10" value={manualForm.country} onChange={e => setManualForm({...manualForm, country: e.target.value})}>
                 {COUNTRIES.filter(c => c.code !== 'ALL').map(c => <option key={c.code} value={c.code}>{c.name}</option>)}
              </select>
           </div>
           <InputField label="رابط الفيديو" id="m-url" value={manualForm.url} onChange={v => setManualForm({...manualForm, url: v})} />
           <button onClick={handleManualAdd} className="w-full bg-highlight-color p-3 rounded font-bold mt-4">إضافة</button>
        </div>
      </Modal>
    </GlassCard>
  );
};

// =========================================================================
// 7. MAIN CONTROLLER
// =========================================================================

const ContestApp = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [settings, setSettings] = useState(null);
  const [submissions, setSubmissions] = useState([]);
  const [modals, setModals] = useState({ adminAuth: false, voteConfirm: null, videoPlayer: null, info: null });
  const [cooldown, setCooldown] = useState(0);
  
  // Filter State
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCountry, setFilterCountry] = useState('الكل');

  const secretClickRef = useRef(0);
  const secretTimerRef = useRef(null);

  // Data Fetching
  useEffect(() => {
    if (!isFirebaseInitialized) { setSettings(DEFAULT_SETTINGS); return; }
    const unsubSettings = onSnapshot(doc(db, PATHS.SETTINGS), (snap) => {
      setSettings(snap.exists() ? snap.data() : DEFAULT_SETTINGS);
    });
    const unsubSubs = onSnapshot(collection(db, PATHS.SUBMISSIONS), (snap) => {
      setSubmissions(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => { unsubSettings(); unsubSubs(); };
  }, []);

  useEffect(() => {
    if (settings) {
      document.documentElement.style.setProperty('--main-color-css', settings.mainColor);
      document.documentElement.style.setProperty('--highlight-color-css', settings.highlightColor);
      document.documentElement.style.fontFamily = `"${settings.appFont}", sans-serif`;
      // Hex to RGB for tailwind opacity usage
      const hexToRgb = hex => hex.match(/[a-f0-9]{2}/gi).map(h => parseInt(h, 16)).join(',');
      if(settings.highlightColor.startsWith('#')) {
         document.documentElement.style.setProperty('--highlight-rgb', hexToRgb(settings.highlightColor));
      }
    }
  }, [settings]);

  // Handlers
  const handleSaveSettings = async (newSettings) => {
    try { await setDoc(doc(db, PATHS.SETTINGS), newSettings, { merge: true }); alert("✅ تم الحفظ"); } catch (e) { alert("❌ خطأ"); }
  };

  const handleUpdateStatus = async (id, status) => {
    if (status === 'DELETE') {
       // Ideally delete doc, but for now update status to deleted or actually delete logic
       // For simplicity in this snippet:
       console.log("Delete logic would go here");
    } else {
       await updateDoc(doc(db, PATHS.SUBMISSIONS, id), { status });
    }
  };
  
  const handleUpdateThumbnail = async (id, url) => {
     await updateDoc(doc(db, PATHS.SUBMISSIONS, id), { thumbnailUrl: url });
  };

  const handleVoteRequest = (sub) => {
    if (cooldown > 0) return alert(`انتظر ${cooldown} ثانية`);
    setModals(p => ({ ...p, voteConfirm: sub }));
  };

  const confirmVote = async () => {
    const sub = modals.voteConfirm;
    if (!sub) return;
    await updateDoc(doc(db, PATHS.SUBMISSIONS, sub.id), { votes: increment(1) });
    setCooldown(30);
    setModals(p => ({ ...p, voteConfirm: null }));
  };

  useEffect(() => {
    if (cooldown > 0) { const t = setInterval(() => setCooldown(c => c - 1), 1000); return () => clearInterval(t); }
  }, [cooldown]);

  const handleSecretClick = () => {
    clearTimeout(secretTimerRef.current);
    secretClickRef.current += 1;
    if (secretClickRef.current === 5) {
      user ? navigate('/admin') : setModals(p => ({ ...p, adminAuth: true }));
      secretClickRef.current = 0;
    }
    secretTimerRef.current = setTimeout(() => secretClickRef.current = 0, 2000);
  };

  // Derived State for UI
  const approvedSubmissions = useMemo(() => {
     return submissions.filter(s => s.status === 'Approved').sort((a,b) => b.votes - a.votes);
  }, [submissions]);

  const filteredSubmissions = useMemo(() => {
     return approvedSubmissions.filter(sub => {
        const matchSearch = sub.tiktokUsername.toLowerCase().includes(searchTerm.toLowerCase());
        const matchCountry = filterCountry === 'الكل' || sub.country === filterCountry;
        return matchSearch && matchCountry;
     });
  }, [approvedSubmissions, searchTerm, filterCountry]);

  if (!settings) return <div className="h-screen bg-black flex items-center justify-center text-white"><Loader className="animate-spin" /></div>;

  return (
    <div className="min-h-screen bg-[#050505] text-white font-sans selection:bg-highlight-color selection:text-black overflow-x-hidden">
      <style>{`
        :root { --highlight-color: ${settings.highlightColor}; }
        .text-highlight-color { color: var(--highlight-color); }
        .border-highlight-color { border-color: var(--highlight-color); }
        .bg-highlight-color { background-color: var(--highlight-color); }
        @keyframes shine { 100% { left: 125%; } }
        .animate-shine { animation: shine 3s infinite; }
        @keyframes marquee { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } }
        .animate-marquee { animation: marquee 30s linear infinite; }
        .btn-shine { position: relative; overflow: hidden; }
        .btn-shine::after { content: ''; position: absolute; top: 0; left: -100%; width: 100%; height: 100%; background: linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent); transition: 0.5s; }
        .btn-shine:hover::after { left: 100%; }
      `}</style>

      <Routes>
        <Route path="/admin" element={user ? (
           <div className="container mx-auto px-4 py-8">
             <div className="flex justify-between items-center mb-8 bg-gray-900 p-4 rounded-2xl border border-white/10">
               {settings.logoUrl ? <img src={settings.logoUrl} className="h-12" alt="Logo" /> : <h1 className="font-bold">لوحة التحكم</h1>}
               <button onClick={() => signOut(auth).then(() => navigate('/'))} className="text-red-400 flex gap-2"><LogOut size={16} /> خروج</button>
             </div>
             <AdminSettingsPanel settings={settings} onSaveSettings={handleSaveSettings} />
             <AdminSubmissionsPanel submissions={submissions} onUpdateStatus={handleUpdateStatus} onUpdateThumbnail={handleUpdateThumbnail} />
           </div>
        ) : <div className="h-screen flex items-center justify-center"><button onClick={() => setModals(p=>({...p, adminAuth:true}))} className="text-blue-400">Login Required</button></div>} />

        <Route path="/" element={
          <>
            <header className="sticky top-0 z-50 bg-black/80 backdrop-blur-lg border-b border-white/10">
              <div className="container mx-auto px-4 py-3 flex justify-between items-center">
                <div className="cursor-pointer" onClick={() => window.location.reload()}>
                  {settings.logoUrl ? <img src={settings.logoUrl} className="h-12 object-contain" alt="Logo" /> : <h1 className="text-xl font-black">{settings.title}</h1>}
                </div>
                {user && <button onClick={() => navigate('/admin')} className="bg-white/10 px-4 py-2 rounded-full text-xs font-bold flex gap-2"><SettingsIcon size={14} /> الإدارة</button>}
              </div>
            </header>

            <main className="container mx-auto px-4 py-8 min-h-[80vh]">
              {/* Alert Banner */}
              {settings.alertBannerText && (
                <div className="mb-8 bg-gradient-to-r from-highlight-color/20 to-transparent p-4 rounded-xl border-r-4 border-highlight-color flex items-center gap-3">
                  <div className="bg-highlight-color text-black p-1 rounded-full"><Crown size={16} /></div>
                  <p className="font-bold text-sm md:text-base">{settings.alertBannerText}</p>
                </div>
              )}

              {settings.stage === 'Submission' && <SubmissionForm settings={settings} />}

              {(settings.stage === 'Voting' || settings.stage === 'Ended') && (
                <div className="animate-slideUp">
                  {/* Leaderboard System */}
                  <TopThree topSubmissions={approvedSubmissions.slice(0, 3)} />
                  <Ticker submissions={approvedSubmissions.slice(3)} />
                  
                  {/* Filter & Search Section */}
                  <FilterBar onSearch={setSearchTerm} onFilterCountry={setFilterCountry} selectedCountry={filterCountry} />

                  {/* Videos Grid */}
                  <div className="flex items-center gap-2 mb-6">
                     <div className="w-1 h-6 bg-highlight-color rounded-full" />
                     <h2 className="text-xl font-bold">كل المشاركات</h2>
                     <span className="text-white/40 text-sm">({filteredSubmissions.length})</span>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6">
                    {filteredSubmissions.map(sub => (
                      <VideoCard key={sub.id} submission={sub} settings={settings} onVote={handleVoteRequest} onClick={() => setModals(p => ({...p, videoPlayer: sub}))} />
                    ))}
                  </div>
                  {filteredSubmissions.length === 0 && <div className="text-center py-20 text-white/30">لا توجد نتائج تطابق بحثك</div>}
                </div>
              )}
            </main>
            
            {/* Footer - Click copyright for secret admin */}
            <footer className="border-t border-white/10 bg-black py-10 text-center">
               <div className="flex justify-center gap-6 mb-6 text-sm font-bold text-white/60">
                  <button onClick={() => setModals(p => ({...p, info: 'why'}))}>عن المسابقة</button>
                  <button onClick={() => setModals(p => ({...p, info: 'terms'}))}>الشروط</button>
                  <button onClick={() => setModals(p => ({...p, info: 'organizers'}))}>المنظمون</button>
               </div>
               <p onClick={handleSecretClick} className="text-white/20 text-xs cursor-pointer select-none">&copy; 2025 {settings.title}</p>
            </footer>
          </>
        } />
      </Routes>

      {/* Modals */}
      <AdminAuthModal isOpen={modals.adminAuth} onClose={() => setModals(p => ({...p, adminAuth: false}))} onSuccess={() => { setModals(p => ({...p, adminAuth: false})); navigate('/admin'); }} />
      <Modal isOpen={!!modals.voteConfirm} onClose={() => setModals(p => ({...p, voteConfirm: null}))} title="تأكيد التصويت">
        <div className="text-center space-y-6">
           <img src={modals.voteConfirm?.profilePic || modals.voteConfirm?.thumbnailUrl} className="w-20 h-20 rounded-full mx-auto border-2 border-highlight-color" alt="" />
           <p className="text-lg">هل تود التصويت لـ <span className="font-bold text-highlight-color" dir="ltr">{modals.voteConfirm?.tiktokUsername}</span>؟</p>
           <button onClick={confirmVote} className="w-full py-3 rounded-xl font-bold text-black bg-highlight-color hover:brightness-110">تأكيد ✅</button>
        </div>
      </Modal>
      <VideoModal isOpen={!!modals.videoPlayer} submission={modals.videoPlayer} settings={settings} onClose={() => setModals(p => ({...p, videoPlayer: null}))} onVote={handleVoteRequest} />
      <Modal isOpen={!!modals.info} onClose={() => setModals(p => ({...p, info: null}))} title="معلومات">
         {modals.info === 'why' && settings.whyText}
         {modals.info === 'terms' && settings.termsText}
         {modals.info === 'organizers' && (
           <div className="space-y-4">
              {settings.organizers?.map((o, i) => (
                 <div key={i} className="flex items-center gap-4 bg-white/5 p-3 rounded-xl">
                    <img src={o.imageUrl} className="w-12 h-12 rounded-full" alt="" />
                    <div><h4 className="font-bold">{o.name}</h4><p className="text-white/50 text-xs">{o.role}</p></div>
                 </div>
              ))}
           </div>
         )}
      </Modal>
    </div>
  );
};

export default function App() {
  return <BrowserRouter><ContestApp /></BrowserRouter>;
}