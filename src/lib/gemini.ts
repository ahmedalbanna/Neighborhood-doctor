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
              1. قم بتحويل الكلام في المقطع الصوتي المرفق إلى نص عربي دقيق (Transcription).
              2. قم بتحليل الحالة الطبية بناءً على الوصف وتقديم ملخص (Summary).
              3. صنف الأولوية (Priority) إلى: low, medium, high, emergency.
              
              يجب أن يكون الرد بتنسيق JSON حصراً:
              {
                "transcription": "نص الكلام المسموع",
                "summary": "ملخص الحالة والأعراض المذكورة",
                "priority": "emergency | high | medium | low",
                "detectedDialect": "صنعاني | عدني | تعزي | حضرمي | إلخ"
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

export async function generateAIAssistantReply(transcription: string) {
  // Optional: could be used for immediate automated feedback
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `المريض يقول: "${transcription}". قدم نصيحة طبية أولية سريعة جداً وودودة باللهجة اليمنية، وأكد له أن الطبيب سيطلع على حالته قريباً. لا تعطِ تشخيصاً نهائياً.`,
  });
  return response.text;
}
