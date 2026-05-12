import fs from 'fs';
import path from 'path';
import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';

// Load environment variables from .env
dotenv.config();

const API_KEY = process.env.GEMINI_API_KEY;
if (!API_KEY) {
  console.error("❌ Error: GEMINI_API_KEY is missing in your .env file.");
  process.exit(1);
}

// Initialize Gemini SDK
const genAI = new GoogleGenerativeAI(API_KEY);

// 🚀 FIXED: Using the ultra-fast gemini-2.5-flash model available on your API key
const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });

const localesDir = path.resolve('./locales');
const TARGET_LANGS = {
  'hi': 'Hindi',
  'gu': 'Gujarati'
};
const BATCH_SIZE = 1000; 

const chunkObject = (obj, size) => {
  const entries = Object.entries(obj);
  const chunks = [];
  for (let i = 0; i < entries.length; i += size) {
    chunks.push(Object.fromEntries(entries.slice(i, i + size)));
  }
  return chunks;
};

async function translateBatchWithGemini(jsonBatch, targetLangName) {
  const prompt = `
You are an expert translator for an Indian Agricultural Sales and Dealer Management Application.
Your task is to translate the values of the provided JSON object from English to ${targetLangName}.

STRICT RULES:
1. Return ONLY a valid JSON object. Do not include markdown tags like \`\`\`json or any conversational text.
2. Keep the EXACT same JSON keys. ONLY translate the values.
3. Maintain agricultural, business, and software terminology appropriate for rural and semi-urban India.
4. If a string contains variables like {{current}} or {{step}}, keep them EXACTLY as they are.
5. Keep formatting like '*', '+', or '-' intact.

JSON to translate:
${JSON.stringify(jsonBatch, null, 2)}
  `;

  try {
    const result = await model.generateContent(prompt);
    const responseText = result.response.text();
    
    // Clean up the response in case the LLM ignored the rule and added markdown formatting
    const cleanedText = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
    
    return JSON.parse(cleanedText);
  } catch (error) {
    console.error(`\n❌ Gemini API Error during translation:`, error.message);
    throw error;
  }
}

async function run() {
  const enPath = path.join(localesDir, 'en.json');
  if (!fs.existsSync(enPath)) {
    console.error("❌ Error: en.json not found.");
    return;
  }

  const enRaw = fs.readFileSync(enPath, 'utf-8').trim();
  const enStrings = enRaw ? JSON.parse(enRaw) : {};

  for (const [langCode, langName] of Object.entries(TARGET_LANGS)) {
    console.log(`\n=================================================`);
    console.log(`🌐 Processing language: ${langName} (${langCode}.json)`);
    console.log(`=================================================`);
    
    const langPath = path.join(localesDir, `${langCode}.json`);
    let existingStrings = {};
    
    if (fs.existsSync(langPath)) {
      const rawData = fs.readFileSync(langPath, 'utf-8').trim();
      existingStrings = rawData ? JSON.parse(rawData) : {};
    }

    // Find keys that exist in English but not in the target language
    const missingKeysObj = {};
    for (const key of Object.keys(enStrings)) {
      if (!existingStrings[key]) {
        missingKeysObj[key] = enStrings[key];
      }
    }
    
    const missingCount = Object.keys(missingKeysObj).length;
    if (missingCount === 0) {
      console.log(`⚡ ${langCode}.json is already up to date.`);
      continue;
    }

    console.log(`Found ${missingCount} missing translations. Grouping into batches of ${BATCH_SIZE}...`);
    const batches = chunkObject(missingKeysObj, BATCH_SIZE);
    let updated = false;

    for (let i = 0; i < batches.length; i++) {
      console.log(`Translating batch ${i + 1} of ${batches.length}...`);
      
      try {
        const translatedBatch = await translateBatchWithGemini(batches[i], langName);
        
        // Merge the newly translated batch into our existing strings
        existingStrings = { ...existingStrings, ...translatedBatch };
        updated = true;
        
        // Save incrementally
        fs.writeFileSync(langPath, JSON.stringify(existingStrings, null, 2));
        
        // 2.5 second pause to respect the 15 RPM free tier limit safely
        await new Promise(resolve => setTimeout(resolve, 2500));
        
      } catch (err) {
        console.error(`❌ Skipping batch ${i + 1} due to error.`);
      }
    }

    if (updated) {
      console.log(`✅ Successfully finished syncing ${langCode}.json`);
    }
  }
  
  console.log(`\n🎉 Translation sync complete!`);
}

run();