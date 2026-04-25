import React, { useState, useRef } from 'react';
import { useConsultations, Consultation } from '../hooks/useConsultations';
import { useMessages } from '../hooks/useMessages';
import { db, auth } from '../lib/firebase';
import { doc, updateDoc, collection, addDoc, serverTimestamp, getDoc } from 'firebase/firestore';
import { motion, AnimatePresence } from 'motion/react';
import { Search, Filter, MessageSquare, User as UserIcon, Stethoscope, ChevronLeft, Send, CheckCircle, Phone, Play, Paperclip, X, History, FileText } from 'lucide-react';
import { AudioPlayer } from './AudioPlayer';
import { AudioRecorder } from './AudioRecorder';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import toast from 'react-hot-toast';
import { uploadMessageFile } from '../lib/storage';

export function DoctorDashboard() {
  const user = auth.currentUser;
  const { consultations, loading } = useConsultations('doctor', user?.uid || '');
  const [selectedCase, setSelectedCase] = useState<Consultation | null>(null);
  const [replyText, setReplyText] = useState('');
  const [isReplying, setIsReplying] = useState(false);
  const [filterSpecialty, setFilterSpecialty] = useState('كل التخصصات');
  const [searchQuery, setSearchQuery] = useState('');
  const [showHistory, setShowHistory] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { messages, loading: messagesLoading } = useMessages(selectedCase?.id);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user || !selectedCase) return;
    
    setIsReplying(true);
    try {
      const fileUrl = await uploadMessageFile(file, selectedCase.id);
      await addDoc(collection(db, `consultations/${selectedCase.id}/messages`), {
        senderId: user.uid,
        content: fileUrl,
        type: 'image',
        createdAt: serverTimestamp(),
      });
      toast.success("تم إرسال الملف");
    } catch(err) {
      console.error(err);
      toast.error("حدث خطأ في رفع الملف");
    } finally {
      setIsReplying(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };
  const prevConsultationsLength = React.useRef(0);
  const prevMessagesLength = React.useRef(0);

  React.useEffect(() => {
    if (!loading && consultations.length > prevConsultationsLength.current && prevConsultationsLength.current !== 0) {
      // Find the new consultation
      const isNew = consultations.some(c => c.status === 'pending');
      if (isNew) {
        toast.success("حالة استشارة جديدة بانتظار مراجعتك", { icon: "🔔" });
      }
    }
    prevConsultationsLength.current = consultations.length;
  }, [consultations, loading]);

  React.useEffect(() => {
    if (!messagesLoading && messages.length > prevMessagesLength.current && prevMessagesLength.current !== 0) {
      if (messages[messages.length - 1]?.senderId !== user?.uid) {
         toast.success("رسالة جديدة من المريض", { icon: "📩" });
      }
    }
    prevMessagesLength.current = messages.length;
  }, [messages, messagesLoading, user?.uid]);

  const specialties = ['عام', 'أطفال', 'نساء وتوليد', 'قلب', 'باطنية'];
  const [doctorSpecialty, setDoctorSpecialty] = React.useState('عام');

  React.useEffect(() => {
    const fetchProfile = async () => {
      if (user) {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists() && userDoc.data().specialty) {
          setDoctorSpecialty(userDoc.data().specialty);
        }
      }
    };
    fetchProfile();
  }, [user]);

  const handleSpecialtyChange = async (newSpecialty: string) => {
    setDoctorSpecialty(newSpecialty);
    if (user) {
      await updateDoc(doc(db, 'users', user.uid), {
        specialty: newSpecialty
      });
    }
  };

  const filteredConsultations = [...consultations].sort((a, b) => {
    // Sort by date first (descending)
    const dateA = a.createdAt?.toDate?.() || new Date(0);
    const dateB = b.createdAt?.toDate?.() || new Date(0);
    if (dateB > dateA) return 1;
    if (dateA > dateB) return -1;

    // Then prioritize doctor's specialty
    const specialtyA = a.suggestedSpecialty || 'عام';
    const specialtyB = b.suggestedSpecialty || 'عام';
    if (specialtyA === doctorSpecialty && specialtyB !== doctorSpecialty) return -1;
    if (specialtyB === doctorSpecialty && specialtyA !== doctorSpecialty) return 1;
    return 0;
  }).filter(c => {
    const specialty = c.suggestedSpecialty || 'عام';
    const matchesSpecialty = filterSpecialty === 'كل التخصصات' || specialty === filterSpecialty;
    const searchLower = searchQuery.toLowerCase();
    const matchesSearch = c.patientName.toLowerCase().includes(searchLower) || c.description.toLowerCase().includes(searchLower) || (c.summary && c.summary.toLowerCase().includes(searchLower));
    return matchesSpecialty && matchesSearch;
  });

  const handleVoiceMessage = async (blob: Blob, base64: string) => {
    if (!selectedCase) return;
    setIsReplying(true);
    try {
      // For simplicity in this demo, we store as base64 in content (In real app, use Storage)
      const dataUrl = `data:audio/webm;base64,${base64}`;
      await addDoc(collection(db, `consultations/${selectedCase.id}/messages`), {
        senderId: user?.uid,
        content: dataUrl,
        type: 'voice',
        createdAt: serverTimestamp(),
      });

      // Update consultation status
      await updateDoc(doc(db, 'consultations', selectedCase.id), {
        status: 'replied',
        doctorId: user?.uid,
        updatedAt: serverTimestamp(),
      });

      setIsReplying(false);
      setSelectedCase(null);
    } catch (err) {
      console.error(err);
      setIsReplying(false);
    }
  };

  const handlePrescriptionUpload = async () => {
    // Generate a pharmacy reference code
    if (!selectedCase) return;
    const refNum = Math.floor(100000 + Math.random() * 900000).toString();
    try {
      await addDoc(collection(db, `consultations/${selectedCase.id}/messages`), {
        senderId: user?.uid,
        content: refNum,
        type: 'prescription',
        text: `وصفة طبية رقم #${refNum}`,
        createdAt: serverTimestamp(),
      });

      // Update consultation status
      await updateDoc(doc(db, 'consultations', selectedCase.id), {
        status: 'replied',
        doctorId: user?.uid,
        updatedAt: serverTimestamp(),
      });

      toast.success("تم إرسال الوصفة الطبية");
      setSelectedCase(null);
    } catch (err) {
      console.error(err);
      toast.error("حدث خطأ");
    }
  };

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
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black text-gray-400">تخصصك:</span>
              <select 
                value={doctorSpecialty} 
                onChange={(e) => handleSpecialtyChange(e.target.value)}
                className="text-[10px] font-black text-brand bg-bg-base px-2 py-1 rounded-lg border-none focus:ring-0 cursor-pointer"
              >
                {specialties.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>
          
          <div className="relative">
            <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input 
              type="text" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="البحث في الحالات..." 
              className="w-full pr-12 pl-4 py-4 bg-bg-base rounded-[20px] border-none focus:ring-2 focus:ring-brand transition-all text-sm font-bold text-brand placeholder:text-gray-400 shadow-inner"
            />
          </div>
          <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
            {['كل التخصصات', ...specialties].map(s => (
              <button
                key={s}
                onClick={() => setFilterSpecialty(s)}
                className={`whitespace-nowrap px-4 py-2 rounded-full text-xs font-bold transition-all border ${
                  filterSpecialty === s ? 'bg-brand text-white border-brand' : 'bg-white text-gray-500 border-border-subtle hover:bg-bg-base'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
          {loading ? (
            <div className="flex justify-center p-12"><div className="w-10 h-10 border-4 border-brand border-t-transparent rounded-full animate-spin" /></div>
          ) : (
            filteredConsultations.map(c => (
              <button
                key={c.id}
                onClick={() => {
                  setSelectedCase(c);
                  if (c.status === 'pending') {
                    updateDoc(doc(db, 'consultations', c.id), { 
                       status: 'active',
                       doctorId: user?.uid 
                    });
                  }
                }}
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
                <div className="flex items-center justify-between mt-2">
                  <div className="flex gap-2">
                    {c.status === 'replied' && (
                      <div className="py-1 px-3 bg-brand/10 text-brand rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
                        <CheckCircle size={12} /> تم الرد
                      </div>
                    )}
                    {c.suggestedSpecialty === doctorSpecialty && (
                      <div className="py-1 px-3 bg-orange-100 text-orange-600 rounded-full text-[10px] font-black uppercase tracking-widest">
                        تخصصك
                      </div>
                    )}
                  </div>
                  {c.audioUrl && (
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        // Minimal play functionality - in a real app might need a tiny specialized player
                        const audio = new Audio(c.audioUrl);
                        audio.play();
                      }}
                      className="p-2 bg-bg-base text-brand rounded-xl hover:bg-brand hover:text-white transition-all shadow-sm"
                      title="استماع سريع"
                    >
                      <Play size={14} fill="currentColor" />
                    </button>
                  )}
                </div>
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
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => setShowHistory(!showHistory)}
                  className={`flex items-center gap-2 px-6 py-3 rounded-2xl font-bold transition-all ${showHistory ? 'bg-brand text-white' : 'bg-bg-base text-gray-400 hover:bg-gray-200'}`}
                >
                  <History size={18} />
                  <span className="hidden sm:inline">{showHistory ? 'إغلاق السجل' : 'السجل المرضي'}</span>
                </button>
                {selectedCase.status !== 'closed' && (
                  <button 
                    onClick={async () => {
                      if (window.confirm('هل أنت متأكد من إغلاق هذه الاستشارة نهائياً؟')) {
                         await updateDoc(doc(db, 'consultations', selectedCase.id), { status: 'closed' });
                         setSelectedCase(null);
                      }
                    }}
                    className="flex items-center gap-2 px-6 py-3 rounded-2xl font-bold transition-all bg-red-50 text-red-600 hover:bg-red-100"
                  >
                    <CheckCircle size={18} />
                    <span className="hidden sm:inline">إغلاق الحالة</span>
                  </button>
                )}
              </div>
            </header>

            <div className="flex-1 overflow-y-auto p-10">
              <div className="max-w-4xl mx-auto space-y-10">
                {showHistory ? (
                   <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
                      <div className="bg-white p-8 rounded-[40px] border border-border-subtle">
                         <h3 className="font-black text-[#2D2D2D] mb-6">التاريخ المرضي</h3>
                         <div className="space-y-4">
                            <div className="p-4 bg-bg-base rounded-2xl border border-border-subtle">
                               <p className="font-bold text-brand text-sm mb-1">الربو المزمن</p>
                               <p className="text-xs text-gray-500">تم التشخيص في 2022 - يمارس علاجات التنفس</p>
                            </div>
                            <div className="p-4 bg-bg-base rounded-2xl border border-border-subtle">
                               <p className="font-bold text-brand text-sm mb-1">حساسية ضد البنسلين</p>
                               <p className="text-xs text-gray-500">تفاعل شديد في حالة الاستهلاك</p>
                            </div>
                         </div>
                      </div>
                      <div className="bg-white p-8 rounded-[40px] border border-border-subtle">
                         <h3 className="font-black text-[#2D2D2D] mb-6">الاستشارات السابقة</h3>
                         <div className="space-y-4 text-gray-400">لا توجد سجلات رقمية سابقة متاحة لهذا المريض حالياً.</div>
                      </div>
                   </motion.div>
                ) : (
                  <>
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
                          {selectedCase.audioUrl && (
                            <div className="mt-4">
                               <h4 className="text-[10px] font-black text-gray-300 uppercase tracking-widest mb-2">الاستماع للتسجيل المباشر</h4>
                               <AudioPlayer src={selectedCase.audioUrl} />
                            </div>
                          )}
                        </div>
                        
                        <div className="space-y-4">
                          <h4 className="text-[10px] font-black text-gray-300 uppercase tracking-widest">الملخص الطبي</h4>
                          <div className="p-6 bg-brand text-white rounded-3xl shadow-xl shadow-brand/20">
                            <p className="font-bold leading-relaxed">{selectedCase.summary}</p>
                          </div>
                          <div className="mt-4 p-4 border-2 border-dashed border-brand/20 rounded-2xl">
                             <p className="text-[10px] font-black text-brand uppercase tracking-widest">التخصص المقترح</p>
                             <p className="text-lg font-black text-brand">{selectedCase.suggestedSpecialty || 'عام'}</p>
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
                          <button 
                            onClick={handlePrescriptionUpload}
                            className="flex items-center gap-4 p-6 bg-white border border-border-subtle rounded-[32px] hover:bg-bg-base transition-all group"
                          >
                             <div className="p-4 bg-bg-base text-brand rounded-[20px] group-hover:scale-110 group-hover:bg-brand group-hover:text-white transition-all shadow-inner">
                               <FileText size={24} />
                             </div>
                             <div className="text-right">
                               <span className="block text-sm font-black text-[#2D2D2D]">وصفة طبية</span>
                               <span className="text-[10px] font-bold text-gray-400">إصدار وصفة رقمية</span>
                             </div>
                          </button>
                        </div>
                    </div>

                    {/* Chat History */}
                    {messages.length > 0 && (
                      <div className="bg-white p-10 rounded-[48px] shadow-sm border border-border-subtle space-y-6">
                        <h3 className="font-black text-[#2D2D2D] mb-4">سجل المحادثة</h3>
                        <div className="space-y-4">
                          {messages.map(msg => (
                            <div key={msg.id} className={`flex ${msg.senderId === user?.uid ? 'justify-start' : 'justify-end'}`}>
                              <div className={`p-4 rounded-2xl max-w-[80%] ${msg.senderId === user?.uid ? 'bg-brand text-white' : 'bg-bg-base text-[#2D2D2D]'}`}>
                                {msg.type === 'text' && <p className="font-bold">{msg.content}</p>}
                                {msg.type === 'voice' && <AudioPlayer src={msg.content} className={msg.senderId === user?.uid ? 'bg-white/20' : ''} />}
                                {msg.type === 'image' && <img src={msg.content} className="rounded-2xl max-w-full" alt="attachment" />}
                                {msg.type === 'prescription' && (
                                  <div className="flex flex-col gap-2">
                                    <FileText size={24} />
                                    <p className="font-bold text-sm">{msg.text || "وصفة طبية رقمية"}</p>
                                  </div>
                                )}
                                <span className={`text-[10px] mt-2 block ${msg.senderId === user?.uid ? 'text-brand-50' : 'text-gray-400'}`}>
                                  {msg.createdAt?.toDate ? format(msg.createdAt.toDate(), 'HH:mm') : 'الآن'}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* Reply Box */}
            <div className="p-8 bg-white border-t border-border-subtle sticky bottom-0">
              <div className="max-w-4xl mx-auto flex items-end gap-4">
                <div className="flex-1 relative">
                  <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/*,.pdf,.doc,.docx" />
                  <button 
                    onClick={() => fileInputRef.current?.click()} 
                    className="absolute right-4 top-1/2 -translate-y-1/2 p-2 text-gray-400 hover:text-brand transition-all"
                    disabled={isReplying}
                  >
                    <Paperclip size={20} />
                  </button>
                  <textarea
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    placeholder="اكتب توجيهاتك الطبية هنا..."
                    className="w-full pr-14 pl-16 py-6 bg-bg-base rounded-[32px] border-none focus:ring-2 focus:ring-brand resize-none min-h-[80px] max-h-40 shadow-inner font-bold text-brand placeholder:text-gray-400"
                  />
                  <button 
                    onClick={handleReply}
                    disabled={isReplying || !replyText.trim()}
                    className="absolute left-3 bottom-3 p-4 bg-brand text-white rounded-2xl hover:opacity-90 disabled:opacity-50 transition-all shadow-xl shadow-brand/20"
                  >
                    <Send size={20} />
                  </button>
                </div>
                <AudioRecorder minimal onRecordingComplete={handleVoiceMessage} isProcessing={isReplying} />
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
