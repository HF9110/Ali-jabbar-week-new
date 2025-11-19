import React, { useState, useEffect, useMemo, useRef } from 'react';
import { BrowserRouter, Routes, Route, useNavigate } from 'react-router-dom';
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged } from 'firebase/auth';
import {
  getFirestore, collection, doc, onSnapshot, setDoc, query, addDoc, updateDoc,
  serverTimestamp, increment, deleteDoc // Added deleteDoc just in case
} from 'firebase/firestore';
import {
  ChevronDown, Crown, Search, Settings as SettingsIcon, X, Loader, User,
  AlertTriangle, Lock, Mail, Key, CheckCircle, Clock, LogOut, Save,
  Plus, Trash2, Edit3, Play, Filter
} from 'lucide-react';

// =========================================================================
// 1. CONFIGURATION
// =========================================================================

const APP_ID = 'ali-jabbar-week';

const firebaseConfig = {
  apiKey: "AIzaSyDUxC_2orwmSLL9iEBIkeohZKfH36MjZ4Y",
  authDomain: "ali-jabbar-week.firebaseapp.com",
  projectId: "ali-jabbar-week",
  storageBucket: "ali-jabbar-week.firebasestorage.app",
  messagingSenderId: "642187294882",
  appId: "1:642187294882:web:fe30f0016e5803a5e1bffb",
};

let db, auth, isFirebaseInitialized = false;
try {
  const app = initializeApp(firebaseConfig);
  db = getFirestore(app);
  auth = getAuth(app);
  isFirebaseInitialized = true;
} catch (e) {
  console.error("Firebase Init Error:", e);
}

const PATHS = {
  SETTINGS: `artifacts/${APP_ID}/public/data/settings/config`,
  SUBMISSIONS: `artifacts/${APP_ID}/public/data/submissions`,
};

const STAGES = {
  Submission: { label: 'استقبال المشاركات', color: 'blue', icon: Clock },
  Voting: { label: 'التصويت مفتوح', color: 'yellow', icon: CheckCircle },
  Paused: { label: 'متوقفة مؤقتاً', color: 'red', icon: AlertTriangle },
  Ended: { label: 'إعلان النتائج', color: 'green', icon: Crown },
};

const COUNTRIES = [
  { name: 'الكل', code: 'ALL', flag: '🌍' }, // Added filter option
  { name: 'الأردن', code: 'JO', flag: '🇯🇴' }, { name: 'الإمارات', code: 'AE', flag: '🇦🇪' },
  { name: 'البحرين', code: 'BH', flag: '🇧🇭' }, { name: 'الجزائر', code: 'DZ', flag: '🇩🇿' },
  { name: 'السعودية', code: 'SA', flag: '🇸🇦' }, { name: 'العراق', code: 'IQ', flag: '🇮🇶' },
  { name: 'الكويت', code: 'KW', flag: '🇰🇼' }, { name: 'المغرب', code: 'MA', flag: '🇲🇦' },
  { name: 'اليمن', code: 'YE', flag: '🇾🇪' }, { name: 'تونس', code: 'TN', flag: '🇹🇳' },
  { name: 'سوريا', code: 'SY', flag: '🇸🇾' }, { name: 'عُمان', code: 'OM', flag: '🇴🇲' },
  { name: 'فلسطين', code: 'PS', flag: '🇵🇸' }, { name: 'قطر', code: 'QA', flag: '🇶🇦' },
  { name: 'لبنان', code: 'LB', flag: '🇱🇧' }, { name: 'ليبيا', code: 'LY', flag: '🇱🇾' },
  { name: 'مصر', code: 'EG', flag: '🇪🇬' },
].sort((a, b) => a.code === 'ALL' ? -1 : a.name.localeCompare(b.name, 'ar'));

const DEFAULT_SETTINGS = {
  title: 'Ali Jabbar Week', // Internal usage only now
  logoUrl: '',
  mainColor: '#fe2c55',
  highlightColor: '#25f4ee',
  appFont: 'Cairo',
  stage: 'Voting',
  marqueeText: '', // Can be empty if disabled
  useGlassmorphism: true,
  termsText: '- العمل يجب أن يكون أصلياً.\n- احترام القوانين العامة.',
  whyText: 'لدعم صناع المحتوى العرب.',
  organizers: [
    { name: 'علي جبار', role: 'المشرف العام', img: '', tiktok: '@AliJabbar' },
    { name: 'فريق الإدارة', role: 'تنظيم', img: '', tiktok: '@Team' },
  ]
};

// =========================================================================
// 2. ADVANCED UI COMPONENTS (Animations & Styles)
// =========================================================================

const Button = ({ children, onClick, className = '', disabled = false, style = {} }) => (
  <button 
    onClick={onClick} 
    disabled={disabled}
    className={`relative overflow-hidden group py-3 px-6 rounded-xl font-bold transition-all duration-300 transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 ${className}`}
    style={style}
  >
    <span className="absolute top-0 left-0 w-full h-full bg-white/20 -skew-x-12 -translate-x-full group-hover:animate-shine" />
    <span className="relative z-10 flex items-center gap-2">{children}</span>
  </button>
);

