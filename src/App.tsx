// /src/App.tsx
import React, { useState, useEffect } from 'react';
import { auth, googleProvider, db } from './lib/firebase';
import { signInWithPopup, onAuthStateChanged, signOut, User } from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { PatientDashboard } from './components/PatientDashboard';
import { DoctorDashboard } from './components/DoctorDashboard';
import { motion, AnimatePresence } from 'motion/react';
import { LogOut, Stethoscope, User as UserIcon, Loader2, Heart } from 'lucide-react';
import { Toaster } from 'react-hot-toast';

type Role = 'patient' | 'doctor';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<Role | null>(null);
  const [loading, setLoading] = useState(true);
  const [showRoleSelection, setShowRoleSelection] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      if (u) {
        const userDoc = await getDoc(doc(db, 'users', u.uid));
        if (userDoc.exists()) {
          setRole(userDoc.data().role as Role);
          setShowRoleSelection(false);
        } else {
          setShowRoleSelection(true);
        }
        setUser(u);
      } else {
        setUser(null);
        setRole(null);
        setShowRoleSelection(false);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleSignIn = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      console.error("Sign in failed:", err);
    }
  };

  const selectRole = async (selectedRole: Role) => {
    if (!user) return;
    try {
      await setDoc(doc(db, 'users', user.uid), {
        uid: user.uid,
        name: user.displayName,
        email: user.email,
        role: selectedRole,
        specialty: selectedRole === 'doctor' ? 'عام' : null,
        createdAt: serverTimestamp(),
      });
      setRole(selectedRole);
      setShowRoleSelection(false);
    } catch (err) {
      console.error("Role selection failed:", err);
    }
  };

  if (loading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="animate-spin text-green-600" size={48} />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-bg-base flex flex-col items-center justify-center p-6 text-center text-[#2D2D2D]">
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="max-w-md w-full"
        >
          <div className="w-24 h-24 bg-brand rounded-[40px] flex items-center justify-center mx-auto mb-8 shadow-2xl">
            <Heart size={48} fill="white" className="text-white" />
          </div>
          <h1 className="text-4xl font-black mb-4 tracking-tight text-brand uppercase">طبيب الحي</h1>
          <p className="text-gray-500 mb-12 text-lg leading-relaxed">
            استشاراتك الطبية بالصوت وباللهجة اليمنية. سهولة، ثقة، وسرعة في الوصول.
          </p>
          <button
            onClick={handleSignIn}
            className="w-full bg-brand text-white py-4 px-8 rounded-3xl font-black text-lg shadow-xl hover:opacity-90 active:scale-95 transition-all flex items-center justify-center gap-3"
          >
            <img src="https://www.google.com/favicon.ico" className="w-5 h-5 brightness-0 invert" alt="google" />
            تسجيل الدخول باستخدام جوجل
          </button>
          <p className="mt-8 text-gray-400 text-xs">
            بالدخول، أنت توافق على شروط الاستخدام وسياسة الخصوصية
          </p>
        </motion.div>
      </div>
    );
  }

  if (showRoleSelection) {
    return (
      <div className="min-h-screen bg-bg-base flex flex-col items-center justify-center p-6" dir="rtl">
        <div className="max-w-md w-full">
          <h2 className="text-3xl font-black text-[#2D2D2D] mb-4 text-center">أهلاً بك معنا</h2>
          <p className="text-gray-500 mb-10 text-center">يرجى اختيار نوع حسابك للانطلاق في رحلة "طبيب الحي"</p>
          
          <div className="grid grid-cols-1 gap-6">
            <button
              onClick={() => selectRole('patient')}
              className="p-8 bg-white rounded-[40px] shadow-sm border border-border-subtle hover:border-brand transition-all flex flex-col items-center gap-4 group"
            >
              <div className="p-5 bg-bg-base text-brand rounded-[30px] group-hover:scale-110 transition-transform">
                <UserIcon size={40} />
              </div>
              <div className="text-center">
                <h3 className="font-bold text-xl text-[#2D2D2D]">أنا مريض</h3>
                <p className="text-sm text-gray-400 mt-1">أرغب في تسجيل شكواي واخذ استشارة</p>
              </div>
            </button>

            <button
              onClick={() => selectRole('doctor')}
              className="p-8 bg-white rounded-[40px] shadow-sm border border-border-subtle hover:border-blue-600 transition-all flex flex-col items-center gap-4 group"
            >
              <div className="p-5 bg-blue-50 text-blue-600 rounded-[30px] group-hover:scale-110 transition-transform">
                <Stethoscope size={40} />
              </div>
              <div className="text-center">
                <h3 className="font-bold text-xl text-[#2D2D2D]">أنا طبيب</h3>
                <p className="text-sm text-gray-400 mt-1">أرغب في التطوع ومساعدة المرضى</p>
              </div>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      <Toaster position="top-center" toastOptions={{ duration: 4000, style: { background: '#333', color: '#fff', borderRadius: '16px', padding: '16px' } }} />
      {role === 'patient' ? <PatientDashboard /> : <DoctorDashboard />}
      
      {/* Universal Sign Out - Bottom Left */}
      <button
        onClick={() => signOut(auth)}
        className="fixed bottom-4 left-4 z-50 p-3 bg-white/80 backdrop-blur shadow-lg border border-gray-100 rounded-2xl text-red-500 hover:bg-red-50 transition-colors"
        title="تسجيل الخروج"
      >
        <LogOut size={20} />
      </button>
    </div>
  );
}
