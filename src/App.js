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

// Firebase initialization (Updated with your new config)
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

  const [showUpdateSuccess, setShowUpdateSuccess] = useState(false);
  const [showAdminModeNotice, setShowAdminModeNotice] = useState(false);

  const [formData, setFormData] = useState({
    name: '', bloodGroup: 'A+', age: '', gender: 'ছেলে', phone: '', lastDonation: '', address: '', designation: 'সদস্য'
  });

  useEffect(() => {
    const initAuth = async () => {
      try {
        await signInAnonymously(auth);
      } catch (err) {
        console.error("Auth error:", err);
      }
    };
    initAuth();
    const unsubscribe = onAuthStateChanged(auth, (u) => setUser(u));
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;
    
    // Simplified Collection Paths for direct access
    const membersCollection = collection(db, 'members');
    const unsubscribeMembers = onSnapshot(membersCollection, (snapshot) => {
      const membersList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setMembers(membersList);
    }, (error) => console.error("Firestore Error:", error));

    const statsDocRef = doc(db, 'config', 'stats');
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
    navigator.clipboard.writeText(text).catch(err => console.error('Copy failed', err));
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    if (!user) return;
    setIsRegistering(true);
    try {
      const statsRef = doc(db, 'config', 'stats');
      const statsSnap = await getDoc(statsRef);
      let lastCodeNum = statsSnap.exists() ? (statsSnap.data().lastCode || 0) : 0;
      
      let nextCodeNum = lastCodeNum + 1;
      await setDoc(statsRef, { ...appStats, lastCode: nextCodeNum }, { merge: true });

      const memberCode = `#LBC${nextCodeNum.toString().padStart(2, '0')}`;
      await setDoc(doc(db, 'members', formData.phone), {
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
      await updateDoc(doc(db, 'members', currentUserData.phone), currentUserData);
      if (isAdminMode) {
        const statsRef = doc(db, 'config', 'stats');
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
      await deleteDoc(doc(db, 'members', profileToDelete.phone));
      if (currentUserData && currentUserData.phone === profileToDelete.phone) {
        setIsLoggedIn(false);
        setCurrentUserData(null);
        setIsAdminMode(false);
      }
      setShowDeleteConfirm(false);
      setProfileToDelete(null);
      setViewProfile(null);
      if (!isLoggedIn) setActiveTab('dashboard');
    } catch (err) { console.error("Delete Error:", err); }
    setIsDeleting(false);
  };

  const toggleAdminMode = () => {
    if (isAdminMode) setIsAdminMode(false);
    else {
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
    } else setAdminPassError(true);
  };

  const inputClasses = `w-full p-4 rounded-2xl border transition-all outline-none focus:border-red-500 ${darkMode ? 'bg-zinc-900 border-zinc-700 text-white' : 'bg-white border-gray-200 text-zinc-900 shadow-sm'}`;
  const labelClasses = `text-[10px] font-black px-2 uppercase mb-1 block ${darkMode ? 'text-zinc-400' : 'text-zinc-500'}`;

  const DesignerCard = () => (
    <div className={`p-5 rounded-[28px] border relative overflow-hidden transition-all duration-500 ${darkMode ? 'bg-zinc-800/80 border-zinc-700' : 'bg-white shadow-xl border-gray-100'}`}>
      <div className="shimmer-effect absolute inset-0 pointer-events-none opacity-50"></div>
      <div className="relative z-10">
        <h4 className="text-[9px] font-black uppercase text-red-500 mb-1 tracking-widest flex items-center gap-1.5"><Sparkles size={12}/> App Designer</h4>
        <p className={`font-black text-xl leading-tight mb-0.5 ${darkMode ? 'text-white' : 'text-zinc-900'}`}>Munsur</p>
        <p className="text-[10px] font-bold text-blue-500 mb-3 italic">MBBS student (NMC-18)</p>
        <div className="flex gap-2">
          <a href="https://wa.me/8801929431870" target="_blank" rel="noopener noreferrer" className="flex-1 bg-green-600 text-white py-2.5 rounded-xl flex items-center justify-center gap-1.5 text-[10px] font-black active:scale-95 transition-transform"><MessageCircle size={14}/> WhatsApp</a>
          <a href="https://www.facebook.com/share/1AU2n7ZyyT/" target="_blank" rel="noopener noreferrer" className="flex-1 bg-blue-600 text-white py-2.5 rounded-xl flex items-center justify-center gap-1.5 text-[10px] font-black active:scale-95 transition-transform"><Facebook size={14}/> Facebook</a>
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

      {/* Notifications */}
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

            {activeTab === 'register' && (
              <form onSubmit={handleRegister} className="space-y-4 animate-[zoomIn_0.2s] pb-10">
                <h2 className="text-2xl font-black text-red-600 mb-4">নতুন নিবন্ধন</h2>
                <div className={`p-4 rounded-[24px] flex items-start gap-3 border ${darkMode ? 'bg-blue-500/10 border-blue-500/30 text-blue-400' : 'bg-blue-50 border-blue-100 text-blue-700'} mb-6`}>
                  <Info size={18} className="shrink-0 mt-0.5" />
                  <p className="text-[11px] font-bold leading-relaxed">এই তথ্যগুলো অত্যন্ত গুরুত্বপূর্ণ, তাই মানবিকতার বোধ থেকে সঠিক তথ্য দিন।</p>
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
                  <div className="space-y-1"><label className={labelClasses}>বর্তমান ঠিকানা</label><textarea required className={`${inputClasses} min-h-[100px]`} value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} /></div>
                </div>
                <button type="submit" disabled={isRegistering} className="w-full bg-red-600 text-white p-5 rounded-[28px] font-black shadow-xl shadow-red-500/30 flex items-center justify-center gap-2 mt-6">{isRegistering ? <Loader2 className="animate-spin"/> : "নিবন্ধন সম্পন্ন করুন"}</button>
              </form>
            )}

            {/* Login, MemberList, Modals continue as in your original design */}
            {activeTab === 'memberList' && (
              <div className="space-y-4 animate-[zoomIn_0.2s]">
                <div className={`flex items-center gap-3 px-5 py-4 rounded-[28px] border ${darkMode ? 'bg-zinc-900 border-zinc-800 shadow-inner text-white' : 'bg-gray-50 border-gray-100 shadow-inner text-zinc-900'}`}>
                  <Search size={20} className="opacity-40" /><input type="text" placeholder="নাম, ঠিকানা, ফোন বা মেম্বার কোড..." className="bg-transparent outline-none w-full text-sm font-bold" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
                </div>
                <div className="space-y-3">
                  {members.filter(m => {
                    const q = searchQuery.toLowerCase();
                    const matchesSearch = (m.name || '').toLowerCase().includes(q) || (m.address || '').toLowerCase().includes(q) || (m.phone || '').includes(q) || (m.memberCode || '').toLowerCase().includes(q);
                    const matchesGroup = selectedGroup ? m.bloodGroup === selectedGroup : true;
                    return matchesSearch && matchesGroup;
                  }).map(m => (
                    <div key={m.phone} onClick={() => setViewProfile(m)} className="p-4 rounded-[28px] border dark:bg-zinc-900 dark:border-zinc-800 flex items-center gap-4 active:scale-95 transition-all relative">
                      <div className="w-14 h-14 rounded-[20px] bg-red-100 text-red-600 flex items-center justify-center font-black text-xl shrink-0">{m.bloodGroup}</div>
                      <div className="flex-1 min-w-0">
                        <h4 className={`font-black text-sm truncate ${darkMode ? 'text-white' : 'text-zinc-900'}`}>{m.name}</h4>
                        <p className="text-[10px] font-bold opacity-60 flex items-center gap-1.5"><MapPin size={10}/> {m.address}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
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
                      <div className="space-y-1"><label className={labelClasses}>শেষ রক্তদান</label><input type="date" className={inputClasses} value={currentUserData.lastDonation || ''} onChange={e => setCurrentUserData({...currentUserData, lastDonation: e.target.value})} /></div>
                    </div>
                    <button type="submit" disabled={isUpdating} className="w-full bg-red-600 text-white p-5 rounded-[28px] font-black flex items-center justify-center gap-2 shadow-lg">{isUpdating ? <Loader2 size={20} className="animate-spin"/> : <Save size={20}/>} সেভ করুন</button>
                    <button type="button" onClick={() => { setIsLoggedIn(false); setIsAdminMode(false); }} className="w-full p-5 rounded-[28px] font-black bg-zinc-100 text-zinc-600">লগ আউট</button>
                  </form>
                ) : (
                  <div className="space-y-8 text-center pt-10">
                    <div className="w-24 h-24 bg-red-600/10 text-red-600 rounded-[32px] mx-auto flex items-center justify-center ring-8 ring-red-600/5"><Fingerprint size={48}/></div>
                    <input className={inputClasses} type="tel" placeholder="আপনার ফোন নম্বর দিন" value={loginPhone} onChange={e => setLoginPhone(e.target.value)} />
                    <button onClick={() => { const m = members.find(x => x.phone === loginPhone); if(m){setIsLoggedIn(true); setCurrentUserData(m); setLoginPhone('');} else alert("নিবন্ধন পাওয়া যায়নি।"); }} className="w-full bg-red-600 text-white p-6 rounded-[28px] font-black shadow-2xl">প্রবেশ করুন</button>
                  </div>
                )}
              </div>
            )}
            
            {/* Added missing WhyDonate Content for completeness */}
            {activeTab === 'whyDonate' && (
              <div className="space-y-8 animate-[zoomIn_0.3s] pb-10">
                <div className={`p-8 rounded-[40px] text-center space-y-4 relative overflow-hidden ${darkMode ? 'bg-zinc-900 border border-zinc-800' : 'bg-gradient-to-br from-red-50 to-white border border-red-100 shadow-xl'}`}>
                  <h2 className="text-xl font-black text-red-600">সুরা আয-যিলযাল, ৭ নং আয়াত</h2>
                  <p className={`text-lg font-serif italic leading-relaxed ${darkMode ? 'text-zinc-100' : 'text-zinc-800'}`}>"অতএব, কেউ অণু পরিমাণ ভালকাজ করলে তা সে দেখবে।"</p>
                </div>
                <div className="grid gap-6">
                  <div className={`p-6 rounded-[32px] border ${darkMode ? 'bg-zinc-900 border-zinc-800' : 'bg-white shadow-sm'}`}>
                    <h3 className="font-black text-red-600 mb-2">শারীরিক উপকারিতা</h3>
                    <p className="text-sm">হার্ট অ্যাটাক ও স্ট্রোকের ঝুঁকি কমে এবং শরীরে নতুন রক্ত কোষ তৈরির গতি বাড়ে।</p>
                  </div>
                </div>
                <button onClick={() => setActiveTab('dashboard')} className="w-full p-5 rounded-3xl font-black bg-zinc-100 text-zinc-600">ফিরে যান</button>
              </div>
            )}
          </>
        )}
      </main>

      {/* Side Menu Drawer */}
      <div className={`fixed inset-0 z-50 transition-all duration-300 ${isMenuOpen ? 'bg-black/60 opacity-100 visible' : 'opacity-0 invisible pointer-events-none'}`} onClick={() => setIsMenuOpen(false)}>
        <div className={`absolute top-0 right-0 w-80 h-full p-6 transition-transform duration-500 flex flex-col ${darkMode ? 'bg-zinc-900' : 'bg-white'} ${isMenuOpen ? 'translate-x-0' : 'translate-x-full'}`} onClick={e => e.stopPropagation()}>
          <div className="flex justify-between items-center mb-10"><h2 className={`text-2xl font-black ${darkMode ? 'text-white' : 'text-zinc-900'}`}>মেনু</h2><button onClick={() => setIsMenuOpen(false)} className="p-2.5 bg-red-50 text-red-600 rounded-full"><X size={24}/></button></div>
          <div className="space-y-2">
            {[{id:'dashboard',label:'হোম পেজ',icon:<Home size={20}/>},{id:'memberList',label:'দাতা তালিকা',icon:<List size={20}/>},{id:'register',label:'নিবন্ধন করুন',icon:<PlusCircle size={20}/>},{id:'login',label:'প্রোফাইল',icon:<Fingerprint size={20}/>}].map(i=>(
              <button key={i.id} onClick={()=>{setActiveTab(i.id);setIsMenuOpen(false);}} className={`w-full p-5 rounded-[24px] flex items-center gap-4 font-black ${activeTab===i.id?'bg-red-600 text-white':'text-zinc-500'}`}>{i.icon} <span className="text-sm">{i.label}</span></button>
            ))}
          </div>
          <div className="mt-auto pt-6"><DesignerCard /></div>
        </div>
      </div>

      {/* Profile Detail View Modal */}
      {viewProfile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm" onClick={() => setViewProfile(null)}>
          <div className={`w-full max-sm rounded-[40px] overflow-hidden ${darkMode ? 'bg-zinc-900' : 'bg-white'}`} onClick={e => e.stopPropagation()}>
            <div className="p-8 text-center space-y-6">
              <div className="w-20 h-20 bg-red-600 text-white rounded-[24px] mx-auto flex items-center justify-center text-3xl font-black shadow-xl">{viewProfile.bloodGroup}</div>
              <h3 className={`text-2xl font-black ${darkMode ? 'text-white' : 'text-zinc-900'}`}>{viewProfile.name}</h3>
              <div className="grid grid-cols-2 gap-3 text-xs font-bold">
                <div className={`p-4 rounded-2xl ${darkMode ? 'bg-zinc-800' : 'bg-gray-50'}`}>বয়স: {viewProfile.age}</div>
                <div className={`p-4 rounded-2xl ${darkMode ? 'bg-zinc-800' : 'bg-gray-50'}`}>লিঙ্গ: {viewProfile.gender}</div>
              </div>
              <p className={`text-sm ${darkMode ? 'text-zinc-400' : 'text-zinc-600'}`}><MapPin size={14} className="inline mr-1"/> {viewProfile.address}</p>
              <a href={`tel:${viewProfile.phone}`} className="w-full bg-green-600 text-white p-5 rounded-[24px] font-black flex items-center justify-center gap-2 shadow-lg"><Phone size={20} /> কল করুন</a>
              <button onClick={() => setViewProfile(null)} className="text-zinc-500 font-black text-sm">বন্ধ করুন</button>
            </div>
          </div>
        </div>
      )}

      {/* Success Modal */}
      {showSuccessModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm">
          <div className={`w-full max-w-xs p-10 rounded-[40px] text-center space-y-6 ${darkMode ? 'bg-zinc-900' : 'bg-white shadow-2xl'}`}>
             <CheckCircle size={60} className="text-green-600 mx-auto" />
             <h3 className={`text-xl font-black ${darkMode ? 'text-white' : 'text-zinc-900'}`}>নিবন্ধন সফল হয়েছে!</h3>
             <button onClick={() => { setShowSuccessModal(false); setActiveTab('memberList'); }} className="w-full bg-red-600 text-white p-5 rounded-[24px] font-black">দাতা তালিকা দেখুন</button>
          </div>
        </div>
      )}

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes zoomIn { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
        @keyframes slideDown { from { opacity: 0; transform: translate(-50%, -20px); } to { opacity: 1; transform: translate(-50%, 0); } }
        body { -webkit-tap-highlight-color: transparent; scroll-behavior: smooth; }
        .shimmer-effect { position: absolute; top: 0; left: 0; width: 60%; height: 100%; background: linear-gradient(to right, transparent, rgba(255, 255, 255, 0.3), transparent); animation: shimmer 4s infinite; }
        @keyframes shimmer { 0% { transform: translateX(-150%) skewX(-20deg); } 100% { transform: translateX(150%) skewX(-20deg); } }
      `}} />
    </div>
  );
  }
