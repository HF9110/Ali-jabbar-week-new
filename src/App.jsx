import React, { useState, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { initializeApp } from 'firebase/app';
import {
  getAuth,
  signInAnonymously,
  signInWithCustomToken,
  onAuthStateChanged,
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
  orderBy
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
  BarChart2,
  TrendingUp,
  Users,
  Instagram,
  Trash2,
  RotateCcw,
  Wand2,
  Link2,
  Plus,
  Image as ImageIcon,
  Newspaper,
  Heart,
  Share2
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
const PUBLIC_LIBRARY_COLLECTION = `library_scenes`;
const PUBLIC_STORIES_COLLECTION = `news_stories`;

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
    'https://placehold.co/1200x400/fe2c55/ffffff?text=إعلان+المسلسل+الثاني'
  ]
};

const generateAvatar = (name) => `https://ui-avatars.com/api/?name=${encodeURIComponent(name || 'Unknown')}&background=random&color=fff&size=128&bold=true`;

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

const GlassCard = ({ children, className = '', isGlassmorphism = true, color = 'bg-gray-800' }) => {
  const glassClasses = isGlassmorphism 
    ? 'bg-white/5 backdrop-blur-xl shadow-[0_8px_32px_0_rgba(0,0,0,0.36)] border border-white/10 hover:border-white/20 transition-all duration-300 relative overflow-hidden' 
    : `shadow-2xl ${color}`;
  
  return (
    <div className={`p-5 rounded-3xl ${glassClasses} ${className}`}>
      {isGlassmorphism && (
        <div className="absolute inset-0 bg-gradient-to-br from-white/[0.04] to-transparent pointer-events-none rounded-3xl" />
      )}
      <div className="relative z-10 h-full w-full">
        {children}
      </div>
    </div>
  );
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
    <div className="relative w-full h-48 sm:h-64 md:h-80 lg:h-96 rounded-[2rem] mb-8 shadow-[0_20px_50px_rgba(0,0,0,0.5)] overflow-hidden border border-white/10 group bg-gray-900">
      {banners.map((ad, index) => (
        <img
          key={index}
          src={ad}
          alt={`Ad ${index + 1}`}
          className={`absolute inset-0 w-full h-full object-cover transition-all duration-1000 ease-in-out transform ${
            index === currentAd ? 'opacity-100 z-10 scale-100' : 'opacity-0 z-0 scale-105'
          }`}
          onError={(e) => {
             e.target.src = `https://placehold.co/1200x400/1e293b/25f4ee?text=صورة+غير+صالحة`;
          }}
        />
      ))}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/20 pointer-events-none opacity-50 group-hover:opacity-100 transition-opacity duration-500 z-20"></div>
      
      {banners.length > 1 && (
        <>
          <div className="absolute bottom-5 left-0 right-0 flex justify-center gap-3 z-30">
            {banners.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentAd(index)}
                className={`h-2.5 rounded-full transition-all duration-500 shadow-lg ${
                  index === currentAd ? 'w-8 bg-white' : 'w-2.5 bg-white/40 hover:bg-white/80'
                }`}
                style={{
                  backgroundColor: index === currentAd ? settings.highlightColor : undefined,
                  boxShadow: index === currentAd ? `0 0 12px ${settings.highlightColor}` : 'none'
                }}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
};

const AlertBanner = ({ settings }) => {
  const [isVisible, setIsVisible] = useState(true);
  if (!isVisible || !settings.marqueeText) return null;

  return (
    <div className="relative mb-8 group animate-fade-in z-20">
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent rounded-2xl blur-md group-hover:bg-white/10 transition-all duration-500 pointer-events-none"></div>

      <div className="relative flex items-center bg-black/60 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden shadow-[0_8px_30px_0_rgba(0,0,0,0.5)] transition-all duration-300"
        style={{ borderRight: `4px solid ${settings.highlightColor}` }}>
        <style>{`
          @keyframes marquee-rtl { 0% { transform: translateX(-100vw); } 100% { transform: translateX(100vw); } }
          .marquee-container:hover .marquee-text { animation-play-state: paused; }
          .marquee-text { display: inline-block; white-space: nowrap; animation: marquee-rtl 35s linear infinite; will-change: transform; text-shadow: 0 2px 5px rgba(0,0,0,0.8); }
        `}</style>
        
        <div className="flex items-center z-10 p-3 sm:p-4 bg-gradient-to-l from-black/80 to-transparent relative min-w-max">
          <div className="relative flex items-center justify-center ml-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-40" style={{ backgroundColor: settings.highlightColor }}></span>
            <div className="relative p-2 rounded-full bg-white/10 border border-white/10 shadow-sm backdrop-blur-md">
              <Film className="w-5 h-5 text-white" />
            </div>
          </div>
          <span className="font-extrabold text-lg tracking-wide text-transparent bg-clip-text hidden sm:block" style={{ backgroundImage: `linear-gradient(to left, #fff, ${settings.highlightColor})` }}>
            إعلان هام
          </span>
        </div>
        
        <div className="flex-grow overflow-hidden relative h-full flex items-center marquee-container py-4 cursor-default">
            <span className="marquee-text text-sm sm:text-base font-medium text-white/90 hover:text-white transition-colors">
              {settings.marqueeText}
            </span>
        </div>

        <button onClick={() => setIsVisible(false)} className="p-4 z-10 bg-gradient-to-r from-black/80 to-transparent hover:bg-white/10 transition-colors text-white/50 hover:text-white flex-shrink-0 border-r border-white/5">
          <X className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};

const Modal = ({ isOpen, onClose, title, children, isGlassmorphism = true, maxWidth = "max-w-2xl" }) => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  if (!isOpen || !mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-md transition-opacity" onClick={onClose} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }}>
      <div className={`w-full ${maxWidth} max-h-[95vh] flex flex-col bg-gray-900 rounded-[2rem] shadow-2xl relative overflow-hidden transform transition-all scale-100 ${isGlassmorphism ? 'bg-white/10 backdrop-blur-2xl border border-white/20' : ''}`} onClick={(e) => e.stopPropagation()}>
        {isGlassmorphism && <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none" />}
        
        <div className="flex justify-between items-center p-5 sm:p-6 border-b border-white/10 shrink-0 bg-black/20 relative z-10">
          <h2 className="text-xl sm:text-2xl font-extrabold text-white tracking-wide">{title}</h2>
          <button onClick={onClose} className="text-white/70 hover:text-white transition-all bg-white/10 hover:bg-white/20 p-2.5 rounded-full hover:rotate-90"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-5 sm:p-8 overflow-y-auto custom-scrollbar flex-grow text-white w-full relative z-10" dir="rtl">
          {children}
        </div>
      </div>
    </div>,
    document.body
  );
};

// =========================================================================
// 3.5 STORIES COMPONENT (آخر الأخبار - Instagram Style)
// =========================================================================

const StoriesBar = ({ stories, settings }) => {
  const [activeStory, setActiveStory] = useState(null);
  const [liked, setLiked] = useState(false);
  const [shared, setShared] = useState(false);

  useEffect(() => {
    setLiked(false);
    setShared(false);
  }, [activeStory]);

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: activeStory.title, url: window.location.href });
      } catch (err) {}
    } else {
      document.execCommand('copy');
      setShared(true);
      setTimeout(() => setShared(false), 2000);
    }
  };

  if (!stories || stories.length === 0) return null;

  return (
    <>
      <div className="mb-8 w-full">
        <div className="flex items-center mb-4">
          <Newspaper className="w-5 h-5 ml-2" style={{ color: settings.highlightColor }} />
          <h3 className="text-xl font-black text-white">آخر الأخبار</h3>
        </div>
        
        <div className="flex gap-4 overflow-x-auto custom-scrollbar pb-4 pt-2 px-1 snap-x">
          {stories.map(story => (
            <div key={story.id} className="flex flex-col items-center gap-2 cursor-pointer group flex-shrink-0 snap-start" onClick={() => setActiveStory(story)}>
              <div className="p-[3px] rounded-full bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-500 hover:scale-105 transition-transform duration-300 shadow-lg">
                <div className="bg-[#050505] p-1 rounded-full">
                  <img 
                    src={story.imageUrl} 
                    alt={story.title}
                    className="w-16 h-16 sm:w-20 sm:h-20 rounded-full object-cover border border-white/10"
                    onError={(e) => e.target.src = 'https://placehold.co/150x150/111/fff?text=News'}
                  />
                </div>
              </div>
              <span className="text-xs sm:text-sm font-bold text-white/80 w-20 sm:w-24 text-center truncate group-hover:text-white transition-colors">
                {story.title}
              </span>
            </div>
          ))}
        </div>
      </div>

      {activeStory && createPortal(
        <div className="fixed inset-0 z-[10000] bg-black sm:bg-zinc-900/95 flex items-center justify-center sm:p-4 backdrop-blur-md animate-fade-in" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }}>
          {/* Background Blur for Desktop */}
          <div className="absolute inset-0 bg-cover bg-center opacity-30 blur-3xl hidden sm:block pointer-events-none" style={{backgroundImage: `url(${activeStory.imageUrl})`}}></div>
          
          {/* Main Story Container - Full screen on Mobile, Contained on Desktop */}
          <div className="relative w-full h-full sm:w-[420px] sm:h-[90vh] bg-black sm:rounded-[2rem] overflow-hidden shadow-2xl flex flex-col sm:border border-white/10">
            
            {/* Top Bar with Title and Close */}
            <div className="absolute top-0 left-0 w-full p-4 flex justify-between items-center z-50 bg-gradient-to-b from-black/80 via-black/40 to-transparent pt-6 sm:pt-4">
               <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full p-[2px] bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-500">
                    <img src={activeStory.imageUrl} className="w-full h-full rounded-full object-cover border border-black" />
                  </div>
                  <span className="text-white font-bold drop-shadow-md text-sm tracking-wide">{activeStory.title}</span>
               </div>
               <button onClick={() => setActiveStory(null)} className="p-2 text-white/90 hover:text-white transition-colors drop-shadow-md">
                 <X className="w-7 h-7" />
               </button>
            </div>

            {/* Image Content (Fill Screen) */}
            <div className="flex-grow flex items-center justify-center bg-[#111] relative">
              <img src={activeStory.imageUrl} className="w-full h-full object-cover" alt={activeStory.title} onError={(e) => e.target.src = 'https://placehold.co/400x800/111/fff?text=News'} />
            </div>

            {/* Floating Actions (Right Side Instagram style) */}
            <div className="absolute bottom-24 right-4 flex flex-col gap-6 z-50">
               <button onClick={() => setLiked(!liked)} className="flex flex-col items-center gap-1 group outline-none">
                  <Heart className={`w-8 h-8 drop-shadow-lg transition-transform hover:scale-110 ${liked ? 'fill-red-500 text-red-500' : 'text-white'}`} />
                  <span className="text-white drop-shadow-md text-xs font-bold">{liked ? '1' : ''}</span>
               </button>
               <button onClick={handleShare} className="flex flex-col items-center gap-1 group outline-none">
                  {shared ? <CheckCircle className="w-8 h-8 text-green-400 drop-shadow-lg transition-transform hover:scale-110" /> : <Share2 className="w-8 h-8 text-white drop-shadow-lg transition-transform hover:scale-110" />}
               </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
};


// =========================================================================
// 4. MAIN VIEWS
// =========================================================================

