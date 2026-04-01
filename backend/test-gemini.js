import { generateQuestionsForTopic } from './services/geminiService.js';

async function test() {
    console.log('Testing Gemini Question Generation...');
    const questions = await generateQuestionsForTopic('History', 2);
    console.log('Got questions:', JSON.stringify(questions, null, 2));
}

test();
