import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  BrowserRouter,
  Routes,
  Route,
  useLocation,
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
  BarChart2,
  CheckCircle,
  Clock,
  Info,
  LogOut,
} from 'lucide-react';

// =========================================================================
// 1. FIREBASE & INITIALIZATION
// =========================================================================

const appId = 'ali-jabbar-week';

const userFirebaseConfig = {
  apiKey: "AIzaSyDUxC_2orwmSLL9iEBIkeohZKfH36MjZ4Y",
  authDomain: "ali-jabbar-week.firebaseapp.com",
  projectId: "ali-jabbar-week",
  storageBucket: "ali-jabbar-week.firebasestorage.app",
  messagingSenderId: "642187294882",
  appId: "1:642187294882:web:fe30f0016e5803a5e1bffb",
  measurementId: "G-8XSRK7TE1K",
};

const VITE_FIREBASE_API_KEY_PRESENT = userFirebaseConfig.apiKey !== '';

let isFirebaseInitialized = false;
let firebaseApp, db, auth;

if (VITE_FIREBASE_API_KEY_PRESENT) {
  try {
    const firebaseConfig = userFirebaseConfig;
    firebaseApp = initializeApp(firebaseConfig);
    db = getFirestore(firebaseApp);
    auth = getAuth(firebaseApp);
    isFirebaseInitialized = true;
  } catch (e) {
    console.error('Firebase Initialization Failed:', e);
    isFirebaseInitialized = false;
  }
} else {
  console.warn('Firebase API Key not found. Running in MOCK mode.');
}

const PUBLIC_SETTINGS_PATH = `artifacts/${appId}/public/data/settings/config`;
const PUBLIC_SUBMISSIONS_COLLECTION = `artifacts/${appId}/public/data/submissions`;

const retryOperation = async (operation, maxRetries = 3, delay = 1000) => {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await operation();
    } catch (error) {
      if (i === maxRetries - 1) {
        throw error;
      }
      await new Promise((resolve) =>
        setTimeout(resolve, delay * Math.pow(2, i))
      );
    }
  }
};

// =========================================================================
// 2. CONSTANTS
// =========================================================================
const STAGES = {
  Submission: { label: 'استقبال المشاركات', color: 'blue', icon: Clock },
  Voting: { label: 'التصويت مفتوح', color: 'yellow', icon: CheckCircle },
  Paused: { label: 'متوقفة مؤقتاً', color: 'red', icon: X },
  Ended: { label: 'إعلان النتائج', color: 'green', icon: Crown },
};

const COUNTRIES = [
  { name: 'الأردن', code: 'JO', flag: '🇯🇴' },
  { name: 'الإمارات', code: 'AE', flag: '🇦🇪' },
  { name: 'البحرين', code: 'BH', flag: '🇧🇭' },
  { name: 'الجزائر', code: 'DZ', flag: '🇩🇿' },
  { name: 'السعودية', code: 'SA', flag: '🇸🇦' },
  { name: 'السودان', code: 'SD', flag: '🇸🇩' },
  { name: 'الصومال', code: 'SO', flag: '🇸🇴' },
  { name: 'العراق', code: 'IQ', flag: '🇮🇶' },
  { name: 'الكويت', code: 'KW', flag: '🇰🇼' },
  { name: 'المغرب', code: 'MA', flag: '🇲🇦' },
  { name: 'اليمن', code: 'YE', flag: '🇾🇪' },
  { name: 'تونس', code: 'TN', flag: '🇹🇳' },
  { name: 'جزر القمر', code: 'KM', flag: '🇰🇲' },
  { name: 'جيبوتي', code: 'DJ', flag: '🇩🇯' },
  { name: 'سوريا', code: 'SY', flag: '🇸🇾' },
  { name: 'عُمان', code: 'OM', flag: '🇴🇲' },
  { name: 'فلسطين', code: 'PS', flag: '🇵🇸' },
  { name: 'قطر', code: 'QA', flag: '🇶🇦' },
  { name: 'لبنان', code: 'LB', flag: '🇱🇧' },
  { name: 'ليبيا', code: 'LY', flag: '🇱🇾' },
  { name: 'مصر', code: 'EG', flag: '🇪🇬' },
  { name: 'موريتانيا', code: 'MR', flag: '🇲🇷' },
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
  termsText:
    'الشروط والأحكام:\n- يجب أن يكون التصميم أصلياً.\n- يجب ألا ينتهك حقوق الملكية الفكرية.\n- يجب أن يكون المحتوى مناسباً للعرض العام.',
  whyText:
    'لماذا هذه المسابقة؟\nلتعزيز المحتوى العربي الإبداعي على منصة تيك توك ودعم المواهب الشابة في مجال صناعة الفيديو القصير.\nنشجع على الإبداع والابتكار!',
};