const GlassCard = ({ children, className = '', settings, onClick }) => (
  <div 
    onClick={onClick}
    className={`rounded-2xl transition-all duration-300 ${className} 
    ${settings?.useGlassmorphism ? 'bg-gray-900/60 backdrop-blur-xl border border-white/10 shadow-2xl' : 'bg-gray-900 border border-gray-800'}`}
  >
    {children}
  </div>
);

const InputField = ({ label, value, onChange, type = 'text', placeholder = '' }) => (
  <div className="mb-4 w-full">
    {label && <label className="block text-white/80 mb-2 text-sm font-medium">{label}</label>}
    <input
      type={type}
      value={value || ''}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full p-3 rounded-xl bg-black/40 border border-white/10 text-white focus:border-highlight-color focus:ring-1 focus:ring-highlight-color outline-none transition placeholder-white/30"
    />
  </div>
);

const Modal = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-fadeIn" onClick={onClose}>
      <div className="bg-gray-900 border border-white/20 w-full max-w-lg rounded-2xl overflow-hidden shadow-2xl relative flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center p-5 border-b border-white/10 bg-white/5">
          <h3 className="text-xl font-bold text-white">{title}</h3>
          <button onClick={onClose} className="text-white/60 hover:text-red-500 transition"><X /></button>
        </div>
        <div className="p-6 text-white overflow-y-auto custom-scrollbar">
          {children}
        </div>
      </div>
    </div>
  );
};

// =========================================================================
// 3. FEATURE COMPONENTS
// =========================================================================

// --- TOP 3 PODIUM ---
const TopThreePodium = ({ submissions, settings }) => {
  if (submissions.length === 0) return null;
  const [first, second, third] = submissions;

  const PodiumItem = ({ sub, rank }) => {
    if (!sub) return <div className="w-1/3"></div>;
    const isFirst = rank === 1;
    const borderColor = isFirst ? settings.highlightColor : settings.mainColor;
    const height = isFirst ? 'h-48 md:h-56' : rank === 2 ? 'h-40 md:h-44' : 'h-32 md:h-36';
    
    return (
      <div className={`w-1/3 flex flex-col items-center justify-end relative z-10 ${isFirst ? '-mt-8 order-2' : rank === 2 ? 'order-1' : 'order-3'}`}>
        <div className="relative mb-3 group">
           {isFirst && <Crown className="absolute -top-8 left-1/2 -translate-x-1/2 text-yellow-400 w-8 h-8 animate-bounce" />}
           <div className="w-16 h-16 md:w-24 md:h-24 rounded-full border-4 overflow-hidden transition transform group-hover:scale-105 shadow-[0_0_15px_rgba(0,0,0,0.5)]" style={{ borderColor }}>
             <img src={sub.thumbnailUrl} className="w-full h-full object-cover" alt={sub.participantName} onError={e => e.target.src="https://placehold.co/100x100/333/fff?text=User"} />
           </div>
           <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-black border border-white/20 text-white text-[10px] md:text-xs px-2 py-0.5 rounded-full whitespace-nowrap">
             {sub.participantName}
           </div>
        </div>
        
        <div className={`w-full ${height} rounded-t-2xl flex flex-col justify-end items-center pb-4 transition-all duration-500 relative overflow-hidden`} 
             style={{ background: `linear-gradient(to top, ${borderColor}80, rgba(0,0,0,0.2))` }}>
           <div className="absolute inset-0 bg-grid-white/[0.05] bg-[length:10px_10px]" />
           <span className="text-3xl md:text-4xl font-black text-white drop-shadow-lg">{rank}</span>
           <span className="text-sm font-bold text-white/80 mt-1">{sub.votes} صوت</span>
        </div>
      </div>
    );
  };

  return (
    <div className="flex justify-center items-end gap-2 md:gap-4 mb-12 mt-8 max-w-3xl mx-auto">
      <PodiumItem sub={second} rank={2} />
      <PodiumItem sub={first} rank={1} />
      <PodiumItem sub={third} rank={3} />
    </div>
  );
};

// --- SCROLLING TICKER (Rest of Participants) ---
const ParticipantsTicker = ({ submissions }) => {
  if (submissions.length === 0) return null;
  
  return (
    <div className="mb-10 relative overflow-hidden group">
      <div className="absolute left-0 top-0 bottom-0 w-10 bg-gradient-to-r from-black to-transparent z-10" />
      <div className="absolute right-0 top-0 bottom-0 w-10 bg-gradient-to-l from-black to-transparent z-10" />
      
      <div className="flex animate-scroll gap-4 w-max hover:[animation-play-state:paused]">
        {[...submissions, ...submissions].map((sub, idx) => ( // Duplicated for infinite loop illusion
          <div key={`${sub.id}-${idx}`} className="flex items-center gap-3 bg-white/5 border border-white/5 px-4 py-2 rounded-full min-w-[180px]">
            <img src={sub.thumbnailUrl} className="w-8 h-8 rounded-full object-cover border border-white/20" alt="" onError={e => e.target.src="https://placehold.co/50/333/fff?text=U"} />
            <div className="flex flex-col">
              <span className="text-xs font-bold text-white truncate max-w-[100px]">{sub.participantName}</span>
              <span className="text-[10px] text-white/50">{sub.votes} صوت</span>
            </div>
            <span className="text-xs ml-auto opacity-50">#{idx % submissions.length + 4}</span>
          </div>
        ))}
      </div>
      <style>{`
        @keyframes scroll { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } }
        .animate-scroll { animation: scroll 40s linear infinite; }
      `}</style>
    </div>
  );
};

