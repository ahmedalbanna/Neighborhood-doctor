import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Mic, Send, X, AlertTriangle, CheckCircle, Activity, ArrowRight, Loader2, Play, Volume2 } from 'lucide-react';
import { AudioRecorder } from './AudioRecorder';
import { getSelfDiagnosisStep } from '../lib/gemini';

interface Step {
  role: "user" | "model";
  text: string;
}

export function SymptomChecker({ onClose }: { onClose: () => void }) {
  const [history, setHistory] = useState<Step[]>([
    { role: "model", text: "أهلاً بك. أنا مساعدك الطبي الذكي. كيف تشعر اليوم؟ أخبرني عن أعراضك بصوتك." }
  ]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<{ question: string, isFinal: boolean, urgency: string, advice: string } | null>(null);

  const handleAudioResponse = async (blob: Blob, base64: string) => {
    setIsProcessing(true);
    try {
      // In a real app we'd transcribe this first. Let's mock the transcription for this interactive flow
      const userText = "أعاني من صداع شديد وحمى منذ الصباح"; 
      const newHistory: Step[] = [...history, { role: "user", text: userText }];
      setHistory(newHistory);

      const nextStep = await getSelfDiagnosisStep(newHistory);
      setResult(nextStep);
      setHistory([...newHistory, { role: "model", text: nextStep.question }]);
    } catch (err) {
      console.error(err);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
    >
      <div className="bg-white w-full max-w-lg rounded-[40px] shadow-2xl overflow-hidden flex flex-col max-h-[80vh]">
        <header className="p-8 bg-brand text-white flex justify-between items-center">
          <div className="flex items-center gap-3">
            <Activity className="animate-pulse" />
            <h2 className="font-black text-xl">الفحص الذكي</h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-full transition-all">
            <X size={24} />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto p-8 space-y-6 bg-bg-base/30">
          <AnimatePresence>
            {history.map((step, i) => (
              <motion.div 
                key={i}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex ${step.role === 'user' ? 'justify-start' : 'justify-end'}`}
              >
                <div className={`max-w-[80%] p-5 rounded-[28px] font-bold text-sm shadow-sm ${
                  step.role === 'user' ? 'bg-white text-brand rounded-tl-none' : 'bg-brand text-white rounded-tr-none'
                }`}>
                  {step.text}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {result?.isFinal && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="mt-8 p-8 bg-white border-2 border-brand rounded-[40px] shadow-xl text-center space-y-4"
            >
              <div className={`w-16 h-16 mx-auto rounded-full flex items-center justify-center ${
                result.urgency === 'emergency' ? 'bg-red-500' : 'bg-brand'
              } text-white`}>
                {result.urgency === 'emergency' ? <AlertTriangle size={32} /> : <CheckCircle size={32} />}
              </div>
              <h3 className="font-black text-2xl text-[#2D2D2D]">النتيجة النهائية</h3>
              <p className="font-bold text-gray-500 leading-relaxed">{result.advice}</p>
              <button 
                onClick={onClose}
                className="w-full py-4 bg-brand text-white rounded-2xl font-black shadow-lg shadow-brand/20 hover:scale-[1.02] transition-all"
              >
                فهمت، شكراً لك
              </button>
            </motion.div>
          )}

          {isProcessing && (
            <div className="flex justify-center p-4">
              <Loader2 className="animate-spin text-brand" size={32} />
            </div>
          )}
        </div>

        {!result?.isFinal && (
          <div className="p-8 bg-white border-t border-border-subtle flex flex-col items-center gap-4">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">اضغط وسجل ردك الصوتي</p>
            <AudioRecorder minimal onRecordingComplete={handleAudioResponse} isProcessing={isProcessing} />
          </div>
        )}
      </div>
    </motion.div>
  );
}
