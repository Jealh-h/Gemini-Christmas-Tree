import { GoogleGenAI } from "@google/genai";
import { GeminiConfig } from "../types";

export class GeminiService {
  private ai: GoogleGenAI;

  constructor() {
    this.ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  }

  async generateMemoryDescription(photoId: string): Promise<string> {
    try {
      const response = await this.ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: `I am looking at a Christmas memory photo (ID: ${photoId}). 
        Please write a short, magical, and heartwarming single-sentence description of what this memory might be about. 
        Focus on themes of family, snow, gifts, or cozy fireplaces. Keep it under 20 words.`,
      });
      return response.text || "A beautiful Christmas memory preserved forever.";
    } catch (error) {
      console.error("Gemini generation error:", error);
      return "The magic of Christmas glows within this memory.";
    }
  }
}