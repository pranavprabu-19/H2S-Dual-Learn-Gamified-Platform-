import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
dotenv.config();

// Ensure you have GEMINI_API_KEY in your .env
const ai = process.env.GEMINI_API_KEY ? new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY }) : null;

export const generateQuestionsForTopic = async (topic, count = 5, elo = 1200) => {
    if (!ai) {
        console.warn('⚠️ No Gemini API Key provided. Returning mock questions.');
        // Fallback mock questions
        return Array.from({ length: count }).map((_, i) => ({
            text: `Mock question ${i + 1} for ${topic}?`,
            options: ['A', 'B', 'C', 'D'],
            correctAnswer: 'A',
            explanation: "This is a fallback explanation because no API key is set."
        }));
    }

    let difficulty = "Beginner/Standard Learner";
    if (elo >= 1400) difficulty = "Intermediate/College Level";
    if (elo >= 1800) difficulty = "Expert/Grandmaster Level (Obscure, highly complex, deeply theoretical)";

    const prompt = `Generate exactly ${count} multiple choice questions about the topic "${topic}". 
The difficulty and complexity of these questions MUST strictly align with a "${difficulty}" level audience.

Return the result strictly as a valid JSON array of objects.
Each object must have the following keys:
- "text": the precise question text.
- "options": an array of exactly 4 strings.
- "correctAnswer": the exact string of the correct option.
- "explanation": a concise, 1-to-2 sentence educational explanation of WHY the answer is correct or the context behind it.

Example Output:
[
  {
    "text": "What is the capital of France?",
    "options": ["London", "Berlin", "Paris", "Madrid"],
    "correctAnswer": "Paris",
    "explanation": "Paris has been the capital of France since 508 CE when King Clovis I made it the seat of his government."
  }
]`;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                responseMimeType: 'application/json'
            }
        });
        
        const text = response.text;
        return JSON.parse(text);
    } catch (error) {
        console.error('❌ Generator Error:', error);
        return [];
    }
};
