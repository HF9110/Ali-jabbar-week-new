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
  deleteDoc,
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
  AlertTriangle,
  Code,
  BarChart2,
  TrendingUp,
  Users,
  Instagram,
  Trash2,
  RotateCcw,
  Wand2,
  Link2,
  Plus
} from 'lucide-react';

// --- إضافة مكون خاص لشعار تيك توك الرسمي (SVG) ---
const TikTokIcon = ({ className }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 448 512"
    className={className}
    fill="currentColor"
  >
    <path d="M448,209.91a210.06,210.06,0,0,1-122.77-39.25V349.38A162.55,162.55,0,1,1,185,188.31V278.2a74.62,74.62,0,1,0,52.23,71.18V0l88,0a121.18,121.18,0,0,0,1.86,22.17h0A122.18,122.18,0,0,0,381,102.39a121.43,121.43,0,0,0,67,20.14Z" />
  </svg>
);

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
// 2. CONSTANTS & HELPERS
// =========================================================================

const EPISODES = Array.from({ length: 30 }, (_, i) => `الحلقة ${i + 1}`);

const COUNTRIES = [
  { name: 'العراق', code: 'IQ' },
  { name: 'السعودية', code: 'SA' },
  { name: 'الأردن', code: 'JO' },
  { name: 'الإمارات', code: 'AE' },
  { name: 'مصر', code: 'EG' },
  { name: 'سوريا', code: 'SY' },
  { name: 'المغرب', code: 'MA' },
  { name: 'الجزائر', code: 'DZ' },
  { name: 'الكويت', code: 'KW' },
  { name: 'عُمان', code: 'OM' },
  { name: 'قطر', code: 'QA' },
  { name: 'البحرين', code: 'BH' },
  { name: 'لبنان', code: 'LB' },
  { name: 'تونس', code: 'TN' },
  { name: 'فلسطين', code: 'PS' },
  { name: 'اليمن', code: 'YE' },
  { name: 'ليبيا', code: 'LY' },
  { name: 'السودان', code: 'SD' },
];

const getFlagUrl = (countryName) => {
  const code = COUNTRIES.find((c) => c.name === countryName)?.code?.toLowerCase() || 'un';
  return `https://flagcdn.com/w20/${code}.png`;
};

const DEFAULT_SETTINGS = {
  mainColor: '#fe2c55',
  highlightColor: '#25f4ee',
  appFont: 'Cairo',
  title: 'HF Live',
  logoUrl: 'https://placehold.co/120x40/fe2c55/25f4ee?text=HF+Live',
  logoSize: 40,
  marqueeText: 'أهلاً بكم في مسابقة تصاميم المسلسل الرمضاني. التصويت والمشاركات مفتوحة دائماً شاركنا إبداعك وكن من الفائزين!',
  useGlassmorphism: true,
  termsText: 'الشروط والأحكام:\n- يجب أن يكون التصميم من مشاهد المسلسل حصراً.\n- يمنع استخدام حقوق موسيقية غير مصرح بها.\n- يرجى اختيار رقم الحلقة الصحيح عند الإرسال.',
  whyText: 'لماذا هذه المسابقة؟\nلدعم المصممين وصناع المحتوى العراقي والعربي خلال شهر رمضان المبارك، واختيار أفضل الإبداعات للمشاهد الرمضانية.',
  adminName: 'مدير المسابقة',
  adminBio: 'مرحباً بكم في مسابقتنا الرمضانية. نحن هنا لدعم صناع المحتوى والمصممين المبدعين وعرض أعمالهم للجمهور.',
  adminTikTok: '',
  adminInsta: '',
  adBanners: [
    'https://placehold.co/1200x400/1e293b/25f4ee?text=إعلان+المسلسل+الأول',
    'https://placehold.co/1200x400/fe2c55/ffffff?text=إعلان+المسلسل+الثاني',
    'https://placehold.co/1200x400/111827/fe2c55?text=إعلان+المسلسل+الثالث'
  ]
};

const generateAvatar = (name) => `https://ui-avatars.com/api/?name=${encodeURIComponent(name || 'Unknown')}&background=random&color=fff&size=128&bold=true`;

const MOCK_SUBMISSIONS = []; 

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

const getVideoEmbedUrl = (url) => {
  if (!url) return '';
  if (url.includes('instagram.com')) {
    const match = url.match(/(?:p|reel|tv)\/([A-Za-z0-9_-]+)/);
    return match ? `https://www.instagram.com/p/${match[1]}/embed` : url;
  } else {
    const match = url.match(/video\/(\d+)/);
    return match ? `https://www.tiktok.com/embed/v2/${match[1]}?lang=ar` : url;
  }
};

const AdBanner = ({ settings }) => {
  const [currentAd, setCurrentAd] = useState(0);
  const banners = settings?.adBanners || [];

  useEffect(() => {
    if (banners.length <= 1) return;
    const timer = setInterval(() => {
      setCurrentAd((prev) => (prev + 1) % banners.length);
    }, 4000); 
    return () => clearInterval(timer);
  }, [banners.length]);

  if (!banners || banners.length === 0) return null;

  return (
    <div className="relative w-full h-40 sm:h-56 md:h-72 lg:h-80 rounded-2xl mb-6 shadow-2xl overflow-hidden border border-white/10 group">
      {banners.map((ad, index) => (
        <img
          key={index}
          src={ad}
          alt={`Ad ${index + 1}`}
          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-1000 ease-in-out ${
            index === currentAd ? 'opacity-100 z-10' : 'opacity-0 z-0'
          }`}
          onError={(e) => {
             e.target.src = `https://placehold.co/1200x400/1e293b/25f4ee?text=صورة+غير+صالحة`;
          }}
        />
      ))}
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-500 z-20"></div>
      
      {banners.length > 1 && (
        <>
          <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-2 z-30">
            {banners.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentAd(index)}
                className={`h-2 rounded-full transition-all duration-300 ${
                  index === currentAd ? 'w-6 bg-white' : 'w-2 bg-white/40 hover:bg-white/70'
                }`}
                style={{
                  backgroundColor: index === currentAd ? settings.highlightColor : undefined
                }}
              />
            ))}
          </div>
          
          <button onClick={() => setCurrentAd((prev) => (prev - 1 + banners.length) % banners.length)} className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-black/30 hover:bg-black/60 rounded-full flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-all backdrop-blur-sm border border-white/10 z-30">
            <ChevronRight className="w-6 h-6" />
          </button>
          <button onClick={() => setCurrentAd((prev) => (prev + 1) % banners.length)} className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-black/30 hover:bg-black/60 rounded-full flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-all backdrop-blur-sm border border-white/10 z-30">
            <ChevronLeft className="w-6 h-6" />
          </button>
        </>
      )}
    </div>
  );
};


const AlertBanner = ({ settings }) => (
  <div className="text-white border-r-4 rounded-lg flex items-center mb-6 shadow-2xl overflow-hidden relative"
    style={{
      '--pulse-shadow': `0 0 10px 2px ${settings.highlightColor}`,
      backgroundColor: settings.mainColor,
      borderColor: settings.highlightColor,
    }}>
    <style>{`
      @keyframes pulse-effect { 0%, 100% { box-shadow: 0 0 0 0 rgba(255, 255, 255, 0.7); } 50% { box-shadow: var(--pulse-shadow); } } 
      .pulse-animation { animation: pulse-effect 2s infinite ease-in-out; }
      @keyframes marquee-rtl { 0% { transform: translateX(-100vw); } 100% { transform: translateX(100vw); } }
      .marquee-text { position: absolute; right: 0; white-space: nowrap; animation: marquee-rtl 25s linear infinite; display: inline-block; will-change: transform; }
    `}</style>
    
    <div className="flex items-center z-10 p-3 pl-6 relative" style={{ backgroundColor: settings.mainColor, boxShadow: '-15px 0 15px -10px rgba(0,0,0,0.4)' }}>
      <div className="pulse-animation p-1 rounded-full border-2 ml-4 flex-shrink-0" style={{ borderColor: settings.highlightColor }}>
        <Film className="w-6 h-6" />
      </div>
      <span className="font-bold text-xl whitespace-nowrap">إعلان</span>
    </div>
    
    <div className="flex-grow overflow-hidden relative h-12 flex items-center">
        <span className="marquee-text text-lg">{settings.marqueeText}</span>
    </div>
  </div>
);

// تم حل مشكلة التجاوب كلياً في المودال عبر فصل العناصر
const Modal = ({ isOpen, onClose, title, children, isGlassmorphism = true, maxWidth = "max-w-2xl" }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-sm" onClick={onClose}>
      <div className={`w-full ${maxWidth} max-h-[90vh] flex flex-col bg-gray-900 rounded-2xl shadow-2xl relative overflow-hidden ${isGlassmorphism ? 'bg-opacity-80 backdrop-blur-xl border border-white/10' : ''}`} onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center p-4 sm:p-5 border-b border-white/10 shrink-0 bg-gray-800/50">
          <h2 className="text-xl sm:text-2xl font-bold text-white">{title}</h2>
          <button onClick={onClose} className="text-white/70 hover:text-white transition bg-white/5 hover:bg-white/10 p-2 rounded-full"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-4 sm:p-5 overflow-y-auto custom-scrollbar flex-grow text-white w-full">
          {children}
        </div>
      </div>
    </div>
  );
};

// =========================================================================
// 4. MAIN VIEWS
// =========================================================================