// --- SEARCH & FILTER BAR ---
const SearchBar = ({ searchTerm, setSearchTerm, filterCountry, setFilterCountry }) => {
  return (
    <div className="flex flex-col md:flex-row gap-4 mb-8 bg-gray-900/80 p-4 rounded-2xl border border-white/10 backdrop-blur-sm">
      <div className="relative flex-1">
        <Search className="absolute right-4 top-3.5 text-white/40 w-5 h-5" />
        <input 
          type="text" 
          placeholder="ابحث عن اسم الحساب..." 
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full bg-black/40 border border-white/10 text-white rounded-xl py-3 pr-12 pl-4 focus:border-highlight-color focus:ring-1 focus:ring-highlight-color outline-none transition"
        />
      </div>
      <div className="relative w-full md:w-1/3">
        <Filter className="absolute right-4 top-3.5 text-white/40 w-5 h-5 pointer-events-none" />
        <select 
          value={filterCountry}
          onChange={(e) => setFilterCountry(e.target.value)}
          className="w-full bg-black/40 border border-white/10 text-white rounded-xl py-3 pr-12 pl-4 appearance-none outline-none focus:border-highlight-color cursor-pointer"
        >
          {COUNTRIES.map(c => <option key={c.code} value={c.name}>{c.flag} {c.name}</option>)}
        </select>
        <ChevronDown className="absolute left-4 top-3.5 text-white/40 w-5 h-5 pointer-events-none" />
      </div>
    </div>
  );
};

// --- VIDEO CARD (Updated) ---
const VideoCard = ({ submission, settings, onVote, onClick }) => {
  return (
    <div 
      onClick={onClick}
      className="group relative aspect-[9/16] rounded-2xl overflow-hidden cursor-pointer transform transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl hover:shadow-highlight-color/20 border border-white/5 bg-gray-800"
    >
      {/* Fallback image logic handled by onError in img tag */}
      <img 
        src={submission.thumbnailUrl} 
        alt={submission.participantName} 
        className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity duration-500"
        onError={(e) => e.target.src = 'https://placehold.co/600x900/1a1a1a/666?text=No+Preview'} 
      />
      
      {/* Gradient Overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent flex flex-col justify-end p-4">
        <div className="mb-3">
          <div className="flex items-center gap-2 mb-1">
             <div className="w-6 h-6 rounded-full bg-gray-700 overflow-hidden border border-white/30">
               {/* Small profile pic in card */}
               <img src={submission.thumbnailUrl} className="w-full h-full object-cover" alt="" onError={e=>e.target.style.display='none'} /> 
             </div>
             <h3 className="font-bold text-white text-sm truncate dir-ltr text-left flex-1">{submission.participantName}</h3>
          </div>
          <div className="flex justify-between items-center text-xs text-white/70">
            <span className="flex items-center gap-1 bg-black/40 px-2 py-1 rounded-md backdrop-blur-sm">{submission.flag} {submission.country}</span>
          </div>
        </div>
        
        <Button 
          onClick={(e) => { e.stopPropagation(); onVote(submission); }}
          className="w-full py-3 text-sm !bg-white !text-black hover:!bg-gray-200 shadow-lg"
        >
          <Crown className="w-4 h-4 text-yellow-600" /> {submission.votes} تصويت
        </Button>
      </div>
    </div>
  );
};

// =========================================================================
// 4. ADMIN PANELS (Refined)
// =========================================================================

