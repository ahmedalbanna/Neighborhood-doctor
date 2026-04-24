import { GoogleGenAI, Type } from "@google/genai";

const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
  console.warn("GEMINI_API_KEY is not set. AI features will not work.");
}

const ai = new GoogleGenAI({ apiKey: apiKey || "" });

export async function transcribeAndAnalyze(audioBase64: string, mimeType: string) {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
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
              أنت مساعد طبي ذكي متخصص في اللهجة اليمنية. 
              1. قم بتحويل الكلام في المقطع الصوتي المرفق إلى نص عربي دقيق.
              2. قم بتحليل الحالة الطبية بناءً على الوصف وتقديم ملخص طبي موجز ومفيد للطبيب.
              3. صنف الأولوية إلى: low, medium, high, emergency.
              4. اقترح التخصص الطبي المناسب للحالة من: "عام", "أطفال", "نساء وتوليد", "قلب", "باطنية".
              
              يجب أن يكون الرد بتنسيق JSON حصراً:
              {
                "transcription": "نص الكلام المسموع",
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
    const chat = ai.models.startChat({
      model: "gemini-3-flash-preview",
      history: [
        {
          role: "user",
          parts: [{ text: "أنت طبيب ذكي وودود تساعد المرضى في الأرياف اليمنية. هدفك هو مساعدتهم في تشخيص أعراضهم عبر أسئلة صوتية بسيطة باللهجة اليمنية." }],
        },
        ...history.map(h => ({ role: h.role, parts: [{ text: h.text }] })),
      ],
    });

    const result = await chat.sendMessage(`
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
    `);

    const responseText = result.response.text();
    return JSON.parse(responseText || "{}");
  } catch (error) {
    console.error("Diagnosis Error:", error);
    throw error;
  }
}
