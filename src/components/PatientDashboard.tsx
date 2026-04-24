import React, { useState } from 'react';
import { useConsultations, Consultation } from '../hooks/useConsultations';
import { AudioRecorder } from './AudioRecorder';
import { transcribeAndAnalyze } from '../lib/gemini';
import { db, auth } from '../lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { motion, AnimatePresence } from 'motion/react';
import { Clock, CheckCircle2, AlertCircle, Phone, Stethoscope, ChevronRight, Mic, User as UserIcon, Play } from 'lucide-react';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';

export function PatientDashboard() {
  const user = auth.currentUser;
  const { consultations, loading } = useConsultations('patient', user?.uid || '');
  const [isProcessing, setIsProcessing] = useState(false);

  const handleRecordingComplete = async (blob: Blob, base64: string) => {
    if (!user) return;
    setIsProcessing(true);

    try {
      // 1. AI Analysis
      const analysis = await transcribeAndAnalyze(base64, blob.type);
      
      // 2. Save to Firestore
      await addDoc(collection(db, 'consultations'), {
        patientId: user.uid,
        patientName: user.displayName || 'مريض',
        status: 'pending',
        priority: analysis.priority || 'medium',
        description: analysis.transcription,
        summary: analysis.summary,
        detectedDialect: analysis.detectedDialect,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      
    } catch (err) {
      console.error("Submission failed:", err);
      alert("عذراً، حدث خطأ أثناء معالجة رسالتك. يرجى المحاولة لاحقاً.");
    } finally {
      setIsProcessing(false);
    }
  };

  const getPriorityInfo = (priority: Consultation['priority']) => {
    switch (priority) {
      case 'emergency': return { color: 'bg-red-50 text-red-600', label: 'حالة طارئة', icon: AlertCircle };
      case 'high': return { color: 'bg-orange-50 text-orange-600', label: 'أولوية عالية', icon: AlertCircle };
      case 'medium': return { color: 'bg-blue-50 text-blue-600', label: 'أولوية متوسطة', icon: Clock };
      case 'low': return { color: 'bg-green-50 text-brand', label: 'أولوية منخفضة', icon: CheckCircle2 };
      default: return { color: 'bg-gray-50 text-gray-600', label: 'غير محدد', icon: Clock };
    }
  };

  const getStatusLabel = (status: Consultation['status']) => {
    switch (status) {
      case 'pending': return 'بانتظار الطبيب';
      case 'active': return 'قيد المراجعة';
      case 'replied': return 'تم الرد';
      case 'closed': return 'مغلقة';
      default: return status;
    }
  };

  return (
    <div className="max-w-md mx-auto min-h-screen bg-bg-base flex flex-col">
      {/* Header */}
      <header className="bg-white py-6 px-8 flex justify-between items-center border-b border-border-subtle sticky top-0 z-20">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-brand rounded-full flex items-center justify-center text-white">
            <Mic size={20} />
          </div>
          <span className="text-2xl font-black text-brand tracking-tight">طبيب الحي</span>
        </div>
        <div className="text-right">
          <p className="text-[10px] uppercase font-black text-gray-400 tracking-widest">أهلاً بك</p>
          <p className="text-sm font-bold text-[#2D2D2D]">{user?.displayName?.split(' ')[0]}</p>
        </div>
      </header>

      <main className="flex-1 p-8 space-y-10">
        {/* Record Section */}
        <section>
          <AudioRecorder onRecordingComplete={handleRecordingComplete} isProcessing={isProcessing} />
        </section>

        {/* Recent Activity Card Example from Theme */}
        {consultations.length > 0 && consultations[0].status === 'replied' && (
          <section>
            <div className="bg-brand text-white p-8 rounded-[40px] space-y-4 shadow-xl shadow-brand/20">
               <div className="flex items-center gap-4">
                 <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center">
                   <UserIcon className="text-white" size={24} />
                 </div>
                 <div>
                   <p className="text-xs text-white/70 uppercase font-bold tracking-wider">رد الطبيب الأخير</p>
                   <p className="text-xl font-bold">د. مجهول</p>
                 </div>
               </div>
               <div className="bg-white/10 rounded-2xl p-4 flex items-center gap-4">
                 <button className="w-10 h-10 bg-white text-brand rounded-full flex items-center justify-center">
                    <Play size={18} fill="currentColor" />
                 </button>
                 <div className="flex-1 h-1.5 bg-white/30 rounded-full overflow-hidden">
                    <div className="h-full w-1/3 bg-white" />
                 </div>
                 <span className="text-[10px] font-mono">01:24</span>
               </div>
               <p className="text-sm text-white/80 leading-relaxed italic">"هذه الأعراض طبيعية نتيجة الإرهاق، أنصحك بشرب السوائل الدافئة والراحة..."</p>
            </div>
          </section>
        )}

        {/* History Section */}
        <section className="space-y-6">
          <div className="flex justify-between items-center px-2">
            <h2 className="font-black text-[#2D2D2D] text-xl tracking-tight">استشاراتك</h2>
            <div className="bg-white px-3 py-1 rounded-full border border-border-subtle">
               <span className="text-xs font-bold text-gray-400">{consultations.length} استشارة</span>
            </div>
          </div>

          <AnimatePresence>
            {loading ? (
              <div className="flex justify-center p-12">
                <div className="w-10 h-10 border-4 border-brand border-t-transparent rounded-full animate-spin" />
              </div>
            ) : consultations.length === 0 ? (
              <div className="text-center p-12 bg-white rounded-[40px] border border-dashed border-border-subtle">
                <p className="text-gray-400 font-medium">لا يوجد لديك استشارات بعد. ابدأ بتسجيل صوتي!</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {consultations.map((c, index) => {
                  const pInfo = getPriorityInfo(c.priority);
                  const PIcon = pInfo.icon;
                  return (
                    <motion.div
                      key={c.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="bg-white p-6 rounded-[32px] shadow-sm border border-border-subtle hover:scale-[1.02] transition-transform cursor-pointer"
                    >
                      <div className="flex justify-between items-center mb-4">
                        <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${pInfo.color}`}>
                          <PIcon size={12} />
                          {pInfo.label}
                        </div>
                        <span className="text-[10px] text-gray-400 font-black tracking-widest uppercase">
                          {c.createdAt?.toDate ? format(c.createdAt.toDate(), 'd MMM yyyy', { locale: ar }) : 'الآن'}
                        </span>
                      </div>

                      <div className="mb-4">
                        <p className="text-[#2D2D2D] font-bold text-lg leading-tight line-clamp-2">
                          {c.summary || c.description}
                        </p>
                        {c.detectedDialect && (
                          <div className="bg-bg-base px-2 py-1 rounded-lg mt-3 inline-block">
                             <span className="text-[10px] font-bold text-brand uppercase tracking-widest">اللهجة: {c.detectedDialect}</span>
                          </div>
                        )}
                      </div>

                      <div className="flex justify-between items-center pt-4 border-t border-border-subtle">
                        <div className="flex items-center gap-2">
                           <div className={`w-2 h-2 rounded-full ${c.status === 'replied' ? 'bg-brand' : 'bg-orange-400'}`} />
                           <span className="text-xs font-black text-gray-500 uppercase tracking-widest">{getStatusLabel(c.status)}</span>
                        </div>
                        <ChevronRight size={18} className="text-brand" />
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </AnimatePresence>
        </section>
      </main>

      {/* Footer Info */}
      <footer className="p-8 border-t border-border-subtle bg-white text-center">
         <div className="flex items-center justify-center gap-2 mb-2">
            <div className="w-2 h-2 rounded-full bg-brand animate-pulse" />
            <span className="text-[10px] font-black text-brand uppercase tracking-widest">الخدمة نشطة الآن في محافظة ذمار</span>
         </div>
         <p className="text-[10px] text-gray-400">© 2024 طبيب الحي - مشروع إنساني مستدام</p>
      </footer>
    </div>
  );
}
