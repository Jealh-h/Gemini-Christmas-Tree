
import { GoogleGenAI } from "@google/genai";

export class GeminiService {
  private ai: GoogleGenAI;

  constructor() {
    this.ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  }

  async generateMemoryDescription(photoId: string): Promise<string> {
    const maxRetries = 3;
    let attempt = 0;

    while (attempt < maxRetries) {
      try {
        const response = await this.ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: `I am looking at a Christmas memory photo (ID: ${photoId}). 
          Please write a short, magical, and heartwarming single-sentence description of what this memory might be about. 
          Focus on themes of family, snow, gifts, or cozy fireplaces. Keep it under 20 words.`,
        });
        return response.text || "A beautiful Christmas memory preserved forever.";
      } catch (error: any) {
        // Check for Rate Limit (429) or Resource Exhausted errors
        const isRateLimit = error.status === 429 || error.code === 429 || 
                           (error.message && error.message.includes('429')) ||
                           (error.statusText && error.statusText.includes('Too Many Requests'));

        if (isRateLimit) {
          attempt++;
          const delay = Math.pow(2, attempt) * 1000; // 2s, 4s, 8s
          console.warn(`Gemini Rate Limit hit. Retrying in ${delay}ms... (Attempt ${attempt}/${maxRetries})`);
          
          if (attempt >= maxRetries) {
            return "The Christmas spirits are very busy right now, but this memory shines bright!";
          }
          
          await new Promise(resolve => setTimeout(resolve, delay));
        } else {
          // Non-retriable error
          console.error("Gemini generation error:", error);
          return "The magic of Christmas glows within this memory.";
        }
      }
    }
    
    return "The magic of Christmas glows within this memory.";
  }
}