const MOCK_SUBMISSIONS = [
  {
    id: '1',
    participantName: 'نورة القحطاني',
    country: 'السعودية',
    votes: 890,
    status: 'Approved',
    videoUrl: 'https://www.tiktok.com/@tiktok/video/7279148301138855211',
    thumbnailUrl: 'https://placehold.co/600x900/fe2c55/25f4ee?text=SA',
    flag: '🇸🇦',
    submittedAt: new Date(Date.now() - 100000),
  },
  {
    id: '2',
    participantName: 'خالد المصري',
    country: 'مصر',
    votes: 750,
    status: 'Approved',
    videoUrl: 'https://www.tiktok.com/@tiktok/video/7279148301138855211',
    thumbnailUrl: 'https://placehold.co/600x900/25f4ee/fe2c55?text=EG',
    flag: '🇪🇬',
    submittedAt: new Date(Date.now() - 200000),
  },
  {
    id: '3',
    participantName: 'علي الكويتي',
    country: 'الكويت',
    votes: 580,
    status: 'Approved',
    videoUrl: 'https://www.tiktok.com/@tiktok/video/7279148301138855211',
    thumbnailUrl: 'https://placehold.co/600x900/25f4ee/000000?text=KW',
    flag: '🇰🇼',
    submittedAt: new Date(Date.now() - 400000),
  },
];

// =========================================================================
// 3. UTILITIES & COMPONENTS
// =========================================================================

const useAuth = () => {
  const [userId, setUserId] = useState(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    if (!isFirebaseInitialized || !auth) {
      setUserId('mock-user-id');
      setIsLoggedIn(false);
      return;
    }
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setUserId(user.uid);
        setIsLoggedIn(true);
      } else {
        setUserId('public-read-only');
        setIsLoggedIn(false);
      }
    });
    return () => unsubscribe();
  }, []);

  return { userId, isAuthReady: userId !== null, isLoggedIn };
};

const GlassCard = ({
  children,
  className = '',
  isGlassmorphism = true,
  color = 'bg-gray-700',
  onClick,
}) => {
  const glassClasses = isGlassmorphism
    ? 'bg-opacity-50 backdrop-blur-md shadow-xl border border-white/10'
    : 'shadow-2xl';
  return (
    <div 
      className={`p-4 rounded-xl ${color} ${glassClasses} ${className}`}
      onClick={onClick}
    >
      {children}
    </div>
  );
};

const AlertBanner = ({ settings }) => {
  const { stage, logoUrl, marqueeText, highlightColor, mainColor } = settings;
  const stageInfo = STAGES[stage];
  const pulseColor = highlightColor;
  const bannerBgColor = stage === 'Voting' ? mainColor : stage === 'Submission' ? '#2563eb' : '#b91c1c';
  const iconBorderColor = stage === 'Voting' ? highlightColor : stage === 'Submission' ? '#93c5fd' : '#fca5a5';

  return (
    <div
      className={`p-3 text-white border-r-4 rounded-lg flex items-center mb-6 shadow-2xl overflow-hidden`}
      style={{
        '--highlight-color-css': highlightColor,
        '--pulse-shadow': `0 0 10px 2px ${pulseColor}`,
        backgroundColor: bannerBgColor,
        borderColor: iconBorderColor,
      }}
    >
      <style>{`
        @keyframes pulse-effect {
            0%, 100% { box-shadow: 0 0 0 0 rgba(255, 255, 255, 0.7); }
            50% { box-shadow: var(--pulse-shadow); }
        }
        .pulse-animation { animation: pulse-effect 2s infinite ease-in-out; }
      `}</style>
      <div className={`pulse-animation p-1 rounded-full border-2 mr-4`} style={{ borderColor: iconBorderColor, maxHeight: '40px', maxWidth: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <stageInfo.icon className="w-5 h-5" />
      </div>
      <span className="font-bold ml-2 text-xl whitespace-nowrap">{stageInfo.label}</span>
      <span className="mr-auto text-lg truncate ml-4">{marqueeText}</span>
      <img src={logoUrl} alt="Logo" className="h-8 w-auto mr-2 rounded-lg" onError={(e) => (e.target.style.display = 'none')} />
    </div>
  );
};

const Modal = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" onClick={onClose}>
      <GlassCard isGlassmorphism className="w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center pb-3 border-b border-white/20">
          <h2 className="text-2xl font-bold text-white">{title}</h2>
          <button onClick={onClose} className="text-white hover:text-highlight-color transition">
            <X className="w-6 h-6" />
          </button>
        </div>
        <div className="pt-4 text-white text-lg leading-relaxed space-y-4">
          {typeof children === 'string' ? children.split('\n').map((paragraph, index) => <p key={index}>{paragraph}</p>) : children}
        </div>
      </GlassCard>
    </div>
  );
};