const AdminSettingsPanel = ({ settings, onSaveSettings }) => {
  const [local, setLocal] = useState(settings);
  const [isSaving, setIsSaving] = useState(false);

  // Handle organizers changes
  const handleOrganizerChange = (idx, field, value) => {
    const updated = [...local.organizers];
    updated[idx][field] = value;
    setLocal(prev => ({ ...prev, organizers: updated }));
  };

  const addOrganizer = () => setLocal(prev => ({ ...prev, organizers: [...prev.organizers, { name: '', role: '', tiktok: '' }] }));
  const removeOrganizer = (idx) => setLocal(prev => ({ ...prev, organizers: prev.organizers.filter((_, i) => i !== idx) }));

  return (
    <div className="space-y-8 animate-slideUp">
      {/* الهوية البصرية */}
      <GlassCard settings={settings} className="p-6">
        <h3 className="text-lg font-bold text-highlight-color border-b border-white/10 pb-2 mb-4 flex items-center gap-2"><SettingsIcon size={18} /> إعدادات الشعار والألوان</h3>
        <div className="grid md:grid-cols-2 gap-6">
           <div className="space-y-4">
              <div className="flex items-center gap-4">
                 {local.logoUrl && <img src={local.logoUrl} className="w-20 h-20 object-contain bg-black/50 rounded-lg border border-white/10" alt="Preview" />}
                 <InputField label="رابط الشعار (Logo URL)" value={local.logoUrl} onChange={v => setLocal(p => ({...p, logoUrl: v}))} placeholder="https://..." />
              </div>
           </div>
           <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-white/60 mb-1 block">اللون الأساسي</label>
                <div className="flex items-center gap-2 bg-black/30 p-2 rounded-lg"><input type="color" value={local.mainColor} onChange={e => setLocal(p => ({...p, mainColor: e.target.value}))} className="bg-transparent border-0 h-8 w-8 cursor-pointer" /></div>
              </div>
              <div>
                <label className="text-xs text-white/60 mb-1 block">لون التوهج</label>
                <div className="flex items-center gap-2 bg-black/30 p-2 rounded-lg"><input type="color" value={local.highlightColor} onChange={e => setLocal(p => ({...p, highlightColor: e.target.value}))} className="bg-transparent border-0 h-8 w-8 cursor-pointer" /></div>
              </div>
           </div>
        </div>
      </GlassCard>

      {/* التحكم بالمراحل */}
      <GlassCard settings={settings} className="p-6">
         <h3 className="text-lg font-bold text-highlight-color border-b border-white/10 pb-2 mb-4 flex items-center gap-2"><Clock size={18} /> حالة المسابقة</h3>
         <div className="flex flex-wrap gap-2 mb-6">
           {Object.keys(STAGES).map(key => (
             <button key={key} onClick={() => setLocal(p => ({...p, stage: key}))} 
               className={`px-4 py-2 rounded-lg text-sm font-bold transition flex items-center gap-2 ${local.stage === key ? 'bg-white text-black shadow-lg' : 'bg-gray-800 text-white/50'}`}>
               {local.stage === key && <CheckCircle size={14} />} {STAGES[key].label}
             </button>
           ))}
         </div>
         <InputField label="نص التنبيه (يظهر في الشريط العلوي)" value={local.marqueeText} onChange={v => setLocal(p => ({...p, marqueeText: v}))} />
      </GlassCard>

      {/* المنظمون */}
      <GlassCard settings={settings} className="p-6">
         <div className="flex justify-between items-center border-b border-white/10 pb-2 mb-4">
            <h3 className="text-lg font-bold text-highlight-color flex items-center gap-2"><Users size={18} /> القائمون على البرنامج</h3>
            <button onClick={addOrganizer} className="text-xs bg-green-600 px-2 py-1 rounded flex items-center gap-1 hover:bg-green-500"><Plus size={12} /> إضافة</button>
         </div>
         <div className="space-y-3">
           {local.organizers?.map((org, idx) => (
             <div key={idx} className="flex gap-2 items-start bg-white/5 p-3 rounded-xl">
                <div className="flex-1 grid grid-cols-2 md:grid-cols-3 gap-2">
                   <input className="bg-transparent border border-white/10 rounded p-2 text-sm text-white" placeholder="الاسم" value={org.name} onChange={e => handleOrganizerChange(idx, 'name', e.target.value)} />
                   <input className="bg-transparent border border-white/10 rounded p-2 text-sm text-white" placeholder="الدور" value={org.role} onChange={e => handleOrganizerChange(idx, 'role', e.target.value)} />
                   <input className="bg-transparent border border-white/10 rounded p-2 text-sm text-white" placeholder="يوزر تيك توك" value={org.tiktok} onChange={e => handleOrganizerChange(idx, 'tiktok', e.target.value)} />
                   <input className="bg-transparent border border-white/10 rounded p-2 text-sm text-white col-span-2 md:col-span-3" placeholder="رابط الصورة" value={org.img} onChange={e => handleOrganizerChange(idx, 'img', e.target.value)} />
                </div>
                <button onClick={() => removeOrganizer(idx)} className="p-2 text-red-500 hover:bg-red-500/10 rounded"><Trash2 size={16} /></button>
             </div>
           ))}
         </div>
      </GlassCard>

      <div className="sticky bottom-4 z-20">
        <Button onClick={() => { setIsSaving(true); onSaveSettings(local).then(() => setIsSaving(false)); }} disabled={isSaving} className="w-full shadow-xl" style={{ backgroundColor: local.mainColor }}>
          {isSaving ? <Loader className="animate-spin" /> : <Save />} حفظ كافة التغييرات
        </Button>
      </div>
    </div>
  );
};

