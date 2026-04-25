export async function queryOllama(prompt: string, systemInstruction?: string) {
  const response = await fetch("/api/ollama", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      prompt,
      system: systemInstruction,
      stream: false
    }),
  });
  
  if (!response.ok) {
    throw new Error("Failed to query Ollama");
  }
  
  const data = await response.json();
  return data.response;
}
