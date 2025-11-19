import React, { useState, useEffect, useMemo, useRef } from 'react';
import { BrowserRouter, Routes, Route, useNavigate } from 'react-router-dom';
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged } from 'firebase/auth';
import {
  getFirestore, collection, doc, onSnapshot, setDoc, query, limit, getDocs,
  serverTimestamp, increment, addDoc, updateDoc
} from 'firebase/firestore';
import {
  ChevronDown, Crown, Search, Settings as SettingsIcon, X, Loader, User,
  AlertTriangle, ChevronLeft, ChevronRight, Lock, Mail, Key, CheckCircle,
  Clock, Info, LogOut, Save, FileText, Users
} from 'lucide-react';

// =========================================================================
// 1. CONFIGURATION & CONSTANTS
// =========================================================================

const APP_ID = 'ali-jabbar-week';

// إعدادات Firebase (تم وضع المفتاح مباشرة لضمان العمل)
const firebaseConfig = {
  apiKey: "AIzaSyDUxC_2orwmSLL9iEBIkeohZKfH36MjZ4Y",
  authDomain: "ali-jabbar-week.firebaseapp.com",
  projectId: "ali-jabbar-week",
  storageBucket: "ali-jabbar-week.firebasestorage.app",
  messagingSenderId: "642187294882",
  appId: "1:642187294882:web:fe30f0016e5803a5e1bffb",
};

// تهيئة Firebase بأمان
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
  { name: 'الأردن', code: 'JO', flag: '🇯🇴' }, { name: 'الإمارات', code: 'AE', flag: '🇦🇪' },
  { name: 'البحرين', code: 'BH', flag: '🇧🇭' }, { name: 'الجزائر', code: 'DZ', flag: '🇩🇿' },
  { name: 'السعودية', code: 'SA', flag: '🇸🇦' }, { name: 'العراق', code: 'IQ', flag: '🇮🇶' },
  { name: 'الكويت', code: 'KW', flag: '🇰🇼' }, { name: 'المغرب', code: 'MA', flag: '🇲🇦' },
  { name: 'اليمن', code: 'YE', flag: '🇾🇪' }, { name: 'تونس', code: 'TN', flag: '🇹🇳' },
  { name: 'سوريا', code: 'SY', flag: '🇸🇾' }, { name: 'عُمان', code: 'OM', flag: '🇴🇲' },
  { name: 'فلسطين', code: 'PS', flag: '🇵🇸' }, { name: 'قطر', code: 'QA', flag: '🇶🇦' },
  { name: 'لبنان', code: 'LB', flag: '🇱🇧' }, { name: 'ليبيا', code: 'LY', flag: '🇱🇾' },
  { name: 'مصر', code: 'EG', flag: '🇪🇬' },
].sort((a, b) => a.name.localeCompare(b.name, 'ar'));

const ORGANIZERS = [
  { name: 'علي جبار', role: 'المشرف العام', img: 'https://placehold.co/100x100/fe2c55/fff?text=Ali', tiktok: '@AliJabbar' },
  { name: 'فريق الإدارة', role: 'تنظيم', img: 'https://placehold.co/100x100/25f4ee/000?text=Team', tiktok: '@Team' },
];

const DEFAULT_SETTINGS = {
  title: 'Ali Jabbar Week',
  logoUrl: '',
  mainColor: '#fe2c55',
  highlightColor: '#25f4ee',
  appFont: 'Cairo',
  stage: 'Voting',
  marqueeText: 'أهلاً بكم في أسبوع الإبداع!',
  useGlassmorphism: true,
  termsText: '- العمل يجب أن يكون أصلياً.\n- احترام القوانين العامة.',
  whyText: 'لدعم صناع المحتوى العرب.',
};

// =========================================================================
// 2. REUSABLE UI COMPONENTS (The DRY Solution)
// =========================================================================

