import React, { useState } from 'react';
import { useConsultations, Consultation } from '../hooks/useConsultations';
import { db, auth } from '../lib/firebase';
import { doc, updateDoc, collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { motion, AnimatePresence } from 'motion/react';
import { Search, Filter, MessageSquare, User as UserIcon, Stethoscope, ChevronLeft, Send, CheckCircle, Phone } from 'lucide-react';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';

export function DoctorDashboard() {
  const user = auth.currentUser;
  const { consultations, loading } = useConsultations('doctor', user?.uid || '');
  const [selectedCase, setSelectedCase] = useState<Consultation | null>(null);
  const [replyText, setReplyText] = useState('');
  const [isReplying, setIsReplying] = useState(false);

  const handleReply = async () => {
    if (!selectedCase || !replyText.trim()) return;
    setIsReplying(true);

    try {
      // 1. Add message to subcollection
      await addDoc(collection(db, `consultations/${selectedCase.id}/messages`), {
        consultationId: selectedCase.id,
        senderId: user?.uid,
        content: replyText,
        type: 'text',
        createdAt: serverTimestamp(),
      });

      // 2. Update consultation status
      await updateDoc(doc(db, 'consultations', selectedCase.id), {
        status: 'replied',
        doctorId: user?.uid,
        updatedAt: serverTimestamp(),
      });

      setReplyText('');
      setIsReplying(false);
      // Close side panel
      setSelectedCase(null);
    } catch (err) {
      console.error("Reply failed:", err);
      alert("خطأ في إرسال الرد");
      setIsReplying(false);
    }
  };

  const getPriorityColor = (p: Consultation['priority']) => {
    switch (p) {
      case 'emergency': return 'bg-red-500';
      case 'high': return 'bg-orange-500';
      case 'medium': return 'bg-blue-500';
      case 'low': return 'bg-brand';
      default: return 'bg-gray-300';
    }
  };

  return (
    <div className="flex flex-col lg:flex-row h-screen bg-bg-base overflow-hidden" dir="rtl">
      {/* Sidebar - Case List */}
      <div className={`flex-1 lg:flex-none lg:w-96 flex flex-col bg-white border-l border-border-subtle ${selectedCase ? 'hidden lg:flex' : 'flex'}`}>
        <header className="p-8 border-b border-border-subtle space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-brand rounded-full flex items-center justify-center text-white">
                <Stethoscope size={20} />
              </div>
              <span className="text-xl font-black text-brand tracking-tight">طبيب الحي</span>
            </div>
          </div>
          
          <div className="relative">
            <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input 
              type="text" 
              placeholder="البحث في الحالات..." 
              className="w-full pr-12 pl-4 py-4 bg-bg-base rounded-[20px] border-none focus:ring-2 focus:ring-brand transition-all text-sm font-bold text-brand placeholder:text-gray-400 shadow-inner"
            />
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
          {loading ? (
            <div className="flex justify-center p-12"><div className="w-10 h-10 border-4 border-brand border-t-transparent rounded-full animate-spin" /></div>
          ) : (
            consultations.map(c => (
              <button
                key={c.id}
                onClick={() => setSelectedCase(c)}
                className={`p-6 rounded-[32px] transition-all text-right flex flex-col gap-3 border-2 ${
                  selectedCase?.id === c.id ? 'border-brand bg-bg-base shadow-lg' : 'border-transparent bg-white hover:bg-bg-base'
                } group`}
              >
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${getPriorityColor(c.priority)} animate-pulse`} />
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{c.priority}</span>
                  </div>
                  <span className="text-[10px] font-black text-gray-300 uppercase tracking-widest">
                    {c.createdAt?.toDate ? format(c.createdAt.toDate(), 'HH:mm') : 'الآن'}
                  </span>
                </div>
                <h3 className="font-black text-[#2D2D2D] leading-none">{c.patientName}</h3>
                <p className="text-xs text-gray-400 font-medium line-clamp-2 leading-relaxed italic">"{c.summary || c.description}"</p>
                {c.status === 'replied' && (
                  <div className="mt-2 py-1 px-3 bg-brand/10 text-brand rounded-full self-start text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
                    <CheckCircle size={12} /> تم الرد
                  </div>
                )}
              </button>
            ))
          )}
        </div>
      </div>

      {/* Main Content - Case Detail */}
      <div className={`flex-1 flex flex-col bg-bg-base ${selectedCase ? 'flex' : 'hidden lg:flex'}`}>
        {selectedCase ? (
          <>
            <header className="p-8 bg-white border-b border-border-subtle flex items-center justify-between">
              <div className="flex items-center gap-6">
                <button onClick={() => setSelectedCase(null)} className="lg:hidden p-3 bg-bg-base hover:bg-brand hover:text-white rounded-2xl transition-all">
                  <ChevronLeft />
                </button>
                <div className="w-16 h-16 bg-bg-base rounded-[24px] flex items-center justify-center border border-border-subtle">
                  <UserIcon className="text-gray-300" size={32} />
                </div>
                <div>
                  <div className="flex items-center gap-3">
                    <h2 className="font-black text-[#2D2D2D] text-2xl tracking-tight">{selectedCase.patientName}</h2>
                    <div className={`px-4 py-1.5 rounded-full text-white text-[10px] font-black uppercase tracking-widest ${getPriorityColor(selectedCase.priority)} shadow-lg`}>
                      {selectedCase.priority}
                    </div>
                  </div>
                  <p className="text-xs font-black text-gray-400 uppercase tracking-widest mt-1">مريض - لهجة {selectedCase.detectedDialect || 'يمنية'}</p>
                </div>
              </div>
            </header>

            <div className="flex-1 overflow-y-auto p-10">
              <div className="max-w-4xl mx-auto space-y-10">
                {/* AI Analysis Section */}
                <div className="bg-white p-10 rounded-[48px] shadow-sm border border-border-subtle">
                  <div className="flex items-center gap-4 mb-8">
                    <div className="w-12 h-12 bg-bg-base text-brand rounded-2xl flex items-center justify-center">
                      <MessageSquare size={24} />
                    </div>
                    <h3 className="font-black text-brand text-xl tracking-tight uppercase">تشخيص أولي ذكي</h3>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                    <div className="space-y-4">
                      <h4 className="text-[10px] font-black text-gray-300 uppercase tracking-widest">النص المستخلص من الصوت</h4>
                      <div className="p-6 bg-bg-base rounded-3xl border border-border-subtle italic">
                        <p className="text-[#2D2D2D] leading-relaxed font-bold text-lg">"{selectedCase.description}"</p>
                      </div>
                    </div>
                    
                    <div className="space-y-4">
                      <h4 className="text-[10px] font-black text-gray-300 uppercase tracking-widest">الملخص الطبي</h4>
                      <div className="p-6 bg-brand text-white rounded-3xl shadow-xl shadow-brand/20">
                        <p className="font-bold leading-relaxed">{selectedCase.summary}</p>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-6 mt-12">
                      <button className="flex items-center gap-4 p-6 bg-white border border-border-subtle rounded-[32px] hover:bg-bg-base transition-all group">
                         <div className="p-4 bg-bg-base text-brand rounded-[20px] group-hover:scale-110 group-hover:bg-brand group-hover:text-white transition-all shadow-inner">
                           <Phone size={24} />
                         </div>
                         <div className="text-right">
                           <span className="block text-sm font-black text-[#2D2D2D]">اتصال مباشر</span>
                           <span className="text-[10px] font-bold text-gray-400">تواصل صوتي مع المريض</span>
                         </div>
                      </button>
                      <button className="flex items-center gap-4 p-6 bg-white border border-border-subtle rounded-[32px] hover:bg-bg-base transition-all group">
                         <div className="p-4 bg-bg-base text-brand rounded-[20px] group-hover:scale-110 group-hover:bg-brand group-hover:text-white transition-all shadow-inner">
                           <CheckCircle size={24} />
                         </div>
                         <div className="text-right">
                           <span className="block text-sm font-black text-[#2D2D2D]">وصفة طبية</span>
                           <span className="text-[10px] font-bold text-gray-400">إرسال مستند الصيدلية</span>
                         </div>
                      </button>
                    </div>
                </div>
              </div>
            </div>

            {/* Reply Box */}
            <div className="p-8 bg-white border-t border-border-subtle sticky bottom-0">
              <div className="max-w-4xl mx-auto">
                <div className="relative">
                  <textarea
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    placeholder="اكتب توجيهاتك الطبية هنا..."
                    className="w-full pr-8 pl-20 py-6 bg-bg-base rounded-[32px] border-none focus:ring-2 focus:ring-brand resize-none min-h-[80px] max-h-40 shadow-inner font-bold text-brand placeholder:text-gray-400"
                  />
                  <button 
                    onClick={handleReply}
                    disabled={isReplying || !replyText.trim()}
                    className="absolute left-4 bottom-4 p-4 bg-brand text-white rounded-2xl hover:opacity-90 disabled:opacity-50 transition-all shadow-xl shadow-brand/20"
                  >
                    <Send size={24} />
                  </button>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-300">
            <div className="w-32 h-32 bg-white rounded-[48px] flex items-center justify-center mb-8 shadow-sm border border-border-subtle">
              <Stethoscope size={64} className="text-bg-base" fill="currentColor" />
            </div>
            <p className="text-2xl font-black uppercase tracking-tight text-gray-400">الرجاء اختيار حالة للمراجعة</p>
          </div>
        )}
      </div>
    </div>
  );
}
