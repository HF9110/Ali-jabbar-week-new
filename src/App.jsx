import React, { useState, useEffect, useMemo, useRef } from 'react';
import { initializeApp } from 'firebase/app';
import {
  getAuth,
  signInAnonymously,
  signInWithCustomToken,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
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
  where,
} from 'firebase/firestore';
import {
  ChevronDown,
  Crown,
  Search,
  Settings as SettingsIcon,
  X,
  Loader,
  User,
  ChevronLeft,
  ChevronRight,
  Lock,
  Mail,
  Key,
  CheckCircle,
  Clock,
  Info,
  LogOut,
  Film,
  Smartphone,
  MonitorPlay,
  Download,
  Home as HomeIcon,
  UploadCloud,
  FolderOpen,
  PlayCircle,
  ArrowRight,
  AlertTriangle
} from 'lucide-react';

// =========================================================================
// 1. FIREBASE & INITIALIZATION
// =========================================================================

const appId = 'ali-jabbar-week';

const getEnvVar = (key, fallback) => {
  try {
    if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env[key]) {
      return import.meta.env[key];
    }
  } catch (e) {}
  return fallback;
};

const VITE_FIREBASE_API_KEY = getEnvVar('VITE_FIREBASE_API_KEY', 'AIzaSyDUxC_2orwmSLL9iEBIkeohZKfH36MjZ4Y');

const userFirebaseConfig = {
  apiKey: VITE_FIREBASE_API_KEY,
  authDomain: 'ali-jabbar-week.firebaseapp.com',
  projectId: 'ali-jabbar-week',
  storageBucket: 'ali-jabbar-week.firebasestorage.app',
  messagingSenderId: '642187294882',
  appId: '1:642187294882:web:fe30f0016e5803a5e1bffb',
  measurementId: 'G-8XSRK7TE1K',
};
const firebaseConfig = Object.keys(userFirebaseConfig).length > 0 ? userFirebaseConfig : {};

let firebaseApp, db, auth;
if (Object.keys(firebaseConfig).length) {
  try {
    firebaseApp = initializeApp(firebaseConfig);
    db = getFirestore(firebaseApp);
    auth = getAuth(firebaseApp);
  } catch (e) {
    console.error('Firebase Initialization Failed:', e);
  }
}

const PUBLIC_SETTINGS_PATH = `settings/config`;
const PUBLIC_SUBMISSIONS_COLLECTION = `submissions`;

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
// 2. CONSTANTS (EPISODES, COUNTRIES, MOCK DATA)
// =========================================================================

const EPISODES = Array.from({ length: 30 }, (_, i) => `الحلقة ${i + 1}`);

const COUNTRIES = [
  { name: 'العراق', code: 'IQ', flag: '🇮🇶' },
  { name: 'السعودية', code: 'SA', flag: '🇸🇦' },
  { name: 'الأردن', code: 'JO', flag: '🇯🇴' },
  { name: 'الإمارات', code: 'AE', flag: '🇦🇪' },
  { name: 'مصر', code: 'EG', flag: '🇪🇬' },
  { name: 'سوريا', code: 'SY', flag: '🇸🇾' },
  { name: 'المغرب', code: 'MA', flag: '🇲🇦' },
  { name: 'الجزائر', code: 'DZ', flag: '🇩🇿' },
  { name: 'الكويت', code: 'KW', flag: '🇰🇼' },
  { name: 'عُمان', code: 'OM', flag: '🇴🇲' },
  { name: 'قطر', code: 'QA', flag: '🇶🇦' },
  { name: 'البحرين', code: 'BH', flag: '🇧🇭' },
  { name: 'لبنان', code: 'LB', flag: '🇱🇧' },
  { name: 'تونس', code: 'TN', flag: '🇹🇳' },
  { name: 'فلسطين', code: 'PS', flag: '🇵🇸' },
  { name: 'اليمن', code: 'YE', flag: '🇾🇪' },
  { name: 'ليبيا', code: 'LY', flag: '🇱🇾' },
  { name: 'السودان', code: 'SD', flag: '🇸🇩' },
];

const DEFAULT_SETTINGS = {
  mainColor: '#fe2c55',
  highlightColor: '#25f4ee',
  appFont: 'Cairo',
  title: 'مسابقة مسلسل رمضان',
  logoUrl: 'https://placehold.co/100x40/fe2c55/25f4ee?text=Series',
  marqueeText: 'أهلاً بكم في مسابقة تصاميم المسلسل الرمضاني. التصويت والمشاركات مفتوحة دائماً!',
  useGlassmorphism: true,
  termsText: 'الشروط والأحكام:\n- يجب أن يكون التصميم من مشاهد المسلسل حصراً.\n- يمنع استخدام حقوق موسيقية غير مصرح بها.\n- يرجى اختيار رقم الحلقة الصحيح عند الإرسال.',
  whyText: 'لماذا هذه المسابقة؟\nلدعم المصممين وصناع المحتوى العراقي والعربي خلال شهر رمضان المبارك، واختيار أفضل الإبداعات للمشاهد الرمضانية.',
};

const generateAvatar = (name) => `https://ui-avatars.com/api/?name=${encodeURIComponent(name || 'Unknown')}&background=random&color=fff&size=128&bold=true`;

const MOCK_SUBMISSIONS = [
  { id: '1', participantName: 'أحمد العراقي', description: 'تصميم حزين لمشهد النهاية مع موسيقى هادئة جداً', country: 'العراق', episode: 'الحلقة 1', votes: 890, status: 'Approved', videoUrl: 'https://www.tiktok.com/@tiktok/video/7279148301138855211', thumbnailUrl: 'https://placehold.co/600x900/111827/ffffff?text=Ep+1', profilePic: generateAvatar('أحمد العراقي'), flag: '🇮🇶', submittedAt: new Date(Date.now() - 100000) },
  { id: '2', participantName: 'سارة خالد', description: 'تعديل اكشن سريع للمواجهة في بداية الحلقة', country: 'السعودية', episode: 'الحلقة 1', votes: 750, status: 'Approved', videoUrl: 'https://www.tiktok.com/@tiktok/video/7279148301138855211', thumbnailUrl: 'https://placehold.co/600x900/111827/ffffff?text=Ep+1', profilePic: generateAvatar('سارة خالد'), flag: '🇸🇦', submittedAt: new Date(Date.now() - 200000) },
  { id: '3', participantName: 'أحمد العراقي', description: 'ريأكشن كوميدي على لقطة المقهى', country: 'العراق', episode: 'الحلقة 2', votes: 620, status: 'Approved', videoUrl: 'https://www.tiktok.com/@tiktok/video/7279148301138855211', thumbnailUrl: 'https://placehold.co/600x900/111827/ffffff?text=Ep+2', profilePic: generateAvatar('أحمد العراقي'), flag: '🇮🇶', submittedAt: new Date(Date.now() - 300000) },
  { id: '4', participantName: 'نور علي', description: 'مونتاج للمشهد الدرامي في المستشفى', country: 'الكويت', episode: 'الحلقة 2', votes: 580, status: 'Approved', videoUrl: 'https://www.tiktok.com/@tiktok/video/7279148301138855211', thumbnailUrl: 'https://placehold.co/600x900/111827/ffffff?text=Ep+2', profilePic: generateAvatar('نور علي'), flag: '🇰🇼', submittedAt: new Date(Date.now() - 400000) },
];

const MOCK_LIBRARY_SCENES = Array.from({ length: 30 }, (_, index) => {
  const episodeName = `الحلقة ${index + 1}`;
  return [
    { id: `${index}-1`, episode: episodeName, title: `مشهد المواجهة القوية - ${episodeName}`, verticalUrl: '#', horizontalUrl: '#' },
    { id: `${index}-2`, episode: episodeName, title: `مشهد النهاية الصادم - ${episodeName}`, verticalUrl: '#', horizontalUrl: '#' },
  ];
}).flat();

// =========================================================================
// 3. CORE COMPONENTS & HOOKS
// =========================================================================

const useAuth = () => {
  const [userId, setUserId] = useState(null);
  useEffect(() => {
    if (!auth) { setUserId('mock-user-id'); return; }
    const unsubscribe = onAuthStateChanged(
      auth,
      (user) => { setUserId(user ? user.uid : 'public-read-only'); },
      (error) => { console.error('Auth Error:', error); setUserId('public-read-only'); }
    );
    return () => unsubscribe();
  }, []);
  return { userId, isAuthReady: userId !== null };
};