const AdminSubmissions = ({ submissions, onUpdateStatus, onEdit, onAdd }) => {
  const [filter, setFilter] = useState('Pending');
  const filteredList = useMemo(() => {
    let list = submissions.filter(s => s.status === filter);
    if (filter === 'Approved') list.sort((a, b) => b.votes - a.votes);
    return list;
  }, [submissions, filter]);

  return (
    <GlassCard className="p-6 min-h-[500px]">
      <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
         <div className="flex bg-black/40 p-1 rounded-xl">
            {['Pending', 'Approved', 'Rejected'].map(s => (
              <button key={s} onClick={() => setFilter(s)} className={`px-4 py-2 rounded-lg text-sm font-bold transition ${filter === s ? 'bg-gray-700 text-white shadow' : 'text-white/50 hover:text-white'}`}>
                {s === 'Pending' ? 'قيد الانتظار' : s === 'Approved' ? 'المقبولة' : 'مرفوضة'}
              </button>
            ))}
         </div>
         <Button onClick={onAdd} className="text-sm py-2 !bg-blue-600 hover:!bg-blue-500"><Plus size={16} /> إضافة يدوية</Button>
      </div>

      <div className="space-y-3 overflow-y-auto max-h-[600px] custom-scrollbar pr-2">
        {filteredList.map(sub => (
          <div key={sub.id} className="flex items-center gap-4 bg-white/5 p-3 rounded-xl border border-white/5 hover:border-white/10 transition">
             <img src={sub.thumbnailUrl} className="w-12 h-12 rounded-lg object-cover bg-black" alt="" onError={e => e.target.src="https://placehold.co/100/333/fff?text=IMG"} />
             <div className="flex-1 min-w-0">
                <p className="font-bold text-white truncate dir-ltr text-left">{sub.participantName}</p>
                <a href={sub.videoUrl} target="_blank" rel="noreferrer" className="text-xs text-blue-400 hover:underline truncate block">{sub.videoUrl}</a>
                <span className="text-[10px] text-white/40">{sub.country}</span>
             </div>
             {filter === 'Approved' && <div className="text-center px-2"><span className="block text-[10px] text-white/40">Votes</span><span className="font-bold text-highlight-color">{sub.votes}</span></div>}
             <div className="flex gap-2">
                <button onClick={() => onEdit(sub)} className="p-2 bg-gray-700 rounded text-white hover:bg-gray-600"><Edit3 size={16} /></button>
                {filter === 'Pending' && (
                  <>
                    <button onClick={() => onUpdateStatus(sub.id, 'Approved')} className="p-2 bg-green-600/20 text-green-500 rounded hover:bg-green-600 hover:text-white"><CheckCircle size={16} /></button>
                    <button onClick={() => onUpdateStatus(sub.id, 'Rejected')} className="p-2 bg-red-600/20 text-red-500 rounded hover:bg-red-600 hover:text-white"><X size={16} /></button>
                  </>
                )}
                {filter !== 'Pending' && <button onClick={() => onUpdateStatus(sub.id, 'Pending')} className="p-2 bg-yellow-600/20 text-yellow-500 rounded hover:bg-yellow-600 hover:text-white"><Clock size={16} /></button>}
             </div>
          </div>
        ))}
        {filteredList.length === 0 && <p className="text-center text-white/30 py-10">لا توجد مشاركات</p>}
      </div>
    </GlassCard>
  );
};

// =========================================================================
// 5. MAIN APP CONTROLLER
// =========================================================================

