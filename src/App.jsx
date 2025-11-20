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
  CheckCircle,
  Clock,
  LogOut,
  Plus,
  Edit3,
  Trash2,
  Filter,
  Zap,
  PauseCircle,
  Trophy,
  Download,
  Upload,
  AlignRight,
  Info
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
  Submission: { label: 'استقبال المشاركات', color: 'cyan', icon: Clock, title: 'انضم للمنافسة الآن' },
  Voting: { label: 'التصويت مفتوح', color: 'pink', icon: Zap, title: 'المنافسة مشتعلة' },
  Paused: { label: 'متوقفة مؤقتاً', color: 'red', icon: PauseCircle, title: 'تنبيه هام' },
  Ended: { label: 'إعلان النتائج', color: 'green', icon: Trophy, title: 'ألف مبروك للفائزين' },
};

const COUNTRIES = [
  { name: 'الكل', code: 'ALL', flag: '🌍' },
  { name: 'العراق', code: 'IQ', flag: '🇮🇶' },
  { name: 'الأردن', code: 'JO', flag: '🇯🇴' },
  { name: 'الإمارات', code: 'AE', flag: '🇦🇪' },
  { name: 'البحرين', code: 'BH', flag: '🇧🇭' },
  { name: 'الجزائر', code: 'DZ', flag: '🇩🇿' },
  { name: 'السعودية', code: 'SA', flag: '🇸🇦' },
  { name: 'السودان', code: 'SD', flag: '🇸🇩' },
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
].filter((c, index, self) => 
  index === self.findIndex((t) => (t.code === c.code))
);

const DEFAULT_SETTINGS = {
  mainColor: '#ec4899',
  highlightColor: '#25f4ee',
  appFont: 'Cairo',
  title: 'Ali Jabbar Week',
  logoUrl: 'https://placehold.co/200x60/transparent/white?text=LOGO',
  logoSize: 100,
  stage: 'Voting',
  useGlassmorphism: true,
  stageTexts: {
    Submission: 'باب المشاركة مفتوح الآن! أرسل إبداعك',
    Voting: 'صوت لمشتركك المفضل الآن 🔥',
    Paused: 'سنعود قريباً...',
    Ended: 'شكراً لكل من شارك وصوت في المسابقة'
  },
  marqueeSize: 16,
  termsText: 'الشروط والأحكام:\n- الالتزام بالآداب العامة.',
  whyText: 'لتعزيز المحتوى العربي الإبداعي.',
  startTime: '',
  endTime: '',
  organizers: [],
};

// =========================================================================
// 3. UI COMPONENTS
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
        <div className="p-6 text-white space-y-4">
          {children}
        </div>
      </GlassCard>
    </div>
  );
};

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
      className="w-full p-3 rounded-lg bg-gray-800/80 border border-white/10 text-white placeholder-gray-500 focus:ring-2 focus:ring-[var(--highlight-color)] focus:border-transparent transition duration-200 outline-none"
    />
  </div>
);

// =========================================================================
// *** REDESIGNED: Alert Banner (Sleek Bar Style) ***
// =========================================================================
const AlertBanner = ({ settings }) => {
  const stage = settings.stage || 'Voting';
  const stageInfo = STAGES[stage];
  const subText = settings.stageTexts?.[stage] || 'أهلاً بكم';

  const config = useMemo(() => {
    switch (stage) {
      case 'Submission': 
        return { bg: 'bg-gradient-to-r from-cyan-600 to-cyan-400', iconColor: 'text-white' };
      case 'Voting':
        return { bg: 'bg-gradient-to-r from-[#ff0050] to-[#ff4070]', iconColor: 'text-white' };
      case 'Ended':
        return { bg: 'bg-gradient-to-r from-emerald-600 to-emerald-400', iconColor: 'text-white' };
      default:
        return { bg: 'bg-gradient-to-r from-red-700 to-red-500', iconColor: 'text-white' };
    }
  }, [stage]);

  return (
    <div className="w-full mb-8 animate-fadeIn">
       <div className={`relative w-full rounded-xl overflow-hidden shadow-lg ${config.bg} border border-white/10`}>
          <div className="flex items-stretch min-h-[60px]">
             
             {/* Right: Status Label (Icon + Title) */}
             <div className="flex items-center gap-2 px-4 md:px-6 bg-black/20 backdrop-blur-sm z-20 shrink-0">
                <stageInfo.icon className={`w-5 h-5 md:w-6 md:h-6 ${config.iconColor} animate-pulse`} />
                <h2 className="font-black text-white text-sm md:text-lg tracking-wide whitespace-nowrap">
                  {stageInfo.title}
                </h2>
             </div>

             {/* Middle: Scrolling Text */}
             <div className="flex-1 relative flex items-center overflow-hidden bg-black/10">
                <div className="animate-marquee whitespace-nowrap absolute left-0 top-0 bottom-0 flex items-center">
                   <span className="text-white font-bold text-sm md:text-base px-4 inline-block" style={{ textShadow: '0 2px 4px rgba(0,0,0,0.3)' }}>
                      {subText}
                   </span>
                   {/* Repeated for seamless loop */}
                   <span className="text-white font-bold text-sm md:text-base px-4 inline-block" style={{ textShadow: '0 2px 4px rgba(0,0,0,0.3)' }}>
                      {subText}
                   </span>
                   <span className="text-white font-bold text-sm md:text-base px-4 inline-block" style={{ textShadow: '0 2px 4px rgba(0,0,0,0.3)' }}>
                      {subText}
                   </span>
                </div>
             </div>

             {/* Left: Decorative Tag */}
             <div className="hidden md:flex items-center justify-center px-4 bg-black/20 z-20 font-mono text-white/50 text-xs">
                AJW
             </div>
          </div>
       </div>
       <style>{`
         @keyframes marquee {
           0% { transform: translateX(0%); }
           100% { transform: translateX(-100%); }
         }
         .animate-marquee {
           animation: marquee 20s linear infinite;
           min-width: 100%;
         }
       `}</style>
    </div>
  );
};

// =========================================================================
// *** REDESIGNED: Live Header (Inside Podium) ***
// =========================================================================
const LiveResultsBadge = () => (
    <div className="flex items-center gap-2">
        <span className="relative flex h-3 w-3">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ backgroundColor: '#fe2c55' }}></span>
          <span className="relative inline-flex rounded-full h-3 w-3" style={{ backgroundColor: '#fe2c55' }}></span>
        </span>
        <h3 className="font-bold text-lg text-white tracking-wide">
          النتائج المباشرة
        </h3>
    </div>
);

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
// 4. PUBLIC COMPONENTS
// =========================================================================

