import React, { useState, useRef } from 'react';
import { Mic, Square, Play, Trash2, Send, Loader2, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface AudioRecorderProps {
  onRecordingComplete: (blob: Blob, base64: string) => void;
  isProcessing?: boolean;
  minimal?: boolean;
}

export function AudioRecorder({ onRecordingComplete, isProcessing, minimal }: AudioRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        setAudioBlob(blob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } catch (err) {
      console.error("Error accessing microphone:", err);
      alert("يرجى السماح بالوصول إلى الميكروفون");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  };

  const resetRecording = () => {
    setAudioBlob(null);
    setRecordingTime(0);
  };

  const handleSend = async () => {
    if (!audioBlob) return;
    
    // Convert blob to base64
    const reader = new FileReader();
    reader.readAsDataURL(audioBlob);
    reader.onloadend = () => {
      const base64String = (reader.result as string).split(',')[1];
      onRecordingComplete(audioBlob, base64String);
      resetRecording();
    };
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (minimal) {
    return (
      <div className="flex items-center gap-2">
        {audioBlob ? (
          <div className="flex items-center gap-2 bg-brand/10 p-1 pr-4 rounded-full">
            <span className="text-xs font-bold text-brand">{formatTime(recordingTime)}</span>
            <button onClick={resetRecording} className="p-2 text-red-500"><X size={16} /></button>
            <button onClick={handleSend} disabled={isProcessing} className="p-2 bg-brand text-white rounded-full">
              {isProcessing ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
            </button>
          </div>
        ) : (
          <button
            onClick={isRecording ? stopRecording : startRecording}
            className={`p-3 rounded-full transition-all ${isRecording ? 'bg-red-500 text-white animate-pulse' : 'bg-bg-base text-brand'}`}
          >
            {isRecording ? <Square size={20} fill="currentColor" /> : <Mic size={20} />}
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-8 p-10 bg-white rounded-[40px] shadow-sm border border-border-subtle">
      <AnimatePresence mode="wait">
        {!audioBlob ? (
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="flex flex-col items-center gap-8"
          >
            <div className={`relative flex items-center justify-center`}>
              {isRecording && (
                <>
                  <motion.div
                    animate={{ scale: [1, 2, 1], opacity: [0.1, 0.05, 0.1] }}
                    transition={{ repeat: Infinity, duration: 2 }}
                    className="absolute inset-0 bg-brand rounded-full"
                  />
                  <motion.div
                    animate={{ scale: [1, 1.5, 1], opacity: [0.2, 0.1, 0.2] }}
                    transition={{ repeat: Infinity, duration: 1.5 }}
                    className="absolute inset-0 bg-brand rounded-full"
                  />
                </>
              )}
              <button
                onClick={isRecording ? stopRecording : startRecording}
                disabled={isProcessing}
                className={`z-10 w-32 h-32 rounded-full flex items-center justify-center transition-all ${
                  isRecording ? 'bg-red-500 hover:bg-red-600' : 'bg-brand hover:scale-105'
                } text-white disabled:opacity-50 shadow-xl`}
              >
                {isRecording ? <Square size={40} fill="currentColor" /> : <Mic size={40} />}
              </button>
            </div>
            
            <div className="text-center space-y-2">
              {isRecording && (
                <div className="bg-bg-base px-6 py-2 rounded-full mb-4">
                  <span className="text-brand font-bold text-xs uppercase tracking-widest animate-pulse">جارِ الاستماع...</span>
                </div>
              )}
              <p className="text-4xl font-bold text-[#2D2D2D]">
                {formatTime(recordingTime)}
              </p>
              <p className="text-gray-500 max-w-xs leading-relaxed">
                {isRecording ? 'اضغط للتوقف عند الانتهاء' : 'صحتك تبدأ بكلمة. اضغط للتحدث بلهجتك الدارجة.'}
              </p>
            </div>
          </motion.div>
        ) : (
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="w-full flex flex-col gap-6"
          >
            <div className="flex items-center justify-between p-6 bg-bg-base rounded-3xl border border-border-subtle">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-brand text-white rounded-full flex items-center justify-center">
                  <Play size={20} fill="currentColor" />
                </div>
                <span className="font-bold text-[#2D2D2D]">تسجيل جاهز للمراجعة</span>
              </div>
              <span className="text-sm font-mono text-gray-400 font-bold">{formatTime(recordingTime)}</span>
            </div>

            <div className="flex gap-4 w-full">
              <button
                onClick={resetRecording}
                disabled={isProcessing}
                className="flex-1 py-4 px-6 rounded-2xl bg-white border border-border-subtle text-gray-500 font-bold hover:bg-bg-base transition-colors flex items-center justify-center gap-2"
              >
                <Trash2 size={20} />
                إلغاء
              </button>
              <button
                onClick={handleSend}
                disabled={isProcessing}
                className="flex-[2] py-4 px-6 rounded-2xl bg-brand text-white font-bold hover:opacity-90 transition-all flex items-center justify-center gap-2 shadow-lg disabled:opacity-50"
              >
                {isProcessing ? (
                  <Loader2 className="animate-spin" />
                ) : (
                  <>
                    <Send size={20} />
                    إرسال الشكوى
                  </>
                )}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
