import { GoogleGenAI, Type } from "@google/genai";

const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
  console.warn("GEMINI_API_KEY is not set. AI features will not work.");
}

const ai = new GoogleGenAI({ apiKey: apiKey || "" });

export async function transcribeAndAnalyze(audioBase64: string, mimeType: string) {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3.1-pro-preview", // upgraded for better dialect accuracy
      contents: [
        {
          parts: [
            {
              inlineData: {
                data: audioBase64,
                mimeType: mimeType,
              },
            },
            {
              text: `
              أنت مساعد طبي ذكي خبير بجميع اللهجات اليمنية (صنعاني، عدني، تعزي، حضرمي، تهامي، وغيرها). مهمتك هي الاستماع بعناية شديدة للرسالة الصوتية للمريض وتأدية الآتي بدقة عالية:
              1. تحويل الكلام في المقطع الصوتي إلى نص عربي فصيح ودقيق، مع فهم المصطلحات الشعبية والمحلية (رعشة، حمى حق اليومين، موجوع قوي، إلخ) وترجمتها للمعنى الطبي الصحيح إذا لزم.
              2. تحليل الحالة الطبية بناءً على الوصف وتقديم ملخص طبي موجز ومفيد للطبيب.
              3. صنف الأولوية إلى: low, medium, high, emergency.
              4. اقترح التخصص الطبي المناسب للحالة من: "عام", "أطفال", "نساء وتوليد", "قلب", "باطنية".
              
              يجب أن يكون الرد بتنسيق JSON حصراً:
              {
                "transcription": "التفريغ النصي الدقيق لكلام المريض",
                "summary": "ملخص الحالة والأعراض المذكورة",
                "priority": "emergency | high | medium | low",
                "detectedDialect": "صنعاني | عدني | تعزي | حضرمي | إلخ",
                "suggestedSpecialty": "التخصص المقترح"
              }
              `,
            },
          ],
        },
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            transcription: { type: Type.STRING },
            summary: { type: Type.STRING },
            priority: { type: Type.STRING },
            detectedDialect: { type: Type.STRING },
            suggestedSpecialty: { type: Type.STRING },
          },
          required: ["transcription", "summary", "priority"],
        },
      },
    });

    return JSON.parse(response.text || "{}");
  } catch (error) {
    console.error("Gemini Analysis Error:", error);
    throw error;
  }
}

export async function getSelfDiagnosisStep(history: { role: "user" | "model", text: string }[]) {
  try {
    const chat = ai.chats.create({
      model: "gemini-3.1-pro-preview",
      config: {
        systemInstruction: "أنت طبيب ذكي وودود تساعد المرضى في الأرياف اليمنية. هدفك هو مساعدتهم في تشخيص أعراضهم عبر أسئلة صوتية بسيطة باللهجة اليمنية.",
      }
    });

    // Feed previous history 
    // In SDK, you can pass history or send one by one. For simplicity of the SDK, just sending a combined prompt if history is an issue.
    // However, the best way is passing the whole history in a formatted prompt:
    const formattedHistory = history.map(h => `${h.role === 'user' ? 'المريض' : 'الطبيب'}: ${h.text}`).join('\n');

    const result = await chat.sendMessage({
      message: `
      هذا هو سجل المحادثة:
      ${formattedHistory}

      بناءً على المحادثة السابقة:
      1. اقترح السؤال التالي للمريض باللهجة اليمنية البسيطة.
      2. إذا كانت الحالة كافية للتشخيص الأولي، قدم النتيجة (فحص منزلي، استشارة طبيب، أو طوارئ).
      3. يجب أن يكون الرد بتنسيق JSON:
      {
        "question": "السؤال التالي أو التوجيه النهائي",
        "isFinal": true | false,
        "urgency": "low | medium | high | emergency",
        "advice": "نصيحة مختصرة جداً"
      }
    `
    });

    const responseText = result.text;
    if (!responseText) throw new Error("No text returned");
    const cleanText = responseText.replace(/```json\n?|\n?```/g, '').trim();
    return JSON.parse(cleanText || "{}");
  } catch (error) {
    console.error("Diagnosis Error:", error);
    throw error;
  }
}
