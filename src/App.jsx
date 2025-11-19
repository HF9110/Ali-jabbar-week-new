import React, { useState, useEffect, useMemo, useRef } from 'react';
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
  updateDoc,
  addDoc,
  getDocs,
  limit,
  getDoc,
  serverTimestamp,
  increment,
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
} from 'lucide-react';

// =========================================================================
// 1. FIREBASE & INITIALIZATION (VITE INTEGRATION)
// =========================================================================

const appId = 'ali-jabbar-week';

const getEnvVar = (key, fallback) => {
  try {
    if (
      typeof import.meta !== 'undefined' &&
      import.meta.env &&
      import.meta.env[key]
    ) {
      return import.meta.env[key];
    }
  } catch (e) {
    // تجاهل الأخطاء
  }
  return fallback;
};

const VITE_FIREBASE_API_KEY = getEnvVar(
  'VITE_FIREBASE_API_KEY',
  'AIzaSyDUxC_2orwmSLL9iEBIkeohZKfH36MjZ4Y'
);

const userFirebaseConfig = {
  apiKey: VITE_FIREBASE_API_KEY,
  authDomain: 'ali-jabbar-week.firebaseapp.com',
  projectId: 'ali-jabbar-week',
  storageBucket: 'ali-jabbar-week.firebasestorage.app',
  messagingSenderId: '642187294882',
  appId: '1:642187294882:web:fe30f0016e5803a5e1bffb',
  measurementId: 'G-8XSRK7TE1K',
};
const firebaseConfig =
  Object.keys(userFirebaseConfig).length > 0 ? userFirebaseConfig : {};

let firebaseApp, db, auth;
if (Object.keys(firebaseConfig).length) {
  try {
    firebaseApp = initializeApp(firebaseConfig);
    db = getFirestore(firebaseApp);
    auth = getAuth(firebaseApp);
  } catch (e) {
    console.error('Firebase Initialization Failed:', e);
  }
} else {
  console.error('Firebase configuration not found. Running in mock mode.');
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
// 2. CONSTANTS & MOCK DATA
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
    thumbnailUrl: 'https://placehold.co/600x900/fe2c55/25f4ee?text=890',
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
    thumbnailUrl: 'https://placehold.co/600x900/25f4ee/fe2c55?text=750',
    flag: '🇪🇬',
    submittedAt: new Date(Date.now() - 200000),
  },
  {
    id: '3',
    participantName: 'فاطمة المغربي',
    country: 'المغرب',
    votes: 620,
    status: 'Approved',
    videoUrl: 'https://www.tiktok.com/@tiktok/video/7279148301138855211',
    thumbnailUrl: 'https://placehold.co/600x900/fe2c55/ffffff?text=620',
    flag: '🇲🇦',
    submittedAt: new Date(Date.now() - 300000),
  },
  {
    id: '4',
    participantName: 'علي الكويتي',
    country: 'الكويت',
    votes: 580,
    status: 'Approved',
    videoUrl: 'https://www.tiktok.com/@tiktok/video/7279148301138855211',
    thumbnailUrl: 'https://placehold.co/600x900/25f4ee/000000?text=580',
    flag: '🇰🇼',
    submittedAt: new Date(Date.now() - 400000),
  },
  {
    id: '5',
    participantName: 'زينب الهاشمي',
    country: 'الأردن',
    votes: 410,
    status: 'Approved',
    videoUrl: 'https://www.tiktok.com/@tiktok/video/7279148301138855211',
    thumbnailUrl: 'https://placehold.co/600x900/fe2c55/25f4ee?text=410',
    flag: '🇯🇴',
    submittedAt: new Date(Date.now() - 500000),
  },
  {
    id: '8',
    participantName: 'سالم العلي',
    country: 'قطر',
    votes: 350,
    status: 'Approved',
    videoUrl: 'https://www.tiktok.com/@tiktok/video/7279148301138855211',
    thumbnailUrl: 'https://placehold.co/600x900/25f4ee/fe2c55?text=350',
    flag: '🇶🇦',
    submittedAt: new Date(Date.now() - 800000),
  },
];

// =========================================================================
// 3. CORE COMPONENTS (UTILITIES, MODALS, LAYOUT)
// =========================================================================

/** Custom hook for managing Firebase authentication state. */
const useAuth = () => {
  const [userId, setUserId] = useState(null);

  useEffect(() => {
    if (!auth) {
      setUserId('mock-user-id');
      return;
    }

    const unsubscribe = onAuthStateChanged(
      auth,
      (user) => {
        if (user) {
          setUserId(user.uid);
        } else {
          setUserId('public-read-only');
        }
      },
      (error) => {
        console.error('Firebase Auth State Error:', error);
        setUserId('public-read-only');
      }
    );

    return () => unsubscribe();
  }, []);

  return { userId, isAuthReady: userId !== null };
};

/** Glassmorphism Card Wrapper */
const GlassCard = ({
  children,
  className = '',
  isGlassmorphism = true,
  color = 'bg-gray-700',
}) => {
  const glassClasses = isGlassmorphism
    ? 'bg-opacity-50 backdrop-blur-md shadow-xl border border-white/10'
    : 'shadow-2xl';
  return (
    <div className={`p-4 rounded-xl ${color} ${glassClasses} ${className}`}>
      {children}
    </div>
  );
};