const GlassCard = ({ children, className = '', isGlassmorphism = true, color = 'bg-gray-700' }) => {
  const glassClasses = isGlassmorphism ? 'bg-opacity-50 backdrop-blur-md shadow-xl border border-white/10' : 'shadow-2xl';
  return <div className={`p-4 rounded-xl ${color} ${glassClasses} ${className}`}>{children}</div>;
};

const AlertBanner = ({ settings }) => (
  <div className="p-3 text-white border-r-4 rounded-lg flex items-center mb-6 shadow-2xl overflow-hidden"
    style={{
      '--pulse-shadow': `0 0 10px 2px ${settings.highlightColor}`,
      backgroundColor: settings.mainColor,
      borderColor: settings.highlightColor,
    }}>
    <style>{`@keyframes pulse-effect { 0%, 100% { box-shadow: 0 0 0 0 rgba(255, 255, 255, 0.7); } 50% { box-shadow: var(--pulse-shadow); } } .pulse-animation { animation: pulse-effect 2s infinite ease-in-out; }`}</style>
    <div className="pulse-animation p-1 rounded-full border-2 mr-4 flex-shrink-0" style={{ borderColor: settings.highlightColor }}>
      <Film className="w-6 h-6" />
    </div>
    <span className="font-bold ml-2 text-xl whitespace-nowrap">إعلان</span>
    <span className="mx-auto text-lg truncate px-4">{settings.marqueeText}</span>
  </div>
);

const Modal = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" onClick={onClose}>
      <GlassCard isGlassmorphism className="w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center pb-3 border-b border-white/20">
          <h2 className="text-2xl font-bold text-white">{title}</h2>
          <button onClick={onClose} className="text-white hover:text-highlight-color transition"><X className="w-6 h-6" /></button>
        </div>
        <div className="pt-4 text-white text-lg leading-relaxed space-y-4">{children}</div>
      </GlassCard>
    </div>
  );
};

// =========================================================================
// 4. MAIN VIEWS (HOME, SUBMIT, LIBRARY, RESULTS, PROFILE)
// =========================================================================

const StatsCard = ({ submission, settings, onDesignerClick }) => {
  const { participantName, flag, country, episode, votes, profilePic, submittedAt } = submission;
  const submittedDate = submittedAt instanceof Date ? submittedAt : (submittedAt && typeof submittedAt.toDate === 'function' ? submittedAt.toDate() : new Date());
  const formattedDate = submittedDate.toLocaleDateString('ar-EG', { day: 'numeric', month: 'short' });

  return (
    <div className="relative w-full h-40 group [perspective:1000px]">
      <style>{`.flip-container { transition: transform 0.6s; transform-style: preserve-3d; } .flip-container.flipped { transform: rotateY(180deg); } .front, .back { backface-visibility: hidden; position: absolute; top: 0; left: 0; width: 100%; height: 100%; } .back { transform: rotateY(180deg); }`}</style>
      <div className="flip-container h-full group-hover:flipped">
        <div className="front">
          <GlassCard isGlassmorphism={settings.useGlassmorphism} color="bg-gray-800" className="h-full p-2 flex flex-col items-center justify-center overflow-hidden relative">
            <span className="absolute top-1 right-1 bg-black/50 text-[10px] px-1 rounded text-highlight-color font-bold">{episode}</span>
            <img
              src={profilePic || generateAvatar(participantName)}
              alt={`Profile of ${participantName}`}
              onClick={() => onDesignerClick(participantName)}
              className="w-12 h-12 object-cover rounded-full mb-1 border-2 cursor-pointer hover:scale-110 transition"
              style={{ borderColor: `var(--highlight-color-css)` }}
            />
            <p className="text-xl font-extrabold text-white mt-1" style={{ color: `var(--highlight-color-css)` }}>{votes.toLocaleString()}</p>
            <p onClick={() => onDesignerClick(participantName)} className="text-xs font-bold text-white truncate w-full text-center mt-1 cursor-pointer hover:underline">{participantName}</p>
            <p className="text-[10px] text-white/70">{flag} {country}</p>
          </GlassCard>
        </div>
        <div className="back">
          <GlassCard isGlassmorphism={settings.useGlassmorphism} color="bg-gray-800" className="h-full p-2 flex flex-col items-center justify-center text-center">
            <p className="text-xs text-white/70 mb-1">تاريخ التقديم:</p>
            <p className="text-sm font-semibold text-white">{formattedDate}</p>
            <div className="h-px w-1/2 my-2 mx-auto" style={{ backgroundColor: `var(--main-color-css)` }} />
            <p className="text-xs text-white/70 mb-1">إجمالي الأصوات:</p>
            <p className="text-2xl font-extrabold text-white" style={{ color: `var(--highlight-color-css)` }}>{votes.toLocaleString()}</p>
          </GlassCard>
        </div>
      </div>
    </div>
  );
};

const LiveResultsView = ({ approvedSubmissions, settings, currentFilter, onDesignerClick }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isHovering, setIsHovering] = useState(false);
  const perSlide = 4;

  const rankedSubmissions = useMemo(() => approvedSubmissions.sort((a, b) => b.votes - a.votes), [approvedSubmissions]);
  const topThree = rankedSubmissions.slice(0, 3);
  const remainingSubmissions = rankedSubmissions.slice(3);
  const numSlides = Math.ceil(remainingSubmissions.length / perSlide);

  const nextSlide = () => setCurrentIndex((prev) => (prev + 1) % numSlides);
  const prevSlide = () => setCurrentIndex((prev) => (prev - 1 + numSlides) % numSlides);

  const currentSlideSubmissions = remainingSubmissions.slice(currentIndex * perSlide, currentIndex * perSlide + perSlide);

  useEffect(() => {
    if (numSlides <= 1 || isHovering) return;
    const autoSlideTimer = setInterval(() => { nextSlide(); }, 5000);
    return () => clearInterval(autoSlideTimer);
  }, [numSlides, isHovering, approvedSubmissions]);

  if (rankedSubmissions.length === 0) return null;

  const CompactPodiumItem = ({ submission, rank, settings }) => {
    const { participantName, country, flag, episode, votes, profilePic } = submission;
    const rankColor = { 1: settings.highlightColor, 2: settings.mainColor, 3: '#5b1f28' }[rank];

    return (
      <div className="relative flex flex-col items-center p-3 text-center w-full transform hover:scale-105 transition duration-300 rounded-lg mt-4"
        style={{ backgroundColor: `${rankColor}30`, border: `2px solid ${rankColor}`, boxShadow: `0 0 10px ${rankColor}80` }}>
        
        {rank === 1 && <Crown className="absolute -top-6 text-yellow-400 w-8 h-8 drop-shadow-lg animate-bounce" />}
        
        <p className="text-xs font-bold text-gray-900 absolute top-0 right-0 p-1 rounded-bl-lg" style={{ backgroundColor: rankColor, color: rank === 1 ? '#000' : '#fff' }}>
          #{rank}
        </p>
        <p className="text-[10px] font-bold text-white absolute top-0 left-0 p-1 rounded-br-lg bg-black/50">
          {episode}
        </p>
        
        <img 
           src={profilePic || generateAvatar(participantName)} 
           alt={`Rank ${rank}`} 
           onClick={() => onDesignerClick(participantName)}
           className="w-14 h-14 object-cover rounded-full mb-2 border-2 mt-3 cursor-pointer hover:scale-110 transition" 
           style={{ borderColor: rankColor }} 
        />
        <p className="text-lg font-extrabold text-white" style={{ color: rankColor }}>{votes.toLocaleString()}</p>
        <p onClick={() => onDesignerClick(participantName)} className="text-sm font-bold text-white truncate w-full cursor-pointer hover:underline">{participantName}</p>
        <p className="text-[10px] text-white/70">{flag} {country}</p>
      </div>
    );
  };

  return (
    <GlassCard isGlassmorphism={settings.useGlassmorphism} color="bg-gray-800" className="p-4 mb-6 shadow-2xl">
      <h2 className="text-2xl font-extrabold text-white mb-4 border-b border-white/20 pb-2" style={{ color: `var(--highlight-color-css)` }}>
        أوائل المصممين {currentFilter !== 'الكل' ? `(${currentFilter})` : ''}
      </h2>
      
      <div className="flex justify-around gap-2 mb-6 items-end">
        {topThree[1] && <div className="w-1/3"><CompactPodiumItem submission={topThree[1]} rank={2} settings={settings} /></div>}
        {topThree[0] && <div className="w-1/3 z-10 -mt-4"><CompactPodiumItem submission={topThree[0]} rank={1} settings={settings} /></div>}
        {topThree[2] && <div className="w-1/3"><CompactPodiumItem submission={topThree[2]} rank={3} settings={settings} /></div>}
      </div>

      {remainingSubmissions.length > 0 && (
        <div className="relative flex items-center justify-center mt-8 border-t border-white/10 pt-4" onMouseEnter={() => setIsHovering(true)} onMouseLeave={() => setIsHovering(false)}>
          <button onClick={prevSlide} className="p-2 rounded-full bg-white/10 hover:bg-white/30 text-white transition disabled:opacity-50 z-10" disabled={numSlides <= 1}>
            <ChevronRight className="w-6 h-6" />
          </button>
          <div className="flex-grow mx-4 overflow-hidden">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 transition-transform duration-500">
              {currentSlideSubmissions.map((sub) => (
                <StatsCard key={sub.id} submission={sub} settings={settings} onDesignerClick={onDesignerClick}/>
              ))}
              {[...Array(perSlide - currentSlideSubmissions.length)].map((_, i) => (
                <div key={`filler-${i}`} className="w-full hidden md:block"></div>
              ))}
            </div>
          </div>
          <button onClick={nextSlide} className="p-2 rounded-full bg-white/10 hover:bg-white/30 text-white transition disabled:opacity-50 z-10" disabled={numSlides <= 1}>
            <ChevronLeft className="w-6 h-6" />
          </button>
        </div>
      )}
    </GlassCard>
  );
};