const ContestApp = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  // Global State
  const [settings, setSettings] = useState(null);
  const [submissions, setSubmissions] = useState([]);
  const [modals, setModals] = useState({ 
    adminLogin: false, video: null, vote: null, footer: null, 
    editSub: null, addSub: false 
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCountry, setFilterCountry] = useState('الكل');
  const [cooldown, setCooldown] = useState(0);

  // Load Data
  useEffect(() => {
    if (!isFirebaseInitialized) { setSettings(DEFAULT_SETTINGS); return; }
    const unsub1 = onSnapshot(doc(db, PATHS.SETTINGS), s => s.exists() ? setSettings(s.data()) : setDoc(doc(db, PATHS.SETTINGS), DEFAULT_SETTINGS));
    const unsub2 = onSnapshot(collection(db, PATHS.SUBMISSIONS), s => setSubmissions(s.docs.map(d => ({id: d.id, ...d.data()}))));
    return () => { unsub1(); unsub2(); };
  }, []);

  // CSS Vars
  useEffect(() => {
    if (settings) {
      document.documentElement.style.setProperty('--main-color', settings.mainColor);
      document.documentElement.style.setProperty('--highlight-color', settings.highlightColor);
      document.documentElement.style.fontFamily = settings.appFont;
    }
  }, [settings]);

  // Actions
  const handleAdminSave = async (newSettings) => {
    try { await setDoc(doc(db, PATHS.SETTINGS), newSettings, { merge: true }); alert("✅ تم الحفظ"); } 
    catch (e) { alert("Error: " + e.message); }
  };

  const handleVote = async () => {
    if (!modals.vote || cooldown > 0) return;
    try {
      await updateDoc(doc(db, PATHS.SUBMISSIONS, modals.vote.id), { votes: increment(1) });
      setCooldown(30); setModals(p => ({...p, vote: null}));
    } catch (e) { console.error(e); }
  };

  useEffect(() => { if(cooldown > 0) setTimeout(() => setCooldown(c => c-1), 1000); }, [cooldown]);

  const handleManualAdd = async (data) => {
    await addDoc(collection(db, PATHS.SUBMISSIONS), {
      ...data, status: 'Approved', votes: 0, submittedAt: serverTimestamp(),
      flag: COUNTRIES.find(c=>c.name===data.country)?.flag || '🏳️'
    });
    setModals(p => ({...p, addSub: false}));
  };

  const handleEditSub = async (data) => {
    await updateDoc(doc(db, PATHS.SUBMISSIONS, data.id), data);
    setModals(p => ({...p, editSub: null}));
  };

  // Filter Logic
  const displaySubmissions = useMemo(() => {
    let list = submissions.filter(s => s.status === 'Approved');
    if (searchTerm) list = list.filter(s => s.participantName.toLowerCase().includes(searchTerm.toLowerCase()));
    if (filterCountry !== 'الكل') list = list.filter(s => s.country === filterCountry);
    return list.sort((a,b) => b.votes - a.votes);
  }, [submissions, searchTerm, filterCountry]);

  const top3 = displaySubmissions.slice(0, 3);
  const rest = displaySubmissions.slice(3);

  if (!settings) return <div className="h-screen bg-black flex items-center justify-center"><Loader className="animate-spin text-white" /></div>;

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white font-sans selection:bg-highlight-color selection:text-black">
      <style>{`.animate-shine { animation: shine 2s infinite; } @keyframes shine { 100% { left: 125%; } }`}</style>
      
      <Routes>
        {/* ADMIN PANEL */}
        <Route path="/admin" element={user ? (
           <div className="container mx-auto p-4 py-8">
              <div className="flex justify-between items-center mb-8">
                 <h1 className="text-2xl font-bold">لوحة الإدارة</h1>
                 <button onClick={() => navigate('/')} className="bg-white/10 px-4 py-2 rounded-lg text-sm">العودة للموقع</button>
              </div>
              <AdminSettingsPanel settings={settings} onSaveSettings={handleAdminSave} />
              <AdminSubmissions submissions={submissions} 
                onUpdateStatus={(id, s) => updateDoc(doc(db, PATHS.SUBMISSIONS, id), {status: s})} 
                onEdit={(sub) => setModals(p => ({...p, editSub: sub}))}
                onAdd={() => setModals(p => ({...p, addSub: true}))}
              />
           </div>
        ) : <div className="h-screen flex items-center justify-center"><Button onClick={() => setModals(p => ({...p, adminLogin: true}))}>دخول</Button></div>} />

        {/* PUBLIC PAGE */}
        <Route path="/" element={
          <>
            {/* Navbar */}
            <nav className="sticky top-0 z-40 bg-black/80 backdrop-blur-md border-b border-white/10 p-4 flex justify-between items-center">
              {settings.logoUrl ? <img src={settings.logoUrl} className="h-12 object-contain" alt="Logo" /> : <h1 className="font-bold text-xl">{settings.title}</h1>}
              <div className="flex gap-2">
                {(settings.stage === 'Voting' || settings.stage === 'Ended') && <Button onClick={() => document.getElementById('form')?.scrollIntoView()} className="py-2 text-sm !bg-white/10 hidden md:flex">شارك الآن</Button>}
                {user && <Button onClick={() => navigate('/admin')} className="py-2 text-sm">الإدارة</Button>}
              </div>
            </nav>

            <main className="container mx-auto px-4 py-8 pb-32 space-y-12">
               {/* Alert */}
               {settings.marqueeText && (
                 <div className="bg-gradient-to-r from-blue-900/50 to-purple-900/50 border border-white/10 p-4 rounded-2xl flex items-center gap-4">
                    <div className="bg-white/10 p-2 rounded-full"><Info /></div>
                    <p className="text-sm md:text-base">{settings.marqueeText}</p>
                 </div>
               )}

               {/* Header Section */}
               <div className="text-center py-10">
                  <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 mb-4 text-highlight-color">
                    {React.createElement(STAGES[settings.stage].icon, { size: 18 })} 
                    <span className="text-sm font-bold">{STAGES[settings.stage].label}</span>
                  </div>
                  <h2 className="text-4xl md:text-6xl font-black mb-4 tracking-tight">{settings.title}</h2>
                  <p className="text-white/50 max-w-2xl mx-auto">{settings.whyText}</p>
               </div>

               {/* Results Section */}
               {(settings.stage === 'Voting' || settings.stage === 'Ended') && (
                 <div className="animate-fadeIn">
                    <TopThreePodium submissions={top3} settings={settings} />
                    <ParticipantsTicker submissions={rest} />

                    <div className="mt-16" id="gallery">
                       <div className="flex flex-col md:flex-row justify-between items-end mb-6 gap-4">
                          <h3 className="text-2xl font-bold flex items-center gap-2"><Play className="fill-highlight-color text-highlight-color" /> المشاركات ({displaySubmissions.length})</h3>
                          <div className="w-full md:w-auto flex-1 max-w-2xl">
                             <SearchBar searchTerm={searchTerm} setSearchTerm={setSearchTerm} filterCountry={filterCountry} setFilterCountry={setFilterCountry} />
                          </div>
                       </div>
                       
                       <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
                          {displaySubmissions.map(sub => (
                            <VideoCard 
                              key={sub.id} 
                              submission={sub} 
                              settings={settings} 
                              onVote={s => setModals(p => ({...p, vote: s}))} 
                              onClick={() => setModals(p => ({...p, video: sub}))} 
                            />
                          ))}
                       </div>
                       {displaySubmissions.length === 0 && <div className="text-center py-20 bg-white/5 rounded-2xl">لا توجد نتائج مطابقة للبحث</div>}
                    </div>
                 </div>
               )}

               {/* Submission Form */}
               {settings.stage === 'Submission' && (
                 <div id="form" className="max-w-xl mx-auto">
                    <SubmissionForm settings={settings} />
                 </div>
               )}
            </main>

            {/* Footer */}
            <footer className="bg-black border-t border-white/10 py-12">
              <div className="container mx-auto text-center space-y-6">
                <div className="flex justify-center gap-6 text-sm font-bold text-white/60">
                  <button onClick={() => setModals(p => ({...p, footer: 'why'}))} className="hover:text-white transition">عن المسابقة</button>
                  <button onClick={() => setModals(p => ({...p, footer: 'terms'}))} className="hover:text-white transition">الشروط</button>
                  <button onClick={() => setModals(p => ({...p, footer: 'organizers'}))} className="hover:text-white transition">المنظمون</button>
                </div>
                <p className="text-white/20 text-xs cursor-pointer" onDoubleClick={() => setModals(p => ({...p, adminLogin: true}))}>© 2025 All Rights Reserved.</p>
              </div>
            </footer>
          </>
        } />
      </Routes>

      {/* --- MODALS --- */}
      <AdminAuthModal 
        isOpen={modals.adminLogin} 
        onClose={() => setModals(p => ({...p, adminLogin: false}))} 
        onSuccess={() => { setModals(p => ({...p, adminLogin: false})); navigate('/admin'); }} 
      />

      <Modal isOpen={!!modals.vote} onClose={() => setModals(p => ({...p, vote: null}))} title="تأكيد التصويت">
         <p className="text-center mb-6 text-lg">هل تود التصويت للمشارك <br/><span className="font-bold text-highlight-color text-xl">{modals.vote?.participantName}</span>؟</p>
         <Button onClick={handleVote} className="w-full" style={{ backgroundColor: settings.mainColor }}>تأكيد التصويت</Button>
      </Modal>

      {/* Video Modal - Full Width Fix */}
      {modals.video && (
        <div className="fixed inset-0 z-[150] bg-black flex items-center justify-center" onClick={() => setModals(p => ({...p, video: null}))}>
           <button className="absolute top-4 right-4 z-50 bg-white/10 p-2 rounded-full text-white hover:bg-red-600 transition"><X /></button>
           <div className="w-full h-full max-w-md md:max-w-6xl bg-black relative flex flex-col md:flex-row" onClick={e => e.stopPropagation()}>
              <div className="flex-1 bg-black relative flex items-center justify-center">
                 <iframe src={`https://www.tiktok.com/embed/v2/${modals.video.videoUrl.split('/').pop()}?lang=ar`} className="w-full h-full md:w-[500px]" allowFullScreen title="Video"></iframe>
              </div>
              <div className="w-full md:w-80 bg-gray-900 p-6 flex flex-col border-l border-white/10">
                 <div className="text-center mb-6">
                    <img src={modals.video.thumbnailUrl} className="w-20 h-20 rounded-full mx-auto mb-3 object-cover border-2 border-highlight-color" alt="" />
                    <h2 className="font-bold text-xl text-white dir-ltr">{modals.video.participantName}</h2>
                    <p className="text-white/50 text-sm">{modals.video.country}</p>
                 </div>
                 <div className="bg-white/5 p-4 rounded-xl text-center mb-auto">
                    <span className="block text-xs text-white/50">عدد الأصوات</span>
                    <span className="text-3xl font-black text-highlight-color">{modals.video.votes}</span>
                 </div>
                 <Button onClick={() => { setModals(p => ({...p, vote: modals.video, video: null})); }} className="w-full mt-4" style={{ backgroundColor: settings.mainColor }}>تصويت</Button>
              </div>
           </div>
        </div>
      )}

      <Modal isOpen={!!modals.footer} onClose={() => setModals(p => ({...p, footer: null}))} title="معلومات">
         {modals.footer === 'organizers' ? (
           <div className="grid gap-3">
             {settings.organizers.map((org, i) => (
               <div key={i} className="flex items-center gap-3 bg-white/5 p-3 rounded-lg">
                 {org.img && <img src={org.img} className="w-10 h-10 rounded-full" alt="" />}
                 <div><p className="font-bold">{org.name}</p><p className="text-xs text-white/50">{org.role}</p></div>
               </div>
             ))}
           </div>
         ) : <p className="whitespace-pre-line text-white/80">{modals.footer === 'why' ? settings.whyText : settings.termsText}</p>}
      </Modal>

      {/* Edit Submission Modal (With Thumbnail Field) */}
      <Modal isOpen={!!modals.editSub} onClose={() => setModals(p => ({...p, editSub: null}))} title="تعديل المشاركة">
         {modals.editSub && (
           <div className="space-y-4">
              <InputField label="اسم المستخدم (@username)" value={modals.editSub.participantName} onChange={v => setModals(p => ({...p, editSub: {...p.editSub, participantName: v}}))} />
              <InputField label="رابط الفيديو" value={modals.editSub.videoUrl} onChange={v => setModals(p => ({...p, editSub: {...p.editSub, videoUrl: v}}))} />
              <InputField label="رابط الصورة المصغرة (اختياري)" value={modals.editSub.thumbnailUrl} onChange={v => setModals(p => ({...p, editSub: {...p.editSub, thumbnailUrl: v}}))} placeholder="https://..." />
              <InputField label="عدد الأصوات" type="number" value={modals.editSub.votes} onChange={v => setModals(p => ({...p, editSub: {...p.editSub, votes: Number(v)}}))} />
              <Button onClick={() => handleEditSub(modals.editSub)} className="w-full bg-green-600">حفظ التعديلات</Button>
           </div>
         )}
      </Modal>

      {/* Add Manual Submission Modal */}
      <Modal isOpen={modals.addSub} onClose={() => setModals(p => ({...p, addSub: false}))} title="إضافة مشاركة يدوياً">
         <div className="space-y-4">
            <form onSubmit={e => { e.preventDefault(); handleManualAdd({ 
                participantName: e.target.user.value, 
                videoUrl: e.target.url.value, 
                country: e.target.country.value, 
                thumbnailUrl: e.target.thumb.value || 'https://placehold.co/600x900/333/fff?text=New' 
            })}}>
               <InputField id="user" label="اسم المستخدم (@username)" placeholder="@tiktok_user" />
               <div className="mb-4"><label className="text-sm mb-2 block">الدولة</label><select id="country" className="w-full p-3 bg-black/40 rounded-xl text-white border border-white/10">{COUNTRIES.filter(c=>c.code!=='ALL').map(c=><option key={c.code} value={c.name}>{c.name}</option>)}</select></div>
               <InputField id="url" label="رابط الفيديو" placeholder="https://tiktok.com/..." />
               <InputField id="thumb" label="رابط الصورة المصغرة (اختياري)" placeholder="https://..." />
               <Button className="w-full bg-blue-600">إضافة المشاركة</Button>
            </form>
         </div>
      </Modal>

    </div>
  );
};