const SubmissionForm = ({ settings }) => {
  const [form, setForm] = useState({ displayName: '', tiktokUser: '', country: 'العراق', url: '' });
  const [status, setStatus] = useState('idle');

  const handleUserChange = (val) => {
    if (val && !val.startsWith('@')) val = '@' + val;
    setForm({ ...form, tiktokUser: val });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.displayName || !form.tiktokUser || !form.url || !form.tiktokUser.startsWith('@')) {
      return alert('يرجى تعبئة جميع الحقول بشكل صحيح.');
    }
    setStatus('submitting');
    try {
      const countryData = COUNTRIES.find(c => c.name === form.country);
      const defaultProfilePic = `https://ui-avatars.com/api/?name=${form.displayName}&background=random&color=fff&size=128`;
      const defaultThumb = `https://placehold.co/600x900/333/fff?text=Video`;

      await addDoc(collection(db, PATHS.SUBMISSIONS), {
        participantName: form.displayName,
        tiktokUser: form.tiktokUser,
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
      setForm({ displayName: '', tiktokUser: '', country: 'العراق', url: '' });
    } catch (err) {
      console.error(err);
      setStatus('error');
    }
  };

  return (
    <GlassCard className="max-w-xl mx-auto p-8 mt-10" isGlassmorphism={settings.useGlassmorphism}>
      <div className="text-center mb-8">
        <div className="inline-block p-4 rounded-full bg-cyan-500/10 mb-4 border border-cyan-500/30">
          <Clock className="w-10 h-10 text-cyan-400" />
        </div>
        <h2 className="text-3xl font-bold text-white mb-2">شارك إبداعك</h2>
        <p className="text-white/60">املأ الاستمارة بدقة للمشاركة في المنافسة</p>
      </div>

      {status === 'success' && (
        <div className="bg-green-500/20 border border-green-500 text-green-200 p-4 rounded-lg mb-6 text-center flex items-center justify-center gap-2">
          <CheckCircle className="w-5 h-5" /> تم الإرسال بنجاح!
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <InputField label="اسم الحساب الظاهر" id="dname" value={form.displayName} onChange={v => setForm({...form, displayName: v})} placeholder="مثال: أحمد المصمم"/>
        <InputField label="اسم المستخدم (مع @)" id="tiktok" value={form.tiktokUser} onChange={handleUserChange} placeholder="@username"/>
        <div className="mb-4">
          <label className="block text-white mb-2 text-sm opacity-90">البلد</label>
          <select 
            value={form.country} 
            onChange={e => setForm({...form, country: e.target.value})}
            className="w-full p-3 rounded-lg bg-gray-800/80 border border-white/10 text-white outline-none focus:ring-2 focus:ring-[var(--highlight-color)] appearance-none cursor-pointer"
          >
            {COUNTRIES.filter(c => c.code !== 'ALL').map(c => <option key={c.code} value={c.name} className="bg-gray-900">{c.flag} {c.name}</option>)}
          </select>
        </div>
        <InputField label="رابط الفيديو" id="sub-url" value={form.url} onChange={v => setForm({...form, url: v})} placeholder="https://www.tiktok.com/..." />
        <ShinyButton type="submit" disabled={status === 'submitting'} className="w-full" style={{ backgroundColor: settings.mainColor }}>
          {status === 'submitting' ? <Loader className="animate-spin w-5 h-5 inline" /> : 'إرسال المشاركة'}
        </ShinyButton>
      </form>
    </GlassCard>
  );
};

// --- COMPONENTS FOR ENDED STAGE (RESULTS) ---

const CelebrationHeader = () => (
  <div className="text-center mb-16 animate-fadeIn relative z-10">
    <style>{`
      @keyframes fireworks { 0% { transform: translate(var(--x), var(--initialY)); width: var(--initialSize); opacity: 1; } 50% { width: 0.5rem; opacity: 1; } 100% { width: var(--finalSize); opacity: 0; } }
      .firework, .firework::before, .firework::after {
        position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 0.5vmin; aspect-ratio: 1; background: radial-gradient(circle, #ff0 0.2vmin, #0000 0) 50% 0% / 100% 50% no-repeat; animation: fireworks 2s infinite; pointer-events: none;
      }
    `}</style>
    <div className="firework" style={{left: '20%', top: '30%'}}></div>
    <div className="firework" style={{left: '80%', top: '30%', animationDelay: '0.5s'}}></div>
    <div className="firework" style={{left: '50%', top: '10%', animationDelay: '1s'}}></div>
    
    <p className="text-white/70 text-xl font-bold tracking-wide">شكراً لجميع المبدعين الذين شاركوا معنا</p>
  </div>
);

// =========================================================================
// *** REDESIGNED: VotingLeaderboard (Card Style Grid) ***
// =========================================================================
const VotingLeaderboard = ({ submissions }) => {
  const sorted = [...submissions].sort((a, b) => b.votes - a.votes);
  const top3 = sorted.slice(0, 3);
  const rest = sorted.slice(3);

  if (sorted.length === 0) return null;

  // Helper to render the specific style for each rank card
  const renderRankCard = (sub, rank) => {
    let config = {
      borderColor: 'border-white/10',
      glow: '',
      textColor: 'text-white',
      badgeColor: 'bg-gray-700'
    };

    if (rank === 1) { // #1
       config = { 
         borderColor: 'border-cyan-400', 
         glow: 'shadow-[0_0_30px_rgba(34,211,238,0.2)]', 
         textColor: 'text-cyan-400',
         badgeColor: 'bg-cyan-400 text-black'
       };
    } else if (rank === 2) { // #2
       config = { 
         borderColor: 'border-[#ff0050]', 
         glow: 'shadow-[0_0_30px_rgba(255,0,80,0.2)]', 
         textColor: 'text-[#ff0050]',
         badgeColor: 'bg-[#ff0050] text-white'
       };
    } else if (rank === 3) { // #3
       config = { 
         borderColor: 'border-red-900', 
         glow: 'shadow-[0_0_30px_rgba(127,29,29,0.2)]', 
         textColor: 'text-red-400',
         badgeColor: 'bg-red-900 text-white'
       };
    }

    return (
       <div key={sub.id} className={`relative bg-gray-900 rounded-2xl border-2 ${config.borderColor} ${config.glow} p-4 flex flex-col items-center justify-center transition-transform hover:scale-[1.02]`}>
           {/* Rank Badge */}
           <div className={`absolute top-0 right-0 ${config.badgeColor} font-black text-lg px-3 py-1 rounded-bl-2xl rounded-tr-xl`}>
              #{rank}
           </div>
           
           {/* Profile Image */}
           <div className={`w-20 h-20 rounded-xl overflow-hidden mb-3 border-2 ${config.borderColor}`}>
              <img src={sub.profilePicUrl} alt={sub.participantName} className="w-full h-full object-cover" />
           </div>

           {/* Votes */}
           <div className={`text-3xl font-black mb-1 ${config.textColor}`}>
              {sub.votes}
           </div>

           {/* Name */}
           <h3 className="font-bold text-white text-lg truncate w-full text-center">{sub.participantName}</h3>
           
           {/* Country */}
           <div className="flex items-center gap-1 text-white/50 text-xs mt-1">
              <span>{sub.flag}</span>
              <span>{sub.country}</span>
           </div>
       </div>
    );
  };

  return (
    <div className="mb-12 animate-slideUp w-full max-w-5xl mx-auto">
       {/* Header Section */}
       <div className="flex justify-between items-center mb-6 border-b border-white/10 pb-4">
           <div className="hidden md:block"></div> {/* Spacer */}
           <LiveResultsBadge />
       </div>
       
       {/* Grid Layout for Top 3 */}
       <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 mb-10">
          {/* Order visually: 2 - 1 - 3 (or 3 - 2 - 1) depending on preference. 
              Standard CSS Grid keeps them 1, 2, 3. Let's stick to logic 1, 2, 3 but style differently.
              Wait, user image shows #3, #2, #1 left to right or cards. 
              Let's just render top3 array directly, but style based on index.
          */}
          
          {/* Note: In the image, #1 is biggest. In a grid, we usually want #1 in center on desktop.
              To achieve center #1 on desktop:
              Mobile: 1, 2, 3 (Stack)
              Desktop: 2, 1, 3
          */}
          
          {/* Mobile View (Stacked) */}
          <div className="md:hidden space-y-4">
             {top3.map((sub, idx) => renderRankCard(sub, idx + 1))}
          </div>

          {/* Desktop View (2 - 1 - 3 Layout) */}
          <div className="hidden md:contents">
             {/* Position #2 */}
             {top3[1] && renderRankCard(top3[1], 2)}
             {/* Position #1 (Make it slightly taller?) */}
             {top3[0] && (
                 <div className="transform scale-110 z-10">
                    {renderRankCard(top3[0], 1)}
                 </div>
             )}
             {/* Position #3 */}
             {top3[2] && renderRankCard(top3[2], 3)}
          </div>
       </div>

      {rest.length > 0 && (
        <div className="relative bg-white/5 border-y border-white/10 py-3 overflow-hidden group rounded-xl">
          <div className="flex animate-scroll gap-8 w-max hover:pause" style={{ animation: `scroll ${Math.max(30, rest.length * 5)}s linear infinite` }}>
            {rest.map((sub, i) => (
              <div key={sub.id} className="flex items-center gap-3 px-4 border-l border-white/10 min-w-[200px]">
                <span className="text-white/30 font-mono text-sm">#{i + 4}</span>
                <img src={sub.profilePicUrl} className="w-8 h-8 rounded-full object-cover bg-gray-800" alt="" />
                <span className="text-white font-bold text-sm">{sub.participantName}</span>
                <span className="text-[var(--highlight-color)] font-bold">{sub.votes} صوت</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

const ResultsTable = ({ submissions }) => {
    return (
        <div className="max-w-4xl mx-auto bg-gray-900/50 border border-white/10 rounded-2xl overflow-hidden backdrop-blur-md p-4">
            <h3 className="text-white/70 font-bold mb-4 pr-2">باقي المبدعين</h3>
            <div className="space-y-2">
                {submissions.map((sub, idx) => (
                    <div key={sub.id} className="flex items-center bg-white/5 hover:bg-white/10 transition p-3 rounded-xl border border-white/5">
                        <div className="w-8 text-center font-mono text-white/40 font-bold">#{idx + 4}</div>
                        <img src={sub.profilePicUrl} className="w-10 h-10 rounded-full object-cover mx-4 border border-white/10" alt="" />
                        <div className="flex-1">
                            <h4 className="font-bold text-white">{sub.participantName}</h4>
                            <p className="text-xs text-white/40">{sub.flag} {sub.country}</p>
                        </div>
                        <div className="text-white font-mono font-bold bg-black/30 px-3 py-1 rounded-lg">
                            {sub.votes}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

const SearchFilterBar = ({ onSearch, onFilter }) => {
  return (
    <div className="flex flex-col md:flex-row gap-4 mb-8 bg-black/40 p-4 rounded-2xl border border-white/10 backdrop-blur-md">
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
          {COUNTRIES.map(c => <option key={c.code} value={c.name} className="bg-gray-900">{c.flag} {c.name}</option>)}
        </select>
      </div>
    </div>
  );
};

// =========================================================================
// *** VIDEO CARD & MODAL ***
// =========================================================================
const VideoCard = ({ submission, settings, onVote, onClick, cooldown }) => (
  <div 
    onClick={onClick}
    className="group relative aspect-[9/16] rounded-2xl overflow-hidden cursor-pointer transform transition-all duration-500 hover:-translate-y-2 hover:shadow-2xl hover:shadow-[var(--highlight-color)]/20 border border-white/10 bg-gray-800"
  >
    <img 
      src={submission.thumbnailUrl} 
      alt={submission.participantName} 
      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110 opacity-80 group-hover:opacity-100"
      onError={(e) => e.target.src = 'https://placehold.co/600x900/111/fff?text=No+Image'}
    />
    
    <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent flex flex-col justify-end p-4">
      <div className="flex items-center gap-2 mb-3">
        <img src={submission.profilePicUrl} className="w-8 h-8 rounded-full border border-white/50 bg-black" alt="" />
        <div className="overflow-hidden">
          <h3 className="font-bold text-white text-sm truncate shadow-sm">{submission.participantName}</h3>
          <p className="text-[var(--highlight-color)] text-[10px] truncate opacity-90">{submission.tiktokUser}</p>
        </div>
      </div>
      
      {settings.stage !== 'Ended' && (
          <button 
            onClick={(e) => { e.stopPropagation(); if(cooldown === 0) onVote(submission); }}
            disabled={cooldown > 0}
            className={`w-full py-2 rounded-lg font-bold text-xs transition flex items-center justify-center gap-2 shadow-lg active:scale-95 
              ${cooldown > 0 
                ? 'bg-gray-600 text-gray-300 cursor-not-allowed opacity-80' 
                : 'bg-white text-black hover:bg-gray-200'}`}
          >
            {cooldown > 0 ? (
              <span>{cooldown}s</span>
            ) : (
              <><Crown className="w-3 h-3 text-yellow-600" /> تصويت ({submission.votes})</>
            )}
          </button>
      )}
      {settings.stage === 'Ended' && (
          <div className="w-full py-2 rounded-lg font-bold text-xs bg-white/10 text-white text-center border border-white/10">
             {submission.votes} صوت
          </div>
      )}
    </div>
  </div>
);

const VideoModal = ({ isOpen, onClose, submission, settings, onVote, cooldown }) => {
  if (!isOpen || !submission) return null;
  const videoId = submission.videoUrl.split('/').pop().split('?')[0];
  const embedUrl = `https://www.tiktok.com/embed/v2/${videoId}`;

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/95 backdrop-blur-md animate-fadeIn" onClick={onClose}>
      <div 
        className="relative w-full h-full md:h-[90vh] md:max-w-6xl md:rounded-2xl overflow-hidden flex flex-col md:flex-row bg-black md:border md:border-white/10 shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        <button 
            onClick={onClose} 
            className="absolute top-4 left-4 z-[200] bg-black/50 p-2 rounded-full text-white hover:bg-red-600 transition border border-white/10"
        >
            <X size={24} />
        </button>

        <div className="w-full md:flex-1 h-full bg-black relative flex items-center justify-center">
           <iframe 
             src={embedUrl} 
             className="w-full h-full md:w-[400px] md:max-w-full" 
             title="Video" 
             allowFullScreen
             style={{ border: 'none' }}
           ></iframe>
        </div>

        <div className="hidden md:flex w-full md:w-80 bg-gray-900 border-l border-white/10 flex-col relative p-6">
           <div className="flex flex-col items-center mb-6 mt-4">
             <img src={submission.profilePicUrl} className="w-16 h-16 rounded-full border-2 border-[var(--highlight-color)] mb-3 object-cover bg-black" alt="" />
             <h2 className="text-lg font-bold text-white text-center">{submission.participantName}</h2>
             <p className="text-[var(--highlight-color)] text-sm">{submission.tiktokUser}</p>
             <p className="text-white/50 text-xs mt-1">{submission.flag} {submission.country}</p>
           </div>

           <div className="bg-white/5 p-4 rounded-xl text-center mb-auto border border-white/5">
             <p className="text-white/50 text-xs uppercase tracking-widest mb-1">عدد الأصوات</p>
             <p className="text-4xl font-black text-[var(--highlight-color)]">{submission.votes}</p>
           </div>

           {settings.stage !== 'Ended' && (
               <ShinyButton 
                 onClick={() => { if(cooldown === 0) onVote(submission); }}
                 disabled={cooldown > 0}
                 className={`w-full py-3 text-md mt-4 ${cooldown > 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
                 style={{ backgroundColor: cooldown > 0 ? '#4b5563' : settings.mainColor }}
               >
                 {cooldown > 0 ? `انتظر ${cooldown}ث` : 'تصويت للمشارك'}
               </ShinyButton>
           )}
        </div>

        <div className="md:hidden absolute bottom-8 left-0 right-0 px-6 z-50 flex items-center justify-between gap-4">
            <div className="bg-black/60 backdrop-blur-md rounded-full px-4 py-2 border border-white/10 flex items-center gap-2">
                 <span className="text-white font-bold text-sm">{submission.votes} صوت</span>
            </div>
            {settings.stage !== 'Ended' && (
                <button 
                    onClick={() => { if(cooldown === 0) onVote(submission); }}
                    disabled={cooldown > 0}
                    className="flex-1 bg-[var(--highlight-color)] text-black font-bold py-3 rounded-full shadow-lg active:scale-95 transition"
                >
                     {cooldown > 0 ? `انتظر ${cooldown}ث` : '🔥 تصويت الآن'}
                </button>
            )}
        </div>

      </div>
    </div>
  );
};

// =========================================================================
// 5. ADMIN PANEL
// =========================================================================

const AdminSettingsPanel = ({ settings, onSaveSettings }) => {
  const [localSettings, setLocalSettings] = useState(settings);
  const [isSaving, setIsSaving] = useState(false);
  const [turkeyTime, setTurkeyTime] = useState('');

  useEffect(() => {
    const timer = setInterval(() => {
      setTurkeyTime(new Date().toLocaleTimeString('ar-SA', { timeZone: 'Europe/Istanbul' }));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleOrgChange = (index, field, value) => {
    const newOrgs = [...(localSettings.organizers || [])];
    if(!newOrgs[index]) return;
    newOrgs[index][field] = value;
    setLocalSettings({ ...localSettings, organizers: newOrgs });
  };
  const addOrg = () => setLocalSettings({ ...localSettings, organizers: [...(localSettings.organizers || []), { name: '', role: '', imageUrl: '' }] });
  const removeOrg = (index) => {
    const newOrgs = localSettings.organizers.filter((_, i) => i !== index);
    setLocalSettings({ ...localSettings, organizers: newOrgs });
  };

  const handleStageTextChange = (stage, text) => {
    setLocalSettings({
      ...localSettings,
      stageTexts: { ...localSettings.stageTexts, [stage]: text }
    });
  };

  return (
    <GlassCard className="p-6 mb-8 animate-slideUp" isGlassmorphism>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <SettingsIcon className="text-[var(--highlight-color)]" /> إعدادات النظام
        </h2>
        <div className="bg-white/10 px-4 py-2 rounded-lg flex items-center gap-2 text-sm">
            <Clock size={16} className="text-[var(--highlight-color)]"/>
            <span>توقيت تركيا: {turkeyTime}</span>
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-4">
          <h3 className="text-lg font-bold text-white border-b border-white/10 pb-2">الهوية البصرية</h3>
          <InputField label="رابط الشعار (Logo)" id="logo" value={localSettings.logoUrl} onChange={(v) => setLocalSettings({...localSettings, logoUrl: v})} />
          
          <div className="mb-4">
             <label className="block text-white mb-2 text-sm opacity-90">حجم الشعار (بكسل)</label>
             <input type="range" min="30" max="300" value={localSettings.logoSize || 100} onChange={(e) => setLocalSettings({...localSettings, logoSize: e.target.value})} className="w-full"/>
             <div className="text-right text-xs text-white/50">{localSettings.logoSize || 100}px</div>
          </div>

          <div className="flex gap-4">
             <div className="flex-1">
                <label className="block text-white mb-2 text-sm">اللون الرئيسي</label>
                <div className="flex items-center gap-2 bg-gray-800 p-2 rounded border border-white/10">
                   <input type="color" value={localSettings.mainColor} onChange={e => setLocalSettings({...localSettings, mainColor: e.target.value})} className="w-8 h-8 bg-transparent border-0 cursor-pointer"/>
                   <span className="text-white text-xs">{localSettings.mainColor}</span>
                </div>
             </div>
             <div className="flex-1">
                <label className="block text-white mb-2 text-sm">لون التوهج</label>
                <div className="flex items-center gap-2 bg-gray-800 p-2 rounded border border-white/10">
                   <input type="color" value={localSettings.highlightColor} onChange={e => setLocalSettings({...localSettings, highlightColor: e.target.value})} className="w-8 h-8 bg-transparent border-0 cursor-pointer"/>
                   <span className="text-white text-xs">{localSettings.highlightColor}</span>
                </div>
             </div>
          </div>
          
          {/* --- ADDED: Content Fields --- */}
          <h3 className="text-lg font-bold text-white border-b border-white/10 pb-2 mt-6">المحتوى والنصوص</h3>
          <div className="space-y-4">
             <div>
                <label className="block text-white mb-2 text-sm opacity-90">عن المسابقة (Why Text)</label>
                <textarea 
                   value={localSettings.whyText || ''} 
                   onChange={(e) => setLocalSettings({...localSettings, whyText: e.target.value})}
                   className="w-full p-3 rounded-lg bg-gray-800/80 border border-white/10 text-white text-sm outline-none focus:border-[var(--highlight-color)] h-24"
                   placeholder="اكتب نبذة عن المسابقة..."
                />
             </div>
             <div>
                <label className="block text-white mb-2 text-sm opacity-90">الشروط والأحكام (Terms)</label>
                <textarea 
                   value={localSettings.termsText || ''} 
                   onChange={(e) => setLocalSettings({...localSettings, termsText: e.target.value})}
                   className="w-full p-3 rounded-lg bg-gray-800/80 border border-white/10 text-white text-sm outline-none focus:border-[var(--highlight-color)] h-24"
                   placeholder="اكتب الشروط والأحكام..."
                />
             </div>
          </div>

          <h3 className="text-lg font-bold text-white border-b border-white/10 pb-2 mt-6">التوقيت والمواعيد</h3>
          <div className="flex gap-4">
              <InputField label="وقت البدء" type="datetime-local" id="start" value={localSettings.startTime} onChange={(v) => setLocalSettings({...localSettings, startTime: v})} />
              <InputField label="وقت الانتهاء" type="datetime-local" id="end" value={localSettings.endTime} onChange={(v) => setLocalSettings({...localSettings, endTime: v})} />
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-lg font-bold text-white border-b border-white/10 pb-2">حالة المسابقة ونصوص التنبيه</h3>
          <div className="grid grid-cols-2 gap-2 mb-4">
             {Object.keys(STAGES).map(key => (
               <button 
                 key={key} 
                 onClick={() => setLocalSettings({...localSettings, stage: key})}
                 className={`p-2 rounded-lg text-sm font-bold border transition ${localSettings.stage === key ? 'bg-[var(--highlight-color)] text-black border-[var(--highlight-color)]' : 'bg-white/5 border-white/10 text-white/60 hover:bg-white/10'}`}
               >
                 {STAGES[key].label}
               </button>
             ))}
          </div>
          
          <div className="space-y-2">
            <label className="text-sm text-white/70">نصوص شريط التنبيه لكل حالة:</label>
            {Object.keys(STAGES).map(key => (
              <div key={key} className="flex items-center gap-2">
                 <span className="text-xs w-20 text-white/50">{STAGES[key].label}</span>
                 <input 
                   type="text" 
                   value={localSettings.stageTexts?.[key] || ''} 
                   onChange={(e) => handleStageTextChange(key, e.target.value)}
                   className="flex-1 bg-gray-800 border border-white/10 rounded p-2 text-xs text-white"
                   placeholder={`نص حالة ${STAGES[key].label}`}
                 />
              </div>
            ))}
          </div>
          
          <div className="mb-4 mt-4">
             <label className="block text-white mb-2 text-sm opacity-90">حجم خط التنبيه</label>
             <input type="range" min="12" max="40" value={localSettings.marqueeSize || 18} onChange={(e) => setLocalSettings({...localSettings, marqueeSize: e.target.value})} className="w-full"/>
             <div className="text-right text-xs text-white/50">{localSettings.marqueeSize || 18}px</div>
          </div>

          <h3 className="text-lg font-bold text-white border-b border-white/10 pb-2 mt-6">المنظمون</h3>
          <div className="space-y-2 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
            {(localSettings.organizers || []).map((org, i) => (
              <div key={i} className="flex gap-2 bg-white/5 p-2 rounded-lg items-end border border-white/5">
                <div className="flex-1 space-y-2">
                  <input type="text" placeholder="الاسم" value={org.name} onChange={(e) => handleOrgChange(i, 'name', e.target.value)} className="w-full bg-gray-800 border border-white/10 rounded p-1 text-xs text-white" />
                  <input type="text" placeholder="الدور" value={org.role} onChange={(e) => handleOrgChange(i, 'role', e.target.value)} className="w-full bg-gray-800 border border-white/10 rounded p-1 text-xs text-white" />
                  <input type="text" placeholder="رابط الصورة" value={org.imageUrl} onChange={(e) => handleOrgChange(i, 'imageUrl', e.target.value)} className="w-full bg-gray-800 border border-white/10 rounded p-1 text-xs text-white/50" />
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
  const [newSub, setNewSub] = useState({ displayName: '', tiktokUser: '@', country: 'العراق', url: '' });
  
  const fileInputRef = useRef(null);

  const startEdit = (sub) => { setEditMode(sub.id); setEditData({ ...sub }); };
  const saveEdit = async () => { await updateDoc(doc(db, PATHS.SUBMISSIONS, editMode), editData); setEditMode(null); };
  const handleManualSubmit = async () => { await onManualAdd(newSub); setAddModal(false); setNewSub({ displayName: '', tiktokUser: '@', country: 'العراق', url: '' }); };

  const exportToCSV = () => {
    const headers = ['الاسم', 'اليوزر', 'البلد', 'عدد الأصوات', 'الحالة', 'رابط الفيديو'];
    const rows = submissions.map(sub => [
      `"${sub.participantName}"`, 
      sub.tiktokUser,
      sub.country,
      sub.votes,
      sub.status,
      sub.videoUrl
    ]);
    const csvContent = "\uFEFF" + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `submissions_backup_${new Date().toLocaleDateString()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (event) => {
      const text = event.target.result;
      const lines = text.split('\n');
      const dataLines = lines.slice(1);
      let count = 0;
      for (let line of dataLines) {
        if (!line.trim()) continue;
        const cols = line.split(',');
        if (cols.length >= 3) {
            const name = cols[0]?.replace(/"/g, '').trim() || 'Unknown';
            const user = cols[1]?.trim() || '@user';
            const country = cols[2]?.trim() || 'العراق';
            const votes = parseInt(cols[3]) || 0;
            const url = cols[5]?.trim() || '';
            await onManualAdd({
                displayName: name,
                tiktokUser: user,
                country: country,
                url: url,
                initialVotes: votes
            });
            count++;
        }
      }
      alert(`تم استيراد ${count} مشاركة بنجاح!`);
    };
    reader.readAsText(file);
    e.target.value = ''; 
  };

  const filtered = submissions.filter(s => s.status === filter);

  return (
    <GlassCard className="p-6" isGlassmorphism>
      <div className="flex flex-wrap justify-between items-center mb-6 gap-4">
        <h3 className="text-xl font-bold text-white">إدارة المشاركات</h3>
        
        <div className="flex gap-2">
            <button onClick={exportToCSV} className="bg-blue-600/80 px-4 py-2 rounded-lg text-white text-sm font-bold flex items-center gap-2 hover:bg-blue-500 transition">
                <Download size={16} /> تصدير (Excel)
            </button>
            <button onClick={() => fileInputRef.current.click()} className="bg-purple-600/80 px-4 py-2 rounded-lg text-white text-sm font-bold flex items-center gap-2 hover:bg-purple-500 transition">
                <Upload size={16} /> استيراد
            </button>
            <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept=".csv" className="hidden" />
            <button onClick={() => setAddModal(true)} className="bg-green-600 px-4 py-2 rounded-lg text-white text-sm font-bold flex items-center gap-2 hover:bg-green-500 transition">
                <Plus size={16} /> إضافة
            </button>
        </div>
      </div>
      
      <div className="flex gap-2 mb-4 border-b border-white/10 pb-4 overflow-x-auto">
        {['Pending', 'Approved', 'Rejected'].map(s => (
          <button key={s} onClick={() => setFilter(s)} className={`px-4 py-2 rounded-lg text-xs font-bold transition whitespace-nowrap ${filter === s ? 'bg-gray-700 text-white shadow' : 'bg-white/5 text-white/50 hover:bg-white/10'}`}>
             {s} ({submissions.filter(sub => sub.status === s).length})
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {filtered.length === 0 && <div className="text-center text-white/30 py-10 border-2 border-dashed border-white/5 rounded-xl">لا توجد مشاركات هنا</div>}
        {filtered.map(sub => (
          <div key={sub.id} className="bg-white/5 p-4 rounded-xl border border-white/5 flex flex-col md:flex-row gap-4 items-start md:items-center hover:border-white/10 transition">
            {editMode === sub.id ? (
              <div className="flex-1 grid grid-cols-2 gap-2 w-full">
                 <input value={editData.participantName} onChange={e => setEditData({...editData, participantName: e.target.value})} placeholder="الاسم الظاهر" className="bg-gray-800 border border-white/20 rounded p-2 text-white text-sm" />
                 <input value={editData.tiktokUser} onChange={e => setEditData({...editData, tiktokUser: e.target.value})} placeholder="@username" className="bg-gray-800 border border-white/20 rounded p-2 text-white text-sm" />
                 <input value={editData.videoUrl} onChange={e => setEditData({...editData, videoUrl: e.target.value})} placeholder="URL" className="col-span-2 bg-gray-800 border border-white/20 rounded p-2 text-white text-sm" />
                 <div className="col-span-2 flex gap-2 justify-end mt-2">
                   <button onClick={() => setEditMode(null)} className="px-3 py-1 text-xs bg-gray-700 rounded text-white">إلغاء</button>
                   <button onClick={saveEdit} className="px-3 py-1 text-xs bg-green-600 rounded text-white">حفظ</button>
                 </div>
              </div>
            ) : (
              <>
                <img src={sub.thumbnailUrl} className="w-16 h-16 object-cover rounded-lg bg-black border border-white/10" alt="Thumb" onError={e => e.target.src='https://placehold.co/100x150/333/fff?text=?'} />
                <div className="flex-1">
                  <h4 className="font-bold text-white text-lg">{sub.participantName}</h4>
                  <p className="text-xs text-[var(--highlight-color)]">{sub.tiktokUser}</p>
                  <p className="text-xs text-white/50 mt-1">{sub.country} | الأصوات: {sub.votes}</p>
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
        <InputField label="الاسم الظاهر" value={newSub.displayName} onChange={v => setNewSub({...newSub, displayName: v})} />
        <InputField label="اسم المستخدم @" value={newSub.tiktokUser} onChange={v => setNewSub({...newSub, tiktokUser: v})} />
        <InputField label="رابط الفيديو" value={newSub.url} onChange={v => setNewSub({...newSub, url: v})} />
        <div className="mb-4">
           <label className="text-white text-sm block mb-2">البلد</label>
           <select value={newSub.country} onChange={e => setNewSub({...newSub, country: e.target.value})} className="w-full p-3 bg-gray-800 border border-white/20 rounded text-white">
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
    const link = document.createElement('link');
    link.href = 'https://fonts.googleapis.com/css2?family=Cairo:wght@200;400;700;900&display=swap';
    link.rel = 'stylesheet';
    document.head.appendChild(link);

    const style = document.createElement('style');
    style.innerHTML = `
      body, button, input, select, textarea, h1, h2, h3, h4, h5, h6, p, span {
        font-family: 'Cairo', sans-serif !important;
      }
      @keyframes scroll {
        0% { transform: translateX(0); }
        100% { transform: translateX(-50%); }
      }
      .animate-scroll {
         display: flex;
         width: max-content;
      }
      .custom-scrollbar::-webkit-scrollbar { width: 6px; }
      .custom-scrollbar::-webkit-scrollbar-track { background: #111; }
      .custom-scrollbar::-webkit-scrollbar-thumb { background: #333; border-radius: 4px; }
    `;
    document.head.appendChild(style);

    return () => {
      document.head.removeChild(link);
      document.head.removeChild(style);
    };
  }, []);

  useEffect(() => {
    if (!isFirebaseInitialized) { setSettings(DEFAULT_SETTINGS); return; }
    const unsub1 = onSnapshot(doc(db, PATHS.SETTINGS), (s) => {
      if(s.exists()) setSettings(s.data());
      else setDoc(doc(db, PATHS.SETTINGS), DEFAULT_SETTINGS);
    });
    const unsub2 = onSnapshot(collection(db, PATHS.SUBMISSIONS), (s) => {
      setSubmissions(s.docs.map(d => ({id: d.id, ...d.data()})));
    });
    return () => { unsub1(); unsub2(); };
  }, []);

  useEffect(() => {
    if (settings) {
      const root = document.documentElement;
      root.style.setProperty('--highlight-color', settings.highlightColor);
      root.style.setProperty('--main-color', settings.mainColor);
    }
  }, [settings]);

  useEffect(() => {
    const lastVoteTime = localStorage.getItem('lastVoteTime_AliWeek');
    if (lastVoteTime) {
        const now = Date.now();
        const diffInSeconds = Math.floor((now - parseInt(lastVoteTime)) / 1000);
        if (diffInSeconds < 30) {
            setCooldown(30 - diffInSeconds);
        }
    }
  }, []);

  const processedSubmissions = useMemo(() => {
    let list = submissions.filter(s => s.status === 'Approved');
    if (searchQuery) list = list.filter(s => 
      s.tiktokUser.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.participantName && s.participantName.toLowerCase().includes(searchQuery.toLowerCase()))
    );
    if (countryFilter !== 'الكل') list = list.filter(s => s.country === countryFilter);
    return list.sort((a, b) => b.votes - a.votes);
  }, [submissions, searchQuery, countryFilter]);

  const handleSaveSettings = async (newS) => await setDoc(doc(db, PATHS.SETTINGS), newS, { merge: true });
  const handleStatus = async (id, st) => {
    if(st === 'Deleted') { /* delete */ } 
    else await updateDoc(doc(db, PATHS.SUBMISSIONS, id), { status: st });
  };
  const handleManualAdd = async (data) => {
     const countryData = COUNTRIES.find(c => c.name === data.country) || { flag: '🌍' };
     await addDoc(collection(db, PATHS.SUBMISSIONS), {
       participantName: data.displayName,
       tiktokUser: data.tiktokUser,
       country: data.country,
       flag: countryData.flag,
       videoUrl: data.url || '',
       profilePicUrl: `https://ui-avatars.com/api/?name=${data.displayName}&background=random`,
       thumbnailUrl: 'https://placehold.co/600x900/222/fff?text=Video',
       status: 'Approved',
       votes: data.initialVotes || 0,
       submittedAt: serverTimestamp()
     });
  };
  
  const confirmVote = async () => {
    if (modals.voteConfirm) {
      await updateDoc(doc(db, PATHS.SUBMISSIONS, modals.voteConfirm.id), { votes: increment(1) });
      setCooldown(30);
      localStorage.setItem('lastVoteTime_AliWeek', Date.now().toString());
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
       <Routes>
         <Route path="/admin" element={user ? (
            <div className="container mx-auto px-4 py-8 animate-fadeIn">
              <div className="flex justify-between items-center mb-8 bg-gray-900 p-4 rounded-2xl border border-white/10">
                 <div className="flex items-center gap-3">
                    <img src={settings.logoUrl} className="object-contain bg-black/20 rounded p-1" style={{ height: `${settings.logoSize || 100}px` }} alt="Logo"/>
                    <span className="font-bold text-xl hidden md:block">لوحة التحكم</span>
                 </div>
                 <div className="flex gap-3">
                    <button onClick={() => navigate('/')} className="px-4 py-2 bg-white/5 rounded-lg text-sm hover:bg-white/10">الموقع</button>
                    <button onClick={() => signOut(auth).then(() => navigate('/'))} className="text-red-400 hover:text-white flex gap-2 items-center bg-red-500/10 px-4 py-2 rounded-lg"><LogOut size={18}/> خروج</button>
                 </div>
              </div>
              <AdminSettingsPanel settings={settings} onSaveSettings={handleSaveSettings} />
              <AdminSubmissionsPanel submissions={submissions} onUpdateStatus={handleStatus} onManualAdd={handleManualAdd} />
            </div>
         ) : <div className="h-screen flex flex-col items-center justify-center gap-4"><SettingsIcon className="w-12 h-12 text-red-500"/><button onClick={() => setModals(p=>({...p, adminAuth: true}))} className="text-white underline">تسجيل الدخول</button></div>} />

         <Route path="/" element={
           <>
             <header className="sticky top-0 z-40 bg-black/80 backdrop-blur-lg border-b border-white/10">
                <div className="container mx-auto px-4 py-3 flex justify-between items-center">
                   <div className="flex items-center gap-3" onClick={() => window.location.reload()}>
                      <img src={settings.logoUrl} className="object-contain rounded-lg" style={{ height: `${settings.logoSize || 100}px` }} alt="Logo"/>
                   </div>
                </div>
             </header>

             <main className="container mx-auto px-4 py-8 min-h-[80vh]">
                <AlertBanner settings={settings} />

                {settings.stage === 'Submission' && <SubmissionForm settings={settings} />}
                
                {(settings.stage === 'Voting' || settings.stage === 'Ended') && (
                  <>
                    {/* Note: Live Header is now inside VotingLeaderboard for layout purposes, or we can keep simpler structure */}
                    
                    {settings.stage === 'Voting' ? (
                        <VotingLeaderboard submissions={submissions.filter(s => s.status === 'Approved')} />
                    ) : (
                        <div className="animate-slideUp">
                            <CelebrationHeader />
                            <WinnersPodium winners={processedSubmissions.slice(0, 3)} />
                            {processedSubmissions.length > 3 && (
                                <ResultsTable submissions={processedSubmissions.slice(3)} />
                            )}
                        </div>
                    )}
                    
                    {settings.stage === 'Voting' && (
                        <>
                            <div className="flex items-center gap-2 mb-6 mt-10 border-b border-white/10 pb-4">
                                <div className="h-8 w-1 bg-[var(--highlight-color)] rounded-full"></div>
                                <h2 className="text-2xl font-bold">تصفح المشاركات</h2>
                                <span className="bg-white/10 px-3 py-1 rounded-full text-xs text-white/60 mr-auto">
                                    {processedSubmissions.length} فيديو
                                </span>
                            </div>

                            <SearchFilterBar onSearch={setSearchQuery} onFilter={setCountryFilter} />

                            {processedSubmissions.length === 0 ? (
                                <div className="text-center py-20 border border-dashed border-white/10 rounded-xl bg-white/5">
                                    <p className="text-white/40">لا توجد مشاركات مطابقة للبحث</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6">
                                {processedSubmissions.map(sub => (
                                    <VideoCard 
                                    key={sub.id} 
                                    submission={sub} 
                                    settings={settings} 
                                    cooldown={cooldown} 
                                    onVote={(s) => { if(cooldown > 0) return; setModals(p=>({...p, voteConfirm: s})) }} 
                                    onClick={() => setModals(p=>({...p, videoPlayer: sub}))} 
                                    />
                                ))}
                                </div>
                            )}
                        </>
                    )}
                  </>
                )}

                {settings.stage === 'Paused' && (
                    <div className="text-center py-32">
                        <div className="inline-block p-6 bg-white/5 rounded-full mb-6"><Clock className="w-16 h-16 text-white/30" /></div>
                        <h1 className="text-4xl font-bold mb-4 text-white">المسابقة متوقفة حالياً</h1>
                        <p className="text-white/50 text-lg">نعود قريباً للصيانة أو فرز النتائج</p>
                    </div>
                )}
             </main>

             <footer className="bg-[#0a0a0a] border-t border-white/10 py-12 mt-20 text-center text-white/50 text-sm">
               <div className="flex justify-center gap-8 mb-6 font-bold">
                 {['why','terms','organizers'].map(type => (
                   <button key={type} onClick={() => setModals(p=>({...p, info: type}))} className="hover:text-[var(--highlight-color)] transition">
                     {type === 'why' ? 'عن المسابقة' : type === 'terms' ? 'الشروط والأحكام' : 'المنظمون'}
                   </button>
                 ))}
               </div>
               <p className="text-xs text-white/20">&copy; 2025 {settings.title}. All rights reserved.</p>
             </footer>
           </>
         } />
       </Routes>

       {/* MODALS */}
       <Modal isOpen={!!modals.voteConfirm} onClose={() => setModals(p=>({...p, voteConfirm: null}))} title="تأكيد التصويت">
          <div className="text-center py-4">
              <img src={modals.voteConfirm?.profilePicUrl} className="w-20 h-20 rounded-full mx-auto mb-4 border-2 border-[var(--highlight-color)] object-cover bg-black" alt=""/>
              <p className="text-lg mb-1">هل تود التصويت لـ <span className="font-bold text-white">{modals.voteConfirm?.participantName}</span>؟</p>
              <p className="text-sm text-[var(--highlight-color)] mb-6">{modals.voteConfirm?.tiktokUser}</p>
              <ShinyButton onClick={confirmVote} style={{backgroundColor: settings.mainColor}} className="w-full text-white">تأكيد التصويت</ShinyButton>
          </div>
       </Modal>

       <VideoModal 
         isOpen={!!modals.videoPlayer} 
         submission={modals.videoPlayer} 
         onClose={() => setModals(p=>({...p, videoPlayer: null}))} 
         settings={settings} 
         cooldown={cooldown}
         onVote={(s) => { setModals(p=>({...p, voteConfirm: s, videoPlayer: null})); }} 
       />
       
       {modals.adminAuth && (
         <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/90 p-4 backdrop-blur-sm animate-fadeIn">
            <GlassCard className="w-full max-w-md p-8 border-[var(--highlight-color)]" color="bg-gray-900">
               <div className="flex justify-center mb-6"><SettingsIcon className="w-12 h-12 text-[var(--highlight-color)]"/></div>
               <h2 className="text-white font-bold mb-6 text-center text-xl">تسجيل دخول المدير</h2>
               <form onSubmit={(e) => { e.preventDefault(); signInWithEmailAndPassword(auth, e.target.email.value, e.target.pass.value).then(() => setModals(p=>({...p, adminAuth: false}))).catch(()=>alert('خطأ في البيانات')); }}>
                 <input name="email" placeholder="البريد الإلكتروني" className="w-full p-3 mb-3 bg-gray-800 border border-white/20 rounded text-white outline-none focus:border-[var(--highlight-color)]" />
                 <input name="pass" type="password" placeholder="كلمة المرور" className="w-full p-3 mb-6 bg-gray-800 border border-white/20 rounded text-white outline-none focus:border-[var(--highlight-color)]" />
                 <button className="w-full bg-[var(--highlight-color)] py-3 rounded font-bold text-black hover:brightness-110 transition">دخول</button>
                 <button type="button" onClick={() => setModals(p=>({...p, adminAuth: false}))} className="w-full mt-4 text-white/50 text-sm hover:text-white">إلغاء</button>
               </form>
            </GlassCard>
         </div>
       )}
       
       <Modal isOpen={!!modals.info} onClose={() => setModals(p=>({...p, info: null}))} title="المعلومات">
         {modals.info === 'why' && <p className="text-lg leading-relaxed text-gray-300 whitespace-pre-line">{settings.whyText}</p>}
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