const SubmissionForm = ({ settings, userId, allSubmissions }) => {
  const [step, setStep] = useState(1);
  const [videoUrl, setVideoUrl] = useState('');
  const [isFetching, setIsFetching] = useState(false);
  const [fetchError, setFetchError] = useState(false);
  
  const [formData, setFormData] = useState({ 
    participantName: '', 
    description: '', 
    thumbnailUrl: '',
    country: COUNTRIES[0].name, 
    episode: EPISODES[0] 
  });
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState(null);
  const [error, setError] = useState(null);

  // دالة لتنظيف الرابط من المتغيرات الزائدة للمقارنة
  const normalizeTikTokUrl = (url) => {
    try {
      const urlObj = new URL(url);
      return urlObj.origin + urlObj.pathname;
    } catch (e) {
      return url;
    }
  };

  const handleFetchData = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    if (!videoUrl.includes('tiktok.com')) {
      setError('الرجاء إدخال رابط تيك توك صحيح.');
      return;
    }

    setIsFetching(true);
    try {
      const cleanUrl = normalizeTikTokUrl(videoUrl);

      // 1. التحقق من وجود التصميم مسبقاً
      const exists = allSubmissions.some(sub => normalizeTikTokUrl(sub.videoUrl) === cleanUrl);
      if (exists) {
        setError('عذراً، هذا التصميم مشارك في المسابقة مسبقاً!');
        setIsFetching(false);
        return;
      }

      // 2. محاولة جلب البيانات من TikTok oEmbed API عبر Proxy
      const oembedApi = `https://www.tiktok.com/oembed?url=${encodeURIComponent(cleanUrl)}`;
      const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(oembedApi)}`;
      
      const response = await fetch(proxyUrl);
      if (!response.ok) throw new Error('Network error');
      
      const proxyData = await response.json();
      if (!proxyData.contents) throw new Error('No content');
      
      const data = JSON.parse(proxyData.contents);

      setFormData(prev => ({
        ...prev,
        participantName: data.author_name || '',
        description: data.title || '',
        thumbnailUrl: data.thumbnail_url || ''
      }));
      setFetchError(false);
      
    } catch (err) {
      console.warn("Fetch failed, switching to manual mode.", err);
      // في حال فشل الجلب (CORS, Adblocker, الخ)، نفتح الوضع اليدوي للمستخدم
      setFormData(prev => ({
        ...prev,
        participantName: '',
        description: '',
        thumbnailUrl: ''
      }));
      setFetchError(true);
    } finally {
      setIsFetching(false);
      setStep(2); // دائماً ننتقل للخطوة الثانية، سواء نجح الجلب أو فشل
    }
  };

  const handleFinalSubmit = async (e) => {
    e.preventDefault();
    setError(null); 
    
    if (!formData.participantName || !formData.description) {
      setError('الرجاء تعبئة اسم المصمم ووصف التصميم.');
      return;
    }

    setIsSubmitting(true);
    try {
      if (!db) throw new Error('قاعدة البيانات غير مهيأة.');
      const countryData = COUNTRIES.find((c) => c.name === formData.country);
      const cleanUrl = normalizeTikTokUrl(videoUrl);
      
      const newSubmission = {
        participantName: formData.participantName,
        description: formData.description,
        videoUrl: cleanUrl,
        episode: formData.episode,
        country: formData.country,
        userId: userId || 'anonymous',
        status: 'Pending',
        votes: 0,
        flag: countryData.flag,
        profilePic: generateAvatar(formData.participantName), 
        // إذا لم يكن هناك صورة غلاف بسبب فشل الجلب، نولد غلافاً برقم الحلقة
        thumbnailUrl: formData.thumbnailUrl || `https://placehold.co/600x900/111827/ffffff?text=${encodeURIComponent(formData.episode)}`,
        submittedAt: serverTimestamp(),
      };

      await retryOperation(() => addDoc(collection(db, PUBLIC_SUBMISSIONS_COLLECTION), newSubmission));
      setSuccessMessage('تم إرسال مشاركتك بنجاح! سيتم مراجعتها وعرضها قريباً.');
      
      // تصفير البيانات للبدء من جديد
      setStep(1);
      setVideoUrl('');
      setFormData({ participantName: '', description: '', thumbnailUrl: '', country: COUNTRIES[0].name, episode: EPISODES[0] });
    } catch (e) {
      setError(`حدث خطأ أثناء الإرسال: ${e.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <GlassCard isGlassmorphism={settings.useGlassmorphism} color="bg-gray-900" className="max-w-xl mx-auto mt-10">
      <h1 className="text-3xl font-bold text-center mb-6" style={{ color: `var(--main-color-css)` }}>إرسال تصميم جديد</h1>
      {successMessage && <div className="bg-green-600/70 p-4 rounded-lg mb-4 text-white text-center font-semibold">{successMessage}</div>}
      {error && <div className="bg-red-600/70 p-4 rounded-lg mb-4 text-white text-center font-semibold">{error}</div>}
      
      {step === 1 && (
        <form onSubmit={handleFetchData} className="space-y-4 animate-fade-in">
          <div>
            <label className="block text-white mb-2 font-medium">رابط تصميم الفيديو (TikTok URL)</label>
            <input 
              type="url" 
              value={videoUrl} 
              onChange={(e) => setVideoUrl(e.target.value)} 
              className="w-full p-4 rounded-lg bg-gray-800/80 border border-white/20 text-white focus:border-highlight-color transition shadow-inner" 
              placeholder="https://www.tiktok.com/@user/video/123..."
              dir="ltr" 
              required 
            />
            <p className="text-xs text-white/50 mt-2 flex items-center"><Info className="w-4 h-4 ml-1" /> سيتم جلب اسمك والصورة المصغرة والوصف تلقائياً إن أمكن.</p>
          </div>

          <button type="submit" disabled={isFetching || !videoUrl} className="w-full p-4 rounded-lg font-bold text-lg text-gray-900 transition duration-300 disabled:opacity-50 mt-4 flex items-center justify-center" style={{ backgroundColor: `var(--highlight-color-css)` }}>
            {isFetching ? <><Loader className="w-5 h-5 animate-spin ml-2" /> جاري التحليل...</> : 'تحقق وجلب البيانات'}
          </button>
        </form>
      )}

      {step === 2 && (
        <form onSubmit={handleFinalSubmit} className="space-y-4 animate-fade-in">
          
          {/* رسالة في حال فشل الجلب التلقائي */}
          {fetchError && (
            <div className="bg-yellow-600/20 border border-yellow-500/50 p-3 rounded-lg text-yellow-200 text-sm mb-4">
              <AlertTriangle className="w-5 h-5 inline-block ml-1" />
              تعذر الجلب التلقائي (بسبب حماية المتصفح أو الشبكة). يرجى إدخال تفاصيل التصميم يدوياً.
            </div>
          )}

          {/* المعاينة في حال نجاح الجلب */}
          {!fetchError && formData.thumbnailUrl && (
            <div className="bg-gray-800 p-4 rounded-xl border border-white/20 flex gap-4">
              <img src={formData.thumbnailUrl} alt="Thumbnail" className="w-24 h-36 object-cover rounded-lg shadow-lg border border-white/10" />
              <div className="flex flex-col justify-center overflow-hidden">
                 <span className="text-xs text-white/50 mb-1">تم جلب البيانات (يمكنك تعديلها إذا رغبت)</span>
                 <p className="text-lg font-bold truncate text-white" style={{ color: settings.highlightColor }}>{formData.participantName}</p>
                 <p className="text-sm text-white/80 line-clamp-3 mt-2">{formData.description}</p>
              </div>
            </div>
          )}

          {/* الحقول تظهر دائماً ليتمكن المستخدم من المراجعة أو الإدخال اليدوي */}
          <div>
            <label className="block text-white mb-2 font-medium">اسم الحساب / المصمم</label>
            <input 
              type="text" 
              value={formData.participantName} 
              onChange={(e) => setFormData({ ...formData, participantName: e.target.value })} 
              className="w-full p-3 rounded-lg bg-gray-800/80 border border-white/20 text-white focus:border-highlight-color" 
              placeholder="اسم المصمم..."
              required 
            />
          </div>

          <div>
            <label className="block text-white mb-2 font-medium">وصف التصميم (عنوان الفيديو)</label>
            <textarea 
              value={formData.description} 
              onChange={(e) => setFormData({ ...formData, description: e.target.value })} 
              className="w-full p-3 rounded-lg bg-gray-800/80 border border-white/20 text-white focus:border-highlight-color h-20" 
              placeholder="اكتب وصفاً قصيراً للتصميم..."
              required 
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-white mb-2 font-medium">رقم الحلقة</label>
              <div className="relative">
                <select value={formData.episode} onChange={(e) => setFormData({ ...formData, episode: e.target.value })} className="appearance-none w-full p-3 rounded-lg bg-gray-800/80 border border-white/20 text-white focus:border-highlight-color pr-10" style={{ backgroundImage: 'none' }} required>
                  {EPISODES.map((ep) => <option key={ep} value={ep}>{ep}</option>)}
                </select>
                <ChevronDown className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-white pointer-events-none" />
              </div>
            </div>
            <div>
              <label className="block text-white mb-2 font-medium">البلد</label>
              <div className="relative">
                <select value={formData.country} onChange={(e) => setFormData({ ...formData, country: e.target.value })} className="appearance-none w-full p-3 rounded-lg bg-gray-800/80 border border-white/20 text-white focus:border-highlight-color pr-10" style={{ backgroundImage: 'none' }} required>
                  {COUNTRIES.map((c) => <option key={c.code} value={c.name}>{c.flag} {c.name}</option>)}
                </select>
                <ChevronDown className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-white pointer-events-none" />
              </div>
            </div>
          </div>

          <div className="flex gap-4 pt-4">
            <button type="button" onClick={() => {setStep(1); setFetchError(false); setError(null);}} disabled={isSubmitting} className="w-1/3 p-3 rounded-lg font-bold text-white bg-gray-700 hover:bg-gray-600 transition duration-300">
              تراجع
            </button>
            <button type="submit" disabled={isSubmitting} className="w-2/3 p-3 rounded-lg font-bold text-lg text-gray-900 transition duration-300 disabled:opacity-50" style={{ backgroundColor: `var(--main-color-css)` }}>
              {isSubmitting ? 'جاري الإرسال...' : 'تأكيد وإرسال'}
            </button>
          </div>
        </form>
      )}
    </GlassCard>
  );
};

const ContestCard = ({ submission, settings, onVote, onOpenVideo, onDesignerClick }) => {
  const { participantName, description, country, flag, episode, thumbnailUrl, profilePic, votes } = submission;
  
  return (
    <GlassCard isGlassmorphism={settings.useGlassmorphism} color="bg-gray-900" className="flex flex-col h-full overflow-hidden hover:shadow-highlight transition duration-300 relative group">
      <div className="absolute top-2 left-2 z-10 px-2 py-1 rounded-md text-xs font-bold text-gray-900 shadow-md" style={{ backgroundColor: settings.highlightColor }}>
        {episode}
      </div>
      
      <div className="relative overflow-hidden w-full aspect-[2/3] rounded-lg mb-3 cursor-pointer" onClick={() => onOpenVideo(submission)}>
        <img src={thumbnailUrl} alt="Video Thumbnail" className="w-full h-full object-cover transition duration-300 transform group-hover:scale-105 opacity-80" onError={(e) => (e.target.src = 'https://placehold.co/600x900/111827/ffffff?text=Video')} />
        
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent flex flex-col justify-end p-2 pb-4">
           <div className="flex items-center justify-center h-full">
             <PlayCircle className="w-12 h-12 text-white/70 group-hover:text-white transition duration-300" />
           </div>
        </div>
      </div>

      <div className="flex flex-col flex-grow justify-between text-white p-1">
        
        {/* معلومات المصمم قابلة للضغط للذهاب لبروفايله */}
        <div className="flex items-center mb-2 group/author cursor-pointer" onClick={() => onDesignerClick(participantName)}>
           <img src={profilePic || generateAvatar(participantName)} alt={participantName} className="w-8 h-8 rounded-full border border-white/20 object-cover group-hover/author:border-highlight-color transition" />
           <div className="mr-2 overflow-hidden">
             <p className="text-sm font-bold truncate leading-tight group-hover/author:text-highlight-color transition">{participantName}</p>
             <p className="text-[10px] text-white/60 flex items-center">{flag} {country}</p>
           </div>
        </div>

        <div className="mb-3 h-10">
          <p className="text-xs text-white/80 line-clamp-2" title={description}>
            {description || "لم يتم كتابة وصف لهذا التصميم."}
          </p>
        </div>

        <div className="flex justify-between items-center mb-3 pt-2 border-t border-white/10">
            <span className="text-xs text-white/60">إجمالي الدعم</span>
            <span className="text-sm font-bold" style={{ color: settings.highlightColor }}>{votes.toLocaleString()} صوت</span>
        </div>

        <button onClick={() => onVote(submission)} className="w-full py-2 px-4 rounded-lg font-bold text-gray-900 transition duration-300 hover:scale-[1.02] active:scale-95" style={{ backgroundColor: `var(--main-color-css)` }}>
          صوت للتصميم
        </button>
      </div>
    </GlassCard>
  );
};

// --- المكون الجديد: صفحة بروفايل المصمم ---
const DesignerProfile = ({ designerName, allSubmissions, settings, onVote, onBack, setVoteConfirmData }) => {
  const [videoModalOpen, setVideoModalOpen] = useState(false);
  const [selectedSubmission, setSelectedSubmission] = useState(null);

  // جلب كل تصميمات هذا المصمم
  const designerSubmissions = useMemo(() => 
    allSubmissions.filter(sub => sub.status === 'Approved' && sub.participantName === designerName).sort((a,b) => b.votes - a.votes)
  , [allSubmissions, designerName]);

  const totalDesignerVotes = designerSubmissions.reduce((sum, sub) => sum + sub.votes, 0);
  
  // جلب الصورة والبلد من أول تصميم كبيانات أساسية
  const profileInfo = designerSubmissions.length > 0 ? designerSubmissions[0] : null;

  const handleOpenVideo = (submission) => { setSelectedSubmission(submission); setVideoModalOpen(true); };
  
  if(designerSubmissions.length === 0) {
    return (
      <div className="text-center py-20 text-white">
        <p className="text-2xl mb-4">لا توجد أعمال معتمدة لهذا المصمم حالياً.</p>
        <button onClick={onBack} className="px-6 py-2 bg-gray-800 rounded-full hover:bg-gray-700">العودة</button>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
       {/* زر العودة */}
       <button onClick={onBack} className="flex items-center text-white/70 hover:text-white transition bg-gray-900/50 px-4 py-2 rounded-full border border-white/10 w-fit">
         <ArrowRight className="w-5 h-5 ml-2" /> العودة للرئيسية
       </button>

       {/* ترويسة المصمم */}
       <GlassCard isGlassmorphism={settings.useGlassmorphism} color="bg-gray-900" className="flex flex-col md:flex-row items-center md:items-start p-8 gap-6 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-highlight-color/20 to-transparent"></div>
          
          <img src={profileInfo.profilePic || generateAvatar(designerName)} alt={designerName} className="w-32 h-32 rounded-full border-4 shadow-2xl z-10 object-cover" style={{ borderColor: settings.mainColor }} />
          
          <div className="text-center md:text-right z-10 flex-grow pt-2">
            <h2 className="text-4xl font-extrabold text-white mb-2">{designerName}</h2>
            <p className="text-lg text-white/70 mb-4">{profileInfo.flag} {profileInfo.country}</p>
            
            <div className="flex flex-wrap justify-center md:justify-start gap-4">
               <div className="bg-gray-800/80 px-6 py-3 rounded-lg border border-white/10 text-center">
                 <p className="text-sm text-white/50 mb-1">إجمالي التصاميم</p>
                 <p className="text-2xl font-bold text-white">{designerSubmissions.length}</p>
               </div>
               <div className="bg-gray-800/80 px-6 py-3 rounded-lg border border-white/10 text-center">
                 <p className="text-sm text-white/50 mb-1">مجموع الأصوات</p>
                 <p className="text-2xl font-bold" style={{ color: settings.highlightColor }}>{totalDesignerVotes.toLocaleString()}</p>
               </div>
            </div>
          </div>
       </GlassCard>

       <h3 className="text-2xl font-bold text-white border-b border-white/10 pb-2 mt-8">جميع تصاميم {designerName}</h3>

       <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
          {designerSubmissions.map((sub) => (
            <ContestCard key={sub.id} submission={sub} settings={settings} onVote={(s) => setVoteConfirmData(s)} onOpenVideo={handleOpenVideo} onDesignerClick={()=>{}} />
          ))}
       </div>

       <Modal isOpen={videoModalOpen} onClose={() => setVideoModalOpen(false)} title={`تصميم: ${selectedSubmission?.participantName}`}>
        {selectedSubmission && (
          <div className="flex flex-col">
            <div className="relative w-full aspect-[9/16] bg-black rounded-lg overflow-hidden mb-4 mx-auto max-w-sm border border-white/10 shadow-2xl">
              <iframe title="TikTok Video" src={`https://www.tiktok.com/embed/v2/${selectedSubmission.videoUrl.split('/').pop().split('?')[0]}?lang=en-US`} className="w-full h-full" frameBorder="0" allowFullScreen></iframe>
            </div>
            <div className="bg-gray-800 p-4 rounded-lg border border-white/10">
               <p className="font-bold text-lg text-highlight-color mb-2">{selectedSubmission.episode}</p>
               <p className="text-sm text-white/90 mb-4 whitespace-pre-wrap leading-relaxed">{selectedSubmission.description}</p>
               <button onClick={() => {setVideoModalOpen(false); setVoteConfirmData(selectedSubmission);}} className="w-full py-3 px-6 rounded-lg font-bold text-gray-900 transition" style={{ backgroundColor: settings.mainColor }}>
                 صوت لهذا التصميم الآن
               </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

const DesignersLibrary = ({ settings }) => {
  const [selectedEpisode, setSelectedEpisode] = useState(EPISODES[0]);
  const currentScenes = MOCK_LIBRARY_SCENES.filter(scene => scene.episode === selectedEpisode);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col md:flex-row justify-between items-center bg-gray-900/50 p-6 rounded-xl border border-white/10">
        <div>
          <h2 className="text-3xl font-bold text-white mb-2 flex items-center">
            <FolderOpen className="w-8 h-8 ml-3" style={{ color: settings.highlightColor }} />
            مكتبة المصممين
          </h2>
          <p className="text-white/70">حمل مشاهد عالية الدقة خالية من الحقوق لتصاميمك المونتاجية.</p>
        </div>
        
        <div className="mt-4 md:mt-0 w-full md:w-64">
          <label className="block text-white/70 text-sm mb-1">اختر حلقة المشاهد:</label>
          <div className="relative">
            <select 
              value={selectedEpisode} 
              onChange={(e) => setSelectedEpisode(e.target.value)} 
              className="appearance-none w-full p-3 rounded-lg bg-gray-800 border border-white/20 text-white focus:border-highlight-color pr-10 text-lg font-bold" 
              style={{ backgroundImage: 'none' }}
            >
              {EPISODES.map((ep) => <option key={ep} value={ep}>{ep}</option>)}
            </select>
            <ChevronDown className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-white pointer-events-none" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {currentScenes.length > 0 ? (
          currentScenes.map((scene) => (
            <GlassCard key={scene.id} isGlassmorphism={settings.useGlassmorphism} color="bg-gray-800" className="flex flex-col">
              <div className="w-full aspect-video bg-black rounded-lg mb-4 flex items-center justify-center relative overflow-hidden group">
                 <Film className="w-12 h-12 text-white/30 group-hover:scale-110 transition duration-300" />
                 <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent"></div>
                 <p className="absolute bottom-3 right-3 text-white font-bold">{scene.title}</p>
              </div>
              
              <div className="grid grid-cols-2 gap-3 mt-auto">
                <a href={scene.verticalUrl} target="_blank" rel="noreferrer" className="flex flex-col items-center justify-center p-3 rounded-lg bg-gray-700 hover:bg-gray-600 transition text-white border border-white/10">
                  <Smartphone className="w-6 h-6 mb-1 text-blue-400" />
                  <span className="text-xs font-bold text-center">عامودي (Reels)</span>
                  <span className="text-[10px] text-white/50 flex items-center mt-1"><Download className="w-3 h-3 ml-1"/> تحميل</span>
                </a>
                <a href={scene.horizontalUrl} target="_blank" rel="noreferrer" className="flex flex-col items-center justify-center p-3 rounded-lg bg-gray-700 hover:bg-gray-600 transition text-white border border-white/10">
                  <MonitorPlay className="w-6 h-6 mb-1 text-green-400" />
                  <span className="text-xs font-bold text-center">أفقي (YouTube)</span>
                  <span className="text-[10px] text-white/50 flex items-center mt-1"><Download className="w-3 h-3 ml-1"/> تحميل</span>
                </a>
              </div>
            </GlassCard>
          ))
        ) : (
          <div className="col-span-full text-center py-10 text-white/50">
            لا توجد مشاهد متوفرة لهذه الحلقة حالياً.
          </div>
        )}
      </div>
    </div>
  );
};

