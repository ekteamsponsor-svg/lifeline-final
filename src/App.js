import React, { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { 
  getFirestore, collection, doc, setDoc, 
  onSnapshot, updateDoc, getDoc, deleteDoc
} from 'firebase/firestore';
import { 
  getAuth, signInAnonymously, onAuthStateChanged, signInWithCustomToken 
} from 'firebase/auth';
import { 
  Menu, X, Search, Phone, PlusCircle, 
  HeartPulse, Moon, Sun, MessageCircle, 
  Droplets, MapPin, Fingerprint, CheckCircle, 
  Home, List, Loader2, Facebook, 
  ArrowRight, Heart, Save, Copy, Activity, 
  Quote, BookOpen, ChevronRight, Sparkles, Star, ShieldAlert, Calendar, KeyRound, Trash2, AlertTriangle, Info, BellRing
} from 'lucide-react';

// Firebase initialization
const firebaseConfig = {
  apiKey: "AIzaSyCulogzcg09l6zUQg35-pflD_WbKulOSgw",
  authDomain: "lifeline-v2-ae5e6.firebaseapp.com",
  projectId: "lifeline-v2-ae5e6",
  storageBucket: "lifeline-v2-ae5e6.firebasestorage.app",
  messagingSenderId: "360900587857",
  appId: "1:360900587857:web:f4497ab2b596f344a7a370"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = 'lifeline-v2-data';


export default function App() {
  const [user, setUser] = useState(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [darkMode, setDarkMode] = useState(false);
  const [members, setMembers] = useState([]);
  const [appStats, setAppStats] = useState({ beneficiaries: 120, lastCode: 0 });
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [viewProfile, setViewProfile] = useState(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [profileToDelete, setProfileToDelete] = useState(null);
  
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentUserData, setCurrentUserData] = useState(null);
  const [isAdminMode, setIsAdminMode] = useState(false); 
  const [loginPhone, setLoginPhone] = useState('');
  const [showAdminPassModal, setShowAdminPassModal] = useState(false);
  const [adminPasswordInput, setAdminPasswordInput] = useState('');
  const [adminPassError, setAdminPassError] = useState(false);

  // New states for confirmation messages
  const [showUpdateSuccess, setShowUpdateSuccess] = useState(false);
  const [showAdminModeNotice, setShowAdminModeNotice] = useState(false);

  const [formData, setFormData] = useState({
    name: '', bloodGroup: 'A+', age: '', gender: 'ছেলে', phone: '', lastDonation: '', address: '', designation: 'সদস্য'
  });

  useEffect(() => {
    const initAuth = async () => {
      if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
        await signInWithCustomToken(auth, __initial_auth_token);
      } else {
        await signInAnonymously(auth);
      }
    };
    initAuth();
    const unsubscribe = onAuthStateChanged(auth, (u) => setUser(u));
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;
    
    const membersCollection = collection(db, 'artifacts', appId, 'public', 'data', 'members');
    const unsubscribeMembers = onSnapshot(membersCollection, (snapshot) => {
      const membersList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setMembers(membersList);
    }, (error) => console.error("Firestore Error:", error));

    const statsDocRef = doc(db, 'artifacts', appId, 'public', 'data', 'appConfig', 'stats');
    const unsubscribeStats = onSnapshot(statsDocRef, (docSnap) => {
      if (docSnap.exists()) setAppStats(docSnap.data());
    }, (error) => console.error("Stats Error:", error));

    return () => {
      unsubscribeMembers();
      unsubscribeStats();
    };
  }, [user]);

  const checkEligibility = (member) => {
    if (!member?.lastDonation) return { status: 'প্রস্তুত', color: 'text-green-600', bg: 'bg-green-100 dark:bg-green-900/40' };
    const last = new Date(member.lastDonation);
    const today = new Date();
    const diffMonths = (today - last) / (1000 * 60 * 60 * 24 * 30);
    const requiredMonths = member.gender === 'মেয়ে' ? 4 : 3;
    return diffMonths >= requiredMonths ? 
      { status: 'প্রস্তুত', color: 'text-green-600', bg: 'bg-green-100 dark:bg-green-900/40' } : 
      { status: 'বিশ্রামে', color: 'text-orange-600', bg: 'bg-orange-100 dark:bg-orange-900/40' };
  };

  const copyToClipboard = (text) => {
    const textArea = document.createElement("textarea");
    textArea.value = text;
    document.body.appendChild(textArea);
    textArea.select();
    try {
      document.execCommand('copy');
    } catch (err) {
      console.error('Copy failed', err);
    }
    document.body.removeChild(textArea);
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    if (!user) return;
    setIsRegistering(true);
    try {
      const statsRef = doc(db, 'artifacts', appId, 'public', 'data', 'appConfig', 'stats');
      const statsSnap = await getDoc(statsRef);
      let lastCodeNum = statsSnap.exists() ? (statsSnap.data().lastCode || 0) : 0;
      
      let nextCodeNum = lastCodeNum + 1;
      await setDoc(statsRef, { ...appStats, lastCode: nextCodeNum }, { merge: true });

      const memberCode = `#LBC${nextCodeNum.toString().padStart(2, '0')}`;
      await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'members', formData.phone), {
        ...formData,
        memberCode: memberCode,
        createdAt: new Date().toISOString()
      }, { merge: true });

      setShowSuccessModal(true);
      setFormData({ name: '', bloodGroup: 'A+', age: '', gender: 'ছেলে', phone: '', lastDonation: '', address: '', designation: 'সদস্য' });
    } catch (err) { console.error(err); }
    setIsRegistering(false);
  };

  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    if (!user || !currentUserData) return;
    setIsUpdating(true);
    try {
      await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'members', currentUserData.phone), currentUserData);
      if (isAdminMode) {
        const statsRef = doc(db, 'artifacts', appId, 'public', 'data', 'appConfig', 'stats');
        await setDoc(statsRef, { beneficiaries: parseInt(appStats.beneficiaries) || 0 }, { merge: true });
      }
      setShowUpdateSuccess(true);
      setTimeout(() => setShowUpdateSuccess(false), 3000);
    } catch (err) { console.error(err); }
    setIsUpdating(false);
  };

  const handleDeleteProfile = async () => {
    if (!user || !profileToDelete) return;
    setIsDeleting(true);
    try {
      await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'members', profileToDelete.phone));
      
      if (currentUserData && currentUserData.phone === profileToDelete.phone) {
        setIsLoggedIn(false);
        setCurrentUserData(null);
        setIsAdminMode(false);
      }
      
      setShowDeleteConfirm(false);
      setProfileToDelete(null);
      setViewProfile(null);
      if (!isLoggedIn) setActiveTab('dashboard');
    } catch (err) {
      console.error("Delete Error:", err);
    }
    setIsDeleting(false);
  };

  const toggleAdminMode = () => {
    if (isAdminMode) {
      setIsAdminMode(false);
    } else {
      setShowAdminPassModal(true);
      setAdminPasswordInput('');
      setAdminPassError(false);
    }
  };

  const verifyAdminPassword = () => {
    if (adminPasswordInput === '7654') {
      setIsAdminMode(true);
      setShowAdminPassModal(false);
      setAdminPassError(false);
      setShowAdminModeNotice(true);
      setTimeout(() => setShowAdminModeNotice(false), 3000);
    } else {
      setAdminPassError(true);
    }
  };

  const inputClasses = `w-full p-4 rounded-2xl border transition-all outline-none focus:border-red-500 ${
    darkMode 
      ? 'bg-zinc-900 border-zinc-700 text-white' 
      : 'bg-white border-gray-200 text-zinc-900 shadow-sm'
  }`;

  const labelClasses = `text-[10px] font-black px-2 uppercase mb-1 block ${
    darkMode ? 'text-zinc-400' : 'text-zinc-500'
  }`;

  const DesignerCard = () => (
    <div className={`p-5 rounded-[28px] border relative overflow-hidden transition-all duration-500 ${darkMode ? 'bg-zinc-800/80 border-zinc-700' : 'bg-white shadow-xl border-gray-100'}`}>
      <div className="shimmer-effect absolute inset-0 pointer-events-none opacity-50"></div>
      <div className="relative z-10">
        <h4 className="text-[9px] font-black uppercase text-red-500 mb-1 tracking-widest flex items-center gap-1.5"><Sparkles size={12}/> App Designer</h4>
        <p className={`font-black text-xl leading-tight mb-0.5 ${darkMode ? 'text-white' : 'text-zinc-900'}`}>Munsur</p>
        <p className="text-[10px] font-bold text-blue-500 mb-3 italic">MBBS student (NMC-18)</p>
        <div className="flex gap-2">
          <a href="https://wa.me/8801929431870" target="_blank" rel="noopener noreferrer" className="flex-1 bg-green-600 text-white py-2.5 rounded-xl flex items-center justify-center gap-1.5 text-[10px] font-black active:scale-95 transition-transform">
            <MessageCircle size={14}/> WhatsApp
          </a>
          <a href="https://www.facebook.com/share/1AU2n7ZyyT/" target="_blank" rel="noopener noreferrer" className="flex-1 bg-blue-600 text-white py-2.5 rounded-xl flex items-center justify-center gap-1.5 text-[10px] font-black active:scale-95 transition-transform">
            <Facebook size={14}/> Facebook
          </a>
        </div>
      </div>
    </div>
  );

  return (
    <div className={`min-h-screen font-sans flex flex-col ${darkMode ? 'bg-black text-zinc-100' : 'bg-white text-zinc-900'} transition-colors duration-300 pb-10`}>
      <header className={`p-4 flex items-center justify-between sticky top-0 z-30 backdrop-blur-md border-b ${darkMode ? 'bg-black/80 border-zinc-800' : 'bg-white/80 border-gray-100'}`}>
        <div className="flex items-center gap-2 cursor-pointer" onClick={() => setActiveTab('dashboard')}>
          <div className="w-10 h-10 bg-red-600 rounded-xl flex items-center justify-center shadow-lg"><HeartPulse className="text-white" size={22} /></div>
          <div>
            <h1 className={`text-base font-black leading-tight ${darkMode ? 'text-white' : 'text-zinc-900'}`}>LifeLine</h1>
            <p className="text-[9px] font-bold text-red-500 uppercase tracking-widest">Blood Circle</p>
          </div>
        </div>
        <div className="flex gap-2 items-center">
          {isAdminMode && <span className="bg-red-600 text-white text-[8px] px-2 py-1 rounded-full font-black animate-pulse">ADMIN</span>}
          <button onClick={() => setDarkMode(!darkMode)} className={`p-2 rounded-xl ${darkMode ? 'bg-zinc-800 text-yellow-400' : 'bg-gray-100 text-zinc-600'}`}>{darkMode ? <Sun size={18}/> : <Moon size={18}/>}</button>
          <button onClick={() => setIsMenuOpen(true)} className="p-2 rounded-xl bg-red-600 text-white shadow-lg active:scale-90 transition-transform"><Menu size={18} /></button>
        </div>
      </header>

      {/* Floating Notifications */}
      <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[200] w-full max-w-[90%] pointer-events-none flex flex-col gap-2">
        {showUpdateSuccess && (
          <div className="bg-green-600 text-white px-6 py-3 rounded-full shadow-2xl flex items-center gap-3 animate-[slideDown_0.3s] mx-auto">
            <CheckCircle size={18}/> <span className="text-[12px] font-black">তথ্য সফলভাবে আপডেট হয়েছে!</span>
          </div>
        )}
        {showAdminModeNotice && (
          <div className="bg-zinc-900 text-white border border-red-500 px-6 py-3 rounded-full shadow-2xl flex items-center gap-3 animate-[slideDown_0.3s] mx-auto">
            <ShieldAlert size={18} className="text-red-500"/> <span className="text-[12px] font-black">এডমিন মোড সক্রিয় হয়েছে!</span>
          </div>
        )}
      </div>

      <main className="flex-1 p-4">
        {!user ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4"><Loader2 className="animate-spin text-red-600" size={40} /></div>
        ) : (
          <>
            {activeTab === 'dashboard' && (
              <div className="space-y-6 animate-[zoomIn_0.2s]">
                <div className="grid grid-cols-2 gap-4">
                  <div onClick={() => { setSelectedGroup(null); setActiveTab('memberList'); }} className={`p-5 rounded-[32px] ${darkMode ? 'bg-zinc-900 border-zinc-800' : 'bg-red-50 border-red-100'} border flex flex-col items-center justify-center cursor-pointer shadow-sm`}>
                    <Droplets className="text-red-500 mb-1" size={28} />
                    <h3 className={`text-[10px] uppercase font-black opacity-60 ${darkMode ? 'text-zinc-400' : 'text-zinc-600'}`}>মোট দাতা</h3>
                    <p className={`text-2xl font-black ${darkMode ? 'text-white' : 'text-zinc-900'}`}>{members.length}</p>
                  </div>
                  <div className={`p-5 rounded-[32px] ${darkMode ? 'bg-zinc-900 border-zinc-800' : 'bg-blue-50 border-blue-100'} border flex flex-col items-center justify-center shadow-sm`}>
                    <Home className="text-blue-500 mb-1" size={28} />
                    <h3 className={`text-[10px] uppercase font-black opacity-60 ${darkMode ? 'text-zinc-400' : 'text-zinc-600'}`}>উপকারভোগী</h3>
                    <p className={`text-2xl font-black ${darkMode ? 'text-white' : 'text-zinc-900'}`}>{appStats.beneficiaries || 0}+</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <button onClick={() => { setSelectedGroup(null); setActiveTab('memberList'); }} className={`p-5 rounded-3xl border flex items-center gap-3 font-black text-sm ${darkMode ? 'bg-zinc-900 border-zinc-800 text-white' : 'bg-white border-gray-100 shadow-sm'}`}><List size={20} className="text-red-600"/> দাতা তালিকা</button>
                  <button onClick={() => setActiveTab('register')} className={`p-5 rounded-3xl border flex items-center gap-3 font-black text-sm ${darkMode ? 'bg-zinc-900 border-zinc-800 text-white' : 'bg-white border-gray-100 shadow-sm'}`}><PlusCircle size={20} className="text-red-600"/> নতুন নিবন্ধন</button>
                </div>

                <div className="space-y-3">
                  <h3 className={`font-black text-sm px-1 flex items-center gap-2 ${darkMode ? 'text-white' : 'text-zinc-900'}`}><Droplets size={18} className="text-red-500"/> রক্তের গ্রুপসমূহ</h3>
                  <div className="grid grid-cols-4 gap-2">
                    {['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'].map(bg => {
                      const count = members.filter(m => m.bloodGroup === bg).length;
                      return (
                        <button key={bg} onClick={() => { setSelectedGroup(bg); setActiveTab('memberList'); }} className={`py-3 rounded-2xl font-black flex flex-col items-center justify-center transition-all ${selectedGroup === bg ? 'bg-red-600 text-white shadow-lg' : (darkMode ? 'bg-zinc-900 border border-zinc-800 text-zinc-300' : 'bg-gray-100 text-zinc-600')}`}>
                          <span className="text-base">{bg}</span>
                          <span className={`text-[9px] font-bold ${selectedGroup === bg ? 'text-white/70' : 'text-zinc-500'}`}>({count})</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-3">
                  <button onClick={() => setActiveTab('whyDonate')} className={`w-full p-6 rounded-[32px] border flex items-center gap-4 transition-all ${darkMode ? 'bg-zinc-900 border-zinc-800 text-white' : 'bg-white border-gray-100 shadow-sm text-zinc-900'}`}>
                    <div className="w-12 h-12 bg-red-100 text-red-600 rounded-2xl flex items-center justify-center shrink-0"><Heart size={24} fill="currentColor"/></div>
                    <div className="text-left"><h3 className="font-black text-sm">কেন রক্তদান করবেন?</h3><p className={`text-[10px] ${darkMode ? 'text-zinc-400' : 'text-zinc-500'}`}>মানবিক ও শারীরিক গুরুত্ব</p></div>
                    <ChevronRight className="ml-auto opacity-30" size={20}/>
                  </button>

                  <button onClick={() => setActiveTab('guide')} className={`w-full p-6 rounded-[32px] border flex items-center gap-4 transition-all ${darkMode ? 'bg-zinc-900 border-zinc-800 text-white' : 'bg-white border-gray-100 shadow-sm text-zinc-900'}`}>
                    <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center shrink-0"><BookOpen size={24}/></div>
                    <div className="text-left"><h3 className="font-black text-sm">অ্যাপ গাইডলাইন</h3><p className={`text-[10px] ${darkMode ? 'text-zinc-400' : 'text-zinc-500'}`}>কিভাবে ব্যবহার করবেন</p></div>
                    <ChevronRight className="ml-auto opacity-30" size={20}/>
                  </button>
                </div>
              </div>
            )}

            {activeTab === 'whyDonate' && (
              <div className="space-y-8 animate-[zoomIn_0.3s] pb-10">
                <div className={`p-8 rounded-[40px] text-center space-y-4 relative overflow-hidden ${darkMode ? 'bg-zinc-900 border border-zinc-800 shadow-lg' : 'bg-gradient-to-br from-red-50 to-white border border-red-100 shadow-xl'}`}>
                  <Quote className="absolute top-4 left-4 opacity-10 text-red-600" size={60} />
                  <h2 className="text-xl font-black text-red-600">সুরা আয-যিলযাল, ৭ নং আয়াত</h2>
                  <p className={`text-lg font-serif italic leading-relaxed ${darkMode ? 'text-zinc-100' : 'text-zinc-800'}`}>"অতএব, কেউ অণু পরিমাণ ভালকাজ করলে তা সে দেখবে।"</p>
                </div>

                <div className="text-center px-4 space-y-4">
                  <h3 className={`text-2xl font-black ${darkMode ? 'text-white' : 'text-zinc-900'}`}>কেন রক্তদান করবেন?</h3>
                  <p className={`text-sm leading-relaxed font-medium ${darkMode ? 'text-zinc-300' : 'text-zinc-600'}`}>
                    রক্ত কে দিচ্ছে—হয়তো মানুষ তা জানবে না, নামও কেউ মনে রাখবে না। কিন্তু আল্লাহ তায়ালা জানেন কে নিঃস্বার্থভাবে দিয়েছেন, কোন নিয়তে দিয়েছেন। নীরবে করা এই দান মানুষের পাশে দাঁড়ানোর এক সুন্দর আমল এবং আল্লাহর সন্তুষ্টি অর্জনের একটি মাধ্যম।
                  </p>
                </div>

                <div className="grid gap-6">
                  <div className="space-y-4">
                    <h3 className="text-lg font-black flex items-center gap-2 text-red-600 px-2"><Activity size={20} /> শারীরিক উপকারিতা :</h3>
                    <div className={`p-6 rounded-[32px] space-y-4 ${darkMode ? 'bg-zinc-900 border border-zinc-800' : 'bg-white shadow-sm border border-gray-100'}`}>
                      {[
                        "হার্ট অ্যাটাক ও স্ট্রোকের ঝুঁকি বহুগুণ কমে।",
                        "শরীরের অতিরিক্ত আয়রন নিয়ন্ত্রণে থাকে।",
                        "রক্তে নতুন কোষ তৈরির গতি কয়েকগুণ বেড়ে যায়।",
                        "শরীরের ওজন নিয়ন্ত্রণে বিশেষ ভূমিকা রাখে।"
                      ].map((text, i) => (
                        <p key={i} className={`text-sm flex items-start gap-3 ${darkMode ? 'text-zinc-200' : 'text-zinc-700'}`}><span className="text-green-500 font-bold">✅</span> {text}</p>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h3 className="text-lg font-black flex items-center gap-2 text-blue-600 px-2"><Heart size={20} /> মানসিক প্রশান্তি :</h3>
                    <div className={`p-6 rounded-[32px] space-y-4 ${darkMode ? 'bg-zinc-900 border border-zinc-800' : 'bg-white shadow-sm border border-gray-100'}`}>
                      {[
                        "বিষণ্নতা কমে এবং আত্মতৃপ্তি বৃদ্ধি পায়।",
                        "অন্যের জীবন বাঁচাতে পারার অতুলনীয় গৌরব।",
                        "সমাজের প্রতি দায়বদ্ধতার এক মহান অনুভূতি।",
                        "নিঃস্বার্থ ভালোবাসার এক অনন্য দৃষ্টান্ত।"
                      ].map((text, i) => (
                        <p key={i} className={`text-sm flex items-start gap-3 ${darkMode ? 'text-zinc-200' : 'text-zinc-700'}`}><span className="text-blue-500 font-bold">✨</span> {text}</p>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex flex-col items-center justify-center gap-4 py-8">
                  <h4 className={`text-lg font-black ${darkMode ? 'text-white' : 'text-zinc-900'}`}>আপনি কি আমাদের সাথে যুক্ত হতে চান?</h4>
                  <button 
                    onClick={() => setActiveTab('register')} 
                    className="relative w-40 h-40 flex items-center justify-center transition-all hover:scale-105 active:scale-90 group"
                  >
                    <Heart size={160} fill="#e11d48" className="text-red-600 filter drop-shadow-2xl animate-heartbeat-sequence"/>
                    <span className="absolute text-white text-3xl font-black mb-2 animate-text-pulse">হ্যাঁ</span>
                  </button>
                </div>

                <button onClick={() => setActiveTab('dashboard')} className={`w-full p-5 rounded-3xl font-black flex items-center justify-center gap-2 ${darkMode ? 'bg-zinc-800 text-white' : 'bg-zinc-100 text-zinc-600'}`}>
                  হোম পেজে ফিরে যান
                </button>
              </div>
            )}

            {activeTab === 'guide' && (
              <div className="space-y-6 animate-[zoomIn_0.3s] pb-10">
                <div className="text-center py-6">
                  <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-3xl flex items-center justify-center mx-auto mb-3"><BookOpen size={32} /></div>
                  <h2 className={`text-2xl font-black ${darkMode ? 'text-white' : 'text-zinc-900'}`}>অ্যাপ গাইডলাইন</h2>
                </div>
                <div className="space-y-4">
                  {[
                    { title: "রক্তের দাতা খোঁজা", text: "প্রয়োজনীয় রক্তের গ্রুপ অনুযায়ী হোম পেজের বাটনগুলোতে ক্লিক করুন। সেখানে সকল যোগ্য দাতার তালিকা পাওয়া যাবে। আপনি চাইলে সার্চ বক্সে নাম, ঠিকানা বা ইউনিক মেম্বার কোড (যেমন: #LBC01) লিখেও দাতা খুঁজতে পারেন।" },
                    { title: "নিবন্ধন প্রক্রিয়া", text: "নিজে দাতা হিসেবে যুক্ত হতে 'নতুন নিবন্ধন' পেজে গিয়ে আপনার সঠিক তথ্যগুলো দিন। ফোন নম্বরটিই আপনার লগইন আইডি হিসেবে ব্যবহৃত হবে।" },
                    { title: "তথ্য আপডেট", text: "আপনার ফোন নম্বর দিয়ে লগইন করে নিজের প্রোফাইল আপডেট করতে পারবেন। বিশেষ করে শেষ রক্তদানের তারিখ সঠিক রাখা জরুরি।" },
                    { title: "নিরাপত্তা ও গোপনীয়তা", text: "নিরাপত্তার স্বার্থে সাধারণ সদস্যরা দাতার ফোন নম্বর দেখতে পাবে না। নম্বর সংগ্রহের জন্য এডমিন প্যানেলে যোগাযোগ করার পরামর্শ দেওয়া হলো।" }
                  ].map((item, i) => (
                    <div key={i} className={`p-6 rounded-[32px] border ${darkMode ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-gray-100 shadow-sm'}`}>
                      <h4 className="font-black text-red-600 mb-2 flex items-center gap-2 text-sm"><CheckCircle size={16}/> {item.title}</h4>
                      <p className={`text-xs leading-relaxed font-medium ${darkMode ? 'text-zinc-300' : 'text-zinc-600'}`}>{item.text}</p>
                    </div>
                  ))}
                </div>
                <button onClick={() => setActiveTab('dashboard')} className={`w-full p-5 rounded-3xl font-black flex items-center justify-center gap-2 ${darkMode ? 'bg-zinc-800 text-white' : 'bg-zinc-100 text-zinc-600'}`}>ফিরে যান</button>
              </div>
            )}

            {activeTab === 'adminPanel' && (
              <div className="space-y-6 animate-[zoomIn_0.3s] pb-10">
                <div className="text-center py-6">
                  <div className="w-16 h-16 bg-red-100 text-red-600 rounded-3xl flex items-center justify-center mx-auto mb-3"><Star size={32} /></div>
                  <h2 className={`text-2xl font-black ${darkMode ? 'text-white' : 'text-zinc-900'}`}>এডমিন প্যানেল</h2>
                </div>
                <div className="space-y-4">
                  {members.filter(m => m.designation && m.designation !== 'সদস্য').map(m => (
                    <div key={m.phone} className={`p-5 rounded-[32px] border flex items-center gap-4 ${darkMode ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-gray-100 shadow-sm'}`}>
                      <div className="w-12 h-12 bg-red-600 text-white rounded-2xl flex items-center justify-center font-black text-sm shrink-0">{m.bloodGroup}</div>
                      <div className="flex-1 min-w-0">
                        <h4 className={`font-black text-sm truncate ${darkMode ? 'text-white' : 'text-zinc-900'}`}>{m.name}</h4>
                        <p className="text-[10px] font-black text-red-500 uppercase">{m.designation}</p>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => copyToClipboard(m.phone)} className="p-2.5 bg-gray-100 dark:bg-zinc-800 rounded-xl text-zinc-500"><Copy size={16}/></button>
                        <a href={`tel:${m.phone}`} className="p-2.5 bg-green-100 text-green-600 rounded-xl"><Phone size={16}/></a>
                      </div>
                    </div>
                  ))}
                </div>
                <button onClick={() => setActiveTab('dashboard')} className="w-full p-4 rounded-2xl bg-zinc-800 text-white font-bold">ফিরে যান</button>
              </div>
            )}

            {activeTab === 'register' && (
              <form onSubmit={handleRegister} className="space-y-4 animate-[zoomIn_0.2s] pb-10">
                <h2 className="text-2xl font-black text-red-600 mb-4">নতুন নিবন্ধন</h2>
                
                <div className={`p-4 rounded-[24px] flex items-start gap-3 border ${darkMode ? 'bg-blue-500/10 border-blue-500/30 text-blue-400' : 'bg-blue-50 border-blue-100 text-blue-700'} mb-6`}>
                  <Info size={18} className="shrink-0 mt-0.5" />
                  <p className="text-[11px] font-bold leading-relaxed">
                    এই তথ্যগুলো অত্যন্ত গুরুত্বপূর্ণ, তাই মানবিকতার বোধ থেকে সঠিক তথ্য দিন। আপনার দেওয়া ভুল তথ্য কারো বিপদের কারণ হতে পারে।
                  </p>
                </div>

                <div className="space-y-4">
                  <div className="space-y-1"><label className={labelClasses}>পূর্ণ নাম</label><input required className={inputClasses} value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} /></div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1"><label className={labelClasses}>রক্তের গ্রুপ</label><select className={inputClasses} value={formData.bloodGroup} onChange={e => setFormData({...formData, bloodGroup: e.target.value})}>{['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'].map(g => <option key={g} value={g}>{g}</option>)}</select></div>
                    <div className="space-y-1"><label className={labelClasses}>বয়স</label><input required type="number" className={inputClasses} value={formData.age} onChange={e => setFormData({...formData, age: e.target.value})} /></div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1"><label className={labelClasses}>লিঙ্গ</label><select className={inputClasses} value={formData.gender} onChange={e => setFormData({...formData, gender: e.target.value})}><option value="ছেলে">ছেলে</option><option value="মেয়ে">মেয়ে</option></select></div>
                    <div className="space-y-1"><label className={labelClasses}>ফোন নম্বর</label><input required type="tel" className={inputClasses} value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} /></div>
                  </div>
                  <div className="space-y-1"><label className={labelClasses}>শেষ রক্তদান</label><input type="date" className={inputClasses} value={formData.lastDonation} onChange={e => setFormData({...formData, lastDonation: e.target.value})} /></div>
                  {isAdminMode && (
                    <div className="space-y-1 animate-pulse">
                      <label className={`${labelClasses} text-red-600`}>পদবী (এডমিন স্পেশাল)</label>
                      <input className={`${inputClasses} border-red-500`} placeholder="উদা: এডমিন, মডারেটর" value={formData.designation} onChange={e => setFormData({...formData, designation: e.target.value})} />
                    </div>
                  )}
                  <div className="space-y-1"><label className={labelClasses}>বর্তমান ঠিকানা</label><textarea required className={`${inputClasses} min-h-[100px]`} value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} /></div>
                </div>
                <button type="submit" disabled={isRegistering} className="w-full bg-red-600 text-white p-5 rounded-[28px] font-black shadow-xl shadow-red-500/30 flex items-center justify-center gap-2 mt-6">{isRegistering ? <Loader2 className="animate-spin"/> : "নিবন্ধন সম্পন্ন করুন"}</button>
              </form>
            )}

            {activeTab === 'login' && (
              <div className="pt-6 animate-[zoomIn_0.2s]">
                {isLoggedIn && currentUserData ? (
                  <form onSubmit={handleProfileUpdate} className="space-y-6">
                    <div className="text-center space-y-2">
                      <div className="w-24 h-24 bg-red-600 text-white rounded-[32px] mx-auto flex items-center justify-center text-4xl font-black">{currentUserData.bloodGroup}</div>
                      <h2 className={`text-2xl font-black ${darkMode ? 'text-white' : 'text-zinc-900'}`}>প্রোফাইল আপডেট</h2>
                    </div>

                    <div className={`p-6 rounded-[40px] space-y-4 ${darkMode ? 'bg-zinc-900 border border-zinc-800' : 'bg-gray-50 border border-gray-100'}`}>
                      <div className="space-y-1"><label className={labelClasses}>নাম</label><input className={inputClasses} value={currentUserData.name} onChange={e => setCurrentUserData({...currentUserData, name: e.target.value})} /></div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1"><label className={labelClasses}>বয়স</label><input type="number" className={inputClasses} value={currentUserData.age} onChange={e => setCurrentUserData({...currentUserData, age: e.target.value})} /></div>
                        <div className="space-y-1"><label className={labelClasses}>রক্তের গ্রুপ</label><select className={inputClasses} value={currentUserData.bloodGroup} onChange={e => setCurrentUserData({...currentUserData, bloodGroup: e.target.value})}>{['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'].map(g => <option key={g} value={g}>{g}</option>)}</select></div>
                      </div>
                      <div className="space-y-1"><label className={labelClasses}>শেষ রক্তদান</label><input type="date" className={inputClasses} value={currentUserData.lastDonation || ''} onChange={e => setCurrentUserData({...currentUserData, lastDonation: e.target.value})} /></div>
                      <div className="space-y-1"><label className={labelClasses}>ঠিকানা</label><input className={inputClasses} value={currentUserData.address} onChange={e => setCurrentUserData({...currentUserData, address: e.target.value})} /></div>
                    </div>

                    <div className={`p-6 rounded-[40px] border flex items-center justify-between ${darkMode ? 'bg-zinc-900 border-zinc-800' : 'bg-zinc-50 border-gray-100'}`}>
                      <div className="flex items-center gap-3">
                        <div className={`p-3 rounded-2xl ${isAdminMode ? 'bg-red-600 text-white' : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-500'}`}>
                          <Star size={20} fill={isAdminMode ? "white" : "none"}/>
                        </div>
                        <div>
                          <h4 className={`text-sm font-black ${darkMode ? 'text-white' : 'text-zinc-900'}`}>এডমিন মোড</h4>
                          <p className="text-[10px] font-bold text-zinc-500">স্পেশাল এক্সেস ও কন্ট্রোল</p>
                        </div>
                      </div>
                      <button 
                        type="button"
                        onClick={toggleAdminMode}
                        className={`w-14 h-7 rounded-full transition-all relative ${isAdminMode ? 'bg-red-600' : 'bg-zinc-300 dark:bg-zinc-700'}`}
                      >
                        <div className={`absolute top-1 w-5 h-5 bg-white rounded-full transition-all shadow-md ${isAdminMode ? 'right-1' : 'left-1'}`}></div>
                      </button>
                    </div>

                    {isAdminMode && (
                      <div className={`p-6 rounded-[40px] border border-red-500 bg-red-500/5 space-y-4 animate-[fadeIn_0.3s]`}>
                        <h4 className="font-black text-xs uppercase text-red-500 flex items-center gap-2"><Sparkles size={14}/> এডমিন কন্ট্রোল প্যানেল</h4>
                        <div className="space-y-1"><label className={labelClasses}>উপকারভোগী সংখ্যা</label><input type="number" className={inputClasses} value={appStats.beneficiaries} onChange={e => setAppStats({...appStats, beneficiaries: e.target.value})} /></div>
                        <div className="space-y-1"><label className={labelClasses}>পদবী পরিবর্তন</label><input className={inputClasses} value={currentUserData.designation} onChange={e => setCurrentUserData({...currentUserData, designation: e.target.value})} /></div>
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-3">
                      <button type="submit" disabled={isUpdating} className="bg-red-600 text-white p-5 rounded-[28px] font-black flex items-center justify-center gap-2 shadow-lg shadow-red-500/20 active:scale-95 transition-transform">{isUpdating ? <Loader2 size={20} className="animate-spin"/> : <Save size={20}/>} সেভ করুন</button>
                      <button type="button" onClick={() => { setIsLoggedIn(false); setIsAdminMode(false); }} className={`p-5 rounded-[28px] font-black ${darkMode ? 'bg-zinc-800 text-zinc-400' : 'bg-zinc-100 text-zinc-600'}`}>লগ আউট</button>
                    </div>

                    <button 
                      type="button" 
                      onClick={() => { setProfileToDelete(currentUserData); setShowDeleteConfirm(true); }}
                      className="w-full p-4 rounded-2xl flex items-center justify-center gap-2 text-red-500 font-black text-xs uppercase tracking-widest mt-4 opacity-70 hover:opacity-100 transition-opacity"
                    >
                      <Trash2 size={16}/> প্রোফাইল ডিলিট করুন
                    </button>
                  </form>
                ) : (
                  <div className="space-y-8 text-center pt-10">
                    <div className="w-24 h-24 bg-red-600/10 text-red-600 rounded-[32px] mx-auto flex items-center justify-center mb-4 ring-8 ring-red-600/5 animate-pulse"><Fingerprint size={48}/></div>
                    <div className="space-y-2">
                      <h2 className={`text-4xl font-black ${darkMode ? 'text-white' : 'text-zinc-900'}`}>লগইন</h2>
                      <p className={`text-sm font-medium ${darkMode ? 'text-zinc-400' : 'text-zinc-500'}`}>আপনার ফোন নম্বর দিয়ে এক্সেস করুন</p>
                    </div>
                    <div className="space-y-4">
                      <input 
                        className={`w-full p-6 rounded-[28px] border-2 transition-all focus:border-red-600 outline-none text-center font-black text-2xl tracking-widest ${
                          darkMode 
                            ? 'bg-zinc-900 border-zinc-800 text-white placeholder-zinc-700' 
                            : 'bg-white border-gray-100 text-zinc-900 placeholder-gray-300 shadow-xl'
                        }`} 
                        type="tel" 
                        placeholder="01XXX-XXXXXX" 
                        value={loginPhone} 
                        onChange={e => setLoginPhone(e.target.value)} 
                      />
                      <button 
                        onClick={() => { 
                          const m = members.find(x => x.phone === loginPhone); 
                          if(m){
                            setIsLoggedIn(true); 
                            setCurrentUserData(m); 
                            setLoginPhone('');
                          } else { 
                            alert("নিবন্ধন পাওয়া যায়নি।"); 
                          } 
                        }} 
                        className="w-full bg-red-600 text-white p-6 rounded-[28px] font-black shadow-2xl shadow-red-500/40 text-lg active:scale-95 transition-transform"
                      >
                        প্রবেশ করুন
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'memberList' && (
              <div className="space-y-4 animate-[zoomIn_0.2s]">
                <div className={`flex items-center gap-3 px-5 py-4 rounded-[28px] border ${darkMode ? 'bg-zinc-900 border-zinc-800 shadow-inner text-white' : 'bg-gray-50 border-gray-100 shadow-inner text-zinc-900'}`}>
                  <Search size={20} className="opacity-40" /><input type="text" placeholder="নাম, ঠিকানা, ফোন বা মেম্বার কোড..." className="bg-transparent outline-none w-full text-sm font-bold" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
                  {selectedGroup && (
                    <button onClick={() => setSelectedGroup(null)} className="bg-red-100 text-red-600 px-2 py-1 rounded-lg text-[10px] font-black flex items-center gap-1">{selectedGroup} <X size={12}/></button>
                  )}
                </div>
                <div className="space-y-3">
                  {members.filter(m => {
                    const q = searchQuery.toLowerCase();
                    const matchesSearch = 
                      (m.name || '').toLowerCase().includes(q) || 
                      (m.address || '').toLowerCase().includes(q) || 
                      (m.phone || '').includes(q) ||
                      (m.memberCode || '').toLowerCase().includes(q);
                    const matchesGroup = selectedGroup ? m.bloodGroup === selectedGroup : true;
                    return matchesSearch && matchesGroup;
                  }).sort((a,b) => {
                    const codeA = parseInt(a.memberCode?.replace('#LBC', '')) || 0;
                    const codeB = parseInt(b.memberCode?.replace('#LBC', '')) || 0;
                    return codeA - codeB;
                  }).map(m => {
                    const status = checkEligibility(m);
                    return (
                      <div key={m.phone} onClick={() => setViewProfile(m)} className="p-4 rounded-[28px] border dark:bg-zinc-900 dark:border-zinc-800 flex items-center gap-4 active:scale-95 transition-all relative">
                        <div className="w-14 h-14 rounded-[20px] bg-red-100 text-red-600 flex items-center justify-center font-black text-xl shrink-0 shadow-sm">{m.bloodGroup}</div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <h4 className={`font-black text-sm truncate ${darkMode ? 'text-white' : 'text-zinc-900'}`}>{m.name}</h4>
                            <span className={`text-[9px] font-black px-2.5 py-1 rounded-full ${status.bg} ${status.color}`}>{status.status}</span>
                          </div>
                          <p className={`text-[10px] font-bold opacity-60 flex items-center gap-1.5 truncate ${darkMode ? 'text-zinc-400' : 'text-zinc-500'}`}><MapPin size={10}/> {m.address}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        )}
      </main>

      {/* MODALS */}
      {viewProfile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm" onClick={() => setViewProfile(null)}>
          <div className={`w-full max-sm rounded-[40px] overflow-hidden animate-[zoomIn_0.2s] ${darkMode ? 'bg-zinc-900' : 'bg-white'}`} onClick={e => e.stopPropagation()}>
            <div className="h-28 bg-red-600 flex items-end justify-center relative">
               <button onClick={() => setViewProfile(null)} className="absolute top-4 right-4 bg-black/20 text-white p-2 rounded-full transition-colors hover:bg-black/40"><X size={18}/></button>
               <div className="w-24 h-24 rounded-[32px] absolute top-14 border-8 border-white bg-white dark:bg-zinc-800 dark:border-zinc-900 flex items-center justify-center text-4xl font-black text-red-600 shadow-2xl">{viewProfile.bloodGroup}</div>
            </div>
            <div className="pt-16 pb-8 px-8 text-center space-y-6">
              <div className="space-y-1">
                 <h3 className={`text-2xl font-black ${darkMode ? 'text-white' : 'text-zinc-900'}`}>{viewProfile.name}</h3>
                 <p className="text-[11px] font-black text-red-500 uppercase tracking-widest">{viewProfile.memberCode} | {viewProfile.designation || 'সদস্য'}</p>
              </div>
              <div className={`p-6 rounded-[32px] text-left text-xs space-y-4 border ${darkMode ? 'bg-zinc-950 border-zinc-800' : 'bg-gray-50 border-gray-100'}`}>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col"><span className="opacity-50 block text-[9px] font-black uppercase mb-1">জেন্ডার</span><p className={`font-black text-sm ${darkMode ? 'text-zinc-100' : 'text-zinc-900'}`}>{viewProfile.gender}</p></div>
                  <div className="flex flex-col"><span className="opacity-50 block text-[9px] font-black uppercase mb-1">বয়স</span><p className={`font-black text-sm ${darkMode ? 'text-zinc-100' : 'text-zinc-900'}`}>{viewProfile.age} বছর</p></div>
                </div>
                <div className="flex items-center gap-3"><Activity size={16} className="text-green-500 shrink-0"/><p className={darkMode ? 'text-zinc-100' : 'text-zinc-900'}><span className="opacity-50 block text-[9px] font-black uppercase mb-0.5">রক্তদানের স্থিতি</span><span className={`font-black ${checkEligibility(viewProfile).color}`}>{checkEligibility(viewProfile).status}</span></p></div>
                <div className="flex items-start gap-3"><MapPin size={16} className="text-red-500 shrink-0"/><p className={darkMode ? 'text-zinc-100' : 'text-zinc-900'}><span className="opacity-50 block text-[9px] font-black uppercase mb-0.5">ঠিকানা</span>{viewProfile.address}</p></div>
                <div className="flex items-center gap-3"><Calendar size={16} className="text-orange-500 shrink-0"/><p className={darkMode ? 'text-zinc-100' : 'text-zinc-900'}><span className="opacity-50 block text-[9px] font-black uppercase mb-0.5">শেষ রক্তদান</span>{viewProfile.lastDonation || 'তথ্য নেই'}</p></div>
                
                <div className={`pt-4 border-t ${darkMode ? 'border-zinc-800' : 'border-black/5'}`}>
                  { (isAdminMode || (viewProfile.designation && viewProfile.designation !== 'সদস্য')) ? (
                    <div className="flex items-center justify-between">
                      <div className={`flex items-center gap-3 font-black text-sm ${darkMode ? 'text-white' : 'text-zinc-900'}`}><Phone size={16} className="text-green-500"/>{viewProfile.phone}</div>
                      <div className="flex gap-2">
                        <button onClick={() => copyToClipboard(viewProfile.phone)} className="p-2.5 bg-gray-100 dark:bg-zinc-800 rounded-xl text-zinc-500 transition-colors hover:bg-gray-200 dark:hover:bg-zinc-700"><Copy size={16}/></button>
                        <a href={`tel:${viewProfile.phone}`} className="p-2.5 bg-green-100 text-green-600 rounded-xl transition-colors hover:bg-green-200"><Phone size={16}/></a>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="flex items-start gap-3 p-3 rounded-2xl bg-amber-50 dark:bg-amber-900/20 border border-amber-100">
                        <ShieldAlert className="text-amber-500 shrink-0" size={16}/>
                        <p className="text-[10px] font-bold text-amber-700 leading-relaxed">নিরাপত্তার স্বার্থে দাতার নম্বর গোপন রাখা হয়েছে। নম্বর পাওয়ার জন্য এডমিন প্যানেলে যোগাযোগ করুন।</p>
                      </div>
                      <button onClick={() => { setViewProfile(null); setActiveTab('adminPanel'); }} className="w-full py-3 rounded-xl bg-blue-600 text-white text-[10px] font-black flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20 transition-transform active:scale-95">এডমিন প্যানেলে কথা বলুন <ArrowRight size={14}/></button>
                    </div>
                  )}
                </div>
              </div>
              
              <div className="grid grid-cols-1 gap-3">
                { (isAdminMode || (viewProfile.designation && viewProfile.designation !== 'সদস্য')) && (
                  <a href={`tel:${viewProfile.phone}`} className="w-full bg-green-600 text-white p-5 rounded-[24px] font-black flex items-center justify-center gap-2 shadow-lg shadow-green-600/20 active:scale-95 transition-transform"><Phone size={20} /> কল করুন</a>
                )}
                
                { isAdminMode && (
                  <button 
                    onClick={() => { setProfileToDelete(viewProfile); setShowDeleteConfirm(true); }}
                    className="w-full p-4 rounded-2xl flex items-center justify-center gap-2 text-red-500 font-black text-xs uppercase tracking-widest opacity-70 hover:opacity-100 transition-opacity"
                  >
                    <Trash2 size={16}/> প্রোফাইল ডিলিট (ADMIN)
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SIDEBAR */}
      <div className={`fixed inset-0 z-50 transition-all duration-300 ${isMenuOpen ? 'bg-black/60 opacity-100 visible' : 'opacity-0 invisible pointer-events-none'}`} onClick={() => setIsMenuOpen(false)}>
        <div className={`absolute top-0 right-0 w-80 h-full p-6 transition-transform duration-500 flex flex-col ${darkMode ? 'bg-zinc-900' : 'bg-white shadow-2xl'} ${isMenuOpen ? 'translate-x-0' : 'translate-x-full'}`} onClick={e => e.stopPropagation()}>
          <div className="flex justify-between items-center mb-10"><h2 className={`text-2xl font-black ${darkMode ? 'text-white' : 'text-zinc-900'}`}>মেনু</h2><button onClick={() => setIsMenuOpen(false)} className="p-2.5 bg-red-50 text-red-600 rounded-full"><X size={24}/></button></div>
          <div className="space-y-2 overflow-y-auto">
            {[
              {id:'dashboard',label:'হোম পেজ',icon:<Home size={20}/>},
              {id:'whyDonate',label:'কেন রক্ত দেবেন',icon:<Heart size={20}/>},
              {id:'guide',label:'অ্যাপ গাইড',icon:<BookOpen size={20}/>},
              {id:'memberList',label:'দাতা তালিকা',icon:<List size={20}/>},
              {id:'register',label:'নিবন্ধন করুন',icon:<PlusCircle size={20}/>},
              {id:'login',label:isLoggedIn?'আমার প্রোফাইল':'লগইন',icon:<Fingerprint size={20}/>}
            ].map(i=>(
              <button key={i.id} onClick={()=>{setActiveTab(i.id);setIsMenuOpen(false);}} className={`w-full p-5 rounded-[24px] flex items-center gap-4 font-black transition-all ${activeTab===i.id?'bg-red-600 text-white shadow-xl shadow-red-500/20':'text-zinc-500 hover:bg-gray-100 dark:hover:bg-zinc-800'}`}>{i.icon} <span className="text-sm">{i.label}</span></button>
            ))}
          </div>
          <div className="mt-auto pt-6">
            <DesignerCard />
          </div>
        </div>
      </div>

      {/* Admin Password Modal */}
      {showAdminPassModal && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-6 bg-black/70 backdrop-blur-md">
          <div className={`w-full max-w-xs p-8 rounded-[40px] text-center space-y-6 animate-[zoomIn_0.2s] ${darkMode ? 'bg-zinc-900 border border-zinc-800' : 'bg-white shadow-2xl'}`}>
            <div className="w-16 h-16 bg-red-100 text-red-600 rounded-3xl flex items-center justify-center mx-auto"><KeyRound size={32}/></div>
            <div className="space-y-2">
              <h3 className={`text-xl font-black ${darkMode ? 'text-white' : 'text-zinc-900'}`}>এডমিন ভেরিফিকেশন</h3>
              <p className="text-[10px] font-bold text-zinc-500">অব্যাহত রাখতে পাসওয়ার্ড দিন</p>
            </div>
            <div className="space-y-4">
              <input 
                type="password" 
                className={`w-full p-4 rounded-2xl border-2 text-center text-xl font-black tracking-widest outline-none transition-all ${adminPassError ? 'border-red-500 shake-animation' : (darkMode ? 'bg-zinc-800 border-zinc-700 text-white' : 'bg-gray-50 border-gray-100 text-zinc-900')}`} 
                placeholder="••••"
                value={adminPasswordInput}
                onChange={(e) => {setAdminPasswordInput(e.target.value); setAdminPassError(false);}}
                onKeyDown={(e) => e.key === 'Enter' && verifyAdminPassword()}
              />
              {adminPassError && <p className="text-[10px] font-bold text-red-500">ভুল পাসওয়ার্ড, আবার চেষ্টা করুন!</p>}
              <div className="flex gap-2">
                <button onClick={() => setShowAdminPassModal(false)} className={`flex-1 p-4 rounded-2xl font-black text-sm ${darkMode ? 'bg-zinc-800 text-zinc-400' : 'bg-gray-100 text-zinc-500'}`}>বাতিল</button>
                <button onClick={verifyAdminPassword} className="flex-1 p-4 rounded-2xl bg-red-600 text-white font-black text-sm shadow-lg shadow-red-500/20">ভেরিফাই</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showDeleteConfirm && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-6 bg-black/80 backdrop-blur-md">
          <div className={`w-full max-w-xs p-8 rounded-[40px] text-center space-y-6 animate-[zoomIn_0.2s] ${darkMode ? 'bg-zinc-900 border border-zinc-800' : 'bg-white shadow-2xl'}`}>
            <div className="w-16 h-16 bg-red-100 text-red-600 rounded-3xl flex items-center justify-center mx-auto"><AlertTriangle size={32}/></div>
            <div className="space-y-2">
              <h3 className={`text-xl font-black ${darkMode ? 'text-white' : 'text-zinc-900'}`}>আপনি কি নিশ্চিত?</h3>
              <p className="text-[10px] font-bold text-zinc-500 leading-relaxed">প্রোফাইল ডিলিট করলে সকল তথ্য দাতা তালিকা থেকে মুছে যাবে এবং এটি আর ফিরে পাওয়া সম্ভব নয়।</p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => { setShowDeleteConfirm(false); setProfileToDelete(null); }} className={`flex-1 p-4 rounded-2xl font-black text-xs ${darkMode ? 'bg-zinc-800 text-zinc-400' : 'bg-gray-100 text-zinc-500'}`}>না, থাক</button>
              <button 
                onClick={handleDeleteProfile} 
                disabled={isDeleting}
                className="flex-1 p-4 rounded-2xl bg-red-600 text-white font-black text-xs shadow-lg shadow-red-500/20 flex items-center justify-center gap-2"
              >
                {isDeleting ? <Loader2 size={14} className="animate-spin"/> : <Trash2 size={14}/>} হ্যাঁ, ডিলিট করুন
              </button>
            </div>
          </div>
        </div>
      )}

      {showSuccessModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm">
          <div className={`w-full max-w-xs p-10 rounded-[40px] text-center space-y-6 animate-[zoomIn_0.3s] ${darkMode ? 'bg-zinc-900 border border-zinc-800' : 'bg-white shadow-2xl'}`}>
             <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto text-green-600 ring-8 ring-green-100/50"><CheckCircle size={40}/></div>
             <div className="space-y-3">
               <h3 className={`text-xl font-black leading-tight ${darkMode ? 'text-white' : 'text-zinc-900'}`}>আলহামদুলিল্লাহ! নিবন্ধন সফল হয়েছে।</h3>
               <p className={`text-sm font-bold ${darkMode ? 'text-zinc-400' : 'text-zinc-600'}`}>LifeLine Blood Circle পরিবারে আপনাকে স্বাগতম ❤️।</p>
             </div>
             <button onClick={() => { setShowSuccessModal(false); setActiveTab('memberList'); }} className="w-full bg-red-600 text-white p-5 rounded-[24px] font-black shadow-lg shadow-red-500/30 active:scale-95 transition-transform">দাতা তালিকা দেখুন</button>
          </div>
        </div>
      )}

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes zoomIn { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideDown { from { opacity: 0; transform: translate(-50%, -20px); } to { opacity: 1; transform: translate(-50%, 0); } }
        @keyframes shimmer { 0% { transform: translateX(-150%) skewX(-20deg); } 100% { transform: translateX(150%) skewX(-20deg); } }
        @keyframes shake { 0%, 100% { transform: translateX(0); } 25% { transform: translateX(-5px); } 75% { transform: translateX(5px); } }
        
        @keyframes heartbeatSequence {
          0% { transform: scale(1); }
          10% { transform: scale(1.15); }
          20% { transform: scale(1); }
          30% { transform: scale(1.25); }
          45% { transform: scale(1); }
          100% { transform: scale(1); }
        }

        @keyframes textPulse {
          0% { transform: scale(1); opacity: 1; }
          30% { transform: scale(1.1); opacity: 0.9; }
          45% { transform: scale(1); opacity: 1; }
          100% { transform: scale(1); opacity: 1; }
        }

        .animate-heartbeat-sequence {
          animation: heartbeatSequence 1.5s ease-in-out infinite;
          transform-origin: center;
        }

        .animate-text-pulse {
          animation: textPulse 1.5s ease-in-out infinite;
        }

        .shake-animation { animation: shake 0.2s ease-in-out 0s 2; }
        body { -webkit-tap-highlight-color: transparent; scroll-behavior: smooth; }
        .shimmer-effect { position: absolute; top: 0; left: 0; width: 60%; height: 100%; background: linear-gradient(to right, transparent, rgba(255, 255, 255, 0.3), transparent); animation: shimmer 4s infinite; z-index: 1; pointer-events: none; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-thumb { background: #e11d48; border-radius: 10px; }
      `}} />
    </div>
  );
  }
