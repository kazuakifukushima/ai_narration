import { GoogleGenerativeAI } from '@google/generative-ai';
import * as fs from 'fs';
import * as path from 'path';

// Load .env manualy
const envPath = path.join(__dirname, '.env');
if (fs.existsSync(envPath)) {
    const envConfig = fs.readFileSync(envPath, 'utf8');
    envConfig.split('\n').forEach(line => {
        const [key, value] = line.split('=');
        if (key && value) {
            process.env[key.trim()] = value.trim();
        }
    });
}
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

async function listModels() {
    try {
        // Note: The Node SDK might not expose listModels directly on the main class in some versions, 
        // but usually it's avail via the model manager or similar if supported.
        // Actually, for simplicity in the SDK:
        // There isn't a direct 'listModels' helper in the high-level `GoogleGenerativeAI` class in early versions.
        // We might have to just try a known working model.
        // However, let's try to verify if we can make a simple text call to 'gemini-pro' to see if auth works at all.
        console.log('Testing gemini-pro...');
        const model = genAI.getGenerativeModel({ model: "gemini-pro" });
        const result = await model.generateContent("Hello");
        console.log('gemini-pro success:', result.response.text());
    } catch (e) {
        console.error('gemini-pro failed:', e);
    }

    try {
        console.log('Testing gemini-1.5-flash...');
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        const result = await model.generateContent("Hello");
        console.log('gemini-1.5-flash success:', result.response.text());
    } catch (e) {
        console.error('gemini-1.5-flash failed:', e);
    }

    try {
        console.log('Testing gemini-1.5-flash-001...');
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-001" });
        const result = await model.generateContent("Hello");
        console.log('gemini-1.5-flash-001 success:', result.response.text());
    } catch (e) {
        console.error('gemini-1.5-flash-001 failed:', e);
    }

    try {
        console.log('Testing gemini-3-flash-preview...');
        const model = genAI.getGenerativeModel({ model: "gemini-3-flash-preview" });
        const result = await model.generateContent("Hello");
        console.log('gemini-3-flash-preview success:', result.response.text());
    } catch (e) {
        console.error('gemini-3-flash-preview failed:', e);
    }
}

listModels();