const AdminAuthModal = ({ isOpen, onClose, onAuthSuccess }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);
    if (!isFirebaseInitialized || !auth) {
      setError('خطأ: Firebase غير مهيأ.');
      setIsLoading(false);
      return;
    }
    try {
      await retryOperation(() => signInWithEmailAndPassword(auth, email, password));
      onAuthSuccess();
    } catch (e) {
      setError('فشل تسجيل الدخول.');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <GlassCard isGlassmorphism className="w-full max-w-sm" color="bg-gray-900" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-2xl font-bold text-white mb-6 text-center flex items-center justify-center">
          <Lock className="w-6 h-6 ml-2" /> تسجيل دخول المدير
        </h2>
        <form onSubmit={handleLogin} className="space-y-4">
          <input type="email" placeholder="البريد الإلكتروني" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full p-3 rounded-lg bg-gray-800/80 border border-white/20 text-white" required />
          <input type="password" placeholder="كلمة المرور" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full p-3 rounded-lg bg-gray-800/80 border border-white/20 text-white" required />
          {error && <p className="text-red-400 text-sm text-center">{error}</p>}
          <button type="submit" disabled={isLoading} className="w-full p-3 rounded-lg font-bold text-lg text-gray-900 transition" style={{ backgroundColor: `var(--main-color-css)` }}>{isLoading ? 'جاري الدخول...' : 'دخول'}</button>
          <button onClick={onClose} type="button" className="w-full text-white/70 hover:text-white transition">إلغاء</button>
        </form>
      </GlassCard>
    </div>
  );
};

const InputField = ({ label, id, value, onChange, type = 'text' }) => (
  <div className="mb-4">
    <label htmlFor={id} className="block text-white mb-2 font-medium">{label}</label>
    <input
      type={type}
      id={id}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full p-3 rounded-lg bg-gray-800/80 border border-white/20 text-white focus:ring-highlight-color focus:border-highlight-color transition duration-300"
      required
    />
  </div>
);