const Home = ({ settings, allSubmissions, totalApproved, onVote, cooldown, setVoteConfirmData, onDesignerClick }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterEpisode, setFilterEpisode] = useState('الكل');
  const [videoModalOpen, setVideoModalOpen] = useState(false);
  const [selectedSubmission, setSelectedSubmission] = useState(null);

  const approvedSubmissions = useMemo(() => allSubmissions.filter((sub) => sub.status === 'Approved').sort((a, b) => b.votes - a.votes), [allSubmissions]);
  
  const filteredSubmissions = useMemo(() => {
    return approvedSubmissions.filter((sub) => {
      const matchSearch = sub.participantName.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          sub.country.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (sub.description && sub.description.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchEpisode = filterEpisode === 'الكل' || sub.episode === filterEpisode;
      return matchSearch && matchEpisode;
    });
  }, [approvedSubmissions, searchTerm, filterEpisode]);

  const handleOpenVideo = (submission) => { setSelectedSubmission(submission); setVideoModalOpen(true); };
  const handleVoteFromCard = (submission) => {
    if (cooldown > 0) { handleOpenVideo(submission); return; }
    setVoteConfirmData(submission);
  };

  return (
    <div className="space-y-8 animate-fade-in">
      <GlassCard isGlassmorphism={settings.useGlassmorphism} color="bg-gray-800" className="p-4 flex flex-col md:flex-row gap-4 items-center">
        <div className="w-full md:w-1/3">
          <div className="relative">
            <input type="text" placeholder="البحث باسم المصمم أو الوصف..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full p-3 pr-10 rounded-lg bg-gray-900/80 border border-white/10 text-white focus:border-highlight-color" />
            <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-white/50" />
          </div>
        </div>
        
        <div className="w-full md:w-1/3">
           <div className="relative">
            <select value={filterEpisode} onChange={(e) => setFilterEpisode(e.target.value)} className="appearance-none w-full p-3 rounded-lg bg-gray-900/80 border border-white/10 text-white focus:border-highlight-color pr-10 font-bold" style={{ backgroundImage: 'none' }}>
              <option value="الكل">عرض جميع الحلقات</option>
              {EPISODES.map((ep) => <option key={ep} value={ep}>{ep}</option>)}
            </select>
            <ChevronDown className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-white pointer-events-none" />
          </div>
        </div>

        <div className="w-full md:w-1/3 flex items-center justify-end text-white">
          <span className="text-lg font-semibold ml-2">المشاركات المعروضة:</span>
          <span className="text-2xl font-extrabold" style={{ color: `var(--highlight-color-css)` }}>{filteredSubmissions.length}</span>
        </div>
      </GlassCard>

      <LiveResultsView approvedSubmissions={filteredSubmissions} settings={settings} currentFilter={filterEpisode} onDesignerClick={onDesignerClick} />

      <h3 className="text-2xl font-bold text-white border-b border-white/10 pb-2">
        {filterEpisode === 'الكل' ? 'أحدث التصاميم (جميع الحلقات)' : `تصاميم ${filterEpisode}`}
      </h3>

      {filteredSubmissions.length === 0 ? (
        <p className="text-white/70 text-center text-xl mt-10">لا توجد مشاركات مطابقة لمعايير البحث.</p>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
          {filteredSubmissions.map((sub) => (
            <ContestCard key={sub.id} submission={sub} settings={settings} onVote={handleVoteFromCard} onOpenVideo={handleOpenVideo} onDesignerClick={onDesignerClick} />
          ))}
        </div>
      )}

      <Modal isOpen={videoModalOpen} onClose={() => setVideoModalOpen(false)} title={`تصميم: ${selectedSubmission?.participantName}`}>
        {selectedSubmission && (
          <div className="flex flex-col">
            <div className="relative w-full aspect-[9/16] bg-black rounded-lg overflow-hidden mb-4 mx-auto max-w-sm border border-white/10 shadow-2xl">
              <iframe title="TikTok Video" src={`https://www.tiktok.com/embed/v2/${selectedSubmission.videoUrl.split('/').pop().split('?')[0]}?lang=en-US`} className="w-full h-full" frameBorder="0" allowFullScreen></iframe>
            </div>
            
            <div className="bg-gray-800 p-4 rounded-lg border border-white/10">
               <div className="flex items-start mb-3 border-b border-white/10 pb-3 cursor-pointer hover:bg-gray-700/50 p-2 rounded transition" onClick={()=>{setVideoModalOpen(false); onDesignerClick(selectedSubmission.participantName);}}>
                 <img src={selectedSubmission.profilePic || generateAvatar(selectedSubmission.participantName)} alt={selectedSubmission.participantName} className="w-10 h-10 rounded-full border border-white/20 ml-3 object-cover" />
                 <div>
                    <p className="font-bold text-lg text-white leading-none hover:text-highlight-color">{selectedSubmission.participantName}</p>
                    <p className="text-xs text-white/50 mt-1">{selectedSubmission.country} {selectedSubmission.flag} • {selectedSubmission.episode}</p>
                 </div>
               </div>
               
               <p className="text-sm text-white/90 mb-4 whitespace-pre-wrap leading-relaxed">
                 {selectedSubmission.description || "لم يتم كتابة وصف."}
               </p>

               <button onClick={() => {setVideoModalOpen(false); setVoteConfirmData(selectedSubmission);}} disabled={cooldown > 0} className="w-full py-3 px-6 rounded-lg font-bold text-gray-900 transition disabled:opacity-50 flex items-center justify-center" style={{ backgroundColor: settings.mainColor }}>
                 {cooldown > 0 ? `انتظر ${cooldown} ثانية للتصويت` : 'صوت لهذا التصميم الآن'}
               </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

// =========================================================================
// 5. ADMIN PANEL
// =========================================================================

const AdminSubmissionsPanel = ({ submissions, settings, isGlassmorphism, onUpdateSubmissionStatus }) => {
  const [activeTab, setActiveTab] = useState('Pending');
  const [submissionToEdit, setSubmissionToEdit] = useState(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const filteredSubmissions = useMemo(() => {
    let list = submissions.filter((sub) => sub.status === activeTab);
    if (activeTab === 'Approved') list = list.sort((a, b) => b.votes - a.votes);
    return list;
  }, [submissions, activeTab]);

  const handleSaveEdit = async (updatedSubmission) => {
    try {
      if (!db) return;
      
      // 1. تحديث هذا التصميم بحد ذاته
      await retryOperation(() => setDoc(doc(db, PUBLIC_SUBMISSIONS_COLLECTION, updatedSubmission.id), updatedSubmission, { merge: true }));
      
      // 2. تحديث جميع الصور الشخصية للتصاميم الأخرى التي تمتلك نفس اسم المصمم (توحيد الهوية)
      if (updatedSubmission.profilePic) {
        const q = query(collection(db, PUBLIC_SUBMISSIONS_COLLECTION), where("participantName", "==", updatedSubmission.participantName));
        const querySnapshot = await getDocs(q);
        const updatePromises = [];
        querySnapshot.forEach((document) => {
           if(document.id !== updatedSubmission.id) {
              updatePromises.push(updateDoc(doc(db, PUBLIC_SUBMISSIONS_COLLECTION, document.id), { profilePic: updatedSubmission.profilePic }));
           }
        });
        if(updatePromises.length > 0) {
            await Promise.all(updatePromises);
            console.log("تم توحيد الصورة الشخصية لجميع تصاميم هذا المصمم.");
        }
      }

      setIsEditModalOpen(false); setSubmissionToEdit(null);
    } catch (e) { console.error("Error updating submission: ", e); }
  };

  return (
    <GlassCard isGlassmorphism={isGlassmorphism} color="bg-gray-900" className="p-6 mb-6">
      <div className="flex border-b border-white/20 mb-4 overflow-x-auto">
        {['Pending', 'Approved', 'Rejected'].map((status) => (
          <button key={status} onClick={() => setActiveTab(status)} className={`py-2 px-4 text-sm font-semibold transition-colors whitespace-nowrap ${activeTab === status ? 'border-b-2 text-highlight-color' : 'text-white/70'}`} style={{ borderColor: activeTab === status ? settings.mainColor : 'transparent' }}>
            {status === 'Pending' ? 'المعلقة' : status === 'Approved' ? 'المقبولة' : 'المرفوضة'} ({submissions.filter((s) => s.status === status).length})
          </button>
        ))}
      </div>
      <div className="grid grid-cols-12 gap-2 text-white/70 font-semibold text-xs md:text-sm border-b border-white/30 pb-2 mb-2">
        <div className="col-span-3">المصمم</div>
        <div className="col-span-2">الحلقة</div>
        <div className="col-span-2">الأصوات</div>
        <div className="col-span-3">الرابط</div>
        <div className="col-span-2 text-left">إجراء</div>
      </div>
      <div className="max-h-96 overflow-y-auto custom-scrollbar">
        {filteredSubmissions.map((sub) => (
          <div key={sub.id} className="grid grid-cols-12 gap-2 items-center p-3 border-b border-white/10 hover:bg-gray-700/50 transition">
            <div className="col-span-3 truncate text-sm flex items-center">
              <img src={sub.profilePic || generateAvatar(sub.participantName)} className="w-6 h-6 rounded-full ml-2 object-cover" alt="" />
              <span className="truncate">{sub.participantName}</span>
            </div>
            <div className="col-span-2 text-sm text-highlight-color font-bold">{sub.episode}</div>
            <div className="col-span-2 text-sm">{sub.votes}</div>
            <div className="col-span-3 text-xs truncate" dir="ltr"><a href={sub.videoUrl} target="_blank" rel="noreferrer" className="text-blue-400 hover:underline">Link</a></div>
            <div className="col-span-2 flex justify-end space-x-1 space-x-reverse">
              {activeTab !== 'Approved' && <button onClick={() => onUpdateSubmissionStatus(sub.id, 'Approved')} className="p-1 rounded bg-green-600 hover:bg-green-700"><CheckCircle className="w-4 h-4 text-white" /></button>}
              {activeTab !== 'Rejected' && <button onClick={() => onUpdateSubmissionStatus(sub.id, 'Rejected')} className="p-1 rounded bg-red-600 hover:bg-red-700"><X className="w-4 h-4 text-white" /></button>}
              <button onClick={() => { setSubmissionToEdit(sub); setIsEditModalOpen(true); }} className="p-1 rounded bg-gray-600 hover:bg-gray-500"><User className="w-4 h-4 text-white" /></button>
            </div>
          </div>
        ))}
      </div>
      
      {submissionToEdit && (
        <Modal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} title="تعديل المشاركة">
          <div className="space-y-4">
            <div><label className="text-white text-sm">اسم المصمم</label><input type="text" value={submissionToEdit.participantName} onChange={(e) => setSubmissionToEdit({...submissionToEdit, participantName: e.target.value})} className="w-full p-2 rounded bg-gray-800 text-white border border-white/20 focus:border-highlight-color" /></div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                 <label className="text-white text-sm">رابط الصورة الشخصية (للمصمم)</label>
                 <input type="url" value={submissionToEdit.profilePic || ''} onChange={(e) => setSubmissionToEdit({...submissionToEdit, profilePic: e.target.value})} placeholder="https://..." dir="ltr" className="w-full p-2 rounded bg-gray-800 text-white border border-white/20 text-left focus:border-highlight-color" />
                 <p className="text-[10px] text-white/50 mt-1">تعديل هذه الصورة سيحدثها في كل أعماله.</p>
              </div>
              <div>
                 <label className="text-white text-sm">رابط صورة غلاف التصميم</label>
                 <input type="url" value={submissionToEdit.thumbnailUrl || ''} onChange={(e) => setSubmissionToEdit({...submissionToEdit, thumbnailUrl: e.target.value})} placeholder="https://..." dir="ltr" className="w-full p-2 rounded bg-gray-800 text-white border border-white/20 text-left focus:border-highlight-color" />
              </div>
            </div>

            <div>
               <label className="text-white text-sm">الوصف</label>
               <textarea value={submissionToEdit.description || ''} onChange={(e) => setSubmissionToEdit({...submissionToEdit, description: e.target.value})} className="w-full p-2 rounded bg-gray-800 text-white border border-white/20 focus:border-highlight-color" rows="3" />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
               <div>
                  <label className="text-white text-sm">الحلقة</label>
                  <select value={submissionToEdit.episode} onChange={(e) => setSubmissionToEdit({...submissionToEdit, episode: e.target.value})} className="w-full p-2 rounded bg-gray-800 text-white border border-white/20">
                    {EPISODES.map(ep => <option key={ep} value={ep}>{ep}</option>)}
                  </select>
               </div>
               <div><label className="text-white text-sm">الأصوات</label><input type="number" value={submissionToEdit.votes} onChange={(e) => setSubmissionToEdit({...submissionToEdit, votes: parseInt(e.target.value)||0})} className="w-full p-2 rounded bg-gray-800 text-white border border-white/20" /></div>
            </div>

            <button onClick={() => handleSaveEdit(submissionToEdit)} className="w-full p-3 rounded-lg text-gray-900 font-bold mt-4" style={{backgroundColor: settings.mainColor}}>حفظ التعديلات</button>
          </div>
        </Modal>
      )}
    </GlassCard>
  );
};

const AdminSettingsPanel = ({ settings, isGlassmorphism, onSaveSettings }) => {
  const [currentSettings, setCurrentSettings] = useState(settings);
  useEffect(() => { setCurrentSettings(settings); }, [settings]);
  
  return (
    <GlassCard isGlassmorphism={isGlassmorphism} color="bg-gray-900" className="p-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <h4 className="text-lg font-semibold" style={{ color: settings.mainColor }}>الهوية البصرية</h4>
          <div><label className="text-white text-sm">العنوان</label><input type="text" value={currentSettings.title} onChange={(e) => setCurrentSettings({...currentSettings, title: e.target.value})} className="w-full p-2 rounded bg-gray-800 text-white border border-white/20" /></div>
          <div><label className="text-white text-sm">رابط الشعار</label><input type="text" value={currentSettings.logoUrl} onChange={(e) => setCurrentSettings({...currentSettings, logoUrl: e.target.value})} className="w-full p-2 rounded bg-gray-800 text-white border border-white/20" /></div>
          <div><label className="text-white text-sm">شريط التنبيهات</label><input type="text" value={currentSettings.marqueeText} onChange={(e) => setCurrentSettings({...currentSettings, marqueeText: e.target.value})} className="w-full p-2 rounded bg-gray-800 text-white border border-white/20" /></div>
          
          <div className="flex gap-4">
             <div><label className="text-white text-sm block">لون أساسي</label><input type="color" value={currentSettings.mainColor} onChange={(e) => setCurrentSettings({...currentSettings, mainColor: e.target.value})} className="w-10 h-10 rounded cursor-pointer" /></div>
             <div><label className="text-white text-sm block">لون التوهج</label><input type="color" value={currentSettings.highlightColor} onChange={(e) => setCurrentSettings({...currentSettings, highlightColor: e.target.value})} className="w-10 h-10 rounded cursor-pointer" /></div>
          </div>
        </div>
        <div className="space-y-4">
           <h4 className="text-lg font-semibold" style={{ color: settings.mainColor }}>النصوص</h4>
           <div><label className="text-white text-sm">الشروط</label><textarea value={currentSettings.termsText} onChange={(e) => setCurrentSettings({...currentSettings, termsText: e.target.value})} className="w-full p-2 rounded bg-gray-800 text-white border border-white/20 h-24" /></div>
           <div><label className="text-white text-sm">من نحن (لماذا)</label><textarea value={currentSettings.whyText} onChange={(e) => setCurrentSettings({...currentSettings, whyText: e.target.value})} className="w-full p-2 rounded bg-gray-800 text-white border border-white/20 h-24" /></div>
        </div>
      </div>
      <button onClick={() => onSaveSettings(currentSettings)} className="w-full mt-6 p-3 rounded font-bold text-gray-900" style={{ backgroundColor: currentSettings.mainColor }}>حفظ الإعدادات</button>
    </GlassCard>
  );
};

// =========================================================================
// 6. LAYOUT & MAIN APP
// =========================================================================

const Header = ({ settings, activeView, setActiveView, isAdminMode, clearDesignerSelection }) => (
  <header className="sticky top-0 z-40 border-b" style={{ backgroundColor: settings.useGlassmorphism ? 'rgba(0,0,0,0.8)' : '#000000', borderColor: 'rgba(255, 255, 255, 0.1)', backdropFilter: settings.useGlassmorphism ? 'blur(12px)' : 'none' }}>
    <div className="container mx-auto px-4 py-3">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="flex items-center cursor-pointer" onClick={() => {setActiveView('home'); clearDesignerSelection();}}>
          <img src={settings.logoUrl} alt="Logo" className="h-10 w-auto rounded-lg mr-4 ml-4" onError={(e) => (e.target.style.display = 'none')} />
          <h1 className="text-2xl font-black text-white">{settings.title}</h1>
        </div>
        
        {!isAdminMode && (
          <nav className="flex items-center space-x-2 space-x-reverse bg-gray-900/80 p-1 rounded-full border border-white/10 overflow-x-auto max-w-full">
            <button onClick={() => {setActiveView('home'); clearDesignerSelection();}} className={`flex items-center px-4 py-2 rounded-full text-sm font-bold transition whitespace-nowrap ${activeView === 'home' ? 'text-gray-900 shadow-md' : 'text-white hover:bg-white/10'}`} style={{ backgroundColor: activeView === 'home' ? settings.highlightColor : 'transparent' }}>
              <HomeIcon className="w-4 h-4 ml-1" /> الرئيسية
            </button>
            <button onClick={() => {setActiveView('submit'); clearDesignerSelection();}} className={`flex items-center px-4 py-2 rounded-full text-sm font-bold transition whitespace-nowrap ${activeView === 'submit' ? 'text-gray-900 shadow-md' : 'text-white hover:bg-white/10'}`} style={{ backgroundColor: activeView === 'submit' ? settings.highlightColor : 'transparent' }}>
              <UploadCloud className="w-4 h-4 ml-1" /> إرسال مشاركة
            </button>
            <button onClick={() => {setActiveView('library'); clearDesignerSelection();}} className={`flex items-center px-4 py-2 rounded-full text-sm font-bold transition whitespace-nowrap ${activeView === 'library' ? 'text-white shadow-md' : 'text-white hover:bg-white/10'}`} style={{ backgroundColor: activeView === 'library' ? settings.mainColor : 'transparent' }}>
              <FolderOpen className="w-4 h-4 ml-1" /> مكتبة المصممين
            </button>
          </nav>
        )}
      </div>
    </div>
  </header>
);

const App = () => {
  const [settings, setSettings] = useState(null);
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [adminMode, setAdminMode] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  
  const [activeView, setActiveView] = useState('home');
  const [selectedDesignerProfile, setSelectedDesignerProfile] = useState(null); // State for Profile View

  const [voteConfirmData, setVoteConfirmData] = useState(null);
  const { userId, isAuthReady } = useAuth();
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (settings) {
      document.documentElement.style.setProperty('--main-color-css', settings.mainColor);
      document.documentElement.style.setProperty('--highlight-color-css', settings.highlightColor);
      document.documentElement.style.fontFamily = `${settings.appFont}, sans-serif`;
      document.documentElement.style.backgroundColor = '#000000';
    }
  }, [settings]);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.has('admin') && urlParams.get('admin') === 'true') {
      if (auth?.currentUser) setAdminMode(true); else setAuthModalOpen(true);
    }
  }, [isAuthReady]);

  const initDataRef = useRef(false);
  useEffect(() => {
    if (!db || !isAuthReady || initDataRef.current) return;
    initDataRef.current = true;
    const initializeFirestore = async () => {
      try {
        const settingsDocRef = doc(db, PUBLIC_SETTINGS_PATH);
        const settingsSnap = await retryOperation(() => getDoc(settingsDocRef));
        if (!settingsSnap.exists()) await retryOperation(() => setDoc(settingsDocRef, DEFAULT_SETTINGS));

        const subColRef = collection(db, PUBLIC_SUBMISSIONS_COLLECTION);
        const subSnap = await retryOperation(() => getDocs(query(subColRef, limit(1))));
        if (subSnap.empty) {
          for (const sub of MOCK_SUBMISSIONS) {
            await retryOperation(() => setDoc(doc(db, PUBLIC_SUBMISSIONS_COLLECTION, sub.id), { ...sub, submittedAt: serverTimestamp() }));
          }
        }
      } catch (e) { console.error('Init Error', e); }
      setLoading(false);
    };
    initializeFirestore();
  }, [isAuthReady]);

  useEffect(() => {
    if (!db || !isAuthReady) return;
    const unsubscribeSettings = onSnapshot(doc(db, PUBLIC_SETTINGS_PATH), (docSnap) => {
        setSettings(docSnap.exists() ? docSnap.data() : DEFAULT_SETTINGS); setLoading(false);
    });
    const unsubscribeSubmissions = onSnapshot(collection(db, PUBLIC_SUBMISSIONS_COLLECTION), (snapshot) => {
        setSubmissions(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
    });
    return () => { unsubscribeSettings(); unsubscribeSubmissions(); };
  }, [isAuthReady]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => setCooldown((prev) => prev - 1), 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  const handleAdminLogout = () => { setAdminMode(false); if (auth) signOut(auth); window.history.replaceState({}, document.title, window.location.pathname); };
  
  const handleConfirmVote = async (submission) => {
    setVoteConfirmData(null); 
    if (cooldown > 0) return;
    try {
      if (!db) return;
      await retryOperation(() => updateDoc(doc(db, PUBLIC_SUBMISSIONS_COLLECTION, submission.id), { votes: increment(1) }));
      setCooldown(30);
    } catch (e) { console.error(e); }
  };

  const handleDesignerClick = (designerName) => {
    setSelectedDesignerProfile(designerName);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const clearDesignerSelection = () => {
    setSelectedDesignerProfile(null);
  };

  if (loading || !settings) {
    return (
      <div className="flex items-center justify-center h-screen" style={{ backgroundColor: '#000000' }} dir="rtl">
        <Loader className="w-10 h-10 text-white animate-spin ml-4" />
        <span className="text-white text-xl">جار تحميل المنصة...</span>
      </div>
    );
  }

  return (
    <div dir="rtl" className="min-h-screen font-sans text-white pb-10" style={{ backgroundColor: '#000000' }}>
      <Header settings={settings} activeView={activeView} setActiveView={setActiveView} isAdminMode={adminMode} clearDesignerSelection={clearDesignerSelection} />

      <main className="container mx-auto p-4 pt-6">
        {!adminMode && <AlertBanner settings={settings} />}

        {adminMode ? (
          <div>
             <div className="flex justify-between items-center mb-6 bg-gray-900 p-4 rounded-lg border border-white/10">
               <h2 className="text-2xl font-bold text-white flex items-center"><SettingsIcon className="w-6 h-6 ml-2" /> لوحة التحكم</h2>
               <button onClick={handleAdminLogout} className="py-2 px-4 rounded bg-red-600 text-white flex"><LogOut className="w-4 h-4 ml-2"/> خروج</button>
             </div>
             <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                   <AdminSubmissionsPanel submissions={submissions} settings={settings} isGlassmorphism={settings.useGlassmorphism} onUpdateSubmissionStatus={async (id, s) => { await updateDoc(doc(db, PUBLIC_SUBMISSIONS_COLLECTION, id), {status: s}) }} />
                </div>
                <div>
                   <AdminSettingsPanel settings={settings} isGlassmorphism={settings.useGlassmorphism} onSaveSettings={async (newSet) => { await setDoc(doc(db, PUBLIC_SETTINGS_PATH), newSet) }} />
                </div>
             </div>
          </div>
        ) : (
          <>
            {selectedDesignerProfile ? (
              <DesignerProfile 
                designerName={selectedDesignerProfile} 
                allSubmissions={submissions} 
                settings={settings} 
                onVote={(sub) => cooldown > 0 ? null : setVoteConfirmData(sub)} 
                onBack={clearDesignerSelection}
                setVoteConfirmData={setVoteConfirmData}
              />
            ) : (
              <>
                {activeView === 'home' && <Home settings={settings} allSubmissions={submissions} totalApproved={submissions.filter(s=>s.status==='Approved').length} onVote={(sub) => cooldown > 0 ? null : setVoteConfirmData(sub)} cooldown={cooldown} setVoteConfirmData={setVoteConfirmData} onDesignerClick={handleDesignerClick} />}
                {activeView === 'submit' && <SubmissionForm settings={settings} userId={userId} allSubmissions={submissions} />}
                {activeView === 'library' && <DesignersLibrary settings={settings} />}
              </>
            )}
          </>
        )}
      </main>

      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80" style={{display: authModalOpen && !adminMode ? 'flex' : 'none'}}>
        <div className="bg-gray-900 p-6 rounded-xl w-full max-w-sm">
           <h2 className="text-white font-bold text-xl mb-4 text-center">تسجيل دخول المدير</h2>
           <button onClick={()=> {setAdminMode(true); setAuthModalOpen(false);}} className="w-full p-3 rounded bg-highlight-color font-bold text-black">دخول تجريبي (Mock Auth)</button>
        </div>
      </div>

      <Modal isOpen={voteConfirmData !== null} onClose={() => setVoteConfirmData(null)} title="تأكيد التصويت">
        {voteConfirmData && (
          <div className="text-center">
            <p className="text-white text-xl mb-6">هل أنت متأكد من التصويت لـ <span className="font-extrabold mx-2" style={{ color: settings.highlightColor }}>{voteConfirmData.participantName}</span> في <span className="text-main-color">{voteConfirmData.episode}</span>؟</p>
            
            <div className="bg-gray-800 p-4 rounded-lg mb-6 border border-white/10 flex items-center justify-center">
              <img src={voteConfirmData.profilePic || generateAvatar(voteConfirmData.participantName)} className="w-12 h-12 rounded-full border-2 ml-3 object-cover" style={{borderColor: settings.highlightColor}} alt="Profile"/>
              <p className="text-sm text-white/80 text-right line-clamp-2">{voteConfirmData.description}</p>
            </div>

            <p className="text-sm text-white/70 mb-8">(يمكنك التصويت مرة كل 30 ثانية)</p>
            <div className="flex justify-around">
              <button onClick={() => setVoteConfirmData(null)} className="py-3 px-8 rounded-lg bg-red-600 hover:bg-red-700 text-white font-semibold transition">إلغاء</button>
              <button onClick={() => handleConfirmVote(voteConfirmData)} className="py-3 px-8 rounded-lg text-gray-900 font-semibold transition" style={{ backgroundColor: settings.mainColor }} disabled={cooldown > 0}>تأكيد التصويت</button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default App;