// بطاقة زجاجية موحدة (تستخدم في كل مكان)
const GlassCard = ({ children, className = '', settings, onClick }) => (
  <div 
    onClick={onClick}
    className={`rounded-xl transition-all duration-300 ${className} 
    ${settings?.useGlassmorphism ? 'bg-gray-900/60 backdrop-blur-xl border border-white/10 shadow-xl' : 'bg-gray-900 border border-gray-800'}`}
  >
    {children}
  </div>
);

// حقل إدخال موحد
const InputField = ({ label, value, onChange, type = 'text', placeholder = '' }) => (
  <div className="mb-4 w-full">
    <label className="block text-white/80 mb-2 text-sm font-medium">{label}</label>
    <input
      type={type}
      value={value || ''}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full p-3 rounded-lg bg-black/40 border border-white/20 text-white focus:border-highlight-color focus:ring-1 focus:ring-highlight-color outline-none transition"
    />
  </div>
);

// زر موحد
const Button = ({ children, onClick, variant = 'primary', className = '', disabled = false, settings }) => {
  const baseStyle = "py-3 px-6 rounded-lg font-bold transition transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2";
  const variants = {
    primary: { backgroundColor: settings?.mainColor || '#fe2c55', color: 'white' },
    secondary: "bg-white/10 hover:bg-white/20 text-white",
    danger: "bg-red-600 hover:bg-red-700 text-white",
    success: "bg-green-600 hover:bg-green-700 text-white"
  };
  
  return (
    <button 
      onClick={onClick} 
      disabled={disabled}
      className={`${baseStyle} ${typeof variants[variant] === 'string' ? variants[variant] : ''} ${className}`}
      style={typeof variants[variant] === 'object' ? variants[variant] : {}}
    >
      {children}
    </button>
  );
};

// نافذة منبثقة موحدة
const Modal = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm animate-fadeIn" onClick={onClose}>
      <div className="bg-gray-900 border border-white/20 w-full max-w-lg rounded-2xl overflow-hidden shadow-2xl relative" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center p-4 border-b border-white/10 bg-white/5">
          <h3 className="text-xl font-bold text-white">{title}</h3>
          <button onClick={onClose} className="text-white/60 hover:text-red-500 transition"><X /></button>
        </div>
        <div className="p-6 text-white max-h-[80vh] overflow-y-auto">
          {children}
        </div>
      </div>
    </div>
  );
};

// =========================================================================
// 3. COMPLEX FEATURE COMPONENTS
// =========================================================================

// مكون بطاقة النتائج (Flip Card) - مستعاد من الكود الطويل
const StatsFlipCard = ({ submission, settings }) => {
  return (
    <div className="relative w-full h-40 group [perspective:1000px] cursor-pointer">
      <div className="relative w-full h-full transition-all duration-500 [transform-style:preserve-3d] group-hover:[transform:rotateY(180deg)]">
        {/* الوجه الأمامي */}
        <GlassCard settings={settings} className="absolute inset-0 flex flex-col items-center justify-center [backface-visibility:hidden]">
          <img src={submission.thumbnailUrl} className="w-12 h-12 rounded-full border-2 object-cover mb-2" style={{ borderColor: settings.highlightColor }} alt="" />
          <p className="text-xl font-black" style={{ color: settings.highlightColor }}>{submission.votes}</p>
          <p className="text-xs text-white/80 truncate w-full text-center px-2">{submission.participantName}</p>
        </GlassCard>
        
        {/* الوجه الخلفي */}
        <GlassCard settings={settings} className="absolute inset-0 flex flex-col items-center justify-center [transform:rotateY(180deg)] [backface-visibility:hidden] bg-gray-800">
          <p className="text-xs text-white/60">التاريخ:</p>
          <p className="text-sm font-bold text-white mb-2">{new Date(submission.submittedAt?.toDate?.() || Date.now()).toLocaleDateString('ar-EG')}</p>
          <div className="h-px w-1/2 bg-white/20 mb-2"></div>
          <p className="text-xs text-white/60">البلد:</p>
          <p className="text-sm">{submission.flag} {submission.country}</p>
        </GlassCard>
      </div>
    </div>
  );
};

