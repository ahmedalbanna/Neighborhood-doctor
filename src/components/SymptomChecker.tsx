import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Mic, Send, X, AlertTriangle, CheckCircle, Activity, ArrowRight, Loader2, Play, Volume2 } from 'lucide-react';
import { AudioRecorder } from './AudioRecorder';
import { getSelfDiagnosisStep, transcribeAndAnalyze } from '../lib/gemini';

interface Step {
  role: "user" | "model";
  text: string;
}

export function SymptomChecker({ onClose }: { onClose: () => void }) {
  const [history, setHistory] = useState<Step[]>(() => {
    const saved = localStorage.getItem('symptomHistory');
    return saved ? JSON.parse(saved) : [
      { role: "model", text: "أهلاً بك. أنا مساعدك الطبي الذكي. كيف تشعر اليوم؟ أخبرني عن أعراضك بصوتك." }
    ];
  });
  const [isProcessing, setIsProcessing] = useState(false);
  const [isTextMode, setIsTextMode] = useState(false);
  const [textInput, setTextInput] = useState('');
  const [result, setResult] = useState<{ question: string, isFinal: boolean, urgency: string, advice: string } | null>(() => {
    const saved = localStorage.getItem('symptomResult');
    return saved ? JSON.parse(saved) : null;
  });

  useEffect(() => {
    localStorage.setItem('symptomHistory', JSON.stringify(history));
    if (result) {
      localStorage.setItem('symptomResult', JSON.stringify(result));
    } else {
      localStorage.removeItem('symptomResult');
    }
  }, [history, result]);

  const handleClose = () => {
    // Only clear if final result is reached
    if (result?.isFinal) {
      localStorage.removeItem('symptomHistory');
      localStorage.removeItem('symptomResult');
    }
    onClose();
  };
  const handleAudioResponse = async (blob: Blob, base64: string) => {
    setIsProcessing(true);
    try {
      const analysis = await transcribeAndAnalyze(base64, blob.type);
      await processResponse(analysis.transcription);
    } catch (err) {
      console.error(err);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleTextResponse = async () => {
    if (!textInput.trim()) return;
    setIsProcessing(true);
    try {
      await processResponse(textInput);
      setTextInput('');
    } catch (err) {
      console.error(err);
    } finally {
      setIsProcessing(false);
    }
  };

  const processResponse = async (userText: string) => {
    const newHistory: Step[] = [...history, { role: "user", text: userText }];
    setHistory(newHistory);

    const nextStep = await getSelfDiagnosisStep(newHistory);
    setResult(nextStep.isFinal ? nextStep : null);
    if (!nextStep.isFinal) {
        setHistory([...newHistory, { role: "model", text: nextStep.question }]);
    } else {
        setHistory([...newHistory, { role: "model", text: nextStep.advice }]);
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
          <button onClick={handleClose} className="p-2 hover:bg-white/20 rounded-full transition-all">
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
                onClick={handleClose}
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
            <div className="w-full flex justify-between items-center text-[10px] uppercase tracking-widest font-black text-gray-400">
               <p>{isTextMode ? 'اكتب ردك' : 'اضغط وسجل ردك الصوتي'}</p>
               <button onClick={() => setIsTextMode(!isTextMode)} className="text-brand hover:underline">
                  {isTextMode ? 'استخدم الصوت' : 'استخدم النص'}
               </button>
            </div>
            {isTextMode ? (
                <div className="w-full flex gap-2">
                    <input type="text" value={textInput} onChange={(e) => setTextInput(e.target.value)} placeholder="أدخل أعراضك..." className="flex-1 p-4 bg-bg-base rounded-2xl border-none text-sm" />
                    <button onClick={handleTextResponse} disabled={isProcessing} className="p-4 bg-brand text-white rounded-2xl">
                        {isProcessing ? <Loader2 className="animate-spin" /> : <Send size={20} />}
                    </button>
                </div>
            ) : (
                <AudioRecorder minimal onRecordingComplete={handleAudioResponse} isProcessing={isProcessing} />
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
}