/** Alert Banner */
const AlertBanner = ({ settings }) => {
  const { stage, logoUrl, marqueeText, highlightColor, mainColor } = settings;
  const stageInfo = STAGES[stage];

  const pulseColor = highlightColor;
  const bannerBgColor =
    stage === 'Voting'
      ? mainColor
      : stage === 'Submission'
      ? '#2563eb'
      : '#b91c1c';
  const iconBorderColor =
    stage === 'Voting'
      ? highlightColor
      : stage === 'Submission'
      ? '#93c5fd'
      : '#fca5a5';

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
      <div
        className={`pulse-animation p-1 rounded-full border-2 mr-4`}
        style={{ borderColor: iconBorderColor, maxHeight: '40px', maxWidth: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      >
        <stageInfo.icon className="w-5 h-5" />
      </div>
      <span className="font-bold ml-2 text-xl whitespace-nowrap">{stageInfo.label}</span>
      <span className="mr-auto text-lg truncate ml-4">{marqueeText}</span>
      <img
        src={logoUrl}
        alt="Logo"
        className="h-8 w-auto mr-2 rounded-lg"
        onError={(e) => (e.target.style.display = 'none')}
      />
    </div>
  );
};

/** Generic Modal Component */
const Modal = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;

  const modalRef = useRef(null);
  const handleOutsideClick = (e) => {
    if (modalRef.current && e.target === modalRef.current) {
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
      onClick={handleOutsideClick}
      ref={modalRef}
    >
      <GlassCard
        isGlassmorphism
        className="w-full max-w-2xl max-h-[90vh] overflow-y-auto"
      >
        <div className="flex justify-between items-center pb-3 border-b border-white/20">
          <h2 className="text-2xl font-bold text-white">{title}</h2>
          <button
            onClick={onClose}
            className="text-white hover:text-highlight-color transition"
          >
            <X className="w-6 h-6" />
          </button>
        </div>
        <div className="pt-4 text-white text-lg leading-relaxed space-y-4">
          {typeof children === 'string'
            ? children
                .split('\n')
                .map((paragraph, index) => <p key={index}>{paragraph}</p>)
            : children}
        </div>
      </GlassCard>
    </div>
  );
};

/** Admin Auth Form (Inline/Page component) */
const AdminAuthForm = ({ onAuthSuccess, settings }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    if (!auth) {
      setError('خطأ: Firebase غير مهيأ.');
      setIsLoading(false);
      return;
    }

    try {
      await retryOperation(() =>
        signInWithEmailAndPassword(auth, email, password)
      );
      onAuthSuccess();
    } catch (e) {
      setError('فشل تسجيل الدخول. تأكد من البريد الإلكتروني وكلمة المرور.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <GlassCard
      isGlassmorphism={settings.useGlassmorphism}
      className="w-full max-w-lg mx-auto my-20 p-8"
      color="bg-gray-900"
    >
      <h2 className="text-3xl font-bold text-white mb-8 text-center flex items-center justify-center">
        <Lock className="w-7 h-7 ml-3" />
        الدخول إلى لوحة التحكم
      </h2>

      <form onSubmit={handleLogin} className="space-y-6">
        <div className="relative">
          <Mail className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-white/50" />
          <input
            type="email"
            placeholder="البريد الإلكتروني"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full p-4 pr-12 rounded-lg bg-gray-800/80 border border-white/20 text-white focus:ring-highlight-color focus:border-highlight-color transition"
            required
          />
        </div>

        <div className="relative">
          <Key className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-white/50" />
          <input
            type="password"
            placeholder="كلمة المرور"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full p-4 pr-12 rounded-lg bg-gray-800/80 border border-white/20 text-white focus:ring-highlight-color focus:border-highlight-color transition"
            required
          />
        </div>

        {error && <p className="text-red-400 text-sm text-center font-bold">{error}</p>}

        <button
          type="submit"
          disabled={isLoading}
          className="w-full p-4 rounded-lg font-bold text-xl text-gray-900 transition duration-300 disabled:opacity-50 shadow-lg hover:opacity-90"
          style={{ backgroundColor: settings.mainColor }}
        >
          {isLoading ? 'جاري الدخول...' : 'دخول'}
        </button>
      </form>
    </GlassCard>
  );
};


const InputField = ({ label, id, value, onChange, type = 'text' }) => (
  <div className="mb-4">
    <label htmlFor={id} className="block text-white mb-2 font-medium">
      {label}
    </label>
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
      setError('الرجاء ملء جميع الحقول المطلوبة.');
      return false;
    }
    if (!formData.videoUrl.startsWith('http')) {
      setError('رابط التصميم يجب أن يكون رابطاً صالحاً.');
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
      if (!db) {
        setError('خطأ: قاعدة البيانات غير مهيأة.');
        setIsSubmitting(false);
        return;
      }
      const countryData = COUNTRIES.find((c) => c.name === formData.country);
      const newSubmission = {
        ...formData,
        userId: userId,
        status: 'Pending',
        votes: 0,
        flag: countryData.flag,
        submittedAt: serverTimestamp(),
        thumbnailUrl: `https://placehold.co/600x900/${Math.floor(
          Math.random() * 16777215
        ).toString(16)}/ffffff?text=${formData.country}`,
      };
      await retryOperation(() =>
        addDoc(collection(db, PUBLIC_SUBMISSIONS_COLLECTION), newSubmission)
      );
      setSuccessMessage('تم إرسال مشاركتك بنجاح! سيتم مراجعتها قريباً.');
      setFormData({
        participantName: '',
        country: COUNTRIES[0].name,
        videoUrl: '',
      });
    } catch (e) {
      setError(`حدث خطأ أثناء الإرسال: ${e.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const CountryDropdown = ({ value, onChange }) => (
    <div className="mb-4">
      <label htmlFor="country" className="block text-white mb-2 font-medium">
        البلد
      </label>
      <div className="relative">
        <select
          id="country"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="appearance-none w-full p-3 rounded-lg bg-gray-800/80 border border-white/20 text-white focus:ring-highlight-color focus:border-highlight-color transition duration-300 pr-10"
          style={{ backgroundImage: 'none' }}
          required
        >
          {COUNTRIES.map((country) => (
            <option key={country.code} value={country.name}>
              {country.flag} {country.name}
            </option>
          ))}
        </select>
        <ChevronDown className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-white pointer-events-none" />
      </div>
    </div>
  );

  return (
    <GlassCard
      isGlassmorphism={settings.useGlassmorphism}
      color="bg-gray-900"
      className="max-w-xl mx-auto mt-10"
    >
      <h1
        className="text-3xl font-bold text-center mb-6"
        style={{ color: `var(--main-color-css)` }}
      >
        {STAGES[settings.stage].label}
      </h1>
      {successMessage && (
        <div className="bg-green-600/70 p-4 rounded-lg mb-4 text-white text-center font-semibold">
          {successMessage}
        </div>
      )}
      {error && (
        <div className="bg-red-600/70 p-4 rounded-lg mb-4 text-white text-center font-semibold">
          {error}
        </div>
      )}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSubmit();
        }}
        className="space-y-4"
      >
        <InputField
          label="اسم الحساب / المشارك"
          id="name"
          value={formData.participantName}
          onChange={(val) => setFormData({ ...formData, participantName: val })}
        />
        <CountryDropdown
          value={formData.country}
          onChange={(val) => setFormData({ ...formData, country: val })}
        />
        <InputField
          label="رابط تصميم الفيديو (TikTok URL)"
          id="videoUrl"
          value={formData.videoUrl}
          onChange={(val) => setFormData({ ...formData, videoUrl: val })}
        />
        <p className="text-sm text-white/70 mt-2">
          <Info className="w-4 h-4 inline-block mr-1" /> يمكنك إرسال تصميم آخر
          بعد اكتمال المراجعة.
        </p>
        <div className="pt-4">
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full p-3 rounded-lg font-bold text-lg text-gray-900 transition duration-300 disabled:opacity-50"
            style={{ backgroundColor: `var(--main-color-css)` }}
          >
            {isSubmitting ? 'جاري الإرسال...' : 'المشاركة'}
          </button>
        </div>
      </form>
      <Modal
        isOpen={confirmModalOpen}
        onClose={() => setConfirmModalOpen(false)}
        title="تأكيد المشاركة"
      >
        <p className="text-white text-center text-xl mb-4">
          هل أنت متأكد من صحة المعلومات وإرسال هذا التصميم للمسابقة؟
        </p>
        <div className="bg-gray-800/80 p-4 rounded-lg text-sm mb-6">
          <p>
            <strong>الاسم:</strong> {formData.participantName}
          </p>
          <p>
            <strong>البلد:</strong> {formData.country}
          </p>
          <p>
            <strong>الرابط:</strong> {formData.videoUrl}
          </p>
        </div>
        <div className="flex justify-around">
          <button
            onClick={() => setConfirmModalOpen(false)}
            className="py-2 px-6 rounded-lg bg-red-600 hover:bg-red-700 text-white font-semibold transition"
          >
            لا، تراجع
          </button>
          <button
            onClick={submitConfirmed}
            className="py-2 px-6 rounded-lg text-gray-900 font-semibold transition"
            style={{ backgroundColor: `var(--main-color-css)` }}
          >
            نعم، أنا متأكد
          </button>
        </div>
      </Modal>
    </GlassCard>
  );
};

const ContestCard = ({ submission, settings, onVote, onOpenVideo }) => {
  const { participantName, country, flag, thumbnailUrl } = submission;
  return (
    <GlassCard
      isGlassmorphism={settings.useGlassmorphism}
      color="bg-gray-900"
      className="flex flex-col h-full overflow-hidden hover:shadow-highlight transition duration-300 cursor-pointer"
    >
      <div
        className="relative overflow-hidden w-full aspect-[2/3] rounded-lg mb-3"
        onClick={() => onOpenVideo(submission)}
      >
        <img
          src={thumbnailUrl}
          alt={`Thumbnail for ${participantName}`}
          className="w-full h-full object-cover transition duration-300 transform hover:scale-105"
          onError={(e) =>
            (e.target.src =
              'https://placehold.co/600x900/6b7280/ffffff?text=Video')
          }
        />
        <div className="absolute inset-0 bg-black/20 hover:bg-black/0 transition duration-300 flex items-center justify-center">
          <svg
            className="w-10 h-10 text-white opacity-70 hover:opacity-100"
            fill="currentColor"
            viewBox="0 0 24 24"
          >
            <path d="M6 5v14l12-7z" />
          </svg>
        </div>
      </div>
      <div className="flex flex-col flex-grow justify-between text-white p-2">
        <div className="flex justify-between items-start mb-2">
          <p className="text-lg font-bold truncate">{participantName}</p>
          <p className="text-sm flex items-center">
            {flag} {country}
          </p>
        </div>
        <button
          onClick={() => onVote(submission)}
          className="w-full p-3 rounded-lg font-bold text-gray-900 transition duration-300 hover:scale-[1.02]"
          style={{
            backgroundColor: `var(--main-color-css)`,
            color: `var(--highlight-color-css)` ? '#000' : '#fff',
          }}
        >
          صوت
        </button>
      </div>
    </GlassCard>
  );
};

const StatsCard = ({ submission, settings }) => {
  const { participantName, flag, country, votes, thumbnailUrl, submittedAt } =
    submission;
  const submittedDate =
    submittedAt instanceof Date
      ? submittedAt
      : submittedAt && typeof submittedAt.toDate === 'function'
      ? submittedAt.toDate()
      : new Date();
  const formattedDate = submittedDate.toLocaleDateString('ar-EG', {
    day: 'numeric',
    month: 'short',
  });

  return (
    <div className="relative w-full h-40 group [perspective:1000px] cursor-pointer">
      <style>{`.flip-container { transition: transform 0.6s; transform-style: preserve-3d; } .flip-container.flipped { transform: rotateY(180deg); } .front, .back { backface-visibility: hidden; position: absolute; top: 0; left: 0; width: 100%; height: 100%; } .back { transform: rotateY(180deg); }`}</style>
      <div className="flip-container h-full group-hover:flipped">
        <div className="front">
          <GlassCard
            isGlassmorphism={settings.useGlassmorphism}
            color="bg-gray-800"
            className="h-full p-2 flex flex-col items-center justify-center overflow-hidden"
          >
            <img
              src={thumbnailUrl}
              alt={`Thumbnail for ${participantName}`}
              className="w-12 h-12 object-cover rounded-full mb-1 border-2"
              style={{ borderColor: `var(--highlight-color-css)` }}
              onError={(e) =>
                (e.target.src =
                  'https://placehold.co/40x40/6b7280/ffffff?text=X')
              }
            />
            <p
              className="text-xl font-extrabold text-white"
              style={{ color: `var(--highlight-color-css)` }}
            >
              {votes.toLocaleString()}
            </p>
            <p className="text-xs text-white truncate w-full text-center">
              {participantName}
            </p>
            <p className="text-xs text-white/70">
              {flag} {country}
            </p>
          </GlassCard>
        </div>
        <div className="back">
          <GlassCard
            isGlassmorphism={settings.useGlassmorphism}
            color="bg-gray-800"
            className="h-full p-2 flex flex-col items-center justify-center text-center"
          >
            <p className="text-xs text-white/70 mb-1">تاريخ التقديم:</p>
            <p className="text-sm font-semibold text-white">{formattedDate}</p>
            <div
              className="h-px w-1/2 my-2"
              style={{ backgroundColor: `var(--main-color-css)` }}
            />
            <p className="text-xs text-white/70 mb-1">إجمالي الأصوات:</p>
            <p
              className="text-2xl font-extrabold text-white"
              style={{ color: `var(--highlight-color-css)` }}
            >
              {votes.toLocaleString()}
            </p>
          </GlassCard>
        </div>
      </div>
    </div>
  );
};

const VideoModal = ({
  isOpen,
  onClose,
  submission,
  settings,
  onVote,
  cooldown,
}) => {
  if (!isOpen || !submission) return null;
  const videoId = submission.videoUrl.split('/').pop().split('?')[0];
  const tiktokEmbedUrl = `https://www.tiktok.com/embed/v2/${videoId}?lang=en-US`;

  const modalRef = useRef(null);
  const handleOutsideClick = (e) => {
    if (modalRef.current && e.target === modalRef.current) {
      onClose();
    }
  };


  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm"
      onClick={handleOutsideClick}
      ref={modalRef}
    >
      <GlassCard
        isGlassmorphism={settings.useGlassmorphism}
        color="bg-gray-900"
        className="w-full max-w-xl max-h-[95vh] overflow-y-auto"
      >
        <div className="flex justify-end items-center mb-3">
          <button
            onClick={onClose}
            className="text-white hover:text-highlight-color transition"
          >
            <X className="w-8 h-8" />
          </button>
        </div>
        <div className="relative w-full aspect-[9/16] bg-black rounded-lg overflow-hidden">
          <iframe
            title="TikTok Video"
            src={tiktokEmbedUrl}
            className="w-full h-full"
            frameBorder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          ></iframe>
        </div>
        <div className="mt-4 p-4 rounded-lg bg-gray-800/50">
          <div className="flex justify-between items-center text-white mb-3">
            <div>
              <p className="text-2xl font-bold">{submission.participantName}</p>
              <p className="text-md text-white/70">
                {submission.flag} {submission.country}
              </p>
            </div>
            <div className="text-center">
              <p className="text-sm text-white/70">إجمالي الأصوات</p>
              <p
                className="text-3xl font-extrabold"
                style={{ color: `var(--highlight-color-css)` }}
              >
                {submission.votes.toLocaleString()}
              </p>
            </div>
          </div>
          <button
            onClick={() => onVote(submission)}
            disabled={cooldown > 0}
            className="w-full p-3 rounded-lg font-bold text-lg text-gray-900 transition duration-300 disabled:opacity-50"
            style={{ backgroundColor: `var(--main-color-css)` }}
          >
            {cooldown > 0 ? `صوت بعد ${cooldown} ثواني` : 'صوت'}
          </button>
        </div>
      </GlassCard>
    </div>
  );
};

const LiveResultsView = ({ approvedSubmissions, settings }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isHovering, setIsHovering] = useState(false);
  const perSlide = 4;

  const rankedSubmissions = useMemo(
    () => approvedSubmissions.sort((a, b) => b.votes - a.votes),
    [approvedSubmissions]
  );
  const topThree = rankedSubmissions.slice(0, 3);
  const remainingSubmissions = rankedSubmissions.slice(3);
  const numSlides = Math.ceil(remainingSubmissions.length / perSlide);

  const nextSlide = () => setCurrentIndex((prev) => (prev + 1) % numSlides);
  const prevSlide = () =>
    setCurrentIndex((prev) => (prev - 1 + numSlides) % numSlides);

  const currentSlideSubmissions = remainingSubmissions.slice(
    currentIndex * perSlide,
    currentIndex * perSlide + perSlide
  );

  useEffect(() => {
    if (numSlides <= 1 || isHovering) return;
    const autoSlideTimer = setInterval(() => {
      nextSlide();
    }, 5000);
    return () => clearInterval(autoSlideTimer);
  }, [numSlides, isHovering, approvedSubmissions]);
  if (rankedSubmissions.length === 0) return null;

  const CompactPodiumItem = ({ submission, rank, settings }) => {
    const { participantName, country, flag, votes, thumbnailUrl } = submission;
    const rankColor = {
      1: settings.highlightColor,
      2: settings.mainColor,
      3: '#5b1f28',
    }[rank];

    return (
      <div
        className="relative flex flex-col items-center p-3 text-center w-1/3 transform hover:scale-105 transition duration-300 rounded-lg"
        style={{
          backgroundColor: `${rankColor}30`,
          border: `2px solid ${rankColor}`,
          boxShadow: `0 0 10px ${rankColor}80`,
        }}
      >
        <p
          className="text-xs font-bold text-gray-900 absolute top-0 right-0 p-1 rounded-bl-lg"
          style={{
            backgroundColor: rankColor,
            color: rank === 1 ? '#000' : '#fff',
          }}
        >
          #{rank}
        </p>
        <img
          src={thumbnailUrl}
          alt={`Rank ${rank}`}
          className="w-12 h-18 object-cover rounded-md mb-2 border-2"
          style={{ borderColor: rankColor }}
        />
        <p
          className="text-lg font-extrabold text-white"
          style={{ color: rankColor }}
        >
          {votes.toLocaleString()}
        </p>
        <p className="text-sm font-semibold text-white truncate w-full">
          {participantName}
        </p>
        <p className="text-xs text-white/70">
          {flag} {country}
        </p>
      </div>
    );
  };

  return (
    <GlassCard
      isGlassmorphism={settings.useGlassmorphism}
      color="bg-gray-800"
      className="p-4 mb-6 shadow-2xl"
    >
      <h2
        className="text-2xl font-extrabold text-white mb-4 border-b border-white/20 pb-2"
        style={{ color: `var(--highlight-color-css)` }}
      >
        النتائج المباشرة
       
      </h2>
      <div className="flex justify-around gap-2 mb-6">
        {topThree.map((sub, index) => (
          <div key={sub.id} className="w-1/3">
            <CompactPodiumItem
              submission={sub}
              rank={index + 1}
              settings={settings}
            />
          </div>
        ))}
       
      </div>

      {remainingSubmissions.length > 0 && (
        <div
          className="relative flex items-center justify-center"
          onMouseEnter={() => setIsHovering(true)}
          onMouseLeave={() => setIsHovering(false)}
        >
          <button
            onClick={prevSlide}
            className="p-2 rounded-full bg-white/10 hover:bg-white/30 text-white transition disabled:opacity-50 z-10"
            disabled={numSlides <= 1}
          >
            <ChevronRight className="w-6 h-6" />
          </button>
          <div className="flex-grow mx-4 overflow-hidden">
            <div className="grid grid-cols-4 gap-4 transition-transform duration-500">
              {currentSlideSubmissions.map((sub) => (
                <StatsCard key={sub.id} submission={sub} settings={settings} />
              ))}
              {[...Array(perSlide - currentSlideSubmissions.length)].map(
                (_, i) => (
                  <div key={`filler-${i}`} className="w-full"></div>
                )
              )}
            </div>
          </div>
          <button
            onClick={nextSlide}
            className="p-2 rounded-full bg-white/10 hover:bg-white/30 text-white transition disabled:opacity-50 z-10"
            disabled={numSlides <= 1}
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
        </div>
      )}

      {numSlides > 1 && (
        <div className="flex justify-center mt-3 space-x-2">
          {[...Array(numSlides)].map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentIndex(index)}
              className={`w-3 h-3 rounded-full transition-colors ${
                currentIndex === index
                  ? 'bg-highlight-color'
                  : 'bg-white/30 hover:bg-white/50'
              }`}
              style={{
                backgroundColor:
                  currentIndex === index
                    ? `var(--highlight-color-css)`
                    : 'rgba(255,255,255,0.3)',
              }}
            />
          ))}
        </div>
      )}
    </GlassCard>
  );
};