const StatsCard = ({ designerItem, settings, currentFilter, onDesignerClick, rank }) => {
  return (
    <div className="relative w-full h-44 group [perspective:1000px]">
      <style>{`.flip-container { transition: transform 0.7s cubic-bezier(0.4, 0.2, 0.2, 1); transform-style: preserve-3d; } .flip-container.flipped { transform: rotateY(180deg); } .front, .back { backface-visibility: hidden; position: absolute; top: 0; left: 0; width: 100%; height: 100%; } .back { transform: rotateY(180deg); }`}</style>
      <div className="flip-container h-full group-hover:flipped">
        <div className="front h-full">
          <GlassCard isGlassmorphism={settings.useGlassmorphism} color="bg-gray-800" className="h-full !p-3 flex flex-col items-center justify-center overflow-hidden relative cursor-pointer">
            {/* Rank Indicator from 4 to 10 */}
            <div className="absolute top-0 right-0 w-8 h-8 flex items-center justify-center font-black rounded-bl-xl shadow-md z-20 bg-gray-700/80 backdrop-blur-md text-white border-l border-b border-white/10">
              #{rank}
            </div>
            
            <img
              src={designerItem.profilePic}
              alt={`Profile`}
              onClick={(e) => { e.stopPropagation(); onDesignerClick(designerItem.username); }}
              className="w-14 h-14 object-cover rounded-full mb-2 border-2 cursor-pointer hover:scale-110 transition-transform duration-300 mt-3 shadow-lg"
              style={{ borderColor: `var(--highlight-color-css)` }}
            />
            <p className="text-2xl font-black text-white mt-1 drop-shadow-md text-amber-400">{designerItem.votes.toLocaleString()}</p>
            <p onClick={(e) => { e.stopPropagation(); onDesignerClick(designerItem.username); }} className="text-sm font-bold text-white truncate w-full text-center mt-1 cursor-pointer hover:text-highlight-color transition-colors">{designerItem.participantName}</p>
            <p className="text-[10px] text-white/50 flex items-center gap-1.5 justify-center mt-1.5 font-medium tracking-wider">
               <img src={getFlagUrl(designerItem.country)} className="w-3.5 h-2.5 rounded-[1px] shadow-sm" alt={designerItem.country}/> {designerItem.country}
            </p>
          </GlassCard>
        </div>
        <div className="back h-full">
          <GlassCard isGlassmorphism={settings.useGlassmorphism} color="bg-gray-800" className="h-full !p-3 flex flex-col items-center justify-center text-center cursor-pointer" onClick={() => onDesignerClick(designerItem.username)}>
            <p className="text-xs text-white/60 mb-1 font-medium">المصمم:</p>
            <p className="text-sm font-bold text-white tracking-wide" dir="ltr">@{designerItem.username}</p>
            <div className="h-0.5 w-1/3 my-3 mx-auto rounded-full opacity-50 bg-amber-500" />
            <p className="text-xs text-white/60 mb-1 font-medium">
               {currentFilter === 'الكل' ? 'إجمالي الأصوات:' : `التصويت في ${currentFilter}:`}
            </p>
            <p className="text-3xl font-black text-white drop-shadow-lg text-amber-400">{designerItem.votes.toLocaleString()}</p>
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
    return Object.values(map).sort((a, b) => b.votes - a.votes).slice(0, 10);
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
    const { participantName, username, country, votes, profilePic } = designerItem;
    const rankColor = { 1: '#fbbf24', 2: '#94a3b8', 3: '#b45309' }[rank]; 
    const isFirst = rank === 1;

    return (
      <div className={`relative flex flex-col items-center p-4 text-center w-full transform hover:-translate-y-2 transition-all duration-300 rounded-2xl overflow-hidden ${isFirst ? 'mt-0 z-20 scale-105' : 'mt-8 z-10 opacity-90 hover:opacity-100'}`}
        style={{ 
          background: `linear-gradient(to bottom, ${rankColor}20, rgba(0,0,0,0.5))`, 
          borderTop: `2px solid ${rankColor}`, 
          borderBottom: `1px solid ${rankColor}40`,
          borderLeft: `1px solid ${rankColor}40`,
          borderRight: `1px solid ${rankColor}40`,
          boxShadow: isFirst ? `0 10px 30px -5px ${rankColor}60` : `0 4px 15px -5px ${rankColor}40`,
          backdropFilter: 'blur(10px)'
        }}>
        
        {isFirst && <Crown className="absolute -top-7 text-yellow-400 w-10 h-10 drop-shadow-[0_0_15px_rgba(250,204,21,0.8)] animate-bounce" />}
        
        <div className="absolute top-0 right-0 w-8 h-8 flex items-center justify-center font-black rounded-bl-xl shadow-md z-20" style={{ backgroundColor: rankColor, color: isFirst ? '#000' : '#fff' }}>
          #{rank}
        </div>
        
        <img 
           src={profilePic} 
           alt={`Rank ${rank}`} 
           onClick={() => onDesignerClick(username)}
           className={`object-cover rounded-full mb-3 border-4 mt-6 cursor-pointer hover:scale-110 transition-transform duration-300 shadow-xl relative z-10 ${isFirst ? 'w-20 h-20' : 'w-16 h-16'}`} 
           style={{ borderColor: rankColor, boxShadow: `0 0 20px ${rankColor}40` }} 
        />
        <p className={`font-black text-white drop-shadow-md text-amber-400 ${isFirst ? 'text-3xl' : 'text-xl'}`}>{votes.toLocaleString()}</p>
        <p onClick={() => onDesignerClick(username)} className={`font-bold text-white truncate w-full cursor-pointer hover:text-[${rankColor}] transition-colors mt-1 ${isFirst ? 'text-base' : 'text-sm'}`}>{participantName}</p>
        <p className="text-xs text-white/60 flex items-center justify-center gap-1.5 mt-1 font-medium tracking-wide">
          <img src={getFlagUrl(country)} className="w-4 h-3 rounded-[1px] shadow-sm" alt={country} /> {country}
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
    <GlassCard isGlassmorphism={settings.useGlassmorphism} color="bg-gray-800" className="!p-6 sm:!p-8 mb-8 shadow-2xl">
      <div className="flex flex-col md:flex-row justify-between items-center mb-8 border-b border-white/10 pb-4 gap-4">
        <h2 className="text-2xl sm:text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-400" style={{ backgroundImage: `linear-gradient(to left, #fff, ${settings.highlightColor})` }}>
          أوائل المصممين {currentFilter !== 'الكل' ? `(${currentFilter})` : '(الترتيب العام - أفضل 10)'} 
        </h2>
        <span className="px-4 py-1.5 rounded-full bg-white/10 text-white/80 text-sm font-bold border border-white/5 backdrop-blur-sm">
          {getPlatformLabel() || 'جميع المنصات'}
        </span>
      </div>
      
      <div className="flex justify-center items-end gap-3 sm:gap-6 mb-10 px-2 sm:px-10">
        {topThree[1] && <div className="w-1/3 max-w-[200px]"><CompactPodiumItem designerItem={topThree[1]} rank={2} settings={settings} /></div>}
        {topThree[0] && <div className="w-1/3 max-w-[220px] z-10"><CompactPodiumItem designerItem={topThree[0]} rank={1} settings={settings} /></div>}
        {topThree[2] && <div className="w-1/3 max-w-[200px]"><CompactPodiumItem designerItem={topThree[2]} rank={3} settings={settings} /></div>}
      </div>

      {remainingDesigners.length > 0 && (
        <div className="relative flex items-center justify-center mt-12 border-t border-white/5 pt-8" onMouseEnter={() => setIsHovering(true)} onMouseLeave={() => setIsHovering(false)}>
          <button onClick={prevSlide} className="absolute right-0 z-20 p-3 rounded-full bg-black/50 hover:bg-white/20 text-white transition-all duration-300 disabled:opacity-0 backdrop-blur-md border border-white/10 hover:scale-110 shadow-lg" disabled={numSlides <= 1}>
            <ChevronRight className="w-6 h-6" />
          </button>
          
          <div className="flex-grow mx-12 overflow-hidden px-2 py-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-5 transition-transform duration-500 ease-out">
              {currentSlideDesigners.map((designer, i) => (
                <StatsCard key={designer.id} designerItem={designer} settings={settings} currentFilter={currentFilter} onDesignerClick={onDesignerClick} rank={4 + (currentIndex * perSlide) + i} />
              ))}
              {[...Array(perSlide - currentSlideDesigners.length)].map((_, i) => (
                <div key={`filler-${i}`} className="w-full hidden md:block"></div>
              ))}
            </div>
          </div>
          
          <button onClick={nextSlide} className="absolute left-0 z-20 p-3 rounded-full bg-black/50 hover:bg-white/20 text-white transition-all duration-300 disabled:opacity-0 backdrop-blur-md border border-white/10 hover:scale-110 shadow-lg" disabled={numSlides <= 1}>
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
    <div className="animate-fade-in flex justify-center w-full">
      <GlassCard isGlassmorphism={settings.useGlassmorphism} color="bg-gray-900" className="w-full max-w-2xl mt-8 !p-8 border-t-4" style={{ borderTopColor: settings.mainColor }}>
        <div className="text-center mb-8">
          <h1 className="text-3xl sm:text-4xl font-black mb-3 text-transparent bg-clip-text" style={{ backgroundImage: `linear-gradient(to right, #fff, ${settings.highlightColor})` }}>إرسال تصميم جديد</h1>
          <p className="text-white/60 text-sm sm:text-base font-medium">ضع الرابط، وسيتكفل النظام بسحب اسمك وصورتك وتفاصيل الفيديو لاحقاً.</p>
        </div>
        
        {successMessage && <div className="bg-green-500/20 border border-green-500/50 p-4 rounded-xl mb-6 text-green-400 text-center font-bold flex items-center justify-center gap-2"><CheckCircle className="w-5 h-5"/> {successMessage}</div>}
        {error && <div className="bg-red-500/20 border border-red-500/50 p-4 rounded-xl mb-6 text-red-400 text-center font-bold flex items-center justify-center gap-2"><AlertTriangle className="w-5 h-5"/> {error}</div>}
        
        <form onSubmit={handleFinalSubmit} className="space-y-6">
          
          <div>
            <label className="block text-white/90 mb-3 font-bold text-sm">اختر منصة التصميم:</label>
            <div className="flex gap-4">
              <button type="button" onClick={() => {setSelectedPlatform('tiktok'); setVideoUrl('');}} className={`flex-1 py-4 rounded-xl font-black text-lg flex items-center justify-center gap-2 transition-all duration-300 transform active:scale-95 ${selectedPlatform === 'tiktok' ? 'bg-white text-black shadow-[0_0_20px_rgba(255,255,255,0.3)] scale-[1.02]' : 'bg-black/40 text-white/40 border border-white/10 hover:bg-black/60'}`}>
                <TikTokIcon className="w-6 h-6"/> تيك توك
              </button>
              <button type="button" onClick={() => {setSelectedPlatform('instagram'); setVideoUrl('');}} className={`flex-1 py-4 rounded-xl font-black text-lg flex items-center justify-center gap-2 transition-all duration-300 transform active:scale-95 ${selectedPlatform === 'instagram' ? 'bg-[#E1306C] text-white shadow-[0_0_20px_rgba(225,48,108,0.4)] scale-[1.02]' : 'bg-black/40 text-white/40 border border-white/10 hover:bg-black/60'}`}>
                <Instagram className="w-6 h-6"/> انستغرام
              </button>
            </div>
          </div>

          <div>
            <label className="text-white/90 mb-3 font-bold text-sm flex items-center">
              <Link2 className="w-5 h-5 ml-2" style={{ color: settings.highlightColor }} />
              رابط الفيديو المباشر (URL)
            </label>
            <input 
              type="url" 
              value={videoUrl} 
              onChange={(e) => setVideoUrl(e.target.value)} 
              className="w-full p-4 rounded-xl bg-black/40 border border-white/10 text-white focus:ring-2 focus:outline-none transition-all shadow-inner focus:shadow-lg" 
              style={{ '--tw-ring-color': settings.highlightColor, borderColor: videoUrl ? settings.highlightColor : '' }}
              placeholder={selectedPlatform === 'tiktok' ? `https://www.tiktok.com/@user/video/...` : `https://www.instagram.com/reel/...`}
              dir="ltr" 
              required 
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <label className="block text-white/90 mb-3 font-bold text-sm">رقم الحلقة</label>
              <div className="relative group">
                <select value={formData.episode} onChange={(e) => setFormData({ ...formData, episode: e.target.value })} className="appearance-none w-full p-4 rounded-xl bg-black/40 border border-white/10 text-white font-bold focus:ring-2 focus:outline-none pr-10 transition-all cursor-pointer group-hover:border-white/30" style={{ '--tw-ring-color': settings.highlightColor, backgroundImage: 'none' }} required>
                  {EPISODES.map((ep) => <option key={ep} value={ep} className="bg-gray-900">{ep}</option>)}
                </select>
                <ChevronDown className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-white/50 group-hover:text-white transition-colors pointer-events-none" />
              </div>
            </div>
            <div>
              <label className="block text-white/90 mb-3 font-bold text-sm">البلد</label>
              <div className="flex gap-3">
                 <div className="bg-black/40 border border-white/10 rounded-xl flex items-center justify-center px-4 shadow-inner">
                   <img src={getFlagUrl(formData.country)} className="w-7 h-5 object-cover rounded-[2px] shadow-sm" alt="Flag" />
                 </div>
                 <div className="relative flex-grow group">
                   <select value={formData.country} onChange={(e) => setFormData({ ...formData, country: e.target.value })} className="appearance-none w-full p-4 rounded-xl bg-black/40 border border-white/10 text-white font-bold focus:ring-2 focus:outline-none pr-10 transition-all cursor-pointer group-hover:border-white/30" style={{ '--tw-ring-color': settings.highlightColor, backgroundImage: 'none' }} required>
                     {COUNTRIES.map((c) => <option key={c.code} value={c.name} className="bg-gray-900">{c.name}</option>)}
                   </select>
                   <ChevronDown className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-white/50 group-hover:text-white transition-colors pointer-events-none" />
                 </div>
              </div>
            </div>
          </div>

          <button type="submit" disabled={isSubmitting || !videoUrl} className="relative w-full p-5 rounded-xl font-black text-xl text-white transition-all duration-300 transform hover:scale-[1.02] active:scale-95 disabled:opacity-50 disabled:hover:scale-100 disabled:cursor-not-allowed shadow-[0_10px_20px_-10px_rgba(59,130,246,0.4)] hover:shadow-[0_15px_25px_-10px_rgba(59,130,246,0.6)] mt-8 overflow-hidden group border border-blue-500/30 bg-gradient-to-r from-blue-600 to-indigo-600">
            <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-in-out"></div>
            <span className="relative z-10 flex justify-center items-center gap-2">
              {isSubmitting ? <Loader className="w-7 h-7 animate-spin" /> : <><UploadCloud className="w-6 h-6"/> إرسال المشاركة للتقييم</>}
            </span>
          </button>
        </form>
      </GlassCard>
    </div>
  );
};

const ContestCard = ({ submission, settings, onVote, onOpenVideo, onDesignerClick }) => {
  const { participantName, username, description, country, episode, thumbnailUrl, profilePic, votes, platform, videoUrl } = submission;
  const safeUsername = username || participantName || 'مجهول';
  const isIg = platform === 'instagram' || (videoUrl && videoUrl.includes('instagram'));

  return (
    <GlassCard isGlassmorphism={settings.useGlassmorphism} color="bg-gray-800" className="!p-3 flex flex-col h-full overflow-hidden transition-all duration-300 relative group hover:-translate-y-1 hover:shadow-[0_15px_30px_-10px_rgba(0,0,0,0.5)] border border-white/5 hover:border-white/20">
      
      {/* Badges */}
      <div className="absolute top-5 left-5 z-20 px-3 py-1.5 rounded-lg text-xs font-black shadow-lg backdrop-blur-md border border-white/20 tracking-wider" style={{ backgroundColor: `${settings.highlightColor}E6`, color: '#000' }}>
        {episode}
      </div>
      <div className="absolute top-5 right-5 z-20 p-2 rounded-lg bg-black/60 shadow-lg backdrop-blur-md border border-white/10 transition-transform group-hover:scale-110">
        {isIg ? <Instagram className="w-5 h-5 text-pink-500 drop-shadow-[0_0_5px_rgba(236,72,153,0.5)]" /> : <TikTokIcon className="w-5 h-5 text-white drop-shadow-[0_0_5px_rgba(255,255,255,0.5)]" />}
      </div>
      
      {/* Thumbnail */}
      <div className="relative overflow-hidden w-full aspect-[2/3] rounded-xl mb-4 cursor-pointer shadow-inner" onClick={() => onOpenVideo(submission)}>
        <img src={thumbnailUrl} alt="Video Thumbnail" className="w-full h-full object-cover transition-transform duration-700 transform group-hover:scale-110 opacity-90 group-hover:opacity-100" onError={(e) => (e.target.src = isIg ? 'https://placehold.co/600x900/e1306c/ffffff?text=Instagram' : 'https://placehold.co/600x900/111827/ffffff?text=TikTok')} />
        
        {/* Play Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent flex flex-col justify-center items-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 backdrop-blur-[2px]">
            <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-sm border border-white/30 transform scale-50 group-hover:scale-100 transition-transform duration-300 ease-out shadow-[0_0_20px_rgba(255,255,255,0.3)]">
              <PlayCircle className="w-10 h-10 text-white ml-1" />
            </div>
            <span className="text-white font-bold mt-3 tracking-wide drop-shadow-md">شاهد التصميم</span>
        </div>
      </div>

      <div className="flex flex-col flex-grow justify-between text-white px-1">
        
        {/* Author Info */}
        <div className="flex items-center mb-3 group/author cursor-pointer bg-white/5 p-2 rounded-lg hover:bg-white/10 transition-colors border border-transparent hover:border-white/10" onClick={() => onDesignerClick(safeUsername)}>
           <img src={profilePic || generateAvatar(participantName)} alt={participantName} className="w-10 h-10 rounded-full border-2 border-white/10 object-cover group-hover/author:border-highlight-color transition-colors shadow-sm" style={{ '--tw-border-opacity': 1, borderColor: `var(--highlight-color-css)` }} />
           <div className="mr-3 overflow-hidden flex-grow">
             <p className="text-sm font-black truncate leading-tight group-hover/author:text-highlight-color transition-colors tracking-wide">{participantName}</p>
             <p className="text-[11px] text-white/50 flex items-center gap-1.5 mt-0.5 font-medium" dir="ltr">
               <span className="truncate max-w-[80px]">@{safeUsername}</span> • <img src={getFlagUrl(country)} className="w-3.5 h-2.5 rounded-[1px]" alt={country}/>
             </p>
           </div>
        </div>

        {/* Description */}
        <div className="mb-4 h-11 relative">
          <p className="text-xs text-white/70 line-clamp-2 leading-relaxed font-medium" title={description}>
            {description || "لم يتم كتابة وصف لهذا التصميم."}
          </p>
        </div>

        {/* Votes Count */}
        <div className="flex justify-between items-end mb-4 pt-3 border-t border-white/5">
            <span className="text-xs text-white/50 font-medium">إجمالي الدعم</span>
            <div className="text-left">
              <span className="text-xl font-black drop-shadow-md text-amber-400">{votes.toLocaleString()}</span>
              <span className="text-xs ml-1 text-white/60 font-bold">صوت</span>
            </div>
        </div>

        {/* Vote Button */}
        <button onClick={() => onVote(submission)} className="relative w-full py-3 px-4 rounded-xl font-black text-sm text-white transition-all duration-300 hover:scale-[1.03] active:scale-95 shadow-[0_4px_14px_0_rgba(245,158,11,0.39)] overflow-hidden group/btn border border-amber-500/30 bg-gradient-to-r from-amber-500 to-orange-600">
          <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover/btn:translate-x-full transition-transform duration-700 ease-in-out"></div>
          <span className="relative z-10 flex items-center justify-center gap-2">
            <Crown className="w-4 h-4 text-white/90 group-hover/btn:text-white group-hover/btn:animate-bounce" />
            صوت للتصميم
          </span>
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
      <div className="text-center py-32 text-white animate-fade-in flex flex-col items-center justify-center">
        <div className="w-24 h-24 bg-white/5 rounded-full flex items-center justify-center mb-6 border border-white/10">
          <User className="w-10 h-10 text-white/30" />
        </div>
        <p className="text-3xl font-bold mb-6 text-white/80">لا توجد أعمال معتمدة لهذا المصمم حالياً.</p>
        <button onClick={onBack} className="px-8 py-3 bg-white/10 backdrop-blur-md rounded-full hover:bg-white/20 font-bold transition-all border border-white/10 flex items-center gap-2">
          <ArrowRight className="w-5 h-5"/> العودة للرئيسية
        </button>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-8 animate-fade-in">
         <button onClick={onBack} className="flex items-center text-white/70 hover:text-white transition-all bg-black/40 hover:bg-black/60 px-5 py-2.5 rounded-full border border-white/10 w-fit backdrop-blur-md font-bold group">
           <ArrowRight className="w-5 h-5 ml-2 transform group-hover:-translate-x-1 transition-transform" /> العودة للرئيسية
         </button>

         <GlassCard isGlassmorphism={settings.useGlassmorphism} color="bg-gray-900" className="!p-0 relative overflow-hidden rounded-3xl border-t-4" style={{ borderTopColor: settings.mainColor }}>
            <div className="absolute top-0 left-0 w-full h-40 md:h-48 bg-cover bg-center opacity-30" style={{ backgroundImage: `url(${profileInfo.thumbnailUrl || 'https://placehold.co/1200x400/111827/ffffff'})`, filter: 'blur(10px)' }}></div>
            <div className="absolute top-0 left-0 w-full h-40 md:h-48 bg-gradient-to-b from-black/20 via-black/60 to-gray-900"></div>
            
            <div className="relative z-10 flex flex-col md:flex-row items-center md:items-end px-6 md:px-10 pt-16 md:pt-24 pb-8 gap-6 md:gap-8">
              
              <div className="relative group">
                <div className="absolute inset-0 bg-white/20 rounded-full blur-xl scale-110 group-hover:scale-125 transition-transform opacity-50" style={{ backgroundColor: settings.highlightColor }}></div>
                <img src={profileInfo.profilePic || generateAvatar(profileInfo.participantName)} alt={profileInfo.participantName} className="w-32 h-32 md:w-40 md:h-40 rounded-full border-4 shadow-2xl z-10 object-cover bg-gray-900 relative" style={{ borderColor: settings.highlightColor }} />
              </div>
              
              <div className="text-center md:text-right flex-grow pb-2">
                <h2 className="text-3xl md:text-5xl font-black text-white mb-2 drop-shadow-md tracking-tight">{profileInfo.participantName}</h2>
                <div className="flex flex-wrap justify-center md:justify-start gap-3 items-center mb-6">
                  <span className="text-base font-bold text-white/80 bg-black/40 px-3 py-1 rounded-lg border border-white/10 backdrop-blur-md font-mono" dir="ltr">@{profileInfo.username || designerId}</span>
                  <span className="text-sm font-bold text-white/80 bg-black/40 px-3 py-1.5 rounded-lg border border-white/10 backdrop-blur-md flex items-center gap-2">
                    <img src={getFlagUrl(profileInfo.country)} className="w-4 h-3 rounded-sm shadow-sm" alt={profileInfo.country} /> {profileInfo.country}
                  </span>
                </div>
                
                <div className="flex flex-wrap justify-center md:justify-start gap-4 md:gap-6">
                   <div className="bg-black/40 backdrop-blur-md px-6 py-4 rounded-2xl border border-white/10 text-center shadow-lg min-w-[140px] transition-transform hover:-translate-y-1">
                     <p className="text-xs text-white/50 mb-1 font-bold">إجمالي التصاميم</p>
                     <p className="text-3xl font-black text-white">{designerSubmissions.length}</p>
                   </div>
                   <div className="bg-black/40 backdrop-blur-md px-6 py-4 rounded-2xl border border-white/10 text-center shadow-lg min-w-[140px] transition-transform hover:-translate-y-1">
                     <p className="text-xs text-white/50 mb-1 font-bold">مجموع الأصوات</p>
                     <p className="text-3xl font-black text-amber-400">{totalDesignerVotes.toLocaleString()}</p>
                   </div>
                </div>
              </div>
            </div>
         </GlassCard>

         <div className="flex items-center gap-4 mt-12 mb-6">
           <div className="h-8 w-1.5 rounded-full" style={{ backgroundColor: settings.mainColor }}></div>
           <h3 className="text-2xl sm:text-3xl font-black text-white tracking-wide">تصاميم <span style={{color: settings.highlightColor}}>{profileInfo.participantName}</span></h3>
           <div className="flex-grow h-px bg-gradient-to-l from-white/10 to-transparent ml-4"></div>
         </div>

         <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 sm:gap-6">
            {designerSubmissions.map((sub) => (
              <ContestCard key={sub.id} submission={sub} settings={settings} onVote={(s) => setVoteConfirmData(s)} onOpenVideo={handleOpenVideo} onDesignerClick={()=>{}} />
            ))}
         </div>
      </div>

      <Modal isOpen={videoModalOpen} onClose={() => setVideoModalOpen(false)} title={`تصميم: ${selectedSubmission?.participantName}`} settings={settings} maxWidth="max-w-4xl">
        {selectedSubmission && (
          <div className="flex flex-col md:flex-row gap-6">
            <div className="relative w-full md:w-1/2 aspect-[9/16] bg-black rounded-2xl overflow-hidden shadow-[0_0_30px_rgba(0,0,0,0.5)] border border-white/10 flex-shrink-0 mx-auto">
              <iframe src={getVideoEmbedUrl(selectedSubmission.videoUrl)} className="absolute inset-0 w-full h-full" frameBorder="0" scrolling="no" allowFullScreen></iframe>
            </div>
            
            <div className="flex flex-col flex-grow bg-white/5 p-6 rounded-2xl border border-white/10 backdrop-blur-md">
               <div className="flex items-center mb-6 pb-6 border-b border-white/10 cursor-pointer group hover:bg-white/5 p-3 rounded-xl transition-all" onClick={()=>{setVideoModalOpen(false); onDesignerClick(selectedSubmission.username || selectedSubmission.participantName);}}>
                 <img src={selectedSubmission.profilePic || generateAvatar(selectedSubmission.participantName)} alt={selectedSubmission.participantName} className="w-14 h-14 rounded-full border-2 ml-4 object-cover shadow-lg group-hover:scale-110 transition-transform" style={{ borderColor: settings.highlightColor }} />
                 <div className="flex-grow">
                    <p className="font-black text-2xl text-white leading-tight group-hover:text-highlight-color transition-colors" dir="ltr">{selectedSubmission.participantName}</p>
                    <p className="text-sm text-white/60 mt-1 flex items-center gap-2 font-medium">
                      <span dir="ltr">@{selectedSubmission.username || selectedSubmission.participantName}</span> •
                      <img src={getFlagUrl(selectedSubmission.country)} className="w-4 h-3 rounded-[1px] shadow-sm" alt=""/> {selectedSubmission.country}
                    </p>
                 </div>
               </div>
               
               <div className="flex-grow flex flex-col gap-4">
                 <div className="flex items-center gap-3 bg-black/20 p-3 rounded-xl border border-white/5 w-fit">
                   {selectedSubmission.platform === 'instagram' ? <Instagram className="w-5 h-5 text-pink-500" /> : <TikTokIcon className="w-5 h-5 text-white" />}
                   <p className="font-bold text-lg" style={{ color: settings.highlightColor }}>{selectedSubmission.episode}</p>
                 </div>
                 
                 <div>
                   <p className="text-sm font-bold text-white/50 mb-2">الوصف:</p>
                   <p className="text-base text-white/90 whitespace-pre-wrap leading-relaxed font-medium bg-black/30 p-4 rounded-xl border border-white/5 shadow-inner">
                     {selectedSubmission.description || "لم يتم كتابة وصف."}
                   </p>
                 </div>
               </div>
               
               <div className="mt-8 pt-6 border-t border-white/10">
                 <div className="flex justify-between items-end mb-4">
                   <span className="text-sm font-bold text-white/60">عدد الأصوات الحالي</span>
                   <span className="text-3xl font-black drop-shadow-md text-amber-400">{selectedSubmission.votes.toLocaleString()}</span>
                 </div>
                 <button onClick={() => {setVideoModalOpen(false); setVoteConfirmData(selectedSubmission);}} disabled={cooldown > 0} className={`relative w-full py-4 px-6 rounded-xl font-black text-lg text-white transition-all duration-300 hover:scale-[1.02] active:scale-95 disabled:opacity-50 disabled:hover:scale-100 shadow-[0_10px_20px_-10px_rgba(245,158,11,0.3)] overflow-hidden group border border-amber-500/30 ${cooldown > 0 ? 'bg-gray-700' : 'bg-gradient-to-r from-amber-500 to-orange-600'}`}>
                   <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-in-out"></div>
                   <span className="relative z-10 flex items-center justify-center gap-2">
                     {cooldown > 0 ? (
                       <><Clock className="w-5 h-5 animate-pulse" /> انتظر {cooldown} ثانية للتصويت مجدداً</>
                     ) : (
                       <><Crown className="w-5 h-5" /> صوت لهذا التصميم الآن</>
                     )}
                   </span>
                 </button>
               </div>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
};

const DesignersLibrary = ({ settings, libraryScenes }) => {
  const [selectedEpisode, setSelectedEpisode] = useState(EPISODES[0]);
  const currentScenes = libraryScenes.filter(scene => scene.episode === selectedEpisode);

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex flex-col md:flex-row justify-between items-center bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 p-8 rounded-3xl border border-white/10 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl -mt-20 -mr-20 pointer-events-none" style={{ backgroundColor: settings.highlightColor }}></div>
        
        <div className="relative z-10 text-center md:text-right mb-6 md:mb-0">
          <h2 className="text-3xl sm:text-4xl font-black text-white mb-3 flex items-center justify-center md:justify-start">
            <FolderOpen className="w-10 h-10 ml-4 drop-shadow-lg" style={{ color: settings.highlightColor }} />
            مكتبة المصممين
          </h2>
          <p className="text-white/70 font-medium text-lg">حمل مشاهد عالية الدقة خالية من الحقوق لتصاميمك المونتاجية.</p>
        </div>
        
        <div className="relative z-10 w-full md:w-80">
          <label className="block text-white/80 text-sm font-bold mb-2">تصفح مشاهد حلقة معينة:</label>
          <div className="relative group">
            <select 
              value={selectedEpisode} 
              onChange={(e) => setSelectedEpisode(e.target.value)} 
              className="appearance-none w-full p-4 rounded-xl bg-black/50 border border-white/20 text-white font-black text-lg focus:ring-2 focus:outline-none pr-12 transition-all cursor-pointer shadow-inner backdrop-blur-md group-hover:border-white/40" 
              style={{ '--tw-ring-color': settings.highlightColor, backgroundImage: 'none' }}
            >
              {EPISODES.map((ep) => <option key={ep} value={ep} className="bg-gray-900">{ep}</option>)}
            </select>
            <ChevronDown className="absolute left-5 top-1/2 transform -translate-y-1/2 w-6 h-6 text-white/50 group-hover:text-white transition-colors pointer-events-none" />
            <Film className="absolute right-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-white/30 pointer-events-none" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
        {currentScenes.length > 0 ? (
          currentScenes.map((scene) => (
            <GlassCard key={scene.id} isGlassmorphism={settings.useGlassmorphism} color="bg-gray-800" className="flex flex-col group hover:-translate-y-1 transition-transform duration-300">
              <div className="w-full aspect-video bg-black rounded-xl mb-5 flex items-center justify-center relative overflow-hidden shadow-inner border border-white/5">
                 <Film className="w-16 h-16 text-white/20 group-hover:scale-125 group-hover:text-white/40 transition-all duration-500" />
                 <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent"></div>
                 <p className="absolute bottom-4 right-4 text-white font-bold text-lg drop-shadow-md">{scene.title}</p>
                 <div className="absolute top-3 left-3 bg-black/60 backdrop-blur-md px-2 py-1 rounded-md border border-white/10">
                   <span className="text-xs font-bold" style={{ color: settings.highlightColor }}>4K Quality</span>
                 </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4 mt-auto">
                <a href={scene.verticalUrl} target="_blank" rel="noreferrer" className="flex flex-col items-center justify-center p-4 rounded-xl bg-black/40 hover:bg-white/10 transition-colors text-white border border-white/10 shadow-sm relative overflow-hidden group/btn">
                  <div className="absolute inset-0 bg-blue-500/10 opacity-0 group-hover/btn:opacity-100 transition-opacity"></div>
                  <Smartphone className="w-7 h-7 mb-2 text-blue-400 relative z-10" />
                  <span className="text-sm font-bold text-center relative z-10">عامودي (Reels)</span>
                  <span className="text-[11px] text-white/50 flex items-center mt-1.5 font-medium relative z-10 bg-black/30 px-2 py-0.5 rounded"><Download className="w-3 h-3 ml-1"/> تحميل</span>
                </a>
                <a href={scene.horizontalUrl} target="_blank" rel="noreferrer" className="flex flex-col items-center justify-center p-4 rounded-xl bg-black/40 hover:bg-white/10 transition-colors text-white border border-white/10 shadow-sm relative overflow-hidden group/btn">
                  <div className="absolute inset-0 bg-green-500/10 opacity-0 group-hover/btn:opacity-100 transition-opacity"></div>
                  <MonitorPlay className="w-7 h-7 mb-2 text-green-400 relative z-10" />
                  <span className="text-sm font-bold text-center relative z-10">أفقي (YouTube)</span>
                  <span className="text-[11px] text-white/50 flex items-center mt-1.5 font-medium relative z-10 bg-black/30 px-2 py-0.5 rounded"><Download className="w-3 h-3 ml-1"/> تحميل</span>
                </a>
              </div>
            </GlassCard>
          ))
        ) : (
          <div className="col-span-full text-center py-20 bg-white/5 rounded-3xl border border-white/10 border-dashed">
            <Film className="w-16 h-16 text-white/20 mx-auto mb-4" />
            <p className="text-xl font-bold text-white/50">لا توجد مشاهد متوفرة لهذه الحلقة حالياً.</p>
            <p className="text-sm text-white/30 mt-2">يرجى العودة لاحقاً أو اختيار حلقة أخرى.</p>
          </div>
        )}
      </div>
    </div>
  );
};

const Home = ({ settings, allSubmissions, totalApproved, onVote, cooldown, setVoteConfirmData, onDesignerClick, stories }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterEpisode, setFilterEpisode] = useState('الكل');
  const [filterPlatform, setFilterPlatform] = useState('الكل');
  const [videoModalOpen, setVideoModalOpen] = useState(false);
  const [selectedSubmission, setSelectedSubmission] = useState(null);
  
  // نظام الصفحات
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;

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

  // العودة للصفحة الأولى عند تغيير الفلاتر
  useEffect(() => {
     setCurrentPage(1);
  }, [searchTerm, filterEpisode, filterPlatform]);

  const handleOpenVideo = (submission) => { setSelectedSubmission(submission); setVideoModalOpen(true); };
  const handleVoteFromCard = (submission) => {
    if (cooldown > 0) { handleOpenVideo(submission); return; }
    setVoteConfirmData(submission);
  };

  const totalPages = Math.ceil(filteredGridSubmissions.length / itemsPerPage);
  const currentSubmissions = filteredGridSubmissions.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <>
      <div className="space-y-10 animate-fade-in">
        
        {/* شريط الستوريات - الأخبار */}
        <StoriesBar stories={stories} settings={settings} />

        {/* شريط البحث المطور المطابق للصورة */}
        <div className="sticky top-20 z-30">
          <GlassCard isGlassmorphism={settings.useGlassmorphism} color="bg-gray-900" className="!p-4 shadow-[0_10px_30px_rgba(0,0,0,0.8)] backdrop-blur-2xl border-white/10 rounded-2xl">
            <div className="flex flex-col md:flex-row gap-4">
              
              {/* القسم الأيمن: شريط البحث (يأخذ المساحة الأكبر) */}
              <div className="flex-grow relative group flex items-center">
                <input 
                   type="text" 
                   placeholder="البحث عن مصمم، بلد، أو وصف..." 
                   value={searchTerm} 
                   onChange={(e) => setSearchTerm(e.target.value)} 
                   className="w-full h-full min-h-[50px] md:min-h-full p-4 pr-12 pl-12 rounded-xl bg-[#111] border border-white/10 text-white font-medium focus:ring-2 focus:outline-none transition-all shadow-inner hover:border-white/30 placeholder-white/40" 
                   style={{ '--tw-ring-color': settings.highlightColor }} 
                />
                <Search className="absolute right-4 w-5 h-5 text-white/40 group-hover:text-white transition-colors" />
                
                {/* زر المسح عند وجود نص */}
                {searchTerm && (
                  <button 
                    onClick={() => setSearchTerm('')} 
                    className="absolute left-4 p-1.5 bg-white/10 hover:bg-white/20 rounded-full text-white/70 hover:text-white transition-all scale-in-center"
                    title="مسح البحث"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
              
              {/* القسم الأيسر: الفلاتر المكدسة وعداد النتائج */}
              <div className="flex flex-col gap-2 w-full md:w-64 flex-shrink-0">
                {/* فلتر المنصات */}
                <div className="relative group w-full">
                  <select value={filterPlatform} onChange={(e) => setFilterPlatform(e.target.value)} className="appearance-none w-full p-2.5 rounded-lg bg-[#111] border border-white/10 text-white font-bold text-sm focus:ring-2 focus:outline-none pr-10 transition-all shadow-inner cursor-pointer hover:border-white/30" style={{ '--tw-ring-color': settings.highlightColor, backgroundImage: 'none' }}>
                    <option value="الكل" className="bg-gray-900">🌐 جميع المنصات</option>
                    <option value="tiktok" className="bg-gray-900">🎵 تيك توك</option>
                    <option value="instagram" className="bg-gray-900">📷 انستغرام</option>
                  </select>
                  <ChevronDown className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-white/40 group-hover:text-white transition-colors pointer-events-none" />
                </div>

                {/* فلتر الحلقات */}
                <div className="relative group w-full">
                  <select value={filterEpisode} onChange={(e) => setFilterEpisode(e.target.value)} className="appearance-none w-full p-2.5 rounded-lg bg-[#111] border border-white/10 text-white font-bold text-sm focus:ring-2 focus:outline-none pr-10 transition-all shadow-inner cursor-pointer hover:border-white/30" style={{ '--tw-ring-color': settings.highlightColor, backgroundImage: 'none' }}>
                    <option value="الكل" className="bg-gray-900">📺 جميع الحلقات</option>
                    {EPISODES.map((ep) => <option key={ep} value={ep} className="bg-gray-900">{ep}</option>)}
                  </select>
                  <ChevronDown className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-white/40 group-hover:text-white transition-colors pointer-events-none" />
                </div>

                {/* العداد */}
                <div className="w-full flex items-center justify-between text-white mt-1 px-1">
                  <span className="text-xs font-bold text-white/50">نتائج البحث:</span>
                  <span className="text-lg font-black drop-shadow-md" style={{ color: `var(--highlight-color-css)` }}>{filteredGridSubmissions.length}</span>
                </div>
              </div>

            </div>
          </GlassCard>
        </div>

        <LiveResultsView approvedSubmissions={leaderboardSubmissions} settings={settings} currentFilter={filterEpisode} currentPlatformFilter={filterPlatform} onDesignerClick={onDesignerClick} />

        <div className="flex items-center gap-4 mt-8 mb-6">
           <div className="h-8 w-1.5 rounded-full" style={{ backgroundColor: settings.mainColor }}></div>
           <h3 className="text-2xl sm:text-3xl font-black text-white tracking-wide">
             {filterEpisode === 'الكل' ? 'أحدث التصاميم المشاركة' : `تصاميم ${filterEpisode}`}
           </h3>
           <div className="flex-grow h-px bg-gradient-to-l from-white/10 to-transparent ml-4"></div>
        </div>

        {/* واجهة عدم وجود نتائج (Empty State) مطورة */}
        {currentSubmissions.length === 0 ? (
          <div className="text-center py-20 sm:py-32 bg-gradient-to-b from-white/5 to-transparent rounded-3xl border border-white/10 border-dashed backdrop-blur-sm relative overflow-hidden group">
             <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none"></div>
             <div className="relative z-10">
               <div className="w-24 h-24 mx-auto bg-black/40 rounded-full flex items-center justify-center mb-6 shadow-inner border border-white/5 relative">
                  <Search className="w-12 h-12 text-white/30 group-hover:scale-110 transition-transform duration-500" style={{ color: settings.highlightColor }} />
                  {searchTerm && <div className="absolute -top-1 -right-1 flex h-6 w-6"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span><span className="relative inline-flex rounded-full h-6 w-6 bg-red-500 items-center justify-center text-white text-[10px] font-bold">X</span></div>}
               </div>
               <p className="text-white/90 text-3xl font-black tracking-wide mb-4 drop-shadow-md">لا توجد نتائج مطابقة</p>
               <p className="text-white/50 text-base font-medium max-w-md mx-auto leading-relaxed">
                 لم نتمكن من العثور على أي مشاركات تتطابق مع بحثك الحالي. جرب استخدام كلمات مفتاحية مختلفة أو قم بإلغاء الفلاتر.
               </p>
               
               {/* زر مسح الفلاتر في حال وجود أي فلتر نشط */}
               {(searchTerm !== '' || filterEpisode !== 'الكل' || filterPlatform !== 'الكل') && (
                 <button 
                    onClick={() => { setSearchTerm(''); setFilterEpisode('الكل'); setFilterPlatform('الكل'); }} 
                    className="mt-8 px-6 py-3.5 bg-white/10 hover:bg-white/20 rounded-xl text-white font-bold transition-all shadow-sm flex items-center justify-center gap-2 mx-auto border border-white/5 hover:scale-105"
                 >
                   <RotateCcw className="w-5 h-5"/> مسح جميع الفلاتر للبحث
                 </button>
               )}
             </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 sm:gap-6">
            {currentSubmissions.map((sub) => (
              <ContestCard key={sub.id} submission={sub} settings={settings} onVote={handleVoteFromCard} onOpenVideo={handleOpenVideo} onDesignerClick={onDesignerClick} />
            ))}
          </div>
        )}

        {/* أزرار التنقل بين الصفحات */}
        {totalPages > 1 && (
          <div className="flex justify-center items-center gap-4 mt-8 pt-4">
            <button 
               onClick={() => setCurrentPage(p => Math.max(1, p - 1))} 
               disabled={currentPage === 1} 
               className="p-3 bg-white/5 border border-white/10 rounded-xl text-white font-bold hover:bg-white/10 disabled:opacity-30 disabled:hover:bg-white/5 transition-all shadow-sm"
            >
              السابق
            </button>
            <span className="text-white/80 font-bold bg-black/40 px-4 py-2 rounded-lg border border-white/5">
               صفحة {currentPage} من {totalPages}
            </span>
            <button 
               onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} 
               disabled={currentPage === totalPages} 
               className="p-3 bg-white/5 border border-white/10 rounded-xl text-white font-bold hover:bg-white/10 disabled:opacity-30 disabled:hover:bg-white/5 transition-all shadow-sm"
            >
              التالي
            </button>
          </div>
        )}
      </div>

      <Modal isOpen={videoModalOpen} onClose={() => setVideoModalOpen(false)} title={`تصميم: ${selectedSubmission?.participantName}`} settings={settings} maxWidth="max-w-4xl">
        {selectedSubmission && (
          <div className="flex flex-col md:flex-row gap-6">
            {/* Video Area */}
            <div className="relative w-full md:w-1/2 aspect-[9/16] bg-black rounded-2xl overflow-hidden shadow-[0_0_30px_rgba(0,0,0,0.5)] border border-white/10 flex-shrink-0 mx-auto">
              <iframe src={getVideoEmbedUrl(selectedSubmission.videoUrl)} className="absolute inset-0 w-full h-full" frameBorder="0" scrolling="no" allowFullScreen></iframe>
            </div>
            
            {/* Info Area */}
            <div className="flex flex-col flex-grow bg-white/5 p-6 rounded-2xl border border-white/10 backdrop-blur-md">
               
               {/* Author Header */}
               <div className="flex items-center mb-6 pb-6 border-b border-white/10 cursor-pointer group hover:bg-white/5 p-3 rounded-xl transition-all" onClick={()=>{setVideoModalOpen(false); onDesignerClick(selectedSubmission.username || selectedSubmission.participantName);}}>
                 <img src={selectedSubmission.profilePic || generateAvatar(selectedSubmission.participantName)} alt={selectedSubmission.participantName} className="w-14 h-14 rounded-full border-2 ml-4 object-cover shadow-lg group-hover:scale-110 transition-transform" style={{ borderColor: settings.highlightColor }} />
                 <div className="flex-grow">
                    <p className="font-black text-2xl text-white leading-tight group-hover:text-highlight-color transition-colors" dir="ltr">{selectedSubmission.participantName}</p>
                    <p className="text-sm text-white/60 mt-1 flex items-center gap-2 font-medium">
                      <span dir="ltr">@{selectedSubmission.username || selectedSubmission.participantName}</span> •
                      <img src={getFlagUrl(selectedSubmission.country)} className="w-4 h-3 rounded-[1px] shadow-sm" alt=""/> {selectedSubmission.country}
                    </p>
                 </div>
               </div>
               
               {/* Details */}
               <div className="flex-grow flex flex-col gap-4">
                 <div className="flex items-center gap-3 bg-black/20 p-3 rounded-xl border border-white/5 w-fit">
                   {selectedSubmission.platform === 'instagram' ? <Instagram className="w-5 h-5 text-pink-500" /> : <TikTokIcon className="w-5 h-5 text-white" />}
                   <p className="font-bold text-lg" style={{ color: settings.highlightColor }}>{selectedSubmission.episode}</p>
                 </div>
                 
                 <div>
                   <p className="text-sm font-bold text-white/50 mb-2">الوصف:</p>
                   <p className="text-base text-white/90 whitespace-pre-wrap leading-relaxed font-medium bg-black/30 p-4 rounded-xl border border-white/5 shadow-inner">
                     {selectedSubmission.description || "لم يتم كتابة وصف."}
                   </p>
                 </div>
               </div>
               
               {/* Action Area */}
               <div className="mt-8 pt-6 border-t border-white/10">
                 <div className="flex justify-between items-end mb-4">
                   <span className="text-sm font-bold text-white/60">عدد الأصوات الحالي</span>
                   <span className="text-3xl font-black drop-shadow-md text-amber-400">{selectedSubmission.votes.toLocaleString()}</span>
                 </div>
                 <button onClick={() => {setVideoModalOpen(false); setVoteConfirmData(selectedSubmission);}} disabled={cooldown > 0} className={`relative w-full py-4 px-6 rounded-xl font-black text-lg text-white transition-all duration-300 hover:scale-[1.02] active:scale-95 disabled:opacity-50 disabled:hover:scale-100 shadow-[0_10px_20px_-10px_rgba(245,158,11,0.3)] overflow-hidden group border border-amber-500/30 ${cooldown > 0 ? 'bg-gray-700' : 'bg-gradient-to-r from-amber-500 to-orange-600'}`}>
                   <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-in-out"></div>
                   <span className="relative z-10 flex items-center justify-center gap-2">
                     {cooldown > 0 ? (
                       <><Clock className="w-5 h-5 animate-pulse" /> انتظر {cooldown} ثانية للتصويت مجدداً</>
                     ) : (
                       <><Crown className="w-5 h-5" /> صوت لهذا التصميم الآن</>
                     )}
                   </span>
                 </button>
               </div>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
};

// =========================================================================
// 5. ADMIN PANELS
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

  const StatBox = ({ title, value, icon: Icon, colorClass, gradient }) => (
    <div className={`bg-gradient-to-br ${gradient} p-6 rounded-2xl border border-white/10 shadow-lg relative overflow-hidden group hover:-translate-y-1 transition-transform`}>
       <div className="absolute right-0 top-0 w-32 h-32 bg-white/5 rounded-full -mr-10 -mt-10 blur-2xl group-hover:bg-white/10 transition-colors pointer-events-none"></div>
       <div className="flex items-start justify-between relative z-10">
         <div>
           <p className="text-white/80 text-sm font-bold mb-2 tracking-wide">{title}</p>
           <p className={`text-4xl font-black drop-shadow-md ${colorClass}`}>{value.toLocaleString()}</p>
         </div>
         <div className={`p-4 rounded-xl bg-black/20 backdrop-blur-md shadow-inner border border-white/10 ${colorClass}`}>
           <Icon className="w-7 h-7" />
         </div>
       </div>
    </div>
  );

  return (
    <div className="animate-fade-in">
      <GlassCard isGlassmorphism={isGlassmorphism} color="bg-gray-900" className="!p-8 mb-8 border-t-4" style={{ borderTopColor: settings.mainColor }}>
        <h3 className="text-3xl font-black text-white mb-8 flex items-center border-b border-white/10 pb-6">
          <BarChart2 className="w-8 h-8 ml-3" style={{ color: settings.highlightColor }} /> ملخص إحصائيات المسابقة
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
           <StatBox title="إجمالي الأصوات (الكل)" value={totalVotes} icon={TrendingUp} colorClass="text-yellow-400" gradient="from-gray-800 to-gray-900" />
           <StatBox title="المشاركات المقبولة (النشطة)" value={approved.length} icon={CheckCircle} colorClass="text-green-400" gradient="from-gray-800 to-gray-900" />
           <StatBox title="المشاركات قيد المراجعة" value={pending.length} icon={Clock} colorClass="text-blue-400" gradient="from-gray-800 to-gray-900" />
           <StatBox title="إجمالي عدد المصممين" value={Object.keys(designersMap).length} icon={Users} colorClass="text-purple-400" gradient="from-gray-800 to-gray-900" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
           <div className="bg-black/40 p-6 rounded-2xl border border-white/10 shadow-inner">
              <h4 className="text-xl font-black text-white mb-6 flex items-center">
                <Crown className="w-6 h-6 ml-2 text-yellow-400" /> أفضل 5 مصممين (حسب الأصوات)
              </h4>
              <div className="space-y-4">
                {topDesigners.length === 0 ? <p className="text-white/50 text-center py-10 font-bold">لا توجد بيانات كافية.</p> : 
                 topDesigners.map((d, index) => (
                  <div key={d.username} className="flex items-center justify-between p-3 hover:bg-white/5 rounded-xl transition-colors border border-transparent hover:border-white/10">
                    <div className="flex items-center gap-4">
                      <span className={`w-8 h-8 flex items-center justify-center font-black rounded-lg text-sm ${index === 0 ? 'bg-yellow-400 text-black shadow-[0_0_10px_rgba(250,204,21,0.5)]' : index === 1 ? 'bg-gray-300 text-black' : index === 2 ? 'bg-amber-700 text-white' : 'bg-white/10 text-white/50'}`}>#{index + 1}</span>
                      <img src={d.profilePic || generateAvatar(d.name)} className="w-12 h-12 rounded-full border-2 border-white/10 object-cover shadow-md" alt=""/>
                      <div>
                        <p className="text-white font-black text-base tracking-wide" dir="ltr">{d.name}</p>
                        <p className="text-white/50 text-xs font-medium mt-0.5" dir="ltr">@{d.username} • {d.count} مشاركات</p>
                      </div>
                    </div>
                    <span className="text-2xl font-black drop-shadow-md" style={{ color: settings.highlightColor }}>{d.votes.toLocaleString()}</span>
                  </div>
                ))}
              </div>
           </div>
        </div>
      </GlassCard>
    </div>
  );
};

const AdminSubmissionsPanel = ({ submissions, settings, isGlassmorphism, onUpdateSubmissionStatus, onDeleteSubmission, onResetVotes }) => {
  const [activeTab, setActiveTab] = useState('Pending');
  const [submissionToEdit, setSubmissionToEdit] = useState(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState(null);
  const [extractLoading, setExtractLoading] = useState(false);
  const [profileExtractLoading, setProfileExtractLoading] = useState(false);

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

  // دالة وسيطة (Proxy) قوية لتخطي حظر المنصات (CORS) وجلب البيانات الخام
  const fetchViaProxy = async (targetUrl) => {
    try {
      const response = await fetch(`https://api.allorigins.win/get?url=${encodeURIComponent(targetUrl)}`);
      if (!response.ok) return null;
      const data = await response.json();
      return data.contents;
    } catch (e) {
      console.error("Proxy fetch error:", e);
      return null;
    }
  };

  const handleAutoExtract = async () => {
    if (!submissionToEdit || !submissionToEdit.videoUrl) return;
    setExtractLoading(true);

    try {
      const videoUrl = submissionToEdit.videoUrl;
      const isTikTok = videoUrl.includes('tiktok.com');
      const isInsta = videoUrl.includes('instagram.com');

      let extractedUsername = submissionToEdit.username || '';
      let newParticipantName = submissionToEdit.participantName !== 'في انتظار المراجعة' ? submissionToEdit.participantName : '';
      let newDesc = submissionToEdit.description !== 'سيتم إضافة التفاصيل والصور من قبل الإدارة قريباً.' ? submissionToEdit.description : '';
      let newThumb = submissionToEdit.thumbnailUrl;

      // 1. استخراج اليوزر المبدئي من الرابط باستخدام Regex
      if (isTikTok) {
         const match = videoUrl.match(/@([a-zA-Z0-9_.-]+)/);
         if (match) extractedUsername = match[1];
      } else if (isInsta) {
         const match = videoUrl.match(/instagram\.com\/([a-zA-Z0-9_.-]+)\//);
         if (match && !['p', 'reel', 'tv', 'explore', 'stories'].includes(match[1])) {
             extractedUsername = match[1];
         }
      }

      // 2. جلب البيانات باستخدام وسيط لتخطي حظر المنصات
      if (isTikTok) {
          const oembedUrl = `https://www.tiktok.com/oembed?url=${encodeURIComponent(videoUrl)}`;
          const responseData = await fetchViaProxy(oembedUrl);
          if (responseData) {
              try {
                  const jsonData = JSON.parse(responseData);
                  if (jsonData.title) newDesc = jsonData.title;
                  if (jsonData.author_name) newParticipantName = jsonData.author_name;
                  if (jsonData.thumbnail_url) newThumb = jsonData.thumbnail_url;
                  if (jsonData.author_unique_id && !extractedUsername) extractedUsername = jsonData.author_unique_id;
              } catch(e) { console.error("JSON parse error for TikTok", e); }
          }
      } else if (isInsta) {
          const htmlData = await fetchViaProxy(videoUrl);
          if (htmlData) {
              const titleMatch = htmlData.match(/<meta property="og:title" content="([^"]+)"/i) || htmlData.match(/<meta name="twitter:title" content="([^"]+)"/i);
              const descMatch = htmlData.match(/<meta property="og:description" content="([^"]+)"/i);
              const imgMatch = htmlData.match(/<meta property="og:image" content="([^"]+)"/i);

              if (titleMatch && !newParticipantName) {
                  newParticipantName = titleMatch[1].split(' on Instagram')[0].split(' (@')[0];
              }
              if (descMatch && !newDesc) {
                  let rawDesc = descMatch[1];
                  if (rawDesc.includes(' - ')) rawDesc = rawDesc.split(' - ')[1];
                  newDesc = rawDesc.replace(/&quot;/g, '"');
              }
              if (imgMatch) newThumb = imgMatch[1].replace(/&amp;/g, '&');
          }
      }

      // 3. تنظيف البيانات ومعالجة الحقول الفارغة كحل بديل
      if (!extractedUsername) extractedUsername = newParticipantName.replace(/\s+/g, '').toLowerCase() || 'user_' + Math.floor(Math.random() * 10000);
      if (!newParticipantName) newParticipantName = extractedUsername;
      if (!newDesc) newDesc = 'تصميم رمضاني مميز للمسلسل.';
      if (newDesc.includes('•')) newDesc = newDesc.replace(/•/g, '').trim();

      setSubmissionToEdit(prev => ({
          ...prev,
          username: extractedUsername,
          participantName: newParticipantName,
          description: newDesc,
          thumbnailUrl: newThumb
      }));

    } catch (err) {
       console.error("Extraction error:", err);
       alert('حدث خطأ أثناء الاستخراج. تأكد من صحة الرابط وأن المنشور عام.');
    } finally {
       setExtractLoading(false);
    }
  };

  const handleExtractProfilePic = async () => {
    if (!submissionToEdit.username) {
      alert('الرجاء التأكد من وجود اليوزر (Username) أولاً لجلب الصورة الشخصية.');
      return;
    }
    setProfileExtractLoading(true);
    try {
      const username = submissionToEdit.username;
      const isTikTok = submissionToEdit.platform === 'tiktok' || (submissionToEdit.videoUrl && submissionToEdit.videoUrl.includes('tiktok'));
      
      const profileUrl = isTikTok 
          ? `https://www.tiktok.com/@${username}`
          : `https://www.instagram.com/${username}/`;
          
      const htmlData = await fetchViaProxy(profileUrl);
      let picUrl = '';

      if (htmlData) {
          const imgMatch = htmlData.match(/<meta property="og:image" content="([^"]+)"/i);
          if (imgMatch && imgMatch[1]) {
              picUrl = imgMatch[1].replace(/&amp;/g, '&');
          }
      }

      if (picUrl && !picUrl.includes('150x150')) {
          setSubmissionToEdit(prev => ({...prev, profilePic: picUrl}));
      } else {
          const avatarUrl = generateAvatar(submissionToEdit.participantName || username);
          setSubmissionToEdit(prev => ({...prev, profilePic: avatarUrl}));
          alert('تم تعيين صورة افتراضية. لم نتمكن من جلب الصورة الشخصية لأن الحساب قد يكون خاصاً أو محمياً.');
      }
    } catch(e) {
      console.error("Profile pic fetch error:", e);
      alert('فشل الاتصال لجلب الصورة الشخصية.');
    } finally {
      setProfileExtractLoading(false);
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
      <div className="animate-fade-in">
        <GlassCard isGlassmorphism={isGlassmorphism} color="bg-gray-900" className="!p-8 mb-8 border-t-4" style={{ borderTopColor: settings.mainColor }}>
          <div className="flex bg-black/40 p-2 rounded-2xl border border-white/10 mb-8 overflow-x-auto shadow-inner">
            {['Pending', 'Approved', 'Rejected'].map((status) => (
              <button key={status} onClick={() => setActiveTab(status)} className={`flex-1 py-3 px-6 text-sm md:text-base font-bold transition-all whitespace-nowrap rounded-xl ${activeTab === status ? 'bg-white/10 shadow-md text-white' : 'text-white/50 hover:bg-white/5 hover:text-white'}`} style={{ color: activeTab === status ? settings.highlightColor : undefined }}>
                {status === 'Pending' ? '⏳ المعلقة' : status === 'Approved' ? '✅ المقبولة' : '❌ المرفوضة'} 
                <span className="ml-2 bg-black/50 px-2 py-0.5 rounded-md text-xs">{submissions.filter((s) => s.status === status).length}</span>
              </button>
            ))}
          </div>
          
          <div className="overflow-x-auto w-full pb-4 custom-scrollbar">
            <table className="w-full text-right text-white/90 min-w-[900px] border-collapse">
              <thead className="bg-black/60 text-white/70 font-bold text-sm border-b-2 border-white/10">
                <tr>
                  <th className="p-5 rounded-tr-xl">المصمم</th>
                  <th className="p-5">التصميم / الوصف</th>
                  <th className="p-5 text-center">الأصوات</th>
                  <th className="p-5 text-center">الرابط</th>
                  <th className="p-5 text-left rounded-tl-xl">الإجراءات</th>
                </tr>
              </thead>
              <tbody>
                {filteredSubmissions.length === 0 ? (
                   <tr><td colSpan="5" className="p-12 text-center text-white/50 font-bold text-lg bg-white/5 rounded-b-xl border border-t-0 border-white/5">لا توجد مشاركات في هذه القائمة.</td></tr>
                ) : (
                  filteredSubmissions.map(sub => (
                    <tr key={sub.id} className="border-b border-white/5 hover:bg-white/5 transition-colors group">
                       <td className="p-4">
                          <div className="flex items-center gap-4">
                            <img src={sub.profilePic || generateAvatar(sub.participantName)} className="w-14 h-14 rounded-full object-cover border-2 border-white/10 shadow-md" alt="Profile" />
                            <div>
                              <p className="font-black text-white text-base tracking-wide" dir="ltr">{sub.participantName}</p>
                              <p className="text-xs text-white/50 flex items-center gap-1.5 mt-1 font-medium" dir="ltr">@{sub.username} • <img src={getFlagUrl(sub.country)} className="w-3.5 h-2.5 rounded-[1px]" alt="" /></p>
                            </div>
                          </div>
                       </td>
                       <td className="p-4 max-w-sm">
                          <div className="flex items-center gap-3 mb-2">
                            <span className="text-black font-black text-xs px-2.5 py-1 rounded-md shadow-sm" style={{backgroundColor: settings.highlightColor}}>{sub.episode}</span>
                            {sub.platform === 'instagram' || sub.videoUrl.includes('instagram') ? <Instagram className="w-5 h-5 text-pink-500" /> : <TikTokIcon className="w-5 h-5 text-white" />}
                          </div>
                          <p className="text-xs text-white/70 line-clamp-2 leading-relaxed font-medium bg-black/20 p-2 rounded-lg border border-white/5" title={sub.description}>{sub.description}</p>
                       </td>
                       <td className="p-4 text-center font-black text-2xl drop-shadow-md text-amber-400">
                          {sub.votes.toLocaleString()}
                       </td>
                       <td className="p-4 text-center">
                          <a href={sub.videoUrl} target="_blank" rel="noreferrer" className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-blue-500/10 text-blue-400 hover:bg-blue-500 hover:text-white transition-all border border-blue-500/30 hover:scale-110 shadow-sm" title="فتح الرابط الأصلي">
                            <PlayCircle className="w-5 h-5"/>
                          </a>
                       </td>
                       <td className="p-4">
                          <div className="flex justify-end gap-2 flex-wrap">
                            {activeTab !== 'Approved' && (
                               <button onClick={() => onUpdateSubmissionStatus(sub.id, 'Approved')} className="p-2.5 rounded-xl bg-green-500/20 text-green-400 hover:bg-green-500 hover:text-white transition-all border border-green-500/30 shadow-sm hover:scale-105" title="موافقة سريعة">
                                 <CheckCircle className="w-5 h-5" />
                               </button>
                            )}
                            {activeTab !== 'Rejected' && <button onClick={() => onUpdateSubmissionStatus(sub.id, 'Rejected')} className="p-2.5 rounded-xl bg-gray-500/20 text-gray-400 hover:bg-gray-500 hover:text-white transition-all border border-gray-500/30 shadow-sm hover:scale-105" title="رفض وإخفاء"><X className="w-5 h-5" /></button>}
                            <button onClick={() => { setSubmissionToEdit(sub); setIsEditModalOpen(true); }} className="p-2.5 rounded-xl bg-blue-500/20 text-blue-400 hover:bg-blue-500 hover:text-white transition-all border border-blue-500/30 shadow-sm hover:scale-105" title="مراجعة وتعديل"><SettingsIcon className="w-5 h-5" /></button>
                            
                            <button onClick={() => setConfirmAction({type: 'reset', id: sub.id})} className="p-2.5 rounded-xl bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500 hover:text-white transition-all border border-yellow-500/30 shadow-sm hover:scale-105" title="تصفير الأصوات"><RotateCcw className="w-5 h-5" /></button>
                            <button onClick={() => setConfirmAction({type: 'delete', id: sub.id})} className="p-2.5 rounded-xl bg-red-500/20 text-red-400 hover:bg-red-500 hover:text-white transition-all border border-red-500/30 shadow-sm hover:scale-105" title="حذف نهائي"><Trash2 className="w-5 h-5" /></button>
                          </div>
                       </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </GlassCard>
      </div>

      <Modal isOpen={!!confirmAction} onClose={() => setConfirmAction(null)} title={confirmAction?.type === 'delete' ? 'تأكيد الحذف النهائي' : 'تأكيد تصفير الأصوات'} settings={settings}>
         <div className="text-center p-4">
            <div className={`w-20 h-20 mx-auto rounded-full flex items-center justify-center mb-6 border-4 shadow-xl ${confirmAction?.type === 'delete' ? 'bg-red-500/20 border-red-500 text-red-500' : 'bg-yellow-500/20 border-yellow-500 text-yellow-500'}`}>
               {confirmAction?.type === 'delete' ? <Trash2 className="w-10 h-10"/> : <RotateCcw className="w-10 h-10"/>}
            </div>
            <p className="text-white text-xl mb-8 font-bold leading-relaxed">
              {confirmAction?.type === 'delete' ? 'هل أنت متأكد من حذف هذه المشاركة بشكل نهائي؟ لا يمكن التراجع عن هذا الإجراء.' : 'هل أنت متأكد من تصفير عدد أصوات هذه المشاركة لتصبح 0؟'}
            </p>
            <div className="flex justify-center gap-4">
              <button onClick={() => setConfirmAction(null)} className="px-8 py-3 rounded-xl bg-black/40 hover:bg-white/10 text-white font-bold transition-colors border border-white/10 shadow-sm">إلغاء الأمر</button>
              <button onClick={confirmActionHandler} className={`px-8 py-3 rounded-xl font-black transition-all shadow-lg text-white hover:scale-105 ${confirmAction?.type === 'delete' ? 'bg-red-600 hover:bg-red-500 shadow-[0_0_15px_rgba(220,38,38,0.5)]' : 'bg-yellow-600 hover:bg-yellow-500 shadow-[0_0_15px_rgba(202,138,4,0.5)]'}`}>نعم، أنا متأكد</button>
            </div>
         </div>
      </Modal>
      
      <Modal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} title="إدارة تفاصيل التصميم" maxWidth="max-w-5xl" isGlassmorphism={true}>
        {submissionToEdit && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
             <div className="lg:col-span-4 flex flex-col gap-6">
                <div className="bg-black/20 p-4 rounded-2xl border border-white/5 backdrop-blur-sm shadow-inner">
                  <button onClick={handleAutoExtract} disabled={extractLoading} className="relative w-full py-4 bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 rounded-xl text-white font-black flex items-center justify-center gap-2 transition-all duration-300 disabled:opacity-50 shadow-[0_5px_20px_rgba(245,158,11,0.4)] hover:shadow-[0_8px_25px_rgba(245,158,11,0.6)] transform active:scale-95 overflow-hidden group">
                     <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/30 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-in-out"></div>
                     <span className="relative z-10 flex items-center justify-center gap-2">
                       {extractLoading ? <Loader className="w-6 h-6 animate-spin" /> : <><Wand2 className="w-6 h-6" /> استخراج البيانات بالذكاء 🪄</>}
                     </span>
                  </button>
                  <p className="text-white/50 text-xs text-center leading-relaxed mt-4 font-medium px-2">
                     <Info className="w-4 h-4 inline-block ml-1" /> سحب تلقائي للاسم، اليوزر، الوصف والصورة الشخصية من الرابط.
                  </p>
                </div>

                <div className="w-full max-w-[280px] mx-auto aspect-[9/16] bg-black rounded-2xl overflow-hidden border-2 border-white/10 shadow-[0_10px_30px_rgba(0,0,0,0.8)] relative">
                  <iframe src={getVideoEmbedUrl(submissionToEdit.videoUrl)} className="absolute inset-0 w-full h-full" frameBorder="0" scrolling="no" allowFullScreen></iframe>
                </div>
             </div>

             <div className="lg:col-span-8 space-y-6 bg-black/20 p-6 md:p-8 rounded-3xl border border-white/5 shadow-inner">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div>
                     <label className="text-white/80 text-sm font-bold mb-2 block">الاسم الظاهر للمصمم</label>
                     <input type="text" value={submissionToEdit.participantName} onChange={(e) => setSubmissionToEdit({...submissionToEdit, participantName: e.target.value})} className="w-full p-4 rounded-xl bg-black/50 text-white border border-white/10 focus:ring-2 focus:outline-none transition-all shadow-inner" style={{ '--tw-ring-color': settings.highlightColor }} />
                  </div>
                  <div>
                     <label className="text-white/80 text-sm font-bold mb-2 block">اليوزر الحقيقي (Username)</label>
                     <input type="text" value={submissionToEdit.username || ''} onChange={(e) => setSubmissionToEdit({...submissionToEdit, username: e.target.value})} dir="ltr" className="w-full p-4 rounded-xl bg-black/50 text-white border border-white/10 focus:ring-2 focus:outline-none transition-all shadow-inner font-mono tracking-wider" style={{ '--tw-ring-color': settings.highlightColor }} />
                  </div>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div>
                     <label className="text-white/80 text-sm font-bold mb-2 flex items-center justify-between">
                       <span>رابط الصورة الشخصية</span>
                       <div className="flex items-center gap-2">
                         <button type="button" onClick={handleExtractProfilePic} disabled={profileExtractLoading} className="text-xs bg-blue-500/20 text-blue-400 px-2 py-1 rounded hover:bg-blue-500 hover:text-white transition-colors cursor-pointer border border-blue-500/30">
                           {profileExtractLoading ? 'جاري...' : 'جلب الصورة 🔄'}
                         </button>
                         {submissionToEdit.profilePic && <img src={submissionToEdit.profilePic} className="w-8 h-8 rounded-full object-cover border-2 border-white/20 shadow-sm" alt="" />}
                       </div>
                     </label>
                     <input type="url" value={submissionToEdit.profilePic || ''} onChange={(e) => setSubmissionToEdit({...submissionToEdit, profilePic: e.target.value})} dir="ltr" className="w-full p-4 rounded-xl bg-black/50 text-white border border-white/10 focus:ring-2 focus:outline-none transition-all shadow-inner text-sm font-mono" style={{ '--tw-ring-color': settings.highlightColor }} />
                  </div>
                  <div>
                     <label className="text-white/80 text-sm font-bold mb-2 flex items-center justify-between">
                       رابط الغلاف (Thumbnail)
                       {submissionToEdit.thumbnailUrl && <img src={submissionToEdit.thumbnailUrl} className="w-6 h-8 rounded object-cover border border-white/20 shadow-sm" alt="" />}
                     </label>
                     <input type="url" value={submissionToEdit.thumbnailUrl || ''} onChange={(e) => setSubmissionToEdit({...submissionToEdit, thumbnailUrl: e.target.value})} dir="ltr" className="w-full p-4 rounded-xl bg-black/50 text-white border border-white/10 focus:ring-2 focus:outline-none transition-all shadow-inner text-sm font-mono" style={{ '--tw-ring-color': settings.highlightColor }} />
                  </div>
                </div>

                <div>
                   <label className="text-white/80 text-sm font-bold mb-2 block">وصف التصميم الكامل (Caption)</label>
                   <textarea value={submissionToEdit.description || ''} onChange={(e) => setSubmissionToEdit({...submissionToEdit, description: e.target.value})} className="w-full p-4 rounded-xl bg-black/50 text-white border border-white/10 focus:ring-2 focus:outline-none transition-all shadow-inner custom-scrollbar font-medium leading-relaxed" rows="5" style={{ '--tw-ring-color': settings.highlightColor }} />
                </div>
                
                <div className="grid grid-cols-2 gap-6 p-6 bg-black/30 rounded-2xl border border-white/5">
                   <div>
                      <label className="text-white/80 text-sm font-bold mb-2 block">تعديل الحلقة</label>
                      <select value={submissionToEdit.episode} onChange={(e) => setSubmissionToEdit({...submissionToEdit, episode: e.target.value})} className="w-full p-4 rounded-xl bg-gray-900 text-white border border-white/10 focus:ring-2 focus:outline-none shadow-inner font-bold cursor-pointer" style={{ '--tw-ring-color': settings.highlightColor }}>
                        {EPISODES.map(ep => <option key={ep} value={ep}>{ep}</option>)}
                      </select>
                   </div>
                   <div>
                      <label className="text-white/80 text-sm font-bold mb-2 block">إضافة/خصم أصوات</label>
                      <input type="number" value={submissionToEdit.votes} onChange={(e) => setSubmissionToEdit({...submissionToEdit, votes: parseInt(e.target.value)||0})} className="w-full p-4 rounded-xl bg-gray-900 text-white border border-white/10 font-black text-2xl text-center focus:ring-2 focus:outline-none shadow-inner transition-all" style={{ '--tw-ring-color': settings.highlightColor, color: settings.highlightColor }} />
                   </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-4 pt-8">
                   <button onClick={() => handleSaveEdit(submissionToEdit, false)} className="flex-1 p-5 rounded-xl text-white bg-white/5 hover:bg-white/10 border border-white/10 font-bold transition-all shadow-sm flex items-center justify-center gap-2">
                     حفظ التعديلات بصمت
                   </button>
                   {submissionToEdit.status !== 'Approved' && (
                     <button onClick={() => handleSaveEdit(submissionToEdit, true)} className="relative flex-1 p-5 rounded-xl text-white font-black transition-all hover:scale-[1.02] active:scale-95 shadow-[0_10px_20px_-10px_rgba(16,185,129,0.3)] overflow-hidden group border border-emerald-500/30 bg-gradient-to-r from-emerald-500 to-teal-600">
                       <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-in-out"></div>
                       <span className="relative z-10 flex items-center justify-center gap-2">
                         <CheckCircle className="w-6 h-6" /> حفظ وقبول ونشر فوراً 
                       </span>
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

// =========================================================================
// 5.B ADMIN LIBRARY PANEL
// =========================================================================

const AdminLibraryPanel = ({ libraryScenes, isGlassmorphism, settings }) => {
  const [newScene, setNewScene] = useState({ title: '', episode: EPISODES[0], verticalUrl: '', horizontalUrl: '' });
  const [isAdding, setIsAdding] = useState(false);

  const handleAddScene = async (e) => {
    e.preventDefault();
    if (!newScene.title || !newScene.verticalUrl) return;
    setIsAdding(true);
    try {
      await addDoc(collection(db, PUBLIC_LIBRARY_COLLECTION), { ...newScene, createdAt: serverTimestamp() });
      setNewScene({ title: '', episode: EPISODES[0], verticalUrl: '', horizontalUrl: '' });
    } catch (e) {
      console.error("Error adding scene", e);
    } finally {
      setIsAdding(false);
    }
  };

  const handleDeleteScene = async (id) => {
    if (window.confirm('هل أنت متأكد من حذف هذا المشهد؟')) {
      try {
        await deleteDoc(doc(db, PUBLIC_LIBRARY_COLLECTION, id));
      } catch (e) { console.error("Error deleting scene", e); }
    }
  };

  return (
    <div className="animate-fade-in space-y-6">
      <GlassCard isGlassmorphism={isGlassmorphism} color="bg-gray-900" className="p-6">
        <h3 className="text-xl font-bold text-white mb-4 border-b border-white/10 pb-2">إضافة مشهد جديد للمكتبة</h3>
        <form onSubmit={handleAddScene} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-white text-sm mb-1 block">عنوان المشهد</label>
            <input type="text" value={newScene.title} onChange={(e) => setNewScene({...newScene, title: e.target.value})} placeholder="مثال: مشهد النهاية الحزين" className="w-full p-3 rounded-xl bg-black/40 text-white border border-white/20 focus:ring-2 focus:outline-none transition-all shadow-inner" style={{ '--tw-ring-color': settings.highlightColor }} required />
          </div>
          <div>
            <label className="text-white text-sm mb-1 block">الحلقة</label>
            <select value={newScene.episode} onChange={(e) => setNewScene({...newScene, episode: e.target.value})} className="w-full p-3 rounded-xl bg-black/40 text-white border border-white/20 focus:ring-2 focus:outline-none transition-all shadow-inner" style={{ '--tw-ring-color': settings.highlightColor }}>
              {EPISODES.map(ep => <option key={ep} value={ep}>{ep}</option>)}
            </select>
          </div>
          <div>
            <label className="text-white text-sm mb-1 block flex items-center"><Smartphone className="w-4 h-4 ml-1 text-blue-400"/> رابط العامودي (Reels/TikTok)</label>
            <input type="url" value={newScene.verticalUrl} onChange={(e) => setNewScene({...newScene, verticalUrl: e.target.value})} dir="ltr" placeholder="https://..." className="w-full p-3 rounded-xl bg-black/40 text-white border border-white/20 focus:ring-2 focus:outline-none transition-all shadow-inner font-mono text-sm" style={{ '--tw-ring-color': settings.highlightColor }} required />
          </div>
          <div>
            <label className="text-white text-sm mb-1 block flex items-center"><MonitorPlay className="w-4 h-4 ml-1 text-green-400"/> رابط الأفقي (YouTube)</label>
            <input type="url" value={newScene.horizontalUrl} onChange={(e) => setNewScene({...newScene, horizontalUrl: e.target.value})} dir="ltr" placeholder="https://..." className="w-full p-3 rounded-xl bg-black/40 text-white border border-white/20 focus:ring-2 focus:outline-none transition-all shadow-inner font-mono text-sm" style={{ '--tw-ring-color': settings.highlightColor }} />
          </div>
          <div className="md:col-span-2 pt-2">
            <button type="submit" disabled={isAdding} className="relative w-full p-4 rounded-xl font-bold text-white transition-all hover:scale-[1.01] shadow-lg overflow-hidden group border border-blue-500/30 bg-gradient-to-r from-blue-600 to-indigo-600">
              <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-in-out"></div>
              <span className="relative z-10 flex items-center justify-center gap-2">
                {isAdding ? <Loader className="w-5 h-5 animate-spin"/> : <><Plus className="w-5 h-5"/> رفع المشهد للمكتبة</>}
              </span>
            </button>
          </div>
        </form>
      </GlassCard>

      <GlassCard isGlassmorphism={isGlassmorphism} color="bg-gray-900" className="p-6">
        <h3 className="text-xl font-bold text-white mb-4 border-b border-white/10 pb-2">المشاهد الحالية ({libraryScenes.length})</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-right text-white/80">
            <thead className="bg-white/5 text-white font-bold border-b border-white/20 text-sm">
              <tr>
                <th className="p-3">العنوان</th>
                <th className="p-3 text-center">الحلقة</th>
                <th className="p-3 text-center">الروابط</th>
                <th className="p-3 text-left">حذف</th>
              </tr>
            </thead>
            <tbody>
              {libraryScenes.length === 0 ? (
                <tr><td colSpan="4" className="p-6 text-center text-white/50">لا توجد مشاهد مضافة حالياً.</td></tr>
              ) : (
                libraryScenes.map(scene => (
                  <tr key={scene.id} className="border-b border-white/10 hover:bg-white/5 transition-colors">
                    <td className="p-3 font-bold">{scene.title}</td>
                    <td className="p-3 text-center">{scene.episode}</td>
                    <td className="p-3 text-center">
                      <div className="flex justify-center gap-2">
                        {scene.verticalUrl && <a href={scene.verticalUrl} target="_blank" rel="noreferrer" className="p-1.5 bg-blue-500/20 text-blue-400 rounded-lg hover:bg-blue-500 hover:text-white transition-colors border border-blue-500/30"><Smartphone className="w-4 h-4"/></a>}
                        {scene.horizontalUrl && <a href={scene.horizontalUrl} target="_blank" rel="noreferrer" className="p-1.5 bg-green-500/20 text-green-400 rounded-lg hover:bg-green-500 hover:text-white transition-colors border border-green-500/30"><MonitorPlay className="w-4 h-4"/></a>}
                      </div>
                    </td>
                    <td className="p-3 text-left">
                      <button onClick={() => handleDeleteScene(scene.id)} className="p-1.5 bg-red-600/20 text-red-500 rounded-lg hover:bg-red-600 hover:text-white transition-colors border border-red-500/30"><Trash2 className="w-4 h-4"/></button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </GlassCard>
    </div>
  );
};

// =========================================================================
// 5.C ADMIN STORIES PANEL (الأخبار والستوريات) - تم إزالة الوصف
// =========================================================================

const AdminStoriesPanel = ({ stories, isGlassmorphism, settings }) => {
  const [newStory, setNewStory] = useState({ title: '', imageUrl: '' });
  const [isAdding, setIsAdding] = useState(false);

  const handleAddStory = async (e) => {
    e.preventDefault();
    if (!newStory.title || !newStory.imageUrl) return;
    setIsAdding(true);
    try {
      await addDoc(collection(db, PUBLIC_STORIES_COLLECTION), { ...newStory, createdAt: serverTimestamp() });
      setNewStory({ title: '', imageUrl: '' });
    } catch (e) {
      console.error("Error adding story", e);
    } finally {
      setIsAdding(false);
    }
  };

  const handleDeleteStory = async (id) => {
    if (window.confirm('هل أنت متأكد من حذف هذا الخبر/الستوري؟')) {
      try {
        await deleteDoc(doc(db, PUBLIC_STORIES_COLLECTION, id));
      } catch (e) { console.error("Error deleting story", e); }
    }
  };

  return (
    <div className="animate-fade-in space-y-6">
      <GlassCard isGlassmorphism={isGlassmorphism} color="bg-gray-900" className="p-6">
        <h3 className="text-xl font-bold text-white mb-4 border-b border-white/10 pb-2">إضافة ستوري جديد (صورة فقط)</h3>
        <form onSubmit={handleAddStory} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-white text-sm mb-1 block">عنوان الستوري (يظهر تحت الدائرة المصغرة)</label>
            <input type="text" value={newStory.title} onChange={(e) => setNewStory({...newStory, title: e.target.value})} placeholder="مثال: تصميم جديد" className="w-full p-3 rounded-xl bg-black/40 text-white border border-white/20 focus:ring-2 focus:outline-none transition-all shadow-inner" style={{ '--tw-ring-color': settings.highlightColor }} required />
          </div>
          <div>
            <label className="text-white text-sm mb-1 block flex items-center"><ImageIcon className="w-4 h-4 ml-1 text-blue-400"/> رابط صورة الستوري</label>
            <input type="url" value={newStory.imageUrl} onChange={(e) => setNewStory({...newStory, imageUrl: e.target.value})} dir="ltr" placeholder="https://..." className="w-full p-3 rounded-xl bg-black/40 text-white border border-white/20 focus:ring-2 focus:outline-none transition-all shadow-inner font-mono text-sm" style={{ '--tw-ring-color': settings.highlightColor }} required />
          </div>
          
          <div className="md:col-span-2 pt-2">
            <button type="submit" disabled={isAdding} className="relative w-full p-4 rounded-xl font-bold text-white transition-all hover:scale-[1.01] shadow-lg overflow-hidden group border border-purple-500/30 bg-gradient-to-r from-purple-600 to-pink-600">
              <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-in-out"></div>
              <span className="relative z-10 flex items-center justify-center gap-2">
                {isAdding ? <Loader className="w-5 h-5 animate-spin"/> : <><Plus className="w-5 h-5"/> نشر الستوري</>}
              </span>
            </button>
          </div>
        </form>
      </GlassCard>

      <GlassCard isGlassmorphism={isGlassmorphism} color="bg-gray-900" className="p-6">
        <h3 className="text-xl font-bold text-white mb-4 border-b border-white/10 pb-2">الستوريات الحالية ({stories.length})</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-right text-white/80">
            <thead className="bg-white/5 text-white font-bold border-b border-white/20 text-sm">
              <tr>
                <th className="p-3">صورة الستوري</th>
                <th className="p-3">العنوان</th>
                <th className="p-3 text-left">حذف</th>
              </tr>
            </thead>
            <tbody>
              {stories.length === 0 ? (
                <tr><td colSpan="3" className="p-6 text-center text-white/50">لا توجد ستوريات مضافة حالياً.</td></tr>
              ) : (
                stories.map(story => (
                  <tr key={story.id} className="border-b border-white/10 hover:bg-white/5 transition-colors">
                    <td className="p-3">
                      <img src={story.imageUrl} alt={story.title} className="w-12 h-12 rounded-full object-cover border-2 border-white/20" />
                    </td>
                    <td className="p-3 font-bold text-white">{story.title}</td>
                    <td className="p-3 text-left">
                      <button onClick={() => handleDeleteStory(story.id)} className="p-2 bg-red-600/20 text-red-500 rounded-lg hover:bg-red-600 hover:text-white transition-colors border border-red-500/30"><Trash2 className="w-4 h-4"/></button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </GlassCard>
    </div>
  );
};


const AdminSettingsPanel = ({ settings, isGlassmorphism, onSaveSettings }) => {
  const [currentSettings, setCurrentSettings] = useState(settings);
  useEffect(() => { setCurrentSettings(settings); }, [settings]);
  
  return (
    <div className="animate-fade-in">
      <GlassCard isGlassmorphism={isGlassmorphism} color="bg-gray-900" className="!p-8 mb-8 border-t-4" style={{ borderTopColor: settings.mainColor }}>
        <h3 className="text-3xl font-black text-white mb-8 flex items-center border-b border-white/10 pb-6">
          <SettingsIcon className="w-8 h-8 ml-3" style={{ color: settings.highlightColor }} /> إعدادات الموقع العامة
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
          
          {/* Visual Settings */}
          <div className="space-y-6 bg-black/20 p-6 rounded-3xl border border-white/5 shadow-inner">
            <h4 className="text-xl font-black mb-4 flex items-center gap-2" style={{ color: settings.highlightColor }}><Wand2 className="w-5 h-5"/> الهوية البصرية</h4>
            
            <div>
              <label className="text-white/80 text-sm font-bold mb-2 block">العنوان الرئيسي</label>
              <input type="text" value={currentSettings.title} onChange={(e) => setCurrentSettings({...currentSettings, title: e.target.value})} className="w-full p-4 rounded-xl bg-black/50 text-white border border-white/10 focus:ring-2 focus:outline-none transition-all shadow-inner font-bold" style={{ '--tw-ring-color': settings.highlightColor }} />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-white/80 text-sm font-bold mb-2 block">رابط الشعار</label>
                <input type="text" value={currentSettings.logoUrl} onChange={(e) => setCurrentSettings({...currentSettings, logoUrl: e.target.value})} className="w-full p-4 rounded-xl bg-black/50 text-white border border-white/10 focus:ring-2 focus:outline-none transition-all shadow-inner text-sm font-mono" dir="ltr" style={{ '--tw-ring-color': settings.highlightColor }} />
              </div>
              <div>
                <label className="text-white/80 text-sm font-bold mb-2 block">حجم الشعار (px)</label>
                <input type="number" min="20" max="200" value={currentSettings.logoSize || 40} onChange={(e) => setCurrentSettings({...currentSettings, logoSize: parseInt(e.target.value) || 40})} className="w-full p-4 rounded-xl bg-black/50 text-white border border-white/10 focus:ring-2 focus:outline-none transition-all shadow-inner font-bold text-center" style={{ '--tw-ring-color': settings.highlightColor }} />
              </div>
            </div>
            
            <div>
              <label className="text-white/80 text-sm font-bold mb-2 block">شريط الإعلانات (Marquee)</label>
              <textarea value={currentSettings.marqueeText} onChange={(e) => setCurrentSettings({...currentSettings, marqueeText: e.target.value})} className="w-full p-4 rounded-xl bg-black/50 text-white border border-white/10 focus:ring-2 focus:outline-none transition-all shadow-inner custom-scrollbar font-medium" rows="3" style={{ '--tw-ring-color': settings.highlightColor }} />
            </div>
            
            <div className="p-6 bg-black/40 rounded-2xl border border-white/5 shadow-inner">
               <label className="text-white/80 text-sm font-bold mb-4 block">ألوان الموقع الأساسية</label>
               <div className="flex gap-6">
                 <div className="flex-1 flex flex-col items-center">
                    <label className="text-white/60 text-xs font-bold mb-2">اللون الرئيسي</label>
                    <input type="color" value={currentSettings.mainColor} onChange={(e) => setCurrentSettings({...currentSettings, mainColor: e.target.value})} className="w-full h-14 rounded-xl cursor-pointer border-2 border-white/20 p-1 bg-black" />
                 </div>
                 <div className="flex-1 flex flex-col items-center">
                    <label className="text-white/60 text-xs font-bold mb-2">لون الإبراز (التوهج)</label>
                    <input type="color" value={currentSettings.highlightColor} onChange={(e) => setCurrentSettings({...currentSettings, highlightColor: e.target.value})} className="w-full h-14 rounded-xl cursor-pointer border-2 border-white/20 p-1 bg-black" />
                 </div>
               </div>
            </div>
          </div>

          {/* Text Settings */}
          <div className="space-y-6 bg-black/20 p-6 rounded-3xl border border-white/5 shadow-inner">
             <h4 className="text-xl font-black mb-4 flex items-center gap-2" style={{ color: settings.highlightColor }}><Info className="w-5 h-5"/> إعدادات النصوص</h4>
             
             <div>
               <label className="text-white/80 text-sm font-bold mb-2 block">شروط وأحكام الانضمام</label>
               <textarea value={currentSettings.termsText} onChange={(e) => setCurrentSettings({...currentSettings, termsText: e.target.value})} className="w-full p-4 rounded-xl bg-black/50 text-white border border-white/10 focus:ring-2 focus:outline-none transition-all shadow-inner h-32 custom-scrollbar font-medium leading-relaxed" style={{ '--tw-ring-color': settings.highlightColor }} />
             </div>
             <div>
               <label className="text-white/80 text-sm font-bold mb-2 block">نبذة عن المسابقة</label>
               <textarea value={currentSettings.whyText} onChange={(e) => setCurrentSettings({...currentSettings, whyText: e.target.value})} className="w-full p-4 rounded-xl bg-black/50 text-white border border-white/10 focus:ring-2 focus:outline-none transition-all shadow-inner h-32 custom-scrollbar font-medium leading-relaxed" style={{ '--tw-ring-color': settings.highlightColor }} />
             </div>
          </div>

          {/* Admin Info */}
          <div className="space-y-6 md:col-span-2 bg-black/20 p-6 md:p-8 rounded-3xl border border-white/5 shadow-inner mt-4">
             <h4 className="text-xl font-black mb-4 flex items-center gap-2" style={{ color: settings.highlightColor }}><User className="w-5 h-5"/> معلومات لوحة "حولنا" (مدير المنصة)</h4>
             
             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
               <div>
                 <label className="text-white/80 text-sm font-bold mb-2 block">اسم المشرف / العنوان</label>
                 <input type="text" value={currentSettings.adminName || ''} onChange={(e) => setCurrentSettings({...currentSettings, adminName: e.target.value})} className="w-full p-4 rounded-xl bg-black/50 text-white border border-white/10 focus:ring-2 focus:outline-none transition-all shadow-inner font-bold" placeholder="مثال: علي جبار" style={{ '--tw-ring-color': settings.highlightColor }} />
               </div>
               <div className="md:col-span-2">
                 <label className="text-white/80 text-sm font-bold mb-2 block">الوصف (نبذة شخصية تظهر في نافذة حولنا)</label>
                 <textarea value={currentSettings.adminBio || ''} onChange={(e) => setCurrentSettings({...currentSettings, adminBio: e.target.value})} className="w-full p-4 rounded-xl bg-black/50 text-white border border-white/10 focus:ring-2 focus:outline-none transition-all shadow-inner h-28 custom-scrollbar font-medium leading-relaxed" placeholder="اكتب نبذة تظهر للمتابعين..." style={{ '--tw-ring-color': settings.highlightColor }}/>
               </div>
               <div>
                 <label className="text-white/80 text-sm font-bold mb-2 block flex items-center gap-2"><TikTokIcon className="w-4 h-4"/> حساب تيك توك (رابط كامل)</label>
                 <input type="url" value={currentSettings.adminTikTok || ''} onChange={(e) => setCurrentSettings({...currentSettings, adminTikTok: e.target.value})} dir="ltr" className="w-full p-4 rounded-xl bg-black/50 text-white border border-white/10 focus:ring-2 focus:outline-none transition-all shadow-inner font-mono text-sm" placeholder="https://www.tiktok.com/@..." style={{ '--tw-ring-color': settings.highlightColor }} />
               </div>
               <div>
                 <label className="text-white/80 text-sm font-bold mb-2 block flex items-center gap-2"><Instagram className="w-4 h-4 text-pink-500"/> حساب انستغرام (رابط كامل)</label>
                 <input type="url" value={currentSettings.adminInsta || ''} onChange={(e) => setCurrentSettings({...currentSettings, adminInsta: e.target.value})} dir="ltr" className="w-full p-4 rounded-xl bg-black/50 text-white border border-white/10 focus:ring-2 focus:outline-none transition-all shadow-inner font-mono text-sm" placeholder="https://www.instagram.com/..." style={{ '--tw-ring-color': settings.highlightColor }} />
               </div>
             </div>
          </div>

          {/* Ad Banners */}
          <div className="space-y-6 md:col-span-2 bg-black/20 p-6 md:p-8 rounded-3xl border border-white/5 shadow-inner mt-4">
             <div className="flex justify-between items-center mb-6">
                <h4 className="text-xl font-black flex items-center gap-2" style={{ color: settings.highlightColor }}><Film className="w-5 h-5"/> البنرات الإعلانية (Carousel)</h4>
                <button onClick={() => { setCurrentSettings({...currentSettings, adBanners: [...(currentSettings.adBanners || []), '']}); }} className="px-5 py-2.5 bg-white/10 hover:bg-white/20 rounded-xl text-white font-bold transition-all flex items-center gap-2 border border-white/10 shadow-sm">
                   <Plus className="w-4 h-4"/> إضافة بنر جديد
                </button>
             </div>
             
             <div className="space-y-4">
               {currentSettings.adBanners?.map((banner, index) => (
                 <div key={index} className="flex gap-3 bg-black/40 p-3 rounded-xl border border-white/5 items-center">
                    <span className="text-white/30 font-black px-2">{index + 1}</span>
                    <input
                      type="url"
                      value={banner}
                      onChange={(e) => {
                         const newBanners = [...(currentSettings.adBanners || [])];
                         newBanners[index] = e.target.value;
                         setCurrentSettings({...currentSettings, adBanners: newBanners});
                      }}
                      placeholder="https://image-url..."
                      className="flex-grow p-4 rounded-lg bg-black/50 text-white border border-white/10 focus:ring-2 focus:outline-none transition-all font-mono text-sm shadow-inner"
                      dir="ltr"
                      style={{ '--tw-ring-color': settings.highlightColor }}
                    />
                    <button onClick={() => {
                       const newBanners = currentSettings.adBanners.filter((_, i) => i !== index);
                       setCurrentSettings({...currentSettings, adBanners: newBanners});
                    }} className="p-4 bg-red-500/10 hover:bg-red-500 rounded-lg text-red-500 hover:text-white font-bold transition-all border border-red-500/20"><Trash2 className="w-5 h-5"/></button>
                 </div>
               ))}
             </div>
          </div>

        </div>
        
        <button onClick={() => onSaveSettings(currentSettings)} className="relative w-full mt-12 p-6 rounded-2xl font-black text-2xl text-white transition-all duration-300 hover:scale-[1.01] active:scale-95 shadow-[0_10px_30px_rgba(16,185,129,0.2)] overflow-hidden group border border-emerald-500/30 bg-gradient-to-r from-emerald-500 to-teal-600">
          <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-in-out"></div>
          <span className="relative z-10 flex items-center justify-center gap-3">
            <CheckCircle className="w-8 h-8"/> حفظ وتطبيق التحديثات فوراً
          </span>
        </button>
      </GlassCard>
    </div>
  );
};

// =========================================================================
// 6. LAYOUT & MAIN APP
// =========================================================================

const Header = ({ settings, activeView, setActiveView, isAdminMode, clearDesignerSelection, onOpenAbout }) => (
  <header className="sticky top-0 z-40 transition-all duration-300 border-b shadow-lg" style={{ 
      backgroundColor: settings.useGlassmorphism ? 'rgba(0,0,0,0.6)' : '#000000', 
      borderColor: 'rgba(255, 255, 255, 0.05)', 
      backdropFilter: settings.useGlassmorphism ? 'blur(20px)' : 'none' 
    }}>
    <div className="container mx-auto px-4 py-3 sm:py-4">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        
        <div className="flex items-center cursor-pointer group" onClick={() => {setActiveView('home'); clearDesignerSelection();}}>
          <img src={settings.logoUrl} alt="Logo" className="rounded-xl mr-3 ml-3 shadow-md transition-transform duration-500 group-hover:scale-105 group-hover:rotate-1" style={{ height: `${settings.logoSize || 40}px`, width: 'auto', display: settings.logoUrl ? 'block' : 'none' }} onError={(e) => (e.target.style.display = 'none')} />
          <h1 className="text-2xl sm:text-3xl font-black text-transparent bg-clip-text tracking-tight transition-all" style={{ backgroundImage: `linear-gradient(to left, #fff, ${settings.highlightColor})` }}>{settings.title}</h1>
        </div>
        
        {!isAdminMode && (
          <nav className="flex items-center space-x-1 space-x-reverse bg-white/5 p-1.5 rounded-full border border-white/10 overflow-x-auto max-w-full backdrop-blur-md shadow-inner">
            <button onClick={() => {setActiveView('home'); clearDesignerSelection();}} className={`flex items-center px-5 py-2.5 rounded-full text-sm font-bold transition-all duration-300 whitespace-nowrap ${activeView === 'home' ? 'text-white shadow-[0_0_15px_rgba(255,255,255,0.2)]' : 'text-white/70 hover:text-white hover:bg-white/10'}`} style={{ backgroundColor: activeView === 'home' ? settings.highlightColor : 'transparent' }}>
              <HomeIcon className="w-4 h-4 ml-1.5" /> الرئيسية
            </button>
            <button onClick={() => {setActiveView('submit'); clearDesignerSelection();}} className={`flex items-center px-5 py-2.5 rounded-full text-sm font-bold transition-all duration-300 whitespace-nowrap ${activeView === 'submit' ? 'text-white shadow-[0_0_15px_rgba(255,255,255,0.2)]' : 'text-white/70 hover:text-white hover:bg-white/10'}`} style={{ background: activeView === 'submit' ? `linear-gradient(135deg, ${settings.highlightColor}, ${settings.mainColor})` : 'transparent' }}>
              <UploadCloud className="w-4 h-4 ml-1.5" /> إرسال مشاركة
            </button>
            <button onClick={() => {setActiveView('library'); clearDesignerSelection();}} className={`flex items-center px-5 py-2.5 rounded-full text-sm font-bold transition-all duration-300 whitespace-nowrap ${activeView === 'library' ? 'text-white shadow-[0_0_15px_rgba(255,255,255,0.2)]' : 'text-white/70 hover:text-white hover:bg-white/10'}`} style={{ backgroundColor: activeView === 'library' ? settings.mainColor : 'transparent' }}>
              <FolderOpen className="w-4 h-4 ml-1.5" /> مكتبة المصممين
            </button>
            <button onClick={onOpenAbout} className="flex items-center px-5 py-2.5 rounded-full text-sm font-bold transition-all duration-300 whitespace-nowrap text-white/70 hover:text-white hover:bg-white/10">
              <User className="w-4 h-4 ml-1.5" /> حولنا
            </button>
          </nav>
        )}
      </div>
    </div>
  </header>
);

const Footer = ({ settings }) => (
  <footer className="bg-black/60 pt-16 pb-8 mt-24 border-t border-white/5 relative overflow-hidden backdrop-blur-lg">
    <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-1/2 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>
    <div className="container mx-auto px-4 text-center relative z-10">
      <div className="flex justify-center items-center gap-4 mb-8">
        <Crown className="w-8 h-8 opacity-50" style={{ color: settings.highlightColor }} />
      </div>
      <h2 className="text-3xl font-black text-white/80 mb-4 tracking-tight">{settings.title}</h2>
      <p className="text-white/40 max-w-md mx-auto leading-relaxed mb-8">منصة متخصصة لدعم المبدعين وصناع المحتوى وعرض أفضل التصاميم الرمضانية للجمهور.</p>
      <div className="h-px w-24 bg-white/10 mx-auto mb-8 rounded-full"></div>
      <p className="text-sm text-white/30 font-bold tracking-widest uppercase">
        &copy; {new Date().getFullYear()} {settings.title}. جميع الحقوق محفوظة.
      </p>
    </div>
  </footer>
);

const App = () => {
  const [settings, setSettings] = useState(null);
  const [submissions, setSubmissions] = useState([]);
  const [libraryScenes, setLibraryScenes] = useState([]); 
  const [stories, setStories] = useState([]); 
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
      document.documentElement.style.fontFamily = `'${settings.appFont}', system-ui, -apple-system, sans-serif`;
      
      const styleEl = document.createElement('style');
      styleEl.innerHTML = `
        body { background-color: #050505; color: #ffffff; }
        .custom-scrollbar::-webkit-scrollbar { width: 8px; height: 8px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: rgba(255,255,255,0.02); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.15); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: var(--highlight-color-css); }
        ::selection { background-color: var(--highlight-color-css); color: #000; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .animate-fade-in { animation: fadeIn 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        @keyframes scaleIn { from { transform: scale(0); opacity: 0; } to { transform: scale(1); opacity: 1; } }
        .scale-in-center { animation: scaleIn 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94) both; }
      `;
      document.head.appendChild(styleEl);
      return () => { document.head.removeChild(styleEl); };
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
    const unsubscribeLibrary = onSnapshot(collection(db, PUBLIC_LIBRARY_COLLECTION), (snapshot) => {
        setLibraryScenes(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })).sort((a,b) => b.createdAt - a.createdAt));
    });
    const unsubscribeStories = onSnapshot(collection(db, PUBLIC_STORIES_COLLECTION), (snapshot) => {
        setStories(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })).sort((a,b) => b.createdAt - a.createdAt));
    });

    return () => { unsubscribeSettings(); unsubscribeSubmissions(); unsubscribeLibrary(); unsubscribeStories(); };
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
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#050505] relative overflow-hidden" dir="rtl">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-white/5 to-transparent blur-3xl opacity-50"></div>
        <div className="relative z-10 flex flex-col items-center">
           <div className="w-20 h-20 mb-6 relative">
             <div className="absolute inset-0 border-4 border-t-white/80 border-r-white/20 border-b-white/5 border-l-white/20 rounded-full animate-spin"></div>
             <div className="absolute inset-2 border-4 border-t-white/40 border-r-white/10 border-b-white/80 border-l-white/10 rounded-full animate-spin" style={{ animationDirection: 'reverse', animationDuration: '1.5s' }}></div>
           </div>
           <span className="text-white/80 text-2xl font-black tracking-widest animate-pulse">جاري تجهيز المنصة...</span>
        </div>
      </div>
    );
  }

  return (
    <div dir="rtl" className="min-h-screen font-sans text-white flex flex-col relative bg-[#050505] selection:bg-white/20">
      {/* Global Background Gradient */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-gray-900/40 via-[#050505] to-[#050505]"></div>
        <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-white/5 rounded-full blur-[120px] opacity-20 transform translate-x-1/3 -translate-y-1/3" style={{ backgroundColor: settings.mainColor }}></div>
        <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-white/5 rounded-full blur-[100px] opacity-20 transform -translate-x-1/3 translate-y-1/3" style={{ backgroundColor: settings.highlightColor }}></div>
      </div>

      <div className="relative z-10 flex flex-col flex-grow">
        <Header settings={settings} activeView={activeView} setActiveView={setActiveView} isAdminMode={adminMode} clearDesignerSelection={clearDesignerSelection} onOpenAbout={() => setIsAboutModalOpen(true)} />

        <main className="container mx-auto p-4 sm:p-6 lg:p-8 pt-8 flex-grow">
          {!adminMode && <AdBanner settings={settings} />}
          {!adminMode && <AlertBanner settings={settings} />}

          {adminMode ? (
            <>
               <div className="flex flex-col md:flex-row justify-between items-center bg-black/40 p-8 rounded-3xl border border-white/10 shadow-[0_10px_40px_rgba(0,0,0,0.5)] backdrop-blur-xl animate-fade-in mb-8 relative overflow-hidden">
                 <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-white/30 to-transparent"></div>
                 
                 <div className="mb-6 md:mb-0 relative z-10">
                    <h2 className="text-3xl sm:text-4xl font-black text-white flex items-center mb-3 drop-shadow-lg"><SettingsIcon className="w-10 h-10 ml-4 animate-[spin_10s_linear_infinite]" style={{ color: settings.highlightColor }} /> لوحة التحكم الشاملة</h2>
                    <p className="text-white/60 text-base font-medium bg-black/20 px-4 py-2 rounded-lg inline-block border border-white/5">مرحباً بك، لديك تحكم كامل في البيانات والإحصائيات.</p>
                 </div>
                 <button onClick={handleAdminLogout} className="py-4 px-8 rounded-xl bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white font-black transition-all flex items-center border border-red-500/20 shadow-lg hover:shadow-[0_0_20px_rgba(239,68,68,0.4)] transform hover:-translate-y-1 relative z-10">
                    <LogOut className="w-6 h-6 ml-2"/> تسجيل الخروج
                 </button>
               </div>
               
               {/* Navigation Tabs for Admin */}
               <div className="flex bg-black/30 p-2 rounded-2xl border border-white/10 mb-8 animate-fade-in overflow-x-auto shadow-inner backdrop-blur-md">
                 <button onClick={() => setAdminActiveTab('stats')} className={`flex-1 py-4 px-6 font-black text-lg transition-all rounded-xl whitespace-nowrap ${adminActiveTab === 'stats' ? 'bg-white/10 shadow-md text-white' : 'text-white/50 hover:bg-white/5 hover:text-white'}`} style={{ color: adminActiveTab === 'stats' ? settings.highlightColor : undefined }}>📊 الإحصائيات العامة</button>
                 <button onClick={() => setAdminActiveTab('subs')} className={`flex-1 py-4 px-6 font-black text-lg transition-all rounded-xl whitespace-nowrap ${adminActiveTab === 'subs' ? 'bg-white/10 shadow-md text-white' : 'text-white/50 hover:bg-white/5 hover:text-white'}`} style={{ color: adminActiveTab === 'subs' ? settings.highlightColor : undefined }}>🎬 إدارة المشاركات والطلبات</button>
                 <button onClick={() => setAdminActiveTab('library')} className={`flex-1 py-4 px-6 font-black text-lg transition-all rounded-xl whitespace-nowrap ${adminActiveTab === 'library' ? 'bg-white/10 shadow-md text-white' : 'text-white/50 hover:bg-white/5 hover:text-white'}`} style={{ color: adminActiveTab === 'library' ? settings.highlightColor : undefined }}>🎞️ إدارة المكتبة</button>
                 <button onClick={() => setAdminActiveTab('stories')} className={`flex-1 py-4 px-6 font-black text-lg transition-all rounded-xl whitespace-nowrap ${adminActiveTab === 'stories' ? 'bg-white/10 shadow-md text-white' : 'text-white/50 hover:bg-white/5 hover:text-white'}`} style={{ color: adminActiveTab === 'stories' ? settings.highlightColor : undefined }}>📰 إدارة الأخبار (ستوريات)</button>
                 <button onClick={() => setAdminActiveTab('settings')} className={`flex-1 py-4 px-6 font-black text-lg transition-all rounded-xl whitespace-nowrap ${adminActiveTab === 'settings' ? 'bg-white/10 shadow-md text-white' : 'text-white/50 hover:bg-white/5 hover:text-white'}`} style={{ color: adminActiveTab === 'settings' ? settings.highlightColor : undefined }}>⚙️ إعدادات وتخصيص الموقع</button>
               </div>

               <div className="animate-fade-in">
                 {adminActiveTab === 'stats' && <AdminStatsPanel submissions={submissions} settings={settings} isGlassmorphism={settings.useGlassmorphism} />}
                 {adminActiveTab === 'subs' && <AdminSubmissionsPanel submissions={submissions} settings={settings} isGlassmorphism={settings.useGlassmorphism} onUpdateSubmissionStatus={async (id, s) => { await updateDoc(doc(db, PUBLIC_SUBMISSIONS_COLLECTION, id), {status: s}) }} onDeleteSubmission={handleDeleteSubmission} onResetVotes={handleResetVotes} />}
                 {adminActiveTab === 'library' && <AdminLibraryPanel libraryScenes={libraryScenes} settings={settings} isGlassmorphism={settings.useGlassmorphism} />}
                 {adminActiveTab === 'stories' && <AdminStoriesPanel stories={stories} settings={settings} isGlassmorphism={settings.useGlassmorphism} />}
                 {adminActiveTab === 'settings' && <AdminSettingsPanel settings={settings} isGlassmorphism={settings.useGlassmorphism} onSaveSettings={async (newSet) => { await setDoc(doc(db, PUBLIC_SETTINGS_PATH), newSet) }} />}
               </div>
            </>
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
                  {activeView === 'home' && <Home settings={settings} allSubmissions={submissions} totalApproved={submissions.filter(s=>s.status==='Approved').length} onVote={(sub) => cooldown > 0 ? null : setVoteConfirmData(sub)} cooldown={cooldown} setVoteConfirmData={setVoteConfirmData} onDesignerClick={handleDesignerClick} stories={stories} />}
                  {activeView === 'submit' && <SubmissionForm settings={settings} userId={userId} allSubmissions={submissions} />}
                  {activeView === 'library' && <DesignersLibrary settings={settings} libraryScenes={libraryScenes} />}
                </>
              )}
            </>
          )}
        </main>

        {!adminMode && <Footer settings={settings} />}

        {/* نافذة "حول المسابقة / عني" */}
        <Modal isOpen={isAboutModalOpen} onClose={() => setIsAboutModalOpen(false)} title="" isGlassmorphism={true} maxWidth="max-w-xl">
           <div className="flex flex-col items-center justify-center p-4 sm:p-8 text-center relative mt-2">
             
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-full h-full bg-white/5 rounded-full blur-3xl opacity-30 pointer-events-none" style={{ backgroundColor: settings.highlightColor }}></div>

              <div className="w-28 h-28 bg-black/60 backdrop-blur-md rounded-full flex items-center justify-center mb-6 border-4 shadow-[0_0_30px_rgba(0,0,0,0.5)] relative z-10 transform hover:scale-110 transition-transform duration-500" style={{ borderColor: settings.highlightColor }}>
                 <Crown className="w-14 h-14 drop-shadow-md" style={{ color: settings.highlightColor }} />
              </div>
              
              <h3 className="text-4xl sm:text-5xl font-black text-transparent bg-clip-text mb-4 drop-shadow-lg relative z-10" style={{ backgroundImage: `linear-gradient(to bottom, #fff, ${settings.highlightColor})` }}>
                 {settings.adminName || 'إدارة المسابقة'}
              </h3>
              
              <div className="h-1.5 w-20 bg-gradient-to-r from-transparent via-white/40 to-transparent rounded-full mb-8 relative z-10"></div>
              
              <div className="bg-black/30 p-6 rounded-3xl border border-white/5 shadow-inner mb-10 w-full relative z-10">
                <p className="text-white/90 leading-relaxed text-lg sm:text-xl whitespace-pre-wrap font-medium">
                   {settings.adminBio || 'وصف المشرف سيظهر هنا. قم بتعديله من لوحة التحكم لتوضيح رسالة المسابقة وأهدافها للجمهور.'}
                </p>
              </div>
              
              <div className="flex flex-col sm:flex-row justify-center gap-4 w-full relative z-10">
                 {settings.adminTikTok && (
                   <a href={settings.adminTikTok} target="_blank" rel="noreferrer" className="flex-1 flex items-center justify-center px-6 py-4 bg-white/5 backdrop-blur-md rounded-2xl hover:bg-white/10 hover:-translate-y-1 transition-all border border-white/10 text-white font-black text-lg shadow-lg group">
                     <TikTokIcon className="w-7 h-7 ml-3 text-white group-hover:scale-110 transition-transform" /> تيك توك
                   </a>
                 )}
                 {settings.adminInsta && (
                   <a href={settings.adminInsta} target="_blank" rel="noreferrer" className="flex-1 flex items-center justify-center px-6 py-4 bg-white/5 backdrop-blur-md rounded-2xl hover:bg-white/10 hover:-translate-y-1 transition-all border border-white/10 text-white font-black text-lg shadow-lg group">
                     <Instagram className="w-7 h-7 ml-3 text-pink-500 group-hover:scale-110 transition-transform" /> انستغرام
                   </a>
                 )}
              </div>
           </div>
        </Modal>

        {/* نافذة الدخول للإدارة */}
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl transition-opacity duration-300" style={{display: authModalOpen && !adminMode ? 'flex' : 'none', opacity: authModalOpen && !adminMode ? 1 : 0}}>
          <div className="bg-gray-900/80 p-10 rounded-3xl w-full max-w-sm border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.8)] backdrop-blur-2xl transform scale-100 transition-transform duration-300">
             <div className="flex justify-center mb-6">
                <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center border border-white/10 shadow-inner">
                   <Lock className="w-10 h-10" style={{ color: settings.highlightColor }}/>
                </div>
             </div>
             <h2 className="text-white font-black text-3xl mb-8 text-center tracking-wide">تسجيل الدخول للإدارة</h2>
             <button onClick={()=> {setAdminMode(true); setAuthModalOpen(false);}} className="relative w-full p-5 rounded-2xl font-black text-white text-xl transition-all duration-300 hover:scale-[1.02] shadow-[0_10px_20px_-10px_rgba(59,130,246,0.3)] overflow-hidden group border border-blue-500/30 bg-gradient-to-r from-blue-600 to-indigo-600">
               <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-in-out"></div>
               <span className="relative z-10">تأكيد ودخول تجريبي</span>
             </button>
             <p className="text-white/40 text-xs text-center mt-6 font-bold">هذه النافذة التجريبية ستختفي عند ربط المصادقة الحقيقية.</p>
          </div>
        </div>

        <Modal isOpen={voteConfirmData !== null} onClose={() => setVoteConfirmData(null)} title="تأكيد التصويت النهائي" isGlassmorphism={true}>
          {voteConfirmData && (
            <div className="text-center p-2 sm:p-4">
              
              <div className="w-24 h-24 mx-auto bg-black/40 rounded-full flex items-center justify-center border-4 shadow-[0_0_30px_rgba(0,0,0,0.5)] mb-6 relative" style={{ borderColor: settings.highlightColor }}>
                 <Crown className="w-12 h-12" style={{ color: settings.highlightColor }} />
                 <div className="absolute inset-0 rounded-full animate-ping opacity-20" style={{ backgroundColor: settings.highlightColor }}></div>
              </div>

              <p className="text-white/90 text-2xl mb-8 font-bold leading-relaxed">
                هل أنت متأكد من منح صوتك للمبدع <br/>
                <span className="font-black inline-block mt-3 px-4 py-2 bg-white/10 backdrop-blur-md rounded-xl shadow-inner border border-white/10 text-3xl drop-shadow-md text-amber-400" dir="ltr">{voteConfirmData.participantName}</span>
                <br/><span className="text-lg text-white/60 mt-2 inline-block">عن مشاركته في <span className="font-bold text-white/90 bg-black/30 px-2 py-0.5 rounded ml-1">{voteConfirmData.episode}</span></span>
              </p>
              
              <div className="bg-black/30 p-5 rounded-2xl mb-8 border border-white/5 flex items-center justify-center shadow-inner relative overflow-hidden">
                <div className="absolute left-0 top-0 bottom-0 w-2 bg-amber-500"></div>
                <img src={voteConfirmData.profilePic || generateAvatar(voteConfirmData.participantName)} className="w-16 h-16 rounded-full border-2 ml-4 object-cover shadow-lg border-amber-500/50" alt="Profile"/>
                <p className="text-sm sm:text-base text-white/80 text-right line-clamp-2 leading-relaxed font-medium">{voteConfirmData.description || "بدون وصف."}</p>
              </div>

              <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-3 mb-8 inline-block">
                <p className="text-sm text-blue-200 font-bold flex items-center gap-2"><Info className="w-5 h-5"/> سيُسمح لك بالتصويت مرة أخرى بعد 30 ثانية.</p>
              </div>

              <div className="flex flex-col sm:flex-row justify-center gap-4">
                <button onClick={() => setVoteConfirmData(null)} className="w-full sm:w-1/2 py-4 rounded-xl bg-white/5 hover:bg-white/10 text-white font-bold transition-colors border border-white/10 shadow-sm text-lg">إلغاء التراجع</button>
                <button onClick={() => handleConfirmVote(voteConfirmData)} className="relative w-full sm:w-1/2 py-4 rounded-xl text-white font-black transition-all duration-300 hover:scale-[1.02] shadow-[0_10px_20px_-10px_rgba(245,158,11,0.3)] text-lg disabled:opacity-50 disabled:hover:scale-100 disabled:cursor-not-allowed overflow-hidden group border border-amber-500/30 bg-gradient-to-r from-amber-500 to-orange-600" disabled={cooldown > 0}>
                  <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-in-out"></div>
                  <span className="relative z-10 flex justify-center items-center gap-2">نعم، تأكيد التصويت</span>
                </button>
              </div>
            </div>
          )}
        </Modal>
      </div>
    </div>
  );
};

export default App;