// --- Submission Form Component ---
const SubmissionForm = ({ settings }) => {
  const [loading, setLoading] = useState(false);
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    const form = e.target;
    try {
      await addDoc(collection(db, PATHS.SUBMISSIONS), {
        participantName: form.name.value, // Now this expects @username
        country: form.country.value,
        flag: COUNTRIES.find(c => c.name === form.country.value)?.flag || '🏳️',
        videoUrl: form.url.value,
        thumbnailUrl: 'https://placehold.co/600x900/222/fff?text=Wait...', // Default pending image
        status: 'Pending',
        votes: 0,
        submittedAt: serverTimestamp()
      });
      alert("تم الإرسال! سيتم مراجعة طلبك.");
      form.reset();
    } catch (e) { alert("حدث خطأ"); }
    setLoading(false);
  };

  return (
    <GlassCard settings={settings} className="p-8">
      <h3 className="text-2xl font-bold text-center mb-6">شارك في المسابقة</h3>
      <form onSubmit={handleSubmit} className="space-y-4">
        <InputField id="name" label="اسم حسابك في تيك توك (@username)" placeholder="@my_account" />
        <div className="mb-4"><label className="text-sm mb-2 block text-white/80">الدولة</label><select id="country" className="w-full p-3 bg-black/40 rounded-xl text-white border border-white/10 outline-none focus:border-highlight-color">{COUNTRIES.filter(c=>c.code!=='ALL').map(c=><option key={c.code} value={c.name}>{c.flag} {c.name}</option>)}</select></div>
        <InputField id="url" label="رابط الفيديو" placeholder="https://www.tiktok.com/@.../video/..." />
        <Button disabled={loading} className="w-full mt-4" style={{ backgroundColor: settings.mainColor }}>{loading ? <Loader className="animate-spin" /> : 'إرسال المشاركة'}</Button>
      </form>
    </GlassCard>
  );
};

const AdminAuthModal = ({ isOpen, onClose, onSuccess }) => {
  const [email, setEmail] = useState(''); const [pass, setPass] = useState('');
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/90 p-4">
       <GlassCard className="w-full max-w-sm p-8">
          <h2 className="text-xl font-bold text-center mb-4">الدخول</h2>
          <form onSubmit={async (e) => { e.preventDefault(); try { await signInWithEmailAndPassword(auth, email, pass); onSuccess(); } catch(e){ alert('خطأ في البيانات'); } }}>
             <InputField value={email} onChange={setEmail} placeholder="Email" />
             <InputField type="password" value={pass} onChange={setPass} placeholder="Password" />
             <Button className="w-full mt-4">دخول</Button>
             <button type="button" onClick={onClose} className="block w-full text-center mt-4 text-sm text-white/50">إلغاء</button>
          </form>
       </GlassCard>
    </div>
  );
};

export default function App() {
  return <BrowserRouter><ContestApp /></BrowserRouter>;
}