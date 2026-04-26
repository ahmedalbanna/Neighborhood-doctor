import { queryOllama } from "../services/ollamaService";

export async function transcribeAndAnalyze(audioBase64: string, mimeType: string) {
  try {
    const prompt = `
      المريض أرسل مقطعاً صوتياً. يرجى تحليله.
      أنت مساعد طبي ذكي خبير بجميع اللهجات اليمنية (صنعاني، عدني، تعزي، حضرمي، تهامي، وغيرها). مهمتك هي الاستماع بعناية شديدة للرسالة الصوتية للمريض وتأدية الآتي بدقة عالية:
      1. تحويل الكلام في المقطع الصوتي إلى نص عربي فصيح ودقيق، مع فهم المصطلحات الشعبية والمحلية وترجمتها للمعنى الطبي الصحيح إذا لزم.
      2. تحليل الحالة الطبية بناءً على الوصف وتقديم ملخص طبي موجز ومفيد للطبيب.
      3. صنف الأولوية إلى: low, medium, high, emergency.
      4. اقترح التخصص الطبي المناسب للحالة من: "عام", "أطفال", "نساء وتوليد", "قلب", "باطنية".
      
      يجب أن يكون الرد بتنسيق JSON حصراً. لا تستخدم ماركداون، لا تبدأ الرد بـ \`\`\`json. ابدأ مباشرة بـ { وانته بـ }.
      {
        "transcription": "التفريغ النصي الدقيق لكلام المريض",
        "summary": "ملخص الحالة والأعراض المذكورة",
        "priority": "emergency | high | medium | low",
        "detectedDialect": "صنعاني | عدني | تعزي | حضرمي | إلخ",
        "suggestedSpecialty": "التخصص المقترح"
      }
    `;
    
    // Note: Ollama (qwen2.5) cannot directly process audio inlineData.
    // Assuming audio-to-text is handled elsewhere or by a different service,
    // here we just prompt for analysis.
    
    const responseText = await queryOllama(prompt);
    const cleanText = responseText.replace(/[\s\S]*({[\s\S]*})[\s\S]*/, '$1').trim();
    return JSON.parse(cleanText || "{}");
  } catch (error) {
    console.error("Ollama Analysis Error:", error);
    throw error;
  }
}

export async function getSelfDiagnosisStep(history: { role: "user" | "model", text: string }[]) {
  try {
    const systemInstruction = "أنت طبيب ذكي وودود تساعد المرضى في الأرياف اليمنية. هدفك هو مساعدتهم في تشخيص أعراضهم عبر أسئلة صوتية بسيطة باللهجة اليمنية.";
    const formattedHistory = history.map(h => `${h.role === 'user' ? 'المريض' : 'الطبيب'}: ${h.text}`).join('\n');
    
    const prompt = `
      هذا هو سجل المحادثة:
      ${formattedHistory}

      بناءً على المحادثة السابقة:
      1. اقترح السؤال التالي للمريض باللهجة اليمنية البسيطة.
      2. إذا كانت الحالة كافية للتشخيص الأولي، قدم النتيجة (فحص منزلي، استشارة طبيب، أو طوارئ).
      3. يجب أن يكون الرد بتنسيق JSON حصراً. لا تستخدم ماركداون، لا تبدأ الرد بـ \`\`\`json. ابدأ مباشرة بـ { وانته بـ }.
      {
        "question": "السؤال التالي أو التوجيه النهائي",
        "isFinal": true | false,
        "urgency": "low | medium | high | emergency",
        "advice": "نصيحة مختصرة جداً"
      }
    `;

    const responseText = await queryOllama(prompt, systemInstruction);

    if (!responseText) throw new Error("No text returned");
    const cleanText = responseText.replace(/[\s\S]*({[\s\S]*})[\s\S]*/, '$1').trim();
    return JSON.parse(cleanText || "{}");
  } catch (error) {
    console.error("Diagnosis Error:", error);
    throw error;
  }
}

