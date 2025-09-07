import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';
import 'dotenv/config'; // Ensure process.env is loaded in dev

const API_KEY = process.env.GOOGLE_API_KEY
if (!API_KEY) {
  throw new Error('Missing GOOGLE_API_KEY environment variable.');
}

/**
 * Creates a configured instance of GoogleGenerativeAI.
 */
export function createGenAI() {
  return new GoogleGenerativeAI(API_KEY);
}

/**
 * Default safety settings for content streaming
 */
export const defaultSafetySettings = [
  { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
  { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
  { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
  { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE }
];