const SubmissionForm = ({ settings, userId }) => {
  const [formData, setFormData] = useState({
    participantName: '',
    country: COUNTRIES[0].name,
    videoUrl: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState(null);
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [error, setError] = useState(null);

  const validateForm = () => {
    if (!formData.participantName || !formData.country || !formData.videoUrl) {
      setError('الرجاء ملء جميع الحقول.');
      return false;
    }
    setError(null);
    return true;
  };

  const handleSubmit = () => {
    if (!validateForm()) return;
    setConfirmModalOpen(true);
  };

  const submitConfirmed = async () => {
    setConfirmModalOpen(false);
    setIsSubmitting(true);
    try {
      const countryData = COUNTRIES.find((c) => c.name === formData.country);
      const newSubmission = {
        ...formData,
        userId: userId,
        status: 'Pending',
        votes: 0,
        flag: countryData.flag,
        submittedAt: serverTimestamp(),
        thumbnailUrl: `https://placehold.co/600x900/${Math.floor(Math.random() * 16777215).toString(16)}/ffffff?text=${formData.country}`,
      };
      await retryOperation(() => addDoc(collection(db, PUBLIC_SUBMISSIONS_COLLECTION), newSubmission));
      setSuccessMessage('تم الإرسال بنجاح!');
      setFormData({ participantName: '', country: COUNTRIES[0].name, videoUrl: '' });
    } catch (e) {
      setError(`حدث خطأ: ${e.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <GlassCard isGlassmorphism={settings.useGlassmorphism} color="bg-gray-900" className="max-w-xl mx-auto mt-10">
      <h1 className="text-3xl font-bold text-center mb-6" style={{ color: `var(--main-color-css)` }}>{STAGES[settings.stage].label}</h1>
      {successMessage && <div className="bg-green-600/70 p-4 rounded-lg mb-4 text-white text-center">{successMessage}</div>}
      {error && <div className="bg-red-600/70 p-4 rounded-lg mb-4 text-white text-center">{error}</div>}
      <form onSubmit={(e) => { e.preventDefault(); handleSubmit(); }} className="space-y-4">
        <InputField label="الاسم" id="name" value={formData.participantName} onChange={(val) => setFormData({ ...formData, participantName: val })} />
        <div className="mb-4">
          <label className="block text-white mb-2 font-medium">البلد</label>
          <div className="relative">
            <select value={formData.country} onChange={(e) => setFormData({ ...formData, country: e.target.value })} className="appearance-none w-full p-3 rounded-lg bg-gray-800/80 border border-white/20 text-white focus:ring-highlight-color" style={{ backgroundImage: 'none' }}>
              {COUNTRIES.map((c) => <option key={c.code} value={c.name}>{c.flag} {c.name}</option>)}
            </select>
            <ChevronDown className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-white pointer-events-none" />
          </div>
        </div>
        <InputField label="رابط الفيديو (TikTok)" id="videoUrl" value={formData.videoUrl} onChange={(val) => setFormData({ ...formData, videoUrl: val })} />
        <button type="submit" disabled={isSubmitting} className="w-full p-3 rounded-lg font-bold text-lg text-gray-900 transition" style={{ backgroundColor: `var(--main-color-css)` }}>{isSubmitting ? 'جاري الإرسال...' : 'المشاركة'}</button>
      </form>
      <Modal isOpen={confirmModalOpen} onClose={() => setConfirmModalOpen(false)} title="تأكيد المشاركة">
        <p className="text-white text-center mb-4">هل أنت متأكد من الإرسال؟</p>
        <div className="flex justify-around">
          <button onClick={() => setConfirmModalOpen(false)} className="py-2 px-6 rounded-lg bg-red-600 text-white">تراجع</button>
          <button onClick={submitConfirmed} className="py-2 px-6 rounded-lg text-gray-900 font-bold" style={{ backgroundColor: `var(--main-color-css)` }}>تأكيد</button>
        </div>
      </Modal>
    </GlassCard>
  );
};

const ContestCard = ({ submission, settings, onVote, onOpenVideo }) => {
  const { participantName, country, flag, thumbnailUrl } = submission;
  return (
    <GlassCard isGlassmorphism={settings.useGlassmorphism} color="bg-gray-900" className="flex flex-col h-full overflow-hidden hover:shadow-highlight transition duration-300 cursor-pointer">
      <div className="relative overflow-hidden w-full aspect-[2/3] rounded-lg mb-3" onClick={() => onOpenVideo(submission)}>
        <img src={thumbnailUrl} alt={participantName} className="w-full h-full object-cover hover:scale-105 transition" onError={(e) => (e.target.src = 'https://placehold.co/600x900/6b7280/ffffff?text=Video')} />
      </div>
      <div className="flex flex-col flex-grow justify-between text-white p-2">
        <div className="flex justify-between items-start mb-2">
          <p className="text-lg font-bold truncate">{participantName}</p>
          <p className="text-sm flex items-center">{flag} {country}</p>
        </div>
        <button onClick={() => onVote(submission)} className="w-full p-3 rounded-lg font-bold text-gray-900 transition hover:scale-[1.02]" style={{ backgroundColor: `var(--main-color-css)` }}>صوت</button>
      </div>
    </GlassCard>
  );
};

const StatsCard = ({ submission, settings }) => {
  const { participantName, flag, country, votes, thumbnailUrl } = submission;
  return (
    <div className="relative w-full h-40 group [perspective:1000px] cursor-pointer">
      <style>{`.flip-container { transition: transform 0.6s; transform-style: preserve-3d; } .flip-container.flipped { transform: rotateY(180deg); } .front, .back { backface-visibility: hidden; position: absolute; top: 0; left: 0; width: 100%; height: 100%; } .back { transform: rotateY(180deg); }`}</style>
      <div className="flip-container h-full group-hover:flipped">
        <div className="front">
          <GlassCard isGlassmorphism={settings.useGlassmorphism} color="bg-gray-800" className="h-full p-2 flex flex-col items-center justify-center overflow-hidden">
            <img src={thumbnailUrl} alt={participantName} className="w-12 h-12 object-cover rounded-full mb-1 border-2" style={{ borderColor: `var(--highlight-color-css)` }} />
            <p className="text-xl font-extrabold text-white" style={{ color: `var(--highlight-color-css)` }}>{votes.toLocaleString()}</p>
            <p className="text-xs text-white truncate">{participantName}</p>
          </GlassCard>
        </div>
        <div className="back">
          <GlassCard isGlassmorphism={settings.useGlassmorphism} color="bg-gray-800" className="h-full p-2 flex flex-col items-center justify-center text-center">
            <p className="text-xs text-white/70">إجمالي الأصوات:</p>
            <p className="text-2xl font-extrabold" style={{ color: `var(--highlight-color-css)` }}>{votes.toLocaleString()}</p>
          </GlassCard>
        </div>
      </div>
    </div>
  );
};

const LiveResultsView = ({ approvedSubmissions, settings }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const perSlide = 4;
  const rankedSubmissions = useMemo(() => [...approvedSubmissions].sort((a, b) => b.votes - a.votes), [approvedSubmissions]);
  const topThree = rankedSubmissions.slice(0, 3);
  const remainingSubmissions = rankedSubmissions.slice(3);
  const numSlides = Math.ceil(remainingSubmissions.length / perSlide);

  useEffect(() => {
    if (numSlides <= 1) return;
    const autoSlideTimer = setInterval(() => setCurrentIndex((prev) => (prev + 1) % numSlides), 5000);
    return () => clearInterval(autoSlideTimer);
  }, [numSlides]);

  if (rankedSubmissions.length === 0) return null;

  return (
    <GlassCard isGlassmorphism={settings.useGlassmorphism} color="bg-gray-800" className="p-4 mb-6 shadow-2xl">
      <h2 className="text-2xl font-extrabold text-white mb-4 border-b border-white/20 pb-2" style={{ color: `var(--highlight-color-css)` }}>النتائج المباشرة</h2>
      <div className="flex justify-around gap-2 mb-6">
        {topThree.map((sub, index) => (
          <div key={sub.id} className="w-1/3 flex flex-col items-center p-3 text-center rounded-lg" style={{ border: `2px solid ${index === 0 ? settings.highlightColor : settings.mainColor}` }}>
            <img src={sub.thumbnailUrl} className="w-12 h-12 rounded-full mb-2" alt="" />
            <p className="text-lg font-bold text-white">{sub.votes}</p>
            <p className="text-sm text-white">{sub.participantName}</p>
          </div>
        ))}
      </div>
      {remainingSubmissions.length > 0 && (
        <div className="grid grid-cols-4 gap-4">
          {remainingSubmissions.slice(currentIndex * perSlide, currentIndex * perSlide + perSlide).map((sub) => (
            <StatsCard key={sub.id} submission={sub} settings={settings} />
          ))}
        </div>
      )}
    </GlassCard>
  );
};

const Home = ({ settings, allSubmissions, totalApproved, onVote, cooldown, setVoteConfirmData }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const approvedSubmissions = useMemo(() => [...allSubmissions].filter((sub) => sub.status === 'Approved').sort((a, b) => b.votes - a.votes), [allSubmissions]);
  const filteredSubmissions = useMemo(() => {
    if (!searchTerm) return approvedSubmissions;
    return approvedSubmissions.filter((sub) => sub.participantName.includes(searchTerm) || sub.country.includes(searchTerm));
  }, [approvedSubmissions, searchTerm]);

  if (settings.stage === 'Submission') return <SubmissionForm settings={settings} userId={null} />;
  if (settings.stage === 'Paused') return <GlassCard color="bg-gray-900" className="mt-10 p-8 text-center text-white"><AlertTriangle className="mx-auto mb-4 text-red-500" size={48} /><h2>المسابقة متوقفة</h2></GlassCard>;

  return (
    <div className="container mx-auto p-4">
      <AlertBanner settings={settings} />
      <LiveResultsView approvedSubmissions={approvedSubmissions} settings={settings} />
      <div className="mb-6 relative">
        <input type="text" placeholder="بحث..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full p-3 pr-10 rounded-lg bg-gray-900 border border-white/10 text-white" />
        <Search className="absolute right-3 top-3.5 text-white/50" />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
        {filteredSubmissions.map((sub) => (
          <ContestCard key={sub.id} submission={sub} settings={settings} onVote={setVoteConfirmData} onOpenVideo={() => {}} />
        ))}
      </div>
    </div>
  );
};

const AdminSettingsPanel = ({ settings, onSaveSettings }) => {
  // ✅ FIX: Using local state for inputs to prevent freezing/losing focus
  const [localSettings, setLocalSettings] = useState(settings);
  const [isDirty, setIsDirty] = useState(false);

  // Sync only when settings change externally and user isn't typing
  useEffect(() => {
    if (!isDirty && settings) {
      setLocalSettings(settings);
    }
  }, [settings, isDirty]);

  const handleChange = (field, value) => {
    setIsDirty(true);
    setLocalSettings(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = () => {
    onSaveSettings(localSettings);
    setIsDirty(false); // Reset dirty flag after save
  };

  return (
    <GlassCard isGlassmorphism color="bg-gray-900" className="p-6">
      <h3 className="text-xl font-bold text-white mb-4">الإعدادات العامة</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <InputField label="عنوان المسابقة" id="title" value={localSettings.title} onChange={(val) => handleChange('title', val)} />
          <InputField label="رابط الشعار" id="logo" value={localSettings.logoUrl} onChange={(val) => handleChange('logoUrl', val)} />
          <div className="mb-4">
            <label className="block text-white mb-2">اللون الأساسي</label>
            <input type="color" value={localSettings.mainColor} onChange={(e) => handleChange('mainColor', e.target.value)} className="w-full h-10" />
          </div>
        </div>
        <div>
          <div className="mb-4">
            <label className="block text-white mb-2">المرحلة</label>
            <select value={localSettings.stage} onChange={(e) => handleChange('stage', e.target.value)} className="w-full p-3 bg-gray-800 text-white rounded">
              {Object.keys(STAGES).map(k => <option key={k} value={k}>{STAGES[k].label}</option>)}
            </select>
          </div>
          <InputField label="نص الشريط" id="marquee" value={localSettings.marqueeText} onChange={(val) => handleChange('marqueeText', val)} />
        </div>
      </div>
      <button onClick={handleSave} className="w-full mt-4 p-3 font-bold rounded text-gray-900" style={{ backgroundColor: localSettings.mainColor }}>حفظ الإعدادات</button>
    </GlassCard>
  );
};

const AdminSubmissionsPanel = ({ submissions, onUpdateSubmissionStatus }) => {
  const [filter, setFilter] = useState('Pending');
  const filtered = submissions.filter(s => s.status === filter);

  return (
    <GlassCard isGlassmorphism color="bg-gray-900" className="p-6 mt-6">
      <h3 className="text-xl font-bold text-white mb-4">إدارة المشاركات</h3>
      <div className="flex gap-4 mb-4 border-b border-white/20 pb-2">
        {['Pending', 'Approved', 'Rejected'].map(s => (
          <button key={s} onClick={() => setFilter(s)} className={`text-white ${filter === s ? 'font-bold underline' : 'opacity-50'}`}>{s}</button>
        ))}
      </div>
      <div className="space-y-2 max-h-96 overflow-y-auto">
        {filtered.map(sub => (
          <div key={sub.id} className="flex justify-between items-center bg-white/5 p-2 rounded">
            <span className="text-white">{sub.participantName} ({sub.votes})</span>
            <div className="flex gap-2">
               <button onClick={() => onUpdateSubmissionStatus(sub.id, 'Approved')} className="text-green-500">قبول</button>
               <button onClick={() => onUpdateSubmissionStatus(sub.id, 'Rejected')} className="text-red-500">رفض</button>
            </div>
          </div>
        ))}
      </div>
    </GlassCard>
  );
};

const ContestApp = ({ isAdminRoute }) => {
  const [settings, setSettings] = useState(null);
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [voteConfirmData, setVoteConfirmData] = useState(null);
  const { isLoggedIn } = useAuth();
  const [cooldown, setCooldown] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    if (settings) {
      document.documentElement.style.setProperty('--main-color-css', settings.mainColor);
      document.documentElement.style.setProperty('--highlight-color-css', settings.highlightColor);
    }
  }, [settings]);

  useEffect(() => {
    if (!isFirebaseInitialized) {
        setSettings(DEFAULT_SETTINGS);
        setSubmissions(MOCK_SUBMISSIONS);
        setLoading(false);
        return;
    }
    const unsubSettings = onSnapshot(doc(db, PUBLIC_SETTINGS_PATH), (snap) => {
      if (snap.exists()) setSettings(snap.data());
      else setDoc(doc(db, PUBLIC_SETTINGS_PATH), DEFAULT_SETTINGS);
      setLoading(false);
    });
    const unsubSubs = onSnapshot(collection(db, PUBLIC_SUBMISSIONS_COLLECTION), (snap) => {
      setSubmissions(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => { unsubSettings(); unsubSubs(); };
  }, []);

  const handleSaveSettings = async (newSettings) => {
    try {
      // FIX: Using merge: true ensures we don't overwrite the whole document if fields are missing
      await setDoc(doc(db, PUBLIC_SETTINGS_PATH), newSettings, { merge: true });
      alert('تم الحفظ!');
    } catch (e) { alert('خطأ في الحفظ'); }
  };

  const handleVote = async (sub) => {
    if (cooldown > 0) return;
    try {
      await updateDoc(doc(db, PUBLIC_SUBMISSIONS_COLLECTION, sub.id), { votes: increment(1) });
      setCooldown(10);
      setVoteConfirmData(null);
    } catch (e) { console.error(e); }
  };

  useEffect(() => {
     if (cooldown > 0) {
         const t = setInterval(() => setCooldown(c => c - 1), 1000);
         return () => clearInterval(t);
     }
  }, [cooldown]);

  if (loading) return <div className="h-screen bg-black flex items-center justify-center text-white">Loading...</div>;

  return (
    <div className="min-h-screen bg-black font-sans">
      <header className="p-4 flex justify-between items-center bg-black/50 sticky top-0 z-40 border-b border-white/10">
        <h1 className="text-white text-xl font-bold cursor-pointer" onClick={() => navigate('/')}>{settings?.title}</h1>
        {isAdminRoute && isLoggedIn && <button onClick={() => { signOut(auth); navigate('/'); }} className="text-red-500">خروج</button>}
        {!isLoggedIn && <button onClick={() => setAuthModalOpen(true)} className="text-white/50"><Lock size={16} /></button>}
      </header>
      
      <main className="pb-20">
        {isAdminRoute && isLoggedIn ? (
          <div className="container mx-auto p-4">
             <AdminSettingsPanel settings={settings} onSaveSettings={handleSaveSettings} />
             <AdminSubmissionsPanel submissions={submissions} onUpdateSubmissionStatus={(id, status) => updateDoc(doc(db, PUBLIC_SUBMISSIONS_COLLECTION, id), { status })} />
          </div>
        ) : (
          <Home settings={settings} allSubmissions={submissions} onVote={setVoteConfirmData} />
        )}
      </main>
      
      <footer className="fixed bottom-0 w-full bg-gray-900 p-4 text-center text-white/50 text-xs border-t border-white/10">© {settings?.title}</footer>
      
      <AdminAuthModal isOpen={authModalOpen} onClose={() => setAuthModalOpen(false)} onAuthSuccess={() => { setAuthModalOpen(false); navigate('/admin'); }} />
      
      <Modal isOpen={!!voteConfirmData} onClose={() => setVoteConfirmData(null)} title="تأكيد التصويت">
         <p className="text-white text-center mb-4">تصويت لـ {voteConfirmData?.participantName}؟</p>
         <button onClick={() => handleVote(voteConfirmData)} className="w-full p-3 rounded font-bold text-gray-900" style={{ backgroundColor: settings?.mainColor }}>تأكيد</button>
      </Modal>
    </div>
  );
};

const App = () => (
  <BrowserRouter>
    <Routes>
      <Route path="/" element={<ContestApp isAdminRoute={false} />} />
      <Route path="/admin" element={<ContestApp isAdminRoute={true} />} />
    </Routes>
  </BrowserRouter>
);

export default App;