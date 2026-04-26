
import { z } from "zod";

export const MedicalHistorySchema = z.object({
  conditions: z.string(),
  treatments: z.string(),
  allergies: z.string(),
});

export type MedicalHistory = z.infer<typeof MedicalHistorySchema>;

export async function queryOllama(prompt: string, systemInstruction?: string) {
  const response = await fetch("/api/ollama", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      prompt,
      system: systemInstruction,
      stream: false,
    }),
  });

  if (!response.ok) {
    throw new Error("Failed to query Ollama");
  }

  const data = await response.json();
  return data.response;
}

export async function mergeMedicalHistory(currentHistory: any, newConsultationSummary: string) {
  const prompt = `
    لديك الملف الطبي الحالي للمريض: ${JSON.stringify(currentHistory)}
    وقد قدم المريض الآن استشارة جديدة تحتوي على ملخص الأعراض التالي: ${newConsultationSummary}
    
    يرجى دمج هذه المعلومات الجديدة في الملف الطبي (تحديث الحالات المزمنة، العلاجات، أو الحساسية إن لزم الأمر).
    يجب أن يكون الرد تنسيق JSON حصراً بنفس هيكل الملف الطبي الأصلي. ابدأ مباشرة بـ { وانته بـ }.
    
    Required JSON structure:
    {
      "conditions": "string - updated chronic conditions",
      "treatments": "string - updated treatments",
      "allergies": "string - updated allergies"
    }
  `;
  
  const responseText = await queryOllama(prompt, "أنت مساعد طبي ذكي. مهمتك هي تحديث السجلات الطبية للمرضى بناءً على البيانات الجديدة. أرجع JSON فقط.");
  const cleanText = responseText.replace(/[\s\S]*({[\s\S]*})[\s\S]*/, '$1').trim();
  
  try {
    const parsedData = JSON.parse(cleanText);
    return MedicalHistorySchema.parse(parsedData);
  } catch (error) {
    console.error("Failed to parse or validate medical history:", error);
    throw new Error("Invalid format received from AI");
  }
}