const StatsCard = ({ designerItem, settings, currentFilter, onDesignerClick }) => {
  return (
    <div className="relative w-full h-40 group [perspective:1000px]">
      <style>{`.flip-container { transition: transform 0.6s; transform-style: preserve-3d; } .flip-container.flipped { transform: rotateY(180deg); } .front, .back { backface-visibility: hidden; position: absolute; top: 0; left: 0; width: 100%; height: 100%; } .back { transform: rotateY(180deg); }`}</style>
      <div className="flip-container h-full group-hover:flipped">
        <div className="front">
          <GlassCard isGlassmorphism={settings.useGlassmorphism} color="bg-gray-800" className="h-full p-2 flex flex-col items-center justify-center overflow-hidden relative">
            <span className="absolute top-1 right-1 bg-black/50 text-[10px] px-1 rounded text-highlight-color font-bold">
              {currentFilter === 'الكل' ? `${designerItem.episodesCount} مشاركات` : designerItem.singleEpisode}
            </span>
            <img
              src={designerItem.profilePic}
              alt={`Profile`}
              onClick={() => onDesignerClick(designerItem.username)}
              className="w-12 h-12 object-cover rounded-full mb-1 border-2 cursor-pointer hover:scale-110 transition mt-2"
              style={{ borderColor: `var(--highlight-color-css)` }}
            />
            <p className="text-xl font-extrabold text-white mt-1" style={{ color: `var(--highlight-color-css)` }}>{designerItem.votes.toLocaleString()}</p>
            <p onClick={() => onDesignerClick(designerItem.username)} className="text-xs font-bold text-white truncate w-full text-center mt-1 cursor-pointer hover:underline">{designerItem.participantName}</p>
            <p className="text-[10px] text-white/70 flex items-center gap-1 justify-center mt-1">
               <img src={getFlagUrl(designerItem.country)} className="w-3 h-2" alt={designerItem.country}/> {designerItem.country}
            </p>
          </GlassCard>
        </div>
        <div className="back">
          <GlassCard isGlassmorphism={settings.useGlassmorphism} color="bg-gray-800" className="h-full p-2 flex flex-col items-center justify-center text-center">
            <p className="text-xs text-white/70 mb-1">المصمم:</p>
            <p className="text-sm font-semibold text-white" dir="ltr">@{designerItem.username}</p>
            <div className="h-px w-1/2 my-2 mx-auto" style={{ backgroundColor: `var(--main-color-css)` }} />
            <p className="text-xs text-white/70 mb-1">
               {currentFilter === 'الكل' ? 'مجموع التصويت الكلي:' : `التصويت في ${currentFilter}:`}
            </p>
            <p className="text-2xl font-extrabold text-white" style={{ color: `var(--highlight-color-css)` }}>{designerItem.votes.toLocaleString()}</p>
          </GlassCard>
        </div>
      </div>
    </div>
  );
};

