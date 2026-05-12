import { GROQ_API_KEY } from '../constants/config';

/**
 * Groq Cloud API Caller
 * Production-ready implementation with async handling and error safety
 */
export const callGroqAPI = async (messages, timeoutMs = 20000) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: messages,
        temperature: 0.7,
        max_tokens: 2048,
      }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error("Groq API Error Status:", response.status, errorData);
      throw new Error(`API_ERROR_${response.status}`);
    }

    const data = await response.json();
    const reply = data?.choices?.[0]?.message?.content;

    if (!reply) {
      throw new Error("EMPTY_RESPONSE");
    }

    return reply;
  } catch (error) {
    clearTimeout(timeoutId);
    
    if (error.name === 'AbortError') {
      console.error("Groq API Error: Timeout");
      throw new Error("TIMEOUT");
    }

    console.error("Groq API Error:", error.message);
    throw error;
  }
};