const Home = ({
  settings,
  allSubmissions,
  totalApproved,
  onVote,
  cooldown,
  setVoteConfirmData,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const submissionsPerPage = 10;

  const approvedSubmissions = useMemo(
    () =>
      allSubmissions
        .filter((sub) => sub.status === 'Approved')
        .sort((a, b) => b.votes - a.votes),
    [allSubmissions]
  );
  const filteredSubmissions = useMemo(() => {
    if (!searchTerm) return approvedSubmissions;
    const lowerCaseSearch = searchTerm.toLowerCase();
    return approvedSubmissions.filter(
      (sub) =>
        sub.participantName.toLowerCase().includes(lowerCaseSearch) ||
        sub.country.toLowerCase().includes(lowerCaseSearch)
    );
  }, [approvedSubmissions, searchTerm]);

  const totalPages = Math.ceil(filteredSubmissions.length / submissionsPerPage);
  const currentSubmissions = filteredSubmissions.slice(
    (currentPage - 1) * submissionsPerPage,
    currentPage * submissionsPerPage
  );

  const [videoModalOpen, setVideoModalOpen] = useState(false);
  const [selectedSubmission, setSelectedSubmission] = useState(null);

  const handleOpenVideo = (submission) => {
    setSelectedSubmission(submission);
    setVideoModalOpen(true);
  };

  // معالجة التصويت من البطاقة
  const handleVoteFromCard = (submission) => {
    if (cooldown > 0) {
      handleOpenVideo(submission); // إذا كان هناك وقت انتظار، افتح الفيديو ليشاهد العد التنازلي
      return;
    }
    setVoteConfirmData(submission);
  };

  const isSubmissionStage = settings.stage === 'Submission';
  const isVotingStage = settings.stage === 'Voting';
  const isEndedStage = settings.stage === 'Ended';
  const isPausedStage = settings.stage === 'Paused';

  const renderContent = () => {
    if (isSubmissionStage) {
      return <SubmissionForm settings={settings} userId={null} />;
    }
    if (isPausedStage) {
      return (
        <GlassCard
          isGlassmorphism={settings.useGlassmorphism}
          color="bg-gray-900"
          className="mt-10 max-w-lg mx-auto p-8 text-center"
        >
          <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-3xl font-bold text-white mb-2">
            المسابقة متوقفة حالياً
          </h2>
          <p className="text-white/70">
            نحن نعمل على فرز النتائج النهائية. ترقبوا إعلان الفائزين قريباً!
          </p>
        </GlassCard>
      );
    }

    if (isVotingStage || isEndedStage) {
      return (
        <div className="space-y-6">
          <LiveResultsView
            approvedSubmissions={approvedSubmissions}
            settings={settings}
          />
          <GlassCard
            isGlassmorphism={settings.useGlassmorphism}
            color="bg-gray-800"
            className="p-4 flex flex-col md:flex-row gap-4"
          >
            <div className="relative w-full md:w-1/2">
              <input
                type="text"
                placeholder="البحث باسم المشارك أو البلد..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full p-3 pr-10 rounded-lg bg-gray-900/80 border border-white/10 text-white focus:ring-highlight-color focus:border-highlight-color transition duration-300"
              />
              <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-white/50" />
            </div>
            <div className="w-full md:w-1/2 flex items-center justify-end text-white">
              <span className="text-lg font-semibold ml-2">
                إجمالي المشاركات:
              </span>
              <span
                className="text-2xl font-extrabold"
                style={{ color: `var(--highlight-color-css)` }}
              >
                {totalApproved.toLocaleString()}
              </span>
            </div>
          </GlassCard>

          <h3 className="text-2xl font-bold text-white mt-8 mb-4">
            قائمة المشاركات (للتصويت والمشاهدة)
          </h3>

          {filteredSubmissions.length === 0 ? (
            <p className="text-white/70 text-center text-xl mt-10">
              لا توجد مشاركات مطابقة لمعايير البحث.
            </p>
          ) : (
            <>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
                {currentSubmissions.map((sub) => (
                  <ContestCard
                    key={sub.id}
                    submission={sub}
                    settings={settings}
                    onVote={handleVoteFromCard}
                    onOpenVideo={handleOpenVideo}
                  />
                ))}
              </div>
              {totalPages > 1 && (
                <div className="flex justify-center items-center space-x-4 mt-8">
                  <button
                    onClick={() =>
                      setCurrentPage((prev) => Math.max(1, prev - 1))
                    }
                    disabled={currentPage === 1}
                    className="p-3 rounded-lg bg-white/10 text-white disabled:opacity-30 hover:bg-white/20 transition"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                  <span className="text-white text-lg font-semibold">
                    صفحة {currentPage} من {totalPages}
                  </span>
                  <button
                    onClick={() =>
                      setCurrentPage((prev) => Math.min(totalPages, prev + 1))
                    }
                    disabled={currentPage === totalPages}
                    className="p-3 rounded-lg bg-white/10 text-white disabled:opacity-30 hover:bg-white/20 transition"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
              )}
            </>
          )}

          <VideoModal
            isOpen={videoModalOpen}
            onClose={() => setVideoModalOpen(false)}
            submission={selectedSubmission}
            settings={settings}
            onVote={() => setVoteConfirmData(selectedSubmission)}
            cooldown={cooldown}
          />
        </div>
      );
    }
  };

  return (
    <div className="container mx-auto p-4">
      <AlertBanner settings={settings} />
      {renderContent()}
    </div>
  );
};

const AdminSubmissionsPanel = ({
  submissions,
  settings,
  isGlassmorphism,
  onUpdateSubmissionStatus,
}) => {
  const [activeTab, setActiveTab] = useState('Pending');
  const [submissionToEdit, setSubmissionToEdit] = useState(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const filteredSubmissions = useMemo(() => {
    let list = submissions.filter((sub) => sub.status === activeTab);
    if (activeTab === 'Approved') {
      list = list.sort((a, b) => b.votes - a.votes);
    }
    return list;
  }, [submissions, activeTab]);

  const handleEdit = (submission) => {
    setSubmissionToEdit(submission);
    setIsEditModalOpen(true);
  };

  const handleSaveEdit = async (updatedSubmission) => {
    try {
      if (!db) {
        console.error('Database not initialized.');
        return;
      }
      const docRef = doc(
        db,
        PUBLIC_SUBMISSIONS_COLLECTION,
        updatedSubmission.id
      );
      await retryOperation(() =>
        setDoc(docRef, updatedSubmission, { merge: true })
      );
      setIsEditModalOpen(false);
      setSubmissionToEdit(null);
    } catch (e) {
      console.error(`فشل تحديث المشاركة: ${e.message}`);
    }
  };

  const SubmissionRow = ({ sub }) => (
    <div
      key={sub.id}
      className="grid grid-cols-12 gap-2 items-center p-3 border-b border-white/10 hover:bg-gray-700/50 transition"
    >
      <div className="col-span-3 truncate text-sm">{sub.participantName}</div>
      <div className="col-span-1 text-sm">{sub.flag}</div>
      <div className="col-span-2 text-sm">{sub.votes.toLocaleString()}</div>
      <div className="col-span-3 text-xs truncate">{sub.videoUrl}</div>
      <div className="col-span-3 flex justify-end space-x-2">
        {activeTab !== 'Approved' && (
          <button
            onClick={() => onUpdateSubmissionStatus(sub.id, 'Approved')}
            className="p-1 rounded-full bg-green-600 hover:bg-green-700 transition"
            title="قبول"
          >
            <CheckCircle className="w-5 h-5 text-white" />
          </button>
        )}
        {activeTab !== 'Rejected' && (
          <button
            onClick={() => onUpdateSubmissionStatus(sub.id, 'Rejected')}
            className="p-1 rounded-full bg-red-600 hover:bg-red-700 transition"
            title="رفض"
          >
            <X className="w-5 h-5 text-white" />
          </button>
        )}
        {activeTab !== 'Pending' && (
          <button
            onClick={() => onUpdateSubmissionStatus(sub.id, 'Pending')}
            className="p-1 rounded-full bg-yellow-600 hover:bg-yellow-700 transition"
            title="تعليق"
          >
            <Clock className="w-5 h-5 text-white" />
          </button>
        )}
        <button
          onClick={() => handleEdit(sub)}
          className="p-1 rounded-full bg-main-color hover:opacity-80 transition"
          title="تعديل"
          style={{ backgroundColor: settings.mainColor }}
        >
          <User className="w-5 h-5 text-gray-900" />
        </button>
      </div>
    </div>
  );

  const EditSubmissionModal = ({
    isOpen,
    onClose,
    submission,
    onSave,
    settings,
  }) => {
    const [editData, setEditData] = useState(submission);
    useEffect(() => {
      if (submission) setEditData(submission);
    }, [submission]);
    if (!isOpen || !editData) return null;

    const handleSave = () => onSave(editData);

    return (
      <Modal isOpen={isOpen} onClose={onClose} title="تعديل المشاركة">
        <div className="space-y-4">
          <InputField
            label="اسم المشارك"
            value={editData.participantName}
            onChange={(val) =>
              setEditData((prev) => ({ ...prev, participantName: val }))
            }
          />
          <InputField
            label="رابط الفيديو"
            value={editData.videoUrl}
            onChange={(val) =>
              setEditData((prev) => ({ ...prev, videoUrl: val }))
            }
          />
          <InputField
            label="عدد الأصوات"
            type="number"
            value={editData.votes}
            onChange={(val) =>
              setEditData((prev) => ({ ...prev, votes: parseInt(val) || 0 }))
            }
          />
          <div className="mb-4">
            <label className="block text-white mb-2 font-medium">البلد</label>
            <select
              value={editData.country}
              onChange={(e) => {
                const country = COUNTRIES.find(
                  (c) => c.name === e.target.value
                );
                setEditData((prev) => ({
                  ...prev,
                  country: e.target.value,
                  flag: country.flag,
                }));
              }}
              className="w-full p-3 rounded-lg bg-gray-800/80 border border-white/20 text-white focus:ring-highlight-color focus:border-highlight-color transition"
            >
              {COUNTRIES.map((c) => (
                <option key={c.code} value={c.name}>
                  {c.flag} {c.name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex justify-end pt-4">
            <button
              onClick={handleSave}
              className="py-2 px-6 rounded-lg text-gray-900 font-semibold transition"
              style={{ backgroundColor: settings.mainColor }}
            >
              حفظ التعديلات
            </button>
          </div>
        </div>
      </Modal>
    );
  };

  return (
    <GlassCard
      isGlassmorphism={isGlassmorphism}
      color="bg-gray-900"
      className="p-6 mb-6"
    >
      <h3 className="text-xl font-bold text-white mb-4">إدارة المشاركات</h3>
      <div className="flex border-b border-white/20 mb-4">
        {['Pending', 'Approved', 'Rejected'].map((status) => (
          <button
            key={status}
            onClick={() => setActiveTab(status)}
            className={`py-2 px-4 text-sm font-semibold transition-colors ${
              activeTab === status
                ? 'border-b-2 text-highlight-color'
                : 'text-white/70 hover:text-white'
            }`}
            style={{
              borderColor:
                activeTab === status ? settings.mainColor : 'transparent',
            }}
          >
            {status === 'Pending'
              ? 'المعلقة'
              : status === 'Approved'
              ? 'المقبولة'
              : 'المرفوضة'}{' '}
            ({submissions.filter((s) => s.status === status).length})
          </button>
        ))}
      </div>
      <div className="grid grid-cols-12 gap-2 text-white/70 font-semibold text-sm border-b border-white/30 pb-2 mb-2">
        <div className="col-span-3">المشارك</div>
        <div className="col-span-1">البلد</div>
        <div className="col-span-2">الأصوات</div>
        <div className="col-span-3">الرابط</div>
        <div className="col-span-3 text-right">الإجراءات</div>
      </div>
      <div className="max-h-96 overflow-y-auto custom-scrollbar">
        {filteredSubmissions.length > 0 ? (
          filteredSubmissions.map((sub) => (
            <SubmissionRow key={sub.id} sub={sub} />
          ))
        ) : (
          <p className="text-white/50 text-center py-4">
            لا توجد مشاركات في هذه الفئة حالياً.
          </p>
        )}
      </div>
      <EditSubmissionModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        submission={submissionToEdit}
        onSave={handleSaveEdit}
        settings={settings}
      />
    </GlassCard>
  );
};

const AdminSettingsPanel = ({ settings, isGlassmorphism, onSaveSettings }) => {
  const [currentSettings, setCurrentSettings] = useState(settings);
  useEffect(() => {
    setCurrentSettings(settings);
  }, [settings]);
  const handleChange = (field, value) => {
    setCurrentSettings((prev) => ({ ...prev, [field]: value }));
  };
  const handleSave = () => {
    onSaveSettings(currentSettings);
  };

  const DateTimeInput = ({ label, value, onChange }) => {
    const datetimeLocal = value
      ? new Date(value).toISOString().substring(0, 16)
      : '';
    const handleDateTimeChange = (e) => {
      const date = new Date(e.target.value);
      if (!isNaN(date)) {
        onChange(date.getTime());
      } else {
        onChange(null);
      }
    };
    return (
      <div className="mb-4">
        <label className="block text-white mb-2 font-medium">{label}</label>
        <input
          type="datetime-local"
          value={datetimeLocal}
          onChange={handleDateTimeChange}
          className="w-full p-3 rounded-lg bg-gray-800/80 border border-white/20 text-white focus:ring-highlight-color focus:border-highlight-color transition"
        />
      </div>
    );
  };

  const TextAreaField = ({ label, value, onChange }) => (
    <div>
      <label className="block text-white mb-2 font-medium">{label}</label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full p-3 rounded-lg bg-gray-800/80 border border-white/20 text-white focus:ring-highlight-color focus:border-highlight-color transition duration-300"
        rows="3"
      />
    </div>
  );

  const ColorPicker = ({ label, value, onChange }) => (
    <div className="flex flex-col">
      <label className="text-white mb-2 font-medium">{label}</label>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-8 h-8 rounded-md p-0 border-none cursor-pointer"
        />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="p-2 rounded-lg bg-gray-800/80 border border-white/20 text-white text-sm w-24"
        />
      </div>
    </div>
  );

  return (
    <GlassCard
      isGlassmorphism={isGlassmorphism}
      color="bg-gray-900"
      className="p-6"
    >
      <h3 className="text-xl font-bold text-white mb-4">
        إعدادات الهوية والمراحل
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <h4
            className="text-lg font-semibold"
            style={{ color: settings.mainColor }}
          >
            الهوية البصرية
          </h4>
          <InputField
            label="عنوان المسابقة"
            value={currentSettings.title}
            onChange={(val) => handleChange('title', val)}
          />
          <InputField
            label="رابط الشعار (URL)"
            value={currentSettings.logoUrl}
            onChange={(val) => handleChange('logoUrl', val)}
          />
          <InputField
            label="الخط العام (Cairo, Arial, etc.)"
            value={currentSettings.appFont}
            onChange={(val) => handleChange('appFont', val)}
          />
          <div className="flex space-x-4 space-x-reverse">
            <ColorPicker
              label="اللون الأساسي (Main)"
              value={currentSettings.mainColor}
              onChange={(val) => handleChange('mainColor', val)}
            />
            <ColorPicker
              label="لون التوهج (Highlight)"
              value={currentSettings.highlightColor}
              onChange={(val) => handleChange('highlightColor', val)}
            />
          </div>
          <div className="flex items-center pt-2">
            <input
              type="checkbox"
              id="glassmorphism"
              checked={currentSettings.useGlassmorphism}
              onChange={(e) =>
                handleChange('useGlassmorphism', e.target.checked)
              }
              className="h-5 w-5 rounded border-gray-300 text-main-color focus:ring-main-color"
              style={{
                backgroundColor: currentSettings.mainColor,
                borderColor: currentSettings.mainColor,
              }}
            />
            <label htmlFor="glassmorphism" className="mr-2 text-white">
              تفعيل تأثير Glassmorphism
            </label>
          </div>
        </div>
        <div className="space-y-4">
          <h4
            className="text-lg font-semibold"
            style={{ color: settings.mainColor }}
          >
            إدارة المراحل
          </h4>
          <div className="mb-4">
            <label className="block text-white mb-2 font-medium">
              المرحلة الحالية
            </label>
            <div className="flex flex-wrap gap-2">
              {Object.keys(STAGES).map((stageKey) => (
                <button
                  key={stageKey}
                  onClick={() => handleChange('stage', stageKey)}
                  className={`py-2 px-4 rounded-lg text-sm font-semibold transition ${
                    currentSettings.stage === stageKey
                      ? 'text-gray-900 shadow-lg'
                      : 'bg-gray-700/70 text-white/80 hover:bg-gray-600/70'
                  }`}
                  style={{
                    backgroundColor:
                      currentSettings.stage === stageKey
                        ? currentSettings.mainColor
                        : undefined,
                  }}
                >
                  {STAGES[stageKey].label}
                </button>
              ))}
            </div>
          </div>
          <DateTimeInput
            label="وقت وتاريخ انتهاء المسابقة (مرحلة Ended)"
            value={currentSettings.endedAt}
            onChange={(val) => handleChange('endedAt', val)}
          />
          <InputField
            label="نص التنبيه (Alert Banner Text)"
            value={currentSettings.marqueeText}
            onChange={(val) => handleChange('marqueeText', val)}
          />
        </div>
        <div className="md:col-span-2 space-y-4">
          <h4
            className="text-lg font-semibold"
            style={{ color: settings.mainColor }}
          >
            نصوص المعلومات
          </h4>
          <TextAreaField
            label="شروط المسابقة"
            value={currentSettings.termsText}
            onChange={(val) => handleChange('termsText', val)}
          />
          <TextAreaField
            label="لماذا هذه المسابقة؟"
            value={currentSettings.whyText}
            onChange={(val) => handleChange('whyText', val)}
          />
        </div>
      </div>
      <div className="mt-6 border-t border-white/20 pt-4 flex justify-end">
        <button
          onClick={handleSave}
          className="py-3 px-8 rounded-lg font-bold text-lg text-gray-900 transition duration-300 hover:opacity-80"
          style={{ backgroundColor: currentSettings.mainColor }}
        >
          حفظ جميع الإعدادات
        </button>
      </div>
    </GlassCard>
  );
};

const SettingsPanel = ({
  settings,
  submissions,
  onSaveSettings,
  onUpdateSubmissionStatus,
  onLogout,
}) => {
  const [activeTab, setActiveTab] = useState('settings');
  return (
    <div className="container mx-auto p-4 pt-10">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-3xl font-bold text-white flex items-center">
          <SettingsIcon className="w-7 h-7 ml-2" />
          لوحة تحكم المدير
        </h2>
        <button
          onClick={onLogout}
          className="py-2 px-4 rounded-lg bg-red-600 hover:bg-red-700 text-white font-semibold transition flex items-center"
        >
          <LogOut className="w-5 h-5 ml-2" /> تسجيل خروج
        </button>
      </div>
      <div className="flex border-b border-white/20 mb-6">
        <button
          onClick={() => setActiveTab('settings')}
          className={`py-3 px-6 text-lg font-semibold transition ${
            activeTab === 'settings' ? 'text-white border-b-2' : 'text-white/70'
          }`}
          style={{
            borderColor:
              activeTab === 'settings'
                ? settings.highlightColor
                : 'transparent',
          }}
        >
          الإعدادات العامة
        </button>
        <button
          onClick={() => setActiveTab('submissions')}
          className={`py-3 px-6 text-lg font-semibold transition ${
            activeTab === 'submissions'
              ? 'text-white border-b-2'
              : 'text-white/70'
          }`}
          style={{
            borderColor:
              activeTab === 'submissions'
                ? settings.highlightColor
                : 'transparent',
          }}
        >
          إدارة المشاركات
        </button>
      </div>
      {activeTab === 'settings' && (
        <AdminSettingsPanel
          settings={settings}
          isGlassmorphism={settings.useGlassmorphism}
          onSaveSettings={onSaveSettings}
        />
      )}
      {activeTab === 'submissions' && (
        <AdminSubmissionsPanel
          submissions={submissions}
          settings={settings}
          isGlassmorphism={settings.useGlassmorphism}
          onUpdateSubmissionStatus={onUpdateSubmissionStatus}
        />
      )}
    </div>
  );
};

const Header = ({ settings, currentStage, isMainAdminPath }) => (
  <header
    className="sticky top-0 z-40 p-4 border-b"
    style={{
      backgroundColor: settings.useGlassmorphism
        ? 'rgba(0,0,0,0.5)'
        : '#000000',
      borderColor: 'rgba(255, 255, 255, 0.1)',
    }}
  >
    <div className="container mx-auto flex justify-between items-center">
      <div className="flex items-center">
        <img
          src={settings.logoUrl}
          alt="Logo"
          className="h-10 w-auto rounded-lg"
          onError={(e) => (e.target.style.display = 'none')}
        />
        <h1 className="text-2xl font-black mr-4 text-white">
          {settings.title}
        </h1>
      </div>
      <nav className="flex items-center space-x-6 space-x-reverse text-white">
        {(currentStage === 'Voting' || currentStage === 'Ended') && !isMainAdminPath && (
          <a
            href="#submission"
            className="font-semibold hover:opacity-80 transition py-2 px-4 rounded-full text-white"
            style={{
              backgroundColor: `var(--main-color-css)`,
              boxShadow: `0 0 10px var(--main-color-css)`,
            }}
          >
            إرسال مشاركة جديدة
          </a>
        )}
      </nav>
    </div>
  </header>
);

const Footer = ({ settings }) => {
  const [modal, setModal] = useState(null);

  return (
    <footer className="bg-gray-900/50 p-6 mt-10 border-t border-white/10">
      <div className="container mx-auto text-white text-center text-sm">
        <h3 className="font-bold mb-4 text-lg" style={{ color: settings.highlightColor }}>
          روابط هامة
        </h3>

        <div className="flex justify-center gap-8 text-sm font-semibold">
          <button 
            onClick={() => setModal('why')} 
            className="hover:text-highlight-color transition duration-300 border-b-2 border-transparent hover:border-highlight-color pb-1"
            style={{ '--highlight-color-css': settings.highlightColor }}
          >
            لماذا هذه المسابقة؟
          </button>

          <button 
            onClick={() => setModal('terms')} 
            className="hover:text-highlight-color transition duration-300 border-b-2 border-transparent hover:border-highlight-color pb-1"
            style={{ '--highlight-color-css': settings.highlightColor }}
          >
            الشروط والأحكام
          </button>

          <button 
            onClick={() => setModal('organizers')} 
            className="hover:text-highlight-color transition duration-300 border-b-2 border-transparent hover:border-highlight-color pb-1"
            style={{ '--highlight-color-css': settings.highlightColor }}
          >
            المنظمون
          </button>
        </div>

        <p className="mt-8 text-white/50 border-t border-white/10 pt-4">
            {/* تم إلغاء خاصية النقر السري واستبدالها بمسار /admin */}
            &copy; {new Date().getFullYear()} {settings.title}. جميع الحقوق محفوظة.
        </p>
      </div>

      <Modal isOpen={modal === 'why'} onClose={() => setModal(null)} title="لماذا هذه المسابقة؟">
        <p>{settings.whyText}</p>
      </Modal>

      <Modal isOpen={modal === 'terms'} onClose={() => setModal(null)} title="الشروط والأحكام">
        <p>{settings.termsText}</p>
      </Modal>

      <Modal isOpen={modal === 'organizers'} onClose={() => setModal(null)} title="القائمون على المسابقة">
        <div className="space-y-4">
          {ORGANIZERS.map((org, index) => (
            <div key={index} className="flex items-center bg-gray-800/80 p-3 rounded-lg border border-white/10">
              <img 
                src={org.imageUrl} 
                alt={org.name} 
                className="w-16 h-16 rounded-full ml-4 object-cover border-2"
                style={{ borderColor: settings.mainColor }}
              />
              <div className="text-right">
                <p className="text-lg font-bold text-white">{org.name}</p>
                <p className="text-sm font-medium" style={{ color: settings.mainColor }}>{org.role}</p>
                <p className="text-xs text-white/70 dir-ltr text-right">{org.tiktok}</p>
              </div>
            </div>
          ))}
        </div>
      </Modal>
    </footer>
  );
};

const App = () => {
  const [settings, setSettings] = useState(null);
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [adminMode, setAdminMode] = useState(false);
  const { userId, isAuthReady } = useAuth();
  const [cooldown, setCooldown] = useState(0);
  // ⬅️ إضافة حالة لتحديد ما إذا كان المسار هو /admin
  const [isMainAdminPath, setIsMainAdminPath] = useState(false); 


  useEffect(() => {
    if (settings) {
      document.documentElement.style.setProperty(
        '--main-color-css',
        settings.mainColor
      );
      document.documentElement.style.setProperty(
        '--highlight-color-css',
        settings.highlightColor
      );
      document.documentElement.style.fontFamily = `${settings.appFont}, sans-serif`;
      document.documentElement.style.backgroundColor = '#000000';
    }
  }, [settings]);

  // ⬅️ معالجة مسار URL لتفعيل وضع التحكم (Routing Simulation)
  useEffect(() => {
    // التحقق من أن المسار هو /admin أو /admin/ (لتفادي مشكلة router)
    const path = window.location.pathname.toLowerCase().replace(/\/$/, '');
    if (path.endsWith('/admin')) { 
      setIsMainAdminPath(true);
    } else {
      setIsMainAdminPath(false);
    }
  }, []); 

  const initDataRef = useRef(false);

  useEffect(() => {
    if (!db || !isAuthReady || initDataRef.current) return;
    initDataRef.current = true;
    const initializeFirestore = async () => {
      try {
        const settingsDocRef = doc(db, PUBLIC_SETTINGS_PATH);
        const settingsSnap = await retryOperation(() => getDoc(settingsDocRef));
        if (!settingsSnap.exists()) {
          await retryOperation(() => setDoc(settingsDocRef, DEFAULT_SETTINGS));
        }

        const subColRef = collection(db, PUBLIC_SUBMISSIONS_COLLECTION);
        const subSnap = await retryOperation(() =>
          getDocs(query(subColRef, limit(1)))
        );
        if (subSnap.empty) {
          for (const sub of MOCK_SUBMISSIONS) {
            const mockDocRef = doc(db, PUBLIC_SUBMISSIONS_COLLECTION, sub.id);
            await retryOperation(() =>
              setDoc(mockDocRef, {
                ...sub,
                submittedAt: sub.submittedAt || serverTimestamp(),
              })
            );
          }
        }
      } catch (e) {
        setError(
          'Failed to initialize data. Check permissions or Firebase configuration.'
        );
      }
      setLoading(false);
    };
    initializeFirestore();
  }, [isAuthReady]);

  useEffect(() => {
    if (!db || !isAuthReady) {
      return;
    }

    const settingsDocRef = doc(db, PUBLIC_SETTINGS_PATH);
    const unsubscribeSettings = onSnapshot(
      settingsDocRef,
      (docSnap) => {
        if (docSnap.exists()) {
          setSettings(docSnap.data());
        } else {
          setSettings(DEFAULT_SETTINGS);
        }
        setLoading(false);
      },
      (e) => {
        setError('Failed to load settings. Check Firestore connectivity.');
        setSettings(DEFAULT_SETTINGS);
        setLoading(false);
      }
    );

    const submissionsColRef = collection(db, PUBLIC_SUBMISSIONS_COLLECTION);
    const unsubscribeSubmissions = onSnapshot(
      submissionsColRef,
      (snapshot) => {
        const subs = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setSubmissions(subs);
      },
      (e) => {
        console.error('Submissions Snapshot Error:', e);
      }
    );

    return () => {
      unsubscribeSettings();
      unsubscribeSubmissions();
    };
  }, [isAuthReady]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => {
      setCooldown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  // ⬅️ تعديل: هذه الدالة الآن تفعل adminMode في الكود (وليست وظيفة نافذة)
  const handleAdminLoginSuccess = () => {
    setAdminMode(true);
  };

  // ⬅️ تعديل: هذه الدالة تعيد توجيه المستخدم بعد تسجيل الخروج
  const handleAdminLogout = () => {
    setAdminMode(false);
    if (auth) {
      signOut(auth);
    }
    // إعادة التوجيه إلى الصفحة الرئيسية
    window.location.href = window.location.origin;
  };

  const handleSaveSettings = async (newSettings) => {
    try {
      if (!db) return;
      const settingsDocRef = doc(db, PUBLIC_SETTINGS_PATH);
      await retryOperation(() => setDoc(settingsDocRef, newSettings));
    } catch (e) {
      console.error(`فشل حفظ الإعدادات: ${e.message}`);
    }
  };

  const handleUpdateSubmissionStatus = async (id, newStatus) => {
    try {
      if (!db) return;
      const docRef = doc(db, PUBLIC_SUBMISSIONS_COLLECTION, id);
      // استخدام increment للتحديث الذري الآمن
      await retryOperation(() => updateDoc(docRef, { status: newStatus }));
    } catch (e) {
      console.error(`فشل تحديث حالة المشاركة: ${e.message}`);
    }
  };

  const handleConfirmVote = async (submission) => {
    setVoteConfirmData(null); // إغلاق النافذة
    if (cooldown > 0) {
      console.warn(`الرجاء الانتظار ${cooldown} ثواني قبل التصويت مرة أخرى.`);
      return;
    }
    try {
      if (!db) return;
      const docRef = doc(db, PUBLIC_SUBMISSIONS_COLLECTION, submission.id);
      // استخدام increment للتحديث الذري الآمن
      await retryOperation(() => updateDoc(docRef, { votes: increment(1) }));
      setCooldown(30);
    } catch (e) {
      console.error(`فشل التصويت: ${e.message}`);
    }
  };

  const handleVote = (submission) => {
    if (cooldown > 0) {
      console.warn(`الرجاء الانتظار ${cooldown} ثواني قبل التصويت مرة أخرى.`);
      return;
    }
    setVoteConfirmData(submission);
  };

  // ⬅️ تفعيل وضع المدير إذا كان المسار /admin والمستخدم مسجل الدخول فعلاً
  useEffect(() => {
    const isLoggedIn = userId && userId !== 'public-read-only';
    if (isMainAdminPath && isLoggedIn) {
      setAdminMode(true);
    } else if (isMainAdminPath && !isLoggedIn) {
        // إذا كان على مسار /admin ولكنه غير مسجل، تأكد من إيقاف وضع المدير
        setAdminMode(false);
    }
  }, [isAuthReady, userId, isMainAdminPath]);


  const totalApproved = submissions.filter(
    (s) => s.status === 'Approved'
  ).length;

  if (loading || !settings) {
    return (
      <div
        className="flex items-center justify-center h-screen"
        style={{ backgroundColor: '#000000' }}
      >
        <Loader className="w-10 h-10 text-white animate-spin" />
        <span className="text-white mr-4 text-xl">جار تحميل الإعدادات...</span>
      </div>
    );
  }

  return (
    <div
      dir="rtl"
      className="min-h-screen"
      style={{ backgroundColor: '#000000' }}
    >
      <Header
        settings={settings}
        currentStage={settings.stage}
        isMainAdminPath={isMainAdminPath}
      />

      <main>
        {isMainAdminPath ? (
          adminMode ? (
            <SettingsPanel
              settings={settings}
              submissions={submissions}
              onSaveSettings={handleSaveSettings}
              onUpdateSubmissionStatus={handleUpdateSubmissionStatus}
              onLogout={handleAdminLogout}
            />
          ) : (
            <div className="container mx-auto p-4 pt-10">
              <AdminAuthForm
                onAuthSuccess={handleAdminLoginSuccess}
                settings={settings}
              />
            </div>
          )
        ) : (
          <Home
            settings={settings}
            allSubmissions={submissions}
            totalApproved={totalApproved}
            onVote={handleVote}
            cooldown={cooldown}
            setVoteConfirmData={setVoteConfirmData}
          />
        )}
      </main>

      <Footer settings={settings} />

      <Modal
        isOpen={voteConfirmData !== null}
        onClose={() => setVoteConfirmData(null)}
        title="تأكيد التصويت"
      >
        {voteConfirmData && (
          <div className="text-center">
            <p className="text-white text-xl mb-6">
              هل أنت متأكد من التصويت لـ
              <span
                className="font-extrabold mx-2"
                style={{ color: settings.highlightColor }}
              >
                {voteConfirmData.participantName}
              </span>
              ؟
            </p>
            <p className="text-sm text-white/70 mb-8">
              (يمكنك التصويت كل 30 ثانية)
            </p>
            <div className="flex justify-around">
              <button
                onClick={() => setVoteConfirmData(null)}
                className="py-3 px-8 rounded-lg bg-red-600 hover:bg-red-700 text-white font-semibold transition"
              >
                إلغاء
              </button>
              <button
                onClick={() => handleConfirmVote(voteConfirmData)}
                className="py-3 px-8 rounded-lg text-gray-900 font-semibold transition"
                style={{ backgroundColor: settings.mainColor }}
                disabled={cooldown > 0}
              >
                تأكيد التصويت
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default App;