const LiveResultsView = ({ approvedSubmissions, settings, currentFilter, currentPlatformFilter, onDesignerClick }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isHovering, setIsHovering] = useState(false);
  const perSlide = 4;

  const rankedDesigners = useMemo(() => {
    const map = {};
    approvedSubmissions.forEach(sub => {
      const key = sub.username || sub.participantName;
      if (!map[key]) {
        map[key] = {
          id: key,
          participantName: sub.participantName,
          username: sub.username || sub.participantName,
          country: sub.country,
          profilePic: sub.profilePic || generateAvatar(sub.participantName),
          votes: 0,
          episodesCount: 0,
          singleEpisode: sub.episode
        };
      }
      map[key].votes += (sub.votes || 0);
      map[key].episodesCount += 1;
    });
    return Object.values(map).sort((a, b) => b.votes - a.votes);
  }, [approvedSubmissions]);

  const topThree = rankedDesigners.slice(0, 3);
  const remainingDesigners = rankedDesigners.slice(3);
  const numSlides = Math.ceil(remainingDesigners.length / perSlide);

  const nextSlide = () => setCurrentIndex((prev) => (prev + 1) % numSlides);
  const prevSlide = () => setCurrentIndex((prev) => (prev - 1 + numSlides) % numSlides);

  const currentSlideDesigners = remainingDesigners.slice(currentIndex * perSlide, currentIndex * perSlide + perSlide);

  useEffect(() => {
    if (numSlides <= 1 || isHovering) return;
    const autoSlideTimer = setInterval(() => { nextSlide(); }, 5000);
    return () => clearInterval(autoSlideTimer);
  }, [numSlides, isHovering, rankedDesigners]);

  if (rankedDesigners.length === 0) return null;

  const CompactPodiumItem = ({ designerItem, rank, settings }) => {
    const { participantName, username, country, votes, profilePic, episodesCount, singleEpisode } = designerItem;
    const rankColor = { 1: settings.highlightColor, 2: settings.mainColor, 3: '#5b1f28' }[rank];
    const episodeText = currentFilter === 'الكل' ? `${episodesCount} مشاركات` : singleEpisode;

    return (
      <div className="relative flex flex-col items-center p-3 text-center w-full transform hover:scale-105 transition duration-300 rounded-lg mt-4"
        style={{ backgroundColor: `${rankColor}30`, border: `2px solid ${rankColor}`, boxShadow: `0 0 10px ${rankColor}80` }}>
        
        {rank === 1 && <Crown className="absolute -top-6 text-yellow-400 w-8 h-8 drop-shadow-lg animate-bounce" />}
        
        <p className="text-xs font-bold text-gray-900 absolute top-0 right-0 p-1 rounded-bl-lg" style={{ backgroundColor: rankColor, color: rank === 1 ? '#000' : '#fff' }}>
          #{rank}
        </p>
        <p className="text-[10px] font-bold text-white absolute top-0 left-0 p-1 rounded-br-lg bg-black/50">
          {episodeText}
        </p>
        
        <img 
           src={profilePic} 
           alt={`Rank ${rank}`} 
           onClick={() => onDesignerClick(username)}
           className="w-14 h-14 object-cover rounded-full mb-2 border-2 mt-4 cursor-pointer hover:scale-110 transition" 
           style={{ borderColor: rankColor }} 
        />
        <p className="text-lg font-extrabold text-white" style={{ color: rankColor }}>{votes.toLocaleString()}</p>
        <p onClick={() => onDesignerClick(username)} className="text-sm font-bold text-white truncate w-full cursor-pointer hover:underline">{participantName}</p>
        <p className="text-[10px] text-white/70 flex items-center justify-center gap-1">
          <img src={getFlagUrl(country)} className="w-3 h-2" alt={country} /> {country}
        </p>
      </div>
    );
  };

  const getPlatformLabel = () => {
     if (currentPlatformFilter === 'tiktok') return 'على تيك توك';
     if (currentPlatformFilter === 'instagram') return 'على الانستغرام';
     return '';
  };

  return (
    <GlassCard isGlassmorphism={settings.useGlassmorphism} color="bg-gray-800" className="p-4 mb-6 shadow-2xl">
      <h2 className="text-2xl font-extrabold text-white mb-4 border-b border-white/20 pb-2" style={{ color: `var(--highlight-color-css)` }}>
        أوائل المصممين {currentFilter !== 'الكل' ? `(${currentFilter})` : '(في جميع الحلقات)'} <span className="text-white/50 text-lg">{getPlatformLabel()}</span>
      </h2>
      
      <div className="flex justify-around gap-2 mb-6 items-end">
        {topThree[1] && <div className="w-1/3"><CompactPodiumItem designerItem={topThree[1]} rank={2} settings={settings} /></div>}
        {topThree[0] && <div className="w-1/3 z-10 -mt-4"><CompactPodiumItem designerItem={topThree[0]} rank={1} settings={settings} /></div>}
        {topThree[2] && <div className="w-1/3"><CompactPodiumItem designerItem={topThree[2]} rank={3} settings={settings} /></div>}
      </div>

      {remainingDesigners.length > 0 && (
        <div className="relative flex items-center justify-center mt-8 border-t border-white/10 pt-4" onMouseEnter={() => setIsHovering(true)} onMouseLeave={() => setIsHovering(false)}>
          <button onClick={prevSlide} className="p-2 rounded-full bg-white/10 hover:bg-white/30 text-white transition disabled:opacity-50 z-10" disabled={numSlides <= 1}>
            <ChevronRight className="w-6 h-6" />
          </button>
          <div className="flex-grow mx-4 overflow-hidden">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 transition-transform duration-500">
              {currentSlideDesigners.map((designer) => (
                <StatsCard key={designer.id} designerItem={designer} settings={settings} currentFilter={currentFilter} onDesignerClick={onDesignerClick}/>
              ))}
              {[...Array(perSlide - currentSlideDesigners.length)].map((_, i) => (
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
  const [selectedPlatform, setSelectedPlatform] = useState('tiktok'); 
  const [videoUrl, setVideoUrl] = useState('');
  
  const [formData, setFormData] = useState({ 
    country: COUNTRIES[0].name, 
    episode: EPISODES[0] 
  });
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState(null);
  const [error, setError] = useState(null);

  const normalizeUrl = (url) => {
    try {
      const urlObj = new URL(url);
      return urlObj.origin + urlObj.pathname;
    } catch (e) { return url; }
  };

  const handleFinalSubmit = async (e) => {
    e.preventDefault();
    setError(null); 
    setSuccessMessage(null);
    
    if (!videoUrl) {
      setError('الرجاء وضع رابط الفيديو.');
      return;
    }

    if (selectedPlatform === 'tiktok' && !videoUrl.includes('tiktok.com')) {
      setError('الرجاء التأكد من أن الرابط يتبع لمنصة تيك توك.');
      return;
    }

    if (selectedPlatform === 'instagram' && !videoUrl.includes('instagram.com')) {
      setError('الرجاء التأكد من أن الرابط يتبع لمنصة انستغرام.');
      return;
    }

    const cleanUrl = normalizeUrl(videoUrl).split('?')[0];
    const exists = allSubmissions.some(sub => normalizeUrl(sub.videoUrl).split('?')[0] === cleanUrl);
    if (exists) {
      setError('عذراً، هذا التصميم موجود ومشارك في المسابقة مسبقاً!');
      return;
    }

    setIsSubmitting(true);
    try {
      if (!db) throw new Error('قاعدة البيانات غير مهيأة.');
      
      const newSubmission = {
        participantName: 'في انتظار المراجعة', 
        username: '',               
        description: 'سيتم إضافة التفاصيل والصور من قبل الإدارة قريباً.',
        videoUrl: cleanUrl,
        platform: selectedPlatform, 
        episode: formData.episode,
        country: formData.country,
        userId: userId || 'anonymous',
        status: 'Pending', 
        votes: 0,
        profilePic: '', 
        thumbnailUrl: `https://placehold.co/600x900/${selectedPlatform === 'instagram' ? 'e1306c' : '111827'}/ffffff?text=${encodeURIComponent(formData.episode)}`,
        submittedAt: serverTimestamp(),
      };

      await retryOperation(() => addDoc(collection(db, PUBLIC_SUBMISSIONS_COLLECTION), newSubmission));
      setSuccessMessage('تم إرسال الرابط بنجاح! سيتم مراجعة التصميم وجلب بياناته من قبل الإدارة.');
      
      setVideoUrl('');
      setFormData({ country: COUNTRIES[0].name, episode: EPISODES[0] });
    } catch (e) {
      setError(`حدث خطأ أثناء الإرسال: ${e.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <GlassCard isGlassmorphism={settings.useGlassmorphism} color="bg-gray-900" className="max-w-2xl mx-auto mt-10">
      <h1 className="text-3xl font-bold text-center mb-2" style={{ color: `var(--main-color-css)` }}>إرسال تصميم جديد</h1>
      <p className="text-center text-white/60 text-sm mb-6">ضع الرابط، وسيتكفل النظام بسحب اسمك وصورتك وتفاصيل الفيديو لاحقاً.</p>
      
      {successMessage && <div className="bg-green-600/70 p-4 rounded-lg mb-4 text-white text-center font-semibold">{successMessage}</div>}
      {error && <div className="bg-red-600/70 p-4 rounded-lg mb-4 text-white text-center font-semibold">{error}</div>}
      
      <form onSubmit={handleFinalSubmit} className="space-y-6 animate-fade-in">
        
        <div>
          <label className="block text-white mb-2 font-medium">اختر منصة التصميم:</label>
          <div className="flex gap-4">
            <button type="button" onClick={() => {setSelectedPlatform('tiktok'); setVideoUrl('');}} className={`flex-1 py-3 rounded-lg font-bold flex items-center justify-center gap-2 transition ${selectedPlatform === 'tiktok' ? 'bg-white text-black shadow-lg' : 'bg-gray-800 text-white/50 border border-white/10'}`}>
              <TikTokIcon className="w-5 h-5"/> تيك توك
            </button>
            <button type="button" onClick={() => {setSelectedPlatform('instagram'); setVideoUrl('');}} className={`flex-1 py-3 rounded-lg font-bold flex items-center justify-center gap-2 transition ${selectedPlatform === 'instagram' ? 'bg-gradient-to-r from-pink-500 to-purple-500 text-white shadow-lg' : 'bg-gray-800 text-white/50 border border-white/10'}`}>
              <Instagram className="w-5 h-5"/> انستغرام
            </button>
          </div>
        </div>

        <div>
          <label className="block text-white mb-2 font-medium flex items-center">
            <Link2 className="w-5 h-5 ml-2 text-highlight-color" />
            رابط الفيديو المباشر (URL)
          </label>
          <input 
            type="url" 
            value={videoUrl} 
            onChange={(e) => setVideoUrl(e.target.value)} 
            className="w-full p-4 rounded-lg bg-gray-800/80 border border-white/20 text-white focus:border-highlight-color transition shadow-inner text-left" 
            placeholder={selectedPlatform === 'tiktok' ? `https://www.tiktok.com/@user/video/...` : `https://www.instagram.com/reel/...`}
            dir="ltr" 
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
            <div className="flex gap-2">
               <div className="bg-gray-800/80 border border-white/20 rounded-lg flex items-center justify-center px-3 shadow-inner">
                 <img src={getFlagUrl(formData.country)} className="w-6 h-4 object-cover rounded-sm" alt="Flag" />
               </div>
               <div className="relative flex-grow">
                 <select value={formData.country} onChange={(e) => setFormData({ ...formData, country: e.target.value })} className="appearance-none w-full p-3 rounded-lg bg-gray-800/80 border border-white/20 text-white focus:border-highlight-color pr-10" style={{ backgroundImage: 'none' }} required>
                   {COUNTRIES.map((c) => <option key={c.code} value={c.name}>{c.name}</option>)}
                 </select>
                 <ChevronDown className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-white pointer-events-none" />
               </div>
            </div>
          </div>
        </div>

        <button type="submit" disabled={isSubmitting || !videoUrl} className="w-full p-4 rounded-lg font-bold text-lg text-gray-900 transition duration-300 disabled:opacity-50 hover:opacity-90 shadow-lg mt-4" style={{ backgroundColor: `var(--main-color-css)` }}>
          {isSubmitting ? <Loader className="w-6 h-6 animate-spin mx-auto" /> : 'إرسال المشاركة'}
        </button>
      </form>
    </GlassCard>
  );
};

const ContestCard = ({ submission, settings, onVote, onOpenVideo, onDesignerClick }) => {
  const { participantName, username, description, country, episode, thumbnailUrl, profilePic, votes, platform, videoUrl } = submission;
  const safeUsername = username || participantName || 'مجهول';
  const isIg = platform === 'instagram' || (videoUrl && videoUrl.includes('instagram'));

  return (
    <GlassCard isGlassmorphism={settings.useGlassmorphism} color="bg-gray-900" className="flex flex-col h-full overflow-hidden hover:shadow-highlight transition duration-300 relative group">
      <div className="absolute top-2 left-2 z-10 px-2 py-1 rounded-md text-xs font-bold text-gray-900 shadow-md" style={{ backgroundColor: settings.highlightColor }}>
        {episode}
      </div>
      <div className="absolute top-2 right-2 z-10 p-1.5 rounded-md bg-black/60 shadow-md backdrop-blur-sm">
        {isIg ? <Instagram className="w-4 h-4 text-pink-500" /> : <TikTokIcon className="w-4 h-4 text-white" />}
      </div>
      
      <div className="relative overflow-hidden w-full aspect-[2/3] rounded-lg mb-3 cursor-pointer" onClick={() => onOpenVideo(submission)}>
        <img src={thumbnailUrl} alt="Video Thumbnail" className="w-full h-full object-cover transition duration-300 transform group-hover:scale-105 opacity-80" onError={(e) => (e.target.src = isIg ? 'https://placehold.co/600x900/e1306c/ffffff?text=Instagram' : 'https://placehold.co/600x900/111827/ffffff?text=TikTok')} />
        
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent flex flex-col justify-end p-2 pb-4">
           <div className="flex items-center justify-center h-full">
             <PlayCircle className="w-12 h-12 text-white/70 group-hover:text-white transition duration-300" />
           </div>
        </div>
      </div>

      <div className="flex flex-col flex-grow justify-between text-white p-1">
        
        <div className="flex items-center mb-2 group/author cursor-pointer" onClick={() => onDesignerClick(safeUsername)}>
           <img src={profilePic || generateAvatar(participantName)} alt={participantName} className="w-8 h-8 rounded-full border border-white/20 object-cover group-hover/author:border-highlight-color transition" />
           <div className="mr-2 overflow-hidden">
             <p className="text-sm font-bold truncate leading-tight group-hover/author:text-highlight-color transition">{participantName}</p>
             <p className="text-[10px] text-white/60 flex items-center gap-1" dir="ltr">
               @{safeUsername} • <img src={getFlagUrl(country)} className="w-3 h-2" alt={country}/>
             </p>
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

        <button onClick={() => onVote(submission)} className="w-full py-2 px-4 rounded-lg font-bold text-gray-900 transition duration-300 hover:scale-[1.02] active:scale-95 shadow-lg" style={{ backgroundColor: `var(--main-color-css)` }}>
          صوت للتصميم
        </button>
      </div>
    </GlassCard>
  );
};

const DesignerProfile = ({ designerId, allSubmissions, settings, onVote, onBack, setVoteConfirmData }) => {
  const [videoModalOpen, setVideoModalOpen] = useState(false);
  const [selectedSubmission, setSelectedSubmission] = useState(null);

  const designerSubmissions = useMemo(() => 
    allSubmissions.filter(sub => sub.status === 'Approved' && (sub.username === designerId || sub.participantName === designerId)).sort((a,b) => b.votes - a.votes)
  , [allSubmissions, designerId]);

  const totalDesignerVotes = designerSubmissions.reduce((sum, sub) => sum + sub.votes, 0);
  const profileInfo = designerSubmissions.length > 0 ? designerSubmissions[0] : null;

  const handleOpenVideo = (submission) => { setSelectedSubmission(submission); setVideoModalOpen(true); };
  
  if(!profileInfo) {
    return (
      <div className="text-center py-20 text-white">
        <p className="text-2xl mb-4">لا توجد أعمال معتمدة لهذا المصمم حالياً.</p>
        <button onClick={onBack} className="px-6 py-2 bg-gray-800 rounded-full hover:bg-gray-700">العودة</button>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
       <button onClick={onBack} className="flex items-center text-white/70 hover:text-white transition bg-gray-900/50 px-4 py-2 rounded-full border border-white/10 w-fit">
         <ArrowRight className="w-5 h-5 ml-2" /> العودة للرئيسية
       </button>

       <GlassCard isGlassmorphism={settings.useGlassmorphism} color="bg-gray-900" className="flex flex-col md:flex-row items-center md:items-start p-8 gap-6 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-highlight-color/20 to-transparent"></div>
          
          <img src={profileInfo.profilePic || generateAvatar(profileInfo.participantName)} alt={profileInfo.participantName} className="w-32 h-32 rounded-full border-4 shadow-2xl z-10 object-cover bg-gray-800" style={{ borderColor: settings.mainColor }} />
          
          <div className="text-center md:text-right z-10 flex-grow pt-2">
            <h2 className="text-3xl md:text-4xl font-extrabold text-white mb-1">{profileInfo.participantName}</h2>
            <p className="text-md text-white/50 mb-4 font-mono flex flex-wrap justify-center md:justify-start gap-2 items-center" dir="ltr">
              @{profileInfo.username || designerId} • <img src={getFlagUrl(profileInfo.country)} className="w-4 h-3" alt={profileInfo.country} /> {profileInfo.country}
            </p>
            
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

       <h3 className="text-2xl font-bold text-white border-b border-white/10 pb-2 mt-8">جميع تصاميم {profileInfo.participantName}</h3>

       <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
          {designerSubmissions.map((sub) => (
            <ContestCard key={sub.id} submission={sub} settings={settings} onVote={(s) => setVoteConfirmData(s)} onOpenVideo={handleOpenVideo} onDesignerClick={()=>{}} />
          ))}
       </div>

       <Modal isOpen={videoModalOpen} onClose={() => setVideoModalOpen(false)} title={`تصميم: ${selectedSubmission?.participantName}`} settings={settings}>
        {selectedSubmission && (
          <div className="flex flex-col">
            <div className="relative w-full aspect-[9/16] bg-black rounded-lg overflow-hidden mb-4 mx-auto max-w-sm border border-white/10 shadow-2xl">
              <iframe src={getVideoEmbedUrl(selectedSubmission.videoUrl)} className="w-full h-full" frameBorder="0" scrolling="no" allowFullScreen></iframe>
            </div>
            <div className="bg-gray-800 p-4 rounded-lg border border-white/10">
               <div className="flex items-center gap-2 mb-2">
                 {selectedSubmission.platform === 'instagram' ? <Instagram className="w-5 h-5 text-pink-500" /> : <TikTokIcon className="w-5 h-5 text-white" />}
                 <p className="font-bold text-lg text-highlight-color">{selectedSubmission.episode}</p>
               </div>
               <p className="text-sm text-white/90 mb-4 whitespace-pre-wrap leading-relaxed">{selectedSubmission.description}</p>
               <button onClick={() => {setVideoModalOpen(false); setVoteConfirmData(selectedSubmission);}} className="w-full py-3 px-6 rounded-lg font-bold text-gray-900 transition shadow-lg" style={{ backgroundColor: settings.mainColor }}>
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
  const [filterPlatform, setFilterPlatform] = useState('الكل');
  const [videoModalOpen, setVideoModalOpen] = useState(false);
  const [selectedSubmission, setSelectedSubmission] = useState(null);

  const approvedSubmissions = useMemo(() => allSubmissions.filter((sub) => sub.status === 'Approved').sort((a, b) => b.votes - a.votes), [allSubmissions]);
  
  const leaderboardSubmissions = useMemo(() => {
    return approvedSubmissions.filter((sub) => {
       const matchEpisode = filterEpisode === 'الكل' || sub.episode === filterEpisode;
       const matchPlatform = filterPlatform === 'الكل' || sub.platform === filterPlatform || (!sub.platform && filterPlatform === 'tiktok');
       return matchEpisode && matchPlatform;
    });
  }, [approvedSubmissions, filterEpisode, filterPlatform]);

  const filteredGridSubmissions = useMemo(() => {
    return leaderboardSubmissions.filter((sub) => {
      return sub.participantName.toLowerCase().includes(searchTerm.toLowerCase()) || 
             (sub.username && sub.username.toLowerCase().includes(searchTerm.toLowerCase())) ||
             sub.country.toLowerCase().includes(searchTerm.toLowerCase()) ||
             (sub.description && sub.description.toLowerCase().includes(searchTerm.toLowerCase()));
    });
  }, [leaderboardSubmissions, searchTerm]);

  const handleOpenVideo = (submission) => { setSelectedSubmission(submission); setVideoModalOpen(true); };
  const handleVoteFromCard = (submission) => {
    if (cooldown > 0) { handleOpenVideo(submission); return; }
    setVoteConfirmData(submission);
  };

  return (
    <div className="space-y-8 animate-fade-in">
      <GlassCard isGlassmorphism={settings.useGlassmorphism} color="bg-gray-800" className="p-4 grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
        
        {/* 1. البحث */}
        <div>
          <div className="relative">
            <input type="text" placeholder="البحث..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full p-3 pr-10 rounded-lg bg-gray-900/80 border border-white/10 text-white focus:border-highlight-color" />
            <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-white/50" />
          </div>
        </div>
        
        {/* 2. فلتر المنصات */}
        <div>
           <div className="relative">
            <select value={filterPlatform} onChange={(e) => setFilterPlatform(e.target.value)} className="appearance-none w-full p-3 rounded-lg bg-gray-900/80 border border-white/10 text-white focus:border-highlight-color pr-10 font-bold" style={{ backgroundImage: 'none' }}>
              <option value="الكل">جميع المنصات</option>
              <option value="tiktok">تيك توك 🎵</option>
              <option value="instagram">انستغرام 📷</option>
            </select>
            <ChevronDown className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-white pointer-events-none" />
          </div>
        </div>

        {/* 3. فلتر الحلقات */}
        <div>
           <div className="relative">
            <select value={filterEpisode} onChange={(e) => setFilterEpisode(e.target.value)} className="appearance-none w-full p-3 rounded-lg bg-gray-900/80 border border-white/10 text-white focus:border-highlight-color pr-10 font-bold" style={{ backgroundImage: 'none' }}>
              <option value="الكل">جميع الحلقات</option>
              {EPISODES.map((ep) => <option key={ep} value={ep}>{ep}</option>)}
            </select>
            <ChevronDown className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-white pointer-events-none" />
          </div>
        </div>

        {/* 4. العداد */}
        <div className="flex items-center justify-end text-white border-r border-white/10 pr-4">
          <span className="text-sm font-semibold ml-2">النتائج:</span>
          <span className="text-2xl font-extrabold" style={{ color: `var(--highlight-color-css)` }}>{filteredGridSubmissions.length}</span>
        </div>
      </GlassCard>

      <LiveResultsView approvedSubmissions={leaderboardSubmissions} settings={settings} currentFilter={filterEpisode} currentPlatformFilter={filterPlatform} onDesignerClick={onDesignerClick} />

      <h3 className="text-2xl font-bold text-white border-b border-white/10 pb-2">
        {filterEpisode === 'الكل' ? 'أحدث التصاميم' : `تصاميم ${filterEpisode}`}
      </h3>

      {filteredGridSubmissions.length === 0 ? (
        <p className="text-white/70 text-center text-xl mt-10">لا توجد مشاركات مطابقة لمعايير البحث.</p>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
          {filteredGridSubmissions.map((sub) => (
            <ContestCard key={sub.id} submission={sub} settings={settings} onVote={handleVoteFromCard} onOpenVideo={handleOpenVideo} onDesignerClick={onDesignerClick} />
          ))}
        </div>
      )}

      {/* المودال الخاص بعرض الفيديو للمستخدمين أخرجناه من الداخل لتجنب أي مشاكل قص مستقبلاً */}
      <Modal isOpen={videoModalOpen} onClose={() => setVideoModalOpen(false)} title={`تصميم: ${selectedSubmission?.participantName}`} settings={settings}>
        {selectedSubmission && (
          <div className="flex flex-col">
            <div className="relative w-full aspect-[9/16] bg-black rounded-lg overflow-hidden mb-4 mx-auto max-w-sm border border-white/10 shadow-2xl">
              <iframe src={getVideoEmbedUrl(selectedSubmission.videoUrl)} className="w-full h-full" frameBorder="0" scrolling="no" allowFullScreen></iframe>
            </div>
            
            <div className="bg-gray-800 p-4 rounded-lg border border-white/10">
               <div className="flex items-start mb-3 border-b border-white/10 pb-3 cursor-pointer hover:bg-gray-700/50 p-2 rounded transition" onClick={()=>{setVideoModalOpen(false); onDesignerClick(selectedSubmission.username || selectedSubmission.participantName);}}>
                 <img src={selectedSubmission.profilePic || generateAvatar(selectedSubmission.participantName)} alt={selectedSubmission.participantName} className="w-10 h-10 rounded-full border border-white/20 ml-3 object-cover" />
                 <div>
                    <p className="font-bold text-lg text-white leading-none hover:text-highlight-color" dir="ltr">{selectedSubmission.participantName}</p>
                    <p className="text-xs text-white/50 mt-1 flex items-center gap-1">
                      <img src={getFlagUrl(selectedSubmission.country)} className="w-3 h-2" alt=""/> {selectedSubmission.country} • {selectedSubmission.episode}
                    </p>
                 </div>
               </div>
               
               <p className="text-sm text-white/90 mb-4 whitespace-pre-wrap leading-relaxed">
                 {selectedSubmission.description || "لم يتم كتابة وصف."}
               </p>

               <button onClick={() => {setVideoModalOpen(false); setVoteConfirmData(selectedSubmission);}} disabled={cooldown > 0} className="w-full py-3 px-6 rounded-lg font-bold text-gray-900 transition disabled:opacity-50 flex items-center justify-center shadow-lg" style={{ backgroundColor: settings.mainColor }}>
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

const AdminStatsPanel = ({ submissions, settings, isGlassmorphism }) => {
  const totalVotes = submissions.reduce((sum, sub) => sum + (sub.votes || 0), 0);
  const approved = submissions.filter(s => s.status === 'Approved');
  const pending = submissions.filter(s => s.status === 'Pending');

  const designersMap = {};
  approved.forEach(sub => {
    const key = sub.username || sub.participantName;
    if (!designersMap[key]) {
      designersMap[key] = { username: key, name: sub.participantName, votes: 0, count: 0, profilePic: sub.profilePic };
    }
    designersMap[key].votes += sub.votes;
    designersMap[key].count += 1;
  });
  const topDesigners = Object.values(designersMap).sort((a, b) => b.votes - a.votes).slice(0, 5);

  const StatBox = ({ title, value, icon: Icon, colorClass }) => (
    <div className="bg-gray-800/80 p-4 rounded-xl border border-white/10 flex items-center justify-between">
       <div>
         <p className="text-white/60 text-sm mb-1">{title}</p>
         <p className={`text-3xl font-extrabold ${colorClass}`}>{value.toLocaleString()}</p>
       </div>
       <div className={`p-3 rounded-full bg-white/5 ${colorClass}`}>
         <Icon className="w-6 h-6" />
       </div>
    </div>
  );

  return (
    <GlassCard isGlassmorphism={isGlassmorphism} color="bg-gray-900" className="p-6 mb-6">
      <h3 className="text-2xl font-bold text-white mb-6 flex items-center border-b border-white/10 pb-4">
        <BarChart2 className="w-6 h-6 ml-2 text-highlight-color" /> ملخص إحصائيات المسابقة
      </h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
         <StatBox title="إجمالي الأصوات (الكل)" value={totalVotes} icon={TrendingUp} colorClass="text-yellow-400" />
         <StatBox title="المشاركات المقبولة (النشطة)" value={approved.length} icon={CheckCircle} colorClass="text-green-400" />
         <StatBox title="المشاركات قيد المراجعة" value={pending.length} icon={Clock} colorClass="text-blue-400" />
         <StatBox title="إجمالي عدد المصممين" value={Object.keys(designersMap).length} icon={Users} colorClass="text-purple-400" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
         <div className="bg-gray-800/50 p-4 rounded-xl border border-white/5">
            <h4 className="text-lg font-bold text-white mb-4">أفضل 5 مصممين (حسب الأصوات الكلية)</h4>
            <div className="space-y-3">
              {topDesigners.length === 0 ? <p className="text-white/50 text-sm">لا توجد بيانات.</p> : 
               topDesigners.map((d, index) => (
                <div key={d.username} className="flex items-center justify-between p-2 hover:bg-gray-700/50 rounded transition">
                  <div className="flex items-center gap-3">
                    <span className="text-gray-500 font-bold w-4">{index + 1}</span>
                    <img src={d.profilePic || generateAvatar(d.name)} className="w-10 h-10 rounded-full border border-white/10 object-cover" alt=""/>
                    <div>
                      <p className="text-white font-bold text-sm" dir="ltr">{d.name}</p>
                      <p className="text-white/50 text-[10px]" dir="ltr">@{d.username} • {d.count} مشاركات</p>
                    </div>
                  </div>
                  <span className="text-highlight-color font-bold">{d.votes.toLocaleString()}</span>
                </div>
              ))}
            </div>
         </div>
      </div>
    </GlassCard>
  );
};

const AdminSubmissionsPanel = ({ submissions, settings, isGlassmorphism, onUpdateSubmissionStatus, onDeleteSubmission, onResetVotes }) => {
  const [activeTab, setActiveTab] = useState('Pending');
  const [submissionToEdit, setSubmissionToEdit] = useState(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState(null);
  const [extractLoading, setExtractLoading] = useState(false);

  const filteredSubmissions = useMemo(() => {
    let list = submissions.filter((sub) => sub.status === activeTab);
    if (activeTab === 'Approved') list = list.sort((a, b) => b.votes - a.votes);
    return list;
  }, [submissions, activeTab]);

  const handleSaveEdit = async (updatedSubmission, forceApprove = false) => {
    try {
      if (!db) return;
      const finalSubmission = forceApprove ? { ...updatedSubmission, status: 'Approved' } : updatedSubmission;
      
      await retryOperation(() => setDoc(doc(db, PUBLIC_SUBMISSIONS_COLLECTION, finalSubmission.id), finalSubmission, { merge: true }));
      
      if (finalSubmission.profilePic && finalSubmission.username) {
        const q = query(collection(db, PUBLIC_SUBMISSIONS_COLLECTION), where("username", "==", finalSubmission.username));
        const querySnapshot = await getDocs(q);
        const updatePromises = [];
        querySnapshot.forEach((document) => {
           if(document.id !== finalSubmission.id) {
              updatePromises.push(updateDoc(doc(db, PUBLIC_SUBMISSIONS_COLLECTION, document.id), { profilePic: finalSubmission.profilePic }));
           }
        });
        if(updatePromises.length > 0) await Promise.all(updatePromises);
      }
      setIsEditModalOpen(false); setSubmissionToEdit(null);
    } catch (e) { console.error("Error updating", e); }
  };

  const handleAutoExtract = async () => {
    if (!submissionToEdit) return;
    setExtractLoading(true);

    try {
      let extractedUsername = submissionToEdit.username || '';
      
      if (submissionToEdit.platform === 'tiktok') {
         const match = submissionToEdit.videoUrl.match(/@([^/]+)/);
         if (match) extractedUsername = match[1];
      } else if (submissionToEdit.platform === 'instagram') {
         const match = submissionToEdit.videoUrl.match(/instagram\.com\/([^/]+)/);
         if (match && !['p', 'reel', 'tv'].includes(match[1])) extractedUsername = match[1];
      }

      const videoApiUrl = `https://api.microlink.io/?url=${encodeURIComponent(submissionToEdit.videoUrl)}`;
      const videoRes = await fetch(videoApiUrl);
      const videoData = await videoRes.json();
      
      let newDesc = submissionToEdit.description;
      let newThumb = submissionToEdit.thumbnailUrl;
      let newParticipantName = submissionToEdit.participantName;

      if (videoData.status === 'success' && videoData.data) {
          newThumb = videoData.data.image?.url || videoData.data.logo?.url || newThumb;
          // الاستخراج يعطي الأولوية لـ description ثم title للحصول على النص
          newDesc = videoData.data.description || videoData.data.title || newDesc;
          
          if (!extractedUsername && videoData.data.author) {
              extractedUsername = videoData.data.author;
          }
          newParticipantName = videoData.data.author || extractedUsername || newParticipantName;
      }

      let newProfilePic = submissionToEdit.profilePic;
      if (extractedUsername && extractedUsername !== 'مجهول' && extractedUsername !== '') {
          const profileUrl = submissionToEdit.platform === 'tiktok' 
               ? `https://www.tiktok.com/@${extractedUsername}`
               : `https://www.instagram.com/${extractedUsername}/`;
          
          const profileApiUrl = `https://api.microlink.io/?url=${encodeURIComponent(profileUrl)}`;
          try {
              const profileRes = await fetch(profileApiUrl);
              const profileData = await profileRes.json();
              if (profileData.status === 'success' && profileData.data) {
                  newProfilePic = profileData.data.image?.url || profileData.data.logo?.url || newProfilePic;
              }
          } catch(e) { console.error("Failed to fetch profile info", e); }
      }

      if (newDesc && newDesc.includes('•')) {
         newDesc = newDesc.replace(/•/g, '').trim();
      }

      setSubmissionToEdit(prev => ({
          ...prev,
          username: extractedUsername || prev.username,
          participantName: newParticipantName !== 'في انتظار المراجعة' ? newParticipantName : prev.participantName,
          description: newDesc !== 'سيتم إضافة التفاصيل والصور من قبل الإدارة قريباً.' ? newDesc : prev.description,
          thumbnailUrl: newThumb,
          profilePic: newProfilePic
      }));

    } catch (err) {
       alert('فشل الاتصال بالخادم الذكي لاستخراج البيانات. يرجى المحاولة لاحقاً.');
    } finally {
       setExtractLoading(false);
    }
  };

  const confirmActionHandler = () => {
     if(!confirmAction) return;
     if(confirmAction.type === 'delete') {
         onDeleteSubmission(confirmAction.id);
     } else if (confirmAction.type === 'reset') {
         onResetVotes(confirmAction.id);
     }
     setConfirmAction(null);
  };

  return (
    <>
      <GlassCard isGlassmorphism={isGlassmorphism} color="bg-gray-900" className="p-6 mb-6">
        <div className="flex border-b border-white/20 mb-6 overflow-x-auto">
          {['Pending', 'Approved', 'Rejected'].map((status) => (
            <button key={status} onClick={() => setActiveTab(status)} className={`py-3 px-6 text-sm md:text-base font-bold transition-colors whitespace-nowrap ${activeTab === status ? 'border-b-2 text-highlight-color' : 'text-white/70 hover:bg-white/5'}`} style={{ borderColor: activeTab === status ? settings.mainColor : 'transparent' }}>
              {status === 'Pending' ? 'المشاركات المعلقة' : status === 'Approved' ? 'المشاركات المقبولة' : 'المرفوضة'} ({submissions.filter((s) => s.status === status).length})
            </button>
          ))}
        </div>
        
        <div className="overflow-x-auto w-full pb-4">
          <table className="w-full text-right text-white/80 min-w-[800px]">
            <thead className="bg-white/5 text-white font-bold border-b border-white/20 text-sm">
              <tr>
                <th className="p-4 rounded-tr-lg">بيانات المصمم</th>
                <th className="p-4">تفاصيل التصميم</th>
                <th className="p-4 text-center">الأصوات</th>
                <th className="p-4 text-center">المشاهدة</th>
                <th className="p-4 text-left rounded-tl-lg">الإجراءات</th>
              </tr>
            </thead>
            <tbody>
              {filteredSubmissions.length === 0 ? (
                 <tr><td colSpan="5" className="p-8 text-center text-white/50">لا توجد بيانات للعرض في هذه القائمة.</td></tr>
              ) : (
                filteredSubmissions.map(sub => (
                  <tr key={sub.id} className="border-b border-white/10 hover:bg-white/5 transition">
                     <td className="p-4">
                        <div className="flex items-center gap-3">
                          <img src={sub.profilePic || generateAvatar(sub.participantName)} className="w-12 h-12 rounded-full object-cover border border-white/20" alt="Profile" />
                          <div>
                            <p className="font-bold text-white text-base" dir="ltr">{sub.participantName}</p>
                            <p className="text-xs text-white/50 flex items-center gap-1" dir="ltr">@{sub.username} • <img src={getFlagUrl(sub.country)} className="w-3 h-2" alt="" /></p>
                          </div>
                        </div>
                     </td>
                     <td className="p-4 max-w-xs">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-gray-900 font-bold text-xs px-2 py-1 rounded inline-block" style={{backgroundColor: settings.highlightColor}}>{sub.episode}</span>
                          {sub.platform === 'instagram' || sub.videoUrl.includes('instagram') ? <Instagram className="w-4 h-4 text-pink-500" /> : <TikTokIcon className="w-4 h-4 text-white" />}
                        </div>
                        <p className="text-xs text-white/80 line-clamp-2 leading-relaxed" title={sub.description}>{sub.description}</p>
                     </td>
                     <td className="p-4 text-center font-bold text-xl text-white">
                        {sub.votes}
                     </td>
                     <td className="p-4 text-center">
                        <a href={sub.videoUrl} target="_blank" rel="noreferrer" className="inline-flex items-center text-blue-400 hover:text-blue-300 hover:underline text-sm bg-blue-400/10 px-3 py-1 rounded-full transition border border-blue-400/20">
                          <PlayCircle className="w-4 h-4 ml-1"/> فتح
                        </a>
                     </td>
                     <td className="p-4">
                        <div className="flex justify-end gap-2 flex-wrap">
                          {activeTab !== 'Approved' && (
                             <button onClick={() => onUpdateSubmissionStatus(sub.id, 'Approved')} className="p-2 rounded bg-green-600 hover:bg-green-500 transition shadow-lg" title="موافقة سريعة و نشر">
                               <CheckCircle className="w-5 h-5 text-white" />
                             </button>
                          )}
                          {activeTab !== 'Rejected' && <button onClick={() => onUpdateSubmissionStatus(sub.id, 'Rejected')} className="p-2 rounded bg-gray-600 hover:bg-gray-500 transition shadow-lg" title="رفض المشاركة وإخفائها"><X className="w-5 h-5 text-white" /></button>}
                          <button onClick={() => { setSubmissionToEdit(sub); setIsEditModalOpen(true); }} className="p-2 rounded bg-blue-600 hover:bg-blue-500 transition shadow-lg" title="مراجعة، تعديل واستخراج البيانات"><SettingsIcon className="w-5 h-5 text-white" /></button>
                          
                          <button onClick={() => setConfirmAction({type: 'reset', id: sub.id})} className="p-2 rounded bg-yellow-600 hover:bg-yellow-500 transition shadow-lg" title="تصفير عدد الأصوات لـ 0"><RotateCcw className="w-5 h-5 text-white" /></button>
                          <button onClick={() => setConfirmAction({type: 'delete', id: sub.id})} className="p-2 rounded bg-red-700 hover:bg-red-600 transition shadow-lg" title="حذف نهائي من قاعدة البيانات"><Trash2 className="w-5 h-5 text-white" /></button>
                        </div>
                     </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </GlassCard>

      {/* النوافذ تم إخراجها من حاوية الجدول (GlassCard) لحل مشكلة القص نهائياً */}
      <Modal isOpen={!!confirmAction} onClose={() => setConfirmAction(null)} title={confirmAction?.type === 'delete' ? 'تأكيد الحذف النهائي' : 'تأكيد التصفير'} settings={settings}>
         <div className="text-center">
            <p className="text-white text-lg mb-6">
              {confirmAction?.type === 'delete' ? 'هل أنت متأكد من حذف هذه المشاركة بشكل نهائي؟ لا يمكن التراجع عن هذا الإجراء.' : 'هل أنت متأكد من تصفير عدد أصوات هذه المشاركة لتصبح 0؟'}
            </p>
            <div className="flex justify-around gap-4">
              <button onClick={() => setConfirmAction(null)} className="w-1/2 py-3 rounded-lg bg-gray-700 hover:bg-gray-600 text-white font-bold transition">إلغاء التراجع</button>
              <button onClick={confirmActionHandler} className={`w-1/2 py-3 rounded-lg font-extrabold transition shadow-lg text-white ${confirmAction?.type === 'delete' ? 'bg-red-600 hover:bg-red-500' : 'bg-yellow-600 hover:bg-yellow-500'}`}>نعم، متأكد</button>
            </div>
         </div>
      </Modal>
      
      <Modal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} title="مراجعة وتعديل التصميم" maxWidth="max-w-5xl">
        {submissionToEdit && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8">
             {/* العمود الأول: الفيديو والزر السحري */}
             <div className="lg:col-span-4 flex flex-col gap-4">
                <button onClick={handleAutoExtract} disabled={extractLoading} className="w-full py-4 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 rounded-xl text-white font-extrabold flex items-center justify-center gap-2 transition disabled:opacity-50 shadow-lg shadow-purple-500/30">
                   {extractLoading ? <Loader className="w-6 h-6 animate-spin" /> : <><Wand2 className="w-6 h-6" /> استخراج البيانات 🪄</>}
                </button>
                <div className="bg-blue-500/10 border border-blue-500/30 p-2.5 rounded-lg text-blue-200 text-xs text-center leading-relaxed">
                   <Info className="w-4 h-4 inline-block ml-1" /> اسحب الغلاف، الوصف، واليوزر تلقائياً بنقرة واحدة!
                </div>

                <div className="w-full max-w-[280px] mx-auto aspect-[9/16] bg-black rounded-xl overflow-hidden border border-white/10 shadow-2xl relative">
                  <iframe src={getVideoEmbedUrl(submissionToEdit.videoUrl)} className="absolute inset-0 w-full h-full" frameBorder="0" scrolling="no" allowFullScreen></iframe>
                </div>
             </div>

             {/* العمود الثاني: الحقول */}
             <div className="lg:col-span-8 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                     <label className="text-white/80 text-sm font-bold mb-1 block">الاسم الظاهر</label>
                     <input type="text" value={submissionToEdit.participantName} onChange={(e) => setSubmissionToEdit({...submissionToEdit, participantName: e.target.value})} className="w-full p-3 rounded-lg bg-gray-800 text-white border border-white/20 focus:border-highlight-color transition" />
                  </div>
                  <div>
                     <label className="text-white/80 text-sm font-bold mb-1 block">اليوزر (Username)</label>
                     <input type="text" value={submissionToEdit.username || ''} onChange={(e) => setSubmissionToEdit({...submissionToEdit, username: e.target.value})} dir="ltr" className="w-full p-3 rounded-lg bg-gray-800 text-white border border-white/20 focus:border-highlight-color transition font-mono" />
                  </div>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                     <label className="text-white/80 text-sm font-bold mb-1 flex items-center justify-between">
                       الصورة الشخصية
                       {submissionToEdit.profilePic && <img src={submissionToEdit.profilePic} className="w-6 h-6 rounded-full object-cover border border-white/20" alt="" />}
                     </label>
                     <input type="url" value={submissionToEdit.profilePic || ''} onChange={(e) => setSubmissionToEdit({...submissionToEdit, profilePic: e.target.value})} dir="ltr" className="w-full p-3 rounded-lg bg-gray-800 text-white border border-white/20 focus:border-highlight-color transition text-sm" />
                  </div>
                  <div>
                     <label className="text-white/80 text-sm font-bold mb-1 flex items-center justify-between">
                       صورة الغلاف (Thumbnail)
                       {submissionToEdit.thumbnailUrl && <img src={submissionToEdit.thumbnailUrl} className="w-4 h-6 rounded object-cover border border-white/20" alt="" />}
                     </label>
                     <input type="url" value={submissionToEdit.thumbnailUrl || ''} onChange={(e) => setSubmissionToEdit({...submissionToEdit, thumbnailUrl: e.target.value})} dir="ltr" className="w-full p-3 rounded-lg bg-gray-800 text-white border border-white/20 focus:border-highlight-color transition text-sm" />
                  </div>
                </div>

                <div>
                   <label className="text-white/80 text-sm font-bold mb-1 block">وصف الفيديو (Caption)</label>
                   <textarea value={submissionToEdit.description || ''} onChange={(e) => setSubmissionToEdit({...submissionToEdit, description: e.target.value})} className="w-full p-3 rounded-lg bg-gray-800 text-white border border-white/20 focus:border-highlight-color transition custom-scrollbar" rows="4" />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                   <div>
                      <label className="text-white/80 text-sm font-bold mb-1 block">تغيير الحلقة</label>
                      <select value={submissionToEdit.episode} onChange={(e) => setSubmissionToEdit({...submissionToEdit, episode: e.target.value})} className="w-full p-3 rounded-lg bg-gray-800 text-white border border-white/20 focus:border-highlight-color">
                        {EPISODES.map(ep => <option key={ep} value={ep}>{ep}</option>)}
                      </select>
                   </div>
                   <div>
                      <label className="text-white/80 text-sm font-bold mb-1 block">تعديل الأصوات</label>
                      <input type="number" value={submissionToEdit.votes} onChange={(e) => setSubmissionToEdit({...submissionToEdit, votes: parseInt(e.target.value)||0})} className="w-full p-3 rounded-lg bg-gray-800 text-white border border-white/20 font-bold text-xl text-center focus:border-highlight-color" />
                   </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-4 pt-6 border-t border-white/10 mt-4">
                   <button onClick={() => handleSaveEdit(submissionToEdit, false)} className="flex-1 p-4 rounded-xl text-white bg-gray-700 hover:bg-gray-600 font-bold transition shadow-md">حفظ التعديلات فقط</button>
                   {submissionToEdit.status !== 'Approved' && (
                     <button onClick={() => handleSaveEdit(submissionToEdit, true)} className="flex-1 p-4 rounded-xl text-gray-900 font-extrabold transition hover:opacity-90 shadow-lg flex items-center justify-center gap-2" style={{backgroundColor: settings.mainColor}}>
                       <CheckCircle className="w-6 h-6" /> حفظ وقبول المشاركة 
                     </button>
                   )}
                </div>
             </div>
          </div>
        )}
      </Modal>
    </>
  );
};

const AdminSettingsPanel = ({ settings, isGlassmorphism, onSaveSettings }) => {
  const [currentSettings, setCurrentSettings] = useState(settings);
  useEffect(() => { setCurrentSettings(settings); }, [settings]);
  
  return (
    <GlassCard isGlassmorphism={isGlassmorphism} color="bg-gray-900" className="p-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <h4 className="text-lg font-semibold border-b border-white/10 pb-2" style={{ color: settings.mainColor }}>الإعدادات البصرية للموقع</h4>
          <div><label className="text-white text-sm">العنوان الرئيسي</label><input type="text" value={currentSettings.title} onChange={(e) => setCurrentSettings({...currentSettings, title: e.target.value})} className="w-full p-2 rounded bg-gray-800 text-white border border-white/20" /></div>
          
          <div className="grid grid-cols-2 gap-4">
            <div><label className="text-white text-sm">رابط الشعار العُلوي</label><input type="text" value={currentSettings.logoUrl} onChange={(e) => setCurrentSettings({...currentSettings, logoUrl: e.target.value})} className="w-full p-2 rounded bg-gray-800 text-white border border-white/20" dir="ltr" /></div>
            <div><label className="text-white text-sm">حجم الشعار (الارتفاع px)</label><input type="number" min="20" max="200" value={currentSettings.logoSize || 40} onChange={(e) => setCurrentSettings({...currentSettings, logoSize: parseInt(e.target.value) || 40})} className="w-full p-2 rounded bg-gray-800 text-white border border-white/20" /></div>
          </div>
          
          <div><label className="text-white text-sm">شريط الإعلانات (يظهر أعلى الموقع)</label><input type="text" value={currentSettings.marqueeText} onChange={(e) => setCurrentSettings({...currentSettings, marqueeText: e.target.value})} className="w-full p-2 rounded bg-gray-800 text-white border border-white/20" /></div>
          
          <div className="flex gap-4 p-4 bg-gray-800/50 rounded-lg border border-white/10">
             <div className="flex-1"><label className="text-white text-sm block mb-2">اللون الأساسي للأزرار</label><input type="color" value={currentSettings.mainColor} onChange={(e) => setCurrentSettings({...currentSettings, mainColor: e.target.value})} className="w-full h-10 rounded cursor-pointer" /></div>
             <div className="flex-1"><label className="text-white text-sm block mb-2">اللون الثانوي (التوهج)</label><input type="color" value={currentSettings.highlightColor} onChange={(e) => setCurrentSettings({...currentSettings, highlightColor: e.target.value})} className="w-full h-10 rounded cursor-pointer" /></div>
          </div>
        </div>
        <div className="space-y-4">
           <h4 className="text-lg font-semibold border-b border-white/10 pb-2" style={{ color: settings.mainColor }}>إعدادات النصوص</h4>
           <div><label className="text-white text-sm">شروط الانضمام</label><textarea value={currentSettings.termsText} onChange={(e) => setCurrentSettings({...currentSettings, termsText: e.target.value})} className="w-full p-2 rounded bg-gray-800 text-white border border-white/20 h-32" /></div>
           <div><label className="text-white text-sm">نبذة عن المسابقة</label><textarea value={currentSettings.whyText} onChange={(e) => setCurrentSettings({...currentSettings, whyText: e.target.value})} className="w-full p-2 rounded bg-gray-800 text-white border border-white/20 h-32" /></div>
        </div>

        {/* معلومات المشرف */}
        <div className="space-y-4 md:col-span-2 mt-4 pt-4 border-t border-white/10">
           <h4 className="text-lg font-semibold mb-2" style={{ color: settings.mainColor }}>حولنا (معلومات المشرف)</h4>
           <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
             <div><label className="text-white text-sm">اسم المشرف / العنوان</label><input type="text" value={currentSettings.adminName || ''} onChange={(e) => setCurrentSettings({...currentSettings, adminName: e.target.value})} className="w-full p-2 rounded bg-gray-800 text-white border border-white/20" placeholder="مثال: علي جبار" /></div>
             <div className="md:col-span-2"><label className="text-white text-sm">الوصف (نبذة شخصية تظهر في نافذة حولنا)</label><textarea value={currentSettings.adminBio || ''} onChange={(e) => setCurrentSettings({...currentSettings, adminBio: e.target.value})} className="w-full p-2 rounded bg-gray-800 text-white border border-white/20 h-24" placeholder="اكتب نبذة تظهر للمتابعين..."/></div>
             <div><label className="text-white text-sm">حساب تيك توك (رابط كامل)</label><input type="url" value={currentSettings.adminTikTok || ''} onChange={(e) => setCurrentSettings({...currentSettings, adminTikTok: e.target.value})} dir="ltr" className="w-full p-2 rounded bg-gray-800 text-white border border-white/20" placeholder="https://www.tiktok.com/@..." /></div>
             <div><label className="text-white text-sm">حساب انستغرام (رابط كامل)</label><input type="url" value={currentSettings.adminInsta || ''} onChange={(e) => setCurrentSettings({...currentSettings, adminInsta: e.target.value})} dir="ltr" className="w-full p-2 rounded bg-gray-800 text-white border border-white/20" placeholder="https://www.instagram.com/..." /></div>
           </div>
        </div>

        {/* روابط البنرات الإعلانية الديناميكية */}
        <div className="space-y-4 md:col-span-2 mt-4 pt-4 border-t border-white/10">
           <h4 className="text-lg font-semibold mb-2" style={{ color: settings.mainColor }}>البنرات الإعلانية (Carousel)</h4>
           {currentSettings.adBanners?.map((banner, index) => (
             <div key={index} className="flex gap-2">
                <input
                  type="url"
                  value={banner}
                  onChange={(e) => {
                     const newBanners = [...(currentSettings.adBanners || [])];
                     newBanners[index] = e.target.value;
                     setCurrentSettings({...currentSettings, adBanners: newBanners});
                  }}
                  placeholder="https://..."
                  className="flex-grow p-2 rounded bg-gray-800 text-white border border-white/20 focus:border-highlight-color transition"
                  dir="ltr"
                />
                <button onClick={() => {
                   const newBanners = currentSettings.adBanners.filter((_, i) => i !== index);
                   setCurrentSettings({...currentSettings, adBanners: newBanners});
                }} className="px-4 bg-red-600/80 rounded text-white font-bold hover:bg-red-500 transition">حذف</button>
             </div>
           ))}
           <button onClick={() => {
              setCurrentSettings({...currentSettings, adBanners: [...(currentSettings.adBanners || []), '']});
           }} className="px-4 py-2 bg-blue-600/80 rounded text-white font-bold hover:bg-blue-500 transition flex items-center gap-2">
              <Plus className="w-4 h-4"/> إضافة بنر جديد
           </button>
        </div>

      </div>
      <button onClick={() => onSaveSettings(currentSettings)} className="w-full mt-8 p-4 rounded-lg font-bold text-gray-900 text-lg transition hover:opacity-90 shadow-lg" style={{ backgroundColor: currentSettings.mainColor }}>حفظ وتطبيق الإعدادات فوراً</button>
    </GlassCard>
  );
};

// =========================================================================
// 6. LAYOUT & MAIN APP
// =========================================================================

const Header = ({ settings, activeView, setActiveView, isAdminMode, clearDesignerSelection, onOpenAbout }) => (
  <header className="sticky top-0 z-40 border-b" style={{ backgroundColor: settings.useGlassmorphism ? 'rgba(0,0,0,0.8)' : '#000000', borderColor: 'rgba(255, 255, 255, 0.1)', backdropFilter: settings.useGlassmorphism ? 'blur(12px)' : 'none' }}>
    <div className="container mx-auto px-4 py-3">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="flex items-center cursor-pointer" onClick={() => {setActiveView('home'); clearDesignerSelection();}}>
          <img src={settings.logoUrl} alt="Logo" className="rounded-lg mr-4 ml-4 shadow-md transition-all duration-300" style={{ height: `${settings.logoSize || 40}px`, width: 'auto', display: settings.logoUrl ? 'block' : 'none' }} onError={(e) => (e.target.style.display = 'none')} />
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
            <button onClick={onOpenAbout} className="flex items-center px-4 py-2 rounded-full text-sm font-bold transition whitespace-nowrap text-white hover:bg-white/10">
              <User className="w-4 h-4 ml-1" /> حولنا
            </button>
          </nav>
        )}
      </div>
    </div>
  </header>
);

const Footer = ({ settings }) => (
  <footer className="bg-gray-900/80 p-6 mt-16 border-t border-white/10 text-center">
    <p className="text-sm text-white/40">
      &copy; {new Date().getFullYear()} {settings.title}. جميع الحقوق محفوظة.
    </p>
  </footer>
);

const App = () => {
  const [settings, setSettings] = useState(null);
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [adminMode, setAdminMode] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [adminActiveTab, setAdminActiveTab] = useState('stats');
  const [isAboutModalOpen, setIsAboutModalOpen] = useState(false);
  
  const [activeView, setActiveView] = useState('home');
  const [selectedDesignerProfile, setSelectedDesignerProfile] = useState(null);

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

  const handleDeleteSubmission = async (id) => {
    try {
      if (!db) return;
      await retryOperation(() => deleteDoc(doc(db, PUBLIC_SUBMISSIONS_COLLECTION, id)));
    } catch (e) { console.error("Error deleting", e); }
  };

  const handleResetVotes = async (id) => {
    try {
      if (!db) return;
      await retryOperation(() => updateDoc(doc(db, PUBLIC_SUBMISSIONS_COLLECTION, id), { votes: 0 }));
    } catch (e) { console.error("Error resetting votes", e); }
  };

  const handleDesignerClick = (designerUsername) => {
    setSelectedDesignerProfile(designerUsername);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const clearDesignerSelection = () => {
    setSelectedDesignerProfile(null);
  };

  if (loading || !settings) {
    return (
      <div className="flex items-center justify-center h-screen" style={{ backgroundColor: '#000000' }} dir="rtl">
        <Loader className="w-10 h-10 text-white animate-spin ml-4" />
        <span className="text-white text-xl font-bold">جاري تجهيز المنصة...</span>
      </div>
    );
  }

  return (
    <div dir="rtl" className="min-h-screen font-sans text-white flex flex-col" style={{ backgroundColor: '#000000' }}>
      <Header settings={settings} activeView={activeView} setActiveView={setActiveView} isAdminMode={adminMode} clearDesignerSelection={clearDesignerSelection} onOpenAbout={() => setIsAboutModalOpen(true)} />

      <main className="container mx-auto p-4 pt-6 flex-grow">
        {!adminMode && <AdBanner settings={settings} />}
        {!adminMode && <AlertBanner settings={settings} />}

        {adminMode ? (
          <div className="space-y-6 animate-fade-in">
             <div className="flex flex-col md:flex-row justify-between items-center bg-gray-900 p-6 rounded-xl border border-white/10 shadow-2xl">
               <div className="mb-4 md:mb-0">
                  <h2 className="text-3xl font-extrabold text-white flex items-center mb-2"><SettingsIcon className="w-8 h-8 ml-3 text-highlight-color" /> لوحة التحكم الشاملة</h2>
                  <p className="text-white/60 text-sm">مرحباً بك، لديك تحكم كامل في البيانات والإحصائيات.</p>
               </div>
               <button onClick={handleAdminLogout} className="py-3 px-6 rounded-lg bg-red-600/20 text-red-400 hover:bg-red-600 hover:text-white font-bold transition flex items-center border border-red-600/30">
                  <LogOut className="w-5 h-5 ml-2"/> تسجيل خروج
               </button>
             </div>
             
             {/* Navigation Tabs for Admin */}
             <div className="flex border-b border-white/10 mb-6">
               <button onClick={() => setAdminActiveTab('stats')} className={`py-3 px-6 font-bold transition-colors ${adminActiveTab === 'stats' ? 'text-highlight-color border-b-2 border-highlight-color' : 'text-white/50 hover:text-white'}`}>📊 الإحصائيات</button>
               <button onClick={() => setAdminActiveTab('subs')} className={`py-3 px-6 font-bold transition-colors ${adminActiveTab === 'subs' ? 'text-highlight-color border-b-2 border-highlight-color' : 'text-white/50 hover:text-white'}`}>🎬 إدارة المشاركات</button>
               <button onClick={() => setAdminActiveTab('settings')} className={`py-3 px-6 font-bold transition-colors ${adminActiveTab === 'settings' ? 'text-highlight-color border-b-2 border-highlight-color' : 'text-white/50 hover:text-white'}`}>⚙️ إعدادات الموقع</button>
             </div>

             {adminActiveTab === 'stats' && <AdminStatsPanel submissions={submissions} settings={settings} isGlassmorphism={settings.useGlassmorphism} />}
             {adminActiveTab === 'subs' && <AdminSubmissionsPanel submissions={submissions} settings={settings} isGlassmorphism={settings.useGlassmorphism} onUpdateSubmissionStatus={async (id, s) => { await updateDoc(doc(db, PUBLIC_SUBMISSIONS_COLLECTION, id), {status: s}) }} onDeleteSubmission={handleDeleteSubmission} onResetVotes={handleResetVotes} />}
             {adminActiveTab === 'settings' && <AdminSettingsPanel settings={settings} isGlassmorphism={settings.useGlassmorphism} onSaveSettings={async (newSet) => { await setDoc(doc(db, PUBLIC_SETTINGS_PATH), newSet) }} />}
          </div>
        ) : (
          <>
            {selectedDesignerProfile ? (
              <DesignerProfile 
                designerId={selectedDesignerProfile} 
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

      {!adminMode && <Footer settings={settings} />}

      {/* نافذة "حول المسابقة / عني" المنبثقة بتصميم Glassmorphism */}
      <Modal isOpen={isAboutModalOpen} onClose={() => setIsAboutModalOpen(false)} title="" isGlassmorphism={true}>
         <div className="flex flex-col items-center justify-center p-2 text-center relative mt-4">
            
            <div className="w-24 h-24 bg-gray-800 rounded-full flex items-center justify-center mb-4 border-2 shadow-2xl" style={{ borderColor: settings.highlightColor }}>
               <Crown className="w-12 h-12" style={{ color: settings.highlightColor }} />
            </div>
            
            <h3 className="text-4xl font-extrabold text-white mb-2" style={{ color: settings.highlightColor }}>
               {settings.adminName || 'إدارة المسابقة'}
            </h3>
            
            <div className="h-1 w-16 bg-white/20 rounded-full mb-6"></div>
            
            <p className="text-white/90 leading-relaxed mb-8 text-lg whitespace-pre-wrap px-4">
               {settings.adminBio || 'وصف المشرف سيظهر هنا. قم بتعديله من لوحة التحكم لتوضيح رسالة المسابقة وأهدافها للجمهور.'}
            </p>
            
            <div className="flex flex-wrap justify-center gap-4 w-full">
               {settings.adminTikTok && (
                 <a href={settings.adminTikTok} target="_blank" rel="noreferrer" className="flex-1 flex items-center justify-center px-6 py-4 bg-gray-800/80 rounded-xl hover:bg-gray-700 transition border border-white/10 text-white font-bold shadow-lg">
                   <TikTokIcon className="w-6 h-6 ml-2 text-white" /> تيك توك
                 </a>
               )}
               {settings.adminInsta && (
                 <a href={settings.adminInsta} target="_blank" rel="noreferrer" className="flex-1 flex items-center justify-center px-6 py-4 bg-gray-800/80 rounded-xl hover:bg-gray-700 transition border border-white/10 text-white font-bold shadow-lg">
                   <Instagram className="w-6 h-6 ml-2 text-purple-500" /> انستغرام
                 </a>
               )}
            </div>
         </div>
      </Modal>

      {/* نافذة الدخول للإدارة */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm" style={{display: authModalOpen && !adminMode ? 'flex' : 'none'}}>
        <div className="bg-gray-900 p-8 rounded-2xl w-full max-w-sm border border-white/10 shadow-2xl">
           <div className="flex justify-center mb-4"><Lock className="w-12 h-12 text-highlight-color"/></div>
           <h2 className="text-white font-extrabold text-2xl mb-6 text-center">تسجيل الدخول للإدارة</h2>
           <button onClick={()=> {setAdminMode(true); setAuthModalOpen(false);}} className="w-full p-4 rounded-lg font-bold text-gray-900 text-lg transition hover:scale-105" style={{backgroundColor: settings.highlightColor}}>تأكيد ودخول تجريبي</button>
        </div>
      </div>

      <Modal isOpen={voteConfirmData !== null} onClose={() => setVoteConfirmData(null)} title="تأكيد التصويت النهائي" isGlassmorphism={true}>
        {voteConfirmData && (
          <div className="text-center">
            <p className="text-white text-xl mb-6">هل أنت متأكد من منح صوتك لـ <span className="font-extrabold mx-2 px-2 py-1 bg-black/30 rounded" style={{ color: settings.highlightColor }} dir="ltr">{voteConfirmData.participantName}</span> عن مشاركته في <span className="text-main-color font-bold">{voteConfirmData.episode}</span>؟</p>
            
            <div className="bg-gray-800 p-4 rounded-xl mb-6 border border-white/10 flex items-center justify-center shadow-inner">
              <img src={voteConfirmData.profilePic || generateAvatar(voteConfirmData.participantName)} className="w-14 h-14 rounded-full border-2 ml-4 object-cover shadow-lg" style={{borderColor: settings.highlightColor}} alt="Profile"/>
              <p className="text-sm text-white/80 text-right line-clamp-2 leading-relaxed">{voteConfirmData.description}</p>
            </div>

            <p className="text-sm text-white/50 mb-8"><Info className="w-4 h-4 inline-block ml-1"/> سيُسمح لك بالتصويت مرة أخرى بعد 30 ثانية.</p>
            <div className="flex justify-around gap-4">
              <button onClick={() => setVoteConfirmData(null)} className="w-1/2 py-3 rounded-lg bg-gray-700 hover:bg-gray-600 text-white font-bold transition">إلغاء التراجع</button>
              <button onClick={() => handleConfirmVote(voteConfirmData)} className="w-1/2 py-3 rounded-lg text-gray-900 font-extrabold transition shadow-lg hover:opacity-90" style={{ backgroundColor: settings.mainColor }} disabled={cooldown > 0}>نعم، تأكيد التصويت</button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default App;