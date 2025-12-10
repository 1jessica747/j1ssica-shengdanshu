import { GoogleGenAI } from "@google/genai";
import { LUXURY_SYSTEM_INSTRUCTION } from '../constants';

const apiKey = process.env.API_KEY || '';
const ai = new GoogleGenAI({ apiKey });

export const generateLuxuryWish = async (userInput: string): Promise<string> => {
  if (!apiKey) {
    return "Experience the magic of the holidays. (API Key missing)";
  }

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Create a luxurious, magical holiday wish for someone who loves: ${userInput || 'Elegance'}`,
      config: {
        systemInstruction: LUXURY_SYSTEM_INSTRUCTION,
        temperature: 0.8,
        maxOutputTokens: 60,
      },
    });

    return response.text?.trim() || "May your holidays be filled with golden moments.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "May elegance guide your way into the New Year.";
  }
};
