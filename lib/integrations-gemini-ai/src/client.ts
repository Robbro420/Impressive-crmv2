import { GoogleGenAI } from "@google/genai";

/**
 * Gemini client using a direct API key (GEMINI_API_KEY).
 * Lazily constructed so the API server can boot without the key —
 * AI features simply report themselves unavailable instead.
 */
let _ai: GoogleGenAI | null = null;

export function hasGemini(): boolean {
  return Boolean(process.env.GEMINI_API_KEY);
}

export function getAi(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY must be set to use AI features.");
  }
  _ai ??= new GoogleGenAI({ apiKey });
  return _ai;
}