// مكون الشريط المتحرك للنتائج (Carousel) - محسن
const LiveResultsCarousel = ({ submissions, settings }) => {
  const [index, setIndex] = useState(0);
  const top3 = submissions.slice(0, 3);
  const others = submissions.slice(3);
  const perSlide = 4;
  
  useEffect(() => {
    const timer = setInterval(() => {
      if (others.length > perSlide) setIndex(prev => (prev + 1) % Math.ceil(others.length / perSlide));
    }, 5000);
    return () => clearInterval(timer);
  }, [others.length]);

  if (submissions.length === 0) return null;

  return (
    <div className="mb-8 space-y-6">
      {/* الثلاثة الأوائل */}
      <div className="flex justify-center items-end gap-4 mb-8">
        {top3.map((sub, i) => {
          const height = i === 0 ? 'h-48' : i === 1 ? 'h-40' : 'h-32';
          const order = i === 0 ? 'order-2' : i === 1 ? 'order-1' : 'order-3';
          const color = i === 0 ? settings.highlightColor : i === 1 ? settings.mainColor : '#ffffff80';
          
          return (
            <div key={sub.id} className={`w-1/3 max-w-[120px] ${order} flex flex-col items-center`}>
               <div className="mb-2 relative">
                 <img src={sub.thumbnailUrl} className="w-16 h-16 rounded-full border-4 object-cover" style={{ borderColor: color }} alt="" />
                 <span className="absolute -top-2 -right-2 bg-black text-white text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full border" style={{ borderColor: color }}>#{i+1}</span>
               </div>
               <div className={`w-full ${height} rounded-t-lg flex flex-col justify-end items-center p-2 transition-all duration-500`} 
                    style={{ background: `linear-gradient(to top, ${color}40, transparent)`, borderTop: `2px solid ${color}` }}>
                  <span className="text-2xl font-black text-white">{sub.votes}</span>
                  <span className="text-xs text-white/70 truncate w-full text-center">{sub.participantName}</span>
               </div>
            </div>
          );
        })}
      </div>

      {/* البقية في سلايدر */}
      {others.length > 0 && (
        <div className="relative px-8">
          <div className="grid grid-cols-4 gap-4">
            {others.slice(index * perSlide, (index + 1) * perSlide).map(sub => (
              <StatsFlipCard key={sub.id} submission={sub} settings={settings} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// =========================================================================
// 4. ADMIN PANELS (Consolidated Logic)
// =========================================================================

const AdminSettings = ({ settings, onSave }) => {
  const [local, setLocal] = useState(settings);
  const [loading, setLoading] = useState(false);

  useEffect(() => setLocal(settings), [settings]);

  const save = async () => {
    setLoading(true);
    await onSave(local);
    setLoading(false);
  };

  const update = (key, val) => setLocal(prev => ({...prev, [key]: val}));

  return (
    <div className="space-y-6 animate-slideUp">
      <GlassCard settings={settings} className="p-6">
        <h3 className="text-lg font-bold mb-4 text-highlight-color border-b border-white/10 pb-2">المظهر والهوية</h3>
        <div className="grid md:grid-cols-2 gap-4">
          <InputField label="عنوان المسابقة" value={local.title} onChange={v => update('title', v)} />
          <InputField label="رابط الشعار" value={local.logoUrl} onChange={v => update('logoUrl', v)} />
          <InputField label="نوع الخط" value={local.appFont} onChange={v => update('appFont', v)} />
          
          <div className="grid grid-cols-2 gap-2">
             <div>
               <label className="text-white/70 text-xs">اللون الأساسي</label>
               <div className="flex gap-2 mt-1"><input type="color" value={local.mainColor} onChange={e=>update('mainColor', e.target.value)} className="h-10 rounded cursor-pointer"/></div>
             </div>
             <div>
               <label className="text-white/70 text-xs">لون التوهج</label>
               <div className="flex gap-2 mt-1"><input type="color" value={local.highlightColor} onChange={e=>update('highlightColor', e.target.value)} className="h-10 rounded cursor-pointer"/></div>
             </div>
          </div>
        </div>
      </GlassCard>

      <GlassCard settings={settings} className="p-6">
        <h3 className="text-lg font-bold mb-4 text-highlight-color border-b border-white/10 pb-2">إدارة المراحل</h3>
        <div className="flex flex-wrap gap-2 mb-4">
          {Object.keys(STAGES).map(key => (
            <button key={key} onClick={() => update('stage', key)} className={`px-3 py-1 rounded text-sm transition ${local.stage === key ? 'bg-white text-black font-bold' : 'bg-gray-700 text-white'}`}>
              {STAGES[key].label}
            </button>
          ))}
        </div>
        <InputField label="شريط الأخبار" value={local.marqueeText} onChange={v => update('marqueeText', v)} />
        <div className="grid md:grid-cols-2 gap-4">
           <div className="space-y-2"><label className="text-white/70 text-sm">لماذا المسابقة؟</label><textarea className="w-full bg-black/40 rounded p-2 text-white border border-white/20" rows={3} value={local.whyText} onChange={e=>update('whyText', e.target.value)} /></div>
           <div className="space-y-2"><label className="text-white/70 text-sm">الشروط</label><textarea className="w-full bg-black/40 rounded p-2 text-white border border-white/20" rows={3} value={local.termsText} onChange={e=>update('termsText', e.target.value)} /></div>
        </div>
      </GlassCard>

      <Button onClick={save} settings={settings} disabled={loading} className="w-full">
        {loading ? <Loader className="animate-spin" /> : <Save />} حفظ الإعدادات
      </Button>
    </div>
  );
};

const AdminSubmissions = ({ submissions, settings, onUpdateStatus, onEdit }) => {
  const [filter, setFilter] = useState('Pending');
  const list = submissions.filter(s => s.status === filter);

  return (
    <GlassCard settings={settings} className="p-6 animate-slideUp">
      <div className="flex gap-4 border-b border-white/10 mb-4 pb-2">
        {['Pending', 'Approved', 'Rejected'].map(status => (
          <button key={status} onClick={() => setFilter(status)} className={`pb-2 px-2 ${filter === status ? 'text-highlight-color border-b-2 border-highlight-color font-bold' : 'text-white/50'}`}>
            {status === 'Pending' ? 'قيد الانتظار' : status === 'Approved' ? 'مقبولة' : 'مرفوضة'} ({submissions.filter(s => s.status === status).length})
          </button>
        ))}
      </div>
      
      <div className="space-y-2 max-h-[500px] overflow-y-auto">
        {list.length === 0 && <p className="text-center text-white/40 py-10">لا توجد مشاركات هنا</p>}
        {list.map(sub => (
          <div key={sub.id} className="flex items-center justify-between bg-white/5 p-3 rounded hover:bg-white/10 transition">
            <div className="flex items-center gap-3 overflow-hidden">
              <img src={sub.thumbnailUrl} className="w-10 h-10 rounded object-cover" alt="" />
              <div className="truncate">
                <p className="font-bold text-white truncate">{sub.participantName}</p>
                <a href={sub.videoUrl} target="_blank" rel="noreferrer" className="text-xs text-highlight-color hover:underline truncate block">{sub.videoUrl}</a>
              </div>
            </div>
            <div className="flex gap-2 shrink-0">
              {filter === 'Pending' && (
                <>
                  <button onClick={() => onUpdateStatus(sub.id, 'Approved')} className="p-2 bg-green-600 rounded text-white hover:bg-green-700"><CheckCircle size={16} /></button>
                  <button onClick={() => onUpdateStatus(sub.id, 'Rejected')} className="p-2 bg-red-600 rounded text-white hover:bg-red-700"><X size={16} /></button>
                </>
              )}
              <button onClick={() => onEdit(sub)} className="p-2 bg-gray-600 rounded text-white hover:bg-gray-700"><SettingsIcon size={16} /></button>
            </div>
          </div>
        ))}
      </div>
    </GlassCard>
  );
};

// =========================================================================
// 5. MAIN APP COMPONENT (Logic Hub)
// =========================================================================

const ContestApp = () => {
  const [settings, setSettings] = useState(null);
  const [submissions, setSubmissions] = useState([]);
  const [user, setUser] = useState(null);
  const [adminTab, setAdminTab] = useState('settings'); // settings | submissions
  
  // Modals State
  const [modals, setModals] = useState({
    login: false,
    video: null,
    vote: null,
    footer: null,
    edit: null
  });

  const navigate = useNavigate();
  const secretClick = useRef(0);
  const voteCooldown = useRef(false);

  // --- Initialization ---
  useEffect(() => {
    if (!isFirebaseInitialized) return;

    // Auth Listener
    onAuthStateChanged(auth, (u) => setUser(u));

    // Settings Realtime
    const unsubConfig = onSnapshot(doc(db, PATHS.SETTINGS), (snap) => {
      if (snap.exists()) setSettings(snap.data());
      else setDoc(doc(db, PATHS.SETTINGS), DEFAULT_SETTINGS);
    });

    // Submissions Realtime
    const unsubSubs = onSnapshot(query(collection(db, PATHS.SUBMISSIONS)), (snap) => {
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setSubmissions(list);
    });

    return () => { unsubConfig(); unsubSubs(); };
  }, []);

  // --- Styles Update ---
  useEffect(() => {
    if (settings) {
      document.documentElement.style.setProperty('--main-color', settings.mainColor);
      document.documentElement.style.setProperty('--highlight-color', settings.highlightColor);
      document.documentElement.style.fontFamily = settings.appFont;
    }
  }, [settings]);

  // --- Handlers ---
  const toggleModal = (name, data = null) => setModals(prev => ({ ...prev, [name]: data }));

  const handleAdminLogin = async (e) => {
    e.preventDefault();
    const email = e.target.email.value;
    const pass = e.target.password.value;
    try {
      await signInWithEmailAndPassword(auth, email, pass);
      toggleModal('login', false);
      navigate('/admin');
    } catch (err) { alert("خطأ في الدخول"); }
  };

  const handleSecretClick = () => {
    secretClick.current += 1;
    if (secretClick.current === 5) {
      toggleModal('login', true);
      secretClick.current = 0;
    }
    setTimeout(() => secretClick.current = 0, 2000);
  };

  const handleVote = async () => {
    const sub = modals.vote;
    if (!sub || voteCooldown.current) return;
    
    voteCooldown.current = true;
    try {
      await updateDoc(doc(db, PATHS.SUBMISSIONS, sub.id), { votes: increment(1) });
      toggleModal('vote', null);
      setTimeout(() => voteCooldown.current = false, 1000);
    } catch (e) { console.error(e); }
  };

  const handleSubmission = async (e) => {
    e.preventDefault();
    const form = e.target;
    const countryName = form.country.value;
    const countryData = COUNTRIES.find(c => c.name === countryName);
    
    try {
      await addDoc(collection(db, PATHS.SUBMISSIONS), {
        participantName: form.name.value,
        country: countryName,
        flag: countryData?.flag || '🏳️',
        videoUrl: form.url.value,
        status: 'Pending',
        votes: 0,
        submittedAt: serverTimestamp(),
        thumbnailUrl: `https://placehold.co/600x900/333/fff?text=${encodeURIComponent(countryName)}`
      });
      alert("تم إرسال مشاركتك بنجاح!");
      form.reset();
    } catch (err) { alert("حدث خطأ"); }
  };

  const handleSaveSettings = async (newSettings) => {
    try {
      // استخدام merge: true لإصلاح مشكلة الحفظ
      await setDoc(doc(db, PATHS.SETTINGS), newSettings, { merge: true });
      alert("✅ تم حفظ الإعدادات");
    } catch (e) { alert("خطأ في الحفظ"); }
  };

  const handleEditSubmission = async (newSub) => {
     try {
       await setDoc(doc(db, PATHS.SUBMISSIONS, newSub.id), newSub, { merge: true });
       toggleModal('edit', null);
     } catch (e) { alert("خطأ في التعديل"); }
  };

  // --- Render Loading ---
  if (!settings) return <div className="h-screen bg-black flex items-center justify-center text-white"><Loader className="animate-spin" /></div>;

  // --- Render App ---
  return (
    <div className="min-h-screen bg-black text-white pb-20 selection:bg-highlight-color selection:text-black">
      <style>{`.text-highlight-color { color: var(--highlight-color) } .bg-main-color { background-color: var(--main-color) }`}</style>
      
      {/* Header */}
      <header className="sticky top-0 z-40 bg-black/80 backdrop-blur-md border-b border-white/10 p-4 flex justify-between items-center">
        <div className="flex items-center gap-3" onClick={() => navigate('/')}>
          {settings.logoUrl && <img src={settings.logoUrl} className="h-10 rounded" alt="Logo" />}
          <h1 className="font-bold text-lg md:text-xl tracking-wide">{settings.title}</h1>
        </div>
        <div className="flex gap-2">
          {(settings.stage === 'Voting' || settings.stage === 'Ended') && <Button onClick={() => document.getElementById('submission-form')?.scrollIntoView()} variant="primary" settings={settings} className="py-2 px-4 text-sm hidden md:flex">مشاركة جديدة</Button>}
          {user ? (
            <Button onClick={() => navigate('/admin')} variant="secondary" className="py-2 px-4 text-sm"><SettingsIcon size={16} /> الإعدادات</Button>
          ) : (
            <button onClick={() => toggleModal('login', true)} className="opacity-50 hover:opacity-100"><Lock size={16} /></button>
          )}
        </div>
      </header>

      <Routes>
        {/* صفحة الأدمن */}
        <Route path="/admin" element={
          user ? (
            <div className="container mx-auto p-4 max-w-4xl">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold flex items-center gap-2"><SettingsIcon /> لوحة التحكم</h2>
                <div className="flex gap-2">
                  <button onClick={() => setAdminTab('settings')} className={`px-4 py-2 rounded ${adminTab === 'settings' ? 'bg-white text-black' : 'bg-gray-800'}`}>الإعدادات</button>
                  <button onClick={() => setAdminTab('submissions')} className={`px-4 py-2 rounded ${adminTab === 'submissions' ? 'bg-white text-black' : 'bg-gray-800'}`}>المشاركات</button>
                  <button onClick={() => signOut(auth).then(() => navigate('/'))} className="px-4 py-2 bg-red-600 rounded text-white"><LogOut size={16} /></button>
                </div>
              </div>
              {adminTab === 'settings' ? 
                <AdminSettings settings={settings} onSave={handleSaveSettings} /> : 
                <AdminSubmissions submissions={submissions} settings={settings} onUpdateStatus={(id, status) => updateDoc(doc(db, PATHS.SUBMISSIONS, id), { status })} onEdit={(sub) => toggleModal('edit', sub)} />
              }
            </div>
          ) : <div className="h-[80vh] flex items-center justify-center"><p>يجب تسجيل الدخول</p></div>
        } />

        {/* الصفحة الرئيسية */}
        <Route path="/" element={
          <>
            {/* الشريط المتحرك */}
            <div className="bg-main-color py-2 overflow-hidden" style={{ backgroundColor: settings.mainColor }}>
              <div className="whitespace-nowrap animate-marquee font-bold text-black">{settings.marqueeText}</div>
            </div>

            <main className="container mx-auto px-4 py-8 space-y-12">
              {/* البانر الرئيسي */}
              <GlassCard settings={settings} className="p-6 text-center relative overflow-hidden">
                <div className="relative z-10">
                  <div className="inline-block p-3 rounded-full bg-white/10 mb-4 text-highlight-color">
                    {React.createElement(STAGES[settings.stage].icon, { size: 32 })}
                  </div>
                  <h2 className="text-3xl font-black mb-2">{STAGES[settings.stage].label}</h2>
                  <p className="text-white/60 max-w-2xl mx-auto">{settings.stage === 'Voting' ? 'صوت الآن لمشاركتك المفضلة!' : settings.whyText}</p>
                </div>
              </GlassCard>

              {/* عرض النتائج (Carousel) */}
              {(settings.stage === 'Voting' || settings.stage === 'Ended') && (
                <>
                  <LiveResultsCarousel submissions={submissions.filter(s => s.status === 'Approved').sort((a,b) => b.votes - a.votes)} settings={settings} />
                  
                  {/* شبكة الفيديوهات */}
                  <div className="flex justify-between items-center border-b border-white/10 pb-4">
                     <h3 className="text-2xl font-bold border-r-4 border-highlight-color pr-3">المشاركات</h3>
                     <span className="text-white/50">{submissions.filter(s => s.status === 'Approved').length} فيديو</span>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
                    {submissions.filter(s => s.status === 'Approved').map(sub => (
                      <div key={sub.id} onClick={() => toggleModal('video', sub)} className="group relative aspect-[9/16] bg-gray-800 rounded-xl overflow-hidden cursor-pointer hover:scale-[1.02] transition duration-300 border border-white/10 hover:border-highlight-color">
                        <img src={sub.thumbnailUrl} className="w-full h-full object-cover opacity-80 group-hover:opacity-100" alt="" />
                        <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent flex flex-col justify-end p-4">
                           <h4 className="font-bold truncate">{sub.participantName}</h4>
                           <div className="flex justify-between items-center mt-2">
                             <span className="text-xs bg-white/20 px-2 py-1 rounded">{sub.flag} {sub.country}</span>
                             <span className="font-bold text-highlight-color">{sub.votes}</span>
                           </div>
                           <Button onClick={(e) => { e.stopPropagation(); toggleModal('vote', sub); }} variant="primary" settings={settings} className="mt-3 py-2 text-sm w-full">تصويت</Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}

              {/* نموذج المشاركة */}
              {settings.stage === 'Submission' && (
                <GlassCard id="submission-form" settings={settings} className="max-w-xl mx-auto p-8">
                  <h3 className="text-2xl font-bold text-center mb-6">شاركنا إبداعك</h3>
                  <form onSubmit={handleSubmission}>
                    <InputField label="الاسم" id="name" placeholder="اسمك الكامل" />
                    <div className="mb-4">
                      <label className="block text-white/80 mb-2 text-sm">البلد</label>
                      <select id="country" className="w-full p-3 rounded-lg bg-black/40 border border-white/20 text-white">{COUNTRIES.map(c => <option key={c.code} value={c.name}>{c.flag} {c.name}</option>)}</select>
                    </div>
                    <InputField label="رابط تيك توك" id="url" placeholder="https://vm.tiktok.com/..." />
                    <Button settings={settings} className="w-full mt-4">إرسال المشاركة</Button>
                  </form>
                </GlassCard>
              )}
            </main>

            {/* الفوتر */}
            <footer className="border-t border-white/10 bg-black/50 backdrop-blur py-8 mt-12">
              <div className="container mx-auto text-center space-y-6">
                 <div className="flex justify-center gap-6 text-sm font-bold text-white/70">
                   <button onClick={() => toggleModal('footer', { title: 'لماذا المسابقة؟', content: settings.whyText })} className="hover:text-highlight-color">لماذا المسابقة؟</button>
                   <button onClick={() => toggleModal('footer', { title: 'الشروط', content: settings.termsText })} className="hover:text-highlight-color">الشروط والأحكام</button>
                   <button onClick={() => toggleModal('footer', { title: 'المنظمون', content: 'organizers' })} className="hover:text-highlight-color">المنظمون</button>
                 </div>
                 <p onClick={handleSecretClick} className="text-white/30 text-xs cursor-pointer select-none">© 2025 {settings.title}</p>
              </div>
            </footer>
          </>
        } />
      </Routes>

      {/* --- GLOBAL MODALS --- */}
      
      {/* 1. Login Modal */}
      <Modal isOpen={modals.login} onClose={() => toggleModal('login', false)} title="دخول المدير">
        <form onSubmit={handleAdminLogin} className="space-y-4">
          <InputField id="email" placeholder="البريد الإلكتروني" />
          <InputField id="password" type="password" placeholder="كلمة المرور" />
          <Button className="w-full">دخول</Button>
        </form>
      </Modal>

      {/* 2. Vote Confirmation */}
      <Modal isOpen={!!modals.vote} onClose={() => toggleModal('vote', null)} title="تأكيد التصويت">
        <div className="text-center space-y-6">
          <p className="text-lg">هل تريد التصويت للمشارك <span className="font-bold text-highlight-color">{modals.vote?.participantName}</span>؟</p>
          <div className="flex gap-4">
            <Button onClick={handleVote} settings={settings} className="flex-1">نعم، أصوت</Button>
            <Button onClick={() => toggleModal('vote', null)} variant="secondary" className="flex-1">إلغاء</Button>
          </div>
        </div>
      </Modal>

      {/* 3. Video Player */}
      <Modal isOpen={!!modals.video} onClose={() => toggleModal('video', null)} title={modals.video?.participantName || 'عرض'}>
        {modals.video && (
           <div className="space-y-4">
             <iframe src={`https://www.tiktok.com/embed/v2/${modals.video.videoUrl.split('/').pop()}?lang=ar`} className="w-full aspect-[9/16] rounded-lg border border-white/10" title="video"></iframe>
             <div className="flex justify-between items-center bg-white/5 p-3 rounded-lg">
                <div><span className="block text-xs text-white/50">الأصوات</span><span className="font-bold text-xl">{modals.video.votes}</span></div>
                <Button onClick={() => { toggleModal('vote', modals.video); toggleModal('video', null); }} settings={settings} className="py-2 text-sm">تصويت</Button>
             </div>
           </div>
        )}
      </Modal>

      {/* 4. Footer Info & Organizers */}
      <Modal isOpen={!!modals.footer} onClose={() => toggleModal('footer', null)} title={modals.footer?.title}>
        {modals.footer?.content === 'organizers' ? (
          <div className="space-y-4">
            {ORGANIZERS.map((org, i) => (
              <div key={i} className="flex items-center gap-4 bg-white/5 p-3 rounded-lg">
                <img src={org.img} className="w-12 h-12 rounded-full border border-white/20" alt="" />
                <div><p className="font-bold">{org.name}</p><p className="text-xs text-white/50">{org.role}</p></div>
              </div>
            ))}
          </div>
        ) : <p className="whitespace-pre-line leading-relaxed">{modals.footer?.content}</p>}
      </Modal>

      {/* 5. Edit Submission (Admin) */}
      <Modal isOpen={!!modals.edit} onClose={() => toggleModal('edit', null)} title="تعديل المشاركة">
        {modals.edit && (
          <div className="space-y-4">
            <InputField label="الاسم" value={modals.edit.participantName} onChange={v => setModals(p => ({...p, edit: {...p.edit, participantName: v}}))} />
            <InputField label="الأصوات" type="number" value={modals.edit.votes} onChange={v => setModals(p => ({...p, edit: {...p.edit, votes: Number(v)}}))} />
            <InputField label="الرابط" value={modals.edit.videoUrl} onChange={v => setModals(p => ({...p, edit: {...p.edit, videoUrl: v}}))} />
            <Button onClick={() => handleEditSubmission(modals.edit)} settings={settings} className="w-full">حفظ التعديلات</Button>
          </div>
        )}
      </Modal>

    </div>
  );
};

export default function App() {
  return <BrowserRouter><ContestApp /></BrowserRouter>;
}