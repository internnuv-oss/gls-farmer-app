import fs from 'fs';
import path from 'path';

const localesDir = path.resolve('./locales');
const TARGET_LANGS = ['hi', 'gu']; 
const BATCH_SIZE = 10; // Safest size for perfect translations

const chunkArray = (array, size) => {
  const chunks = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
};

async function translateBatch(texts, targetLang) {
  // Using a very distinct delimiter that Google won't try to translate
  const DELIMITER = '\n^^^\n'; 
  const combinedText = texts.join(DELIMITER);
  
  const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=${targetLang}&dt=t`;
  
  // 🚀 USING POST REQUEST: This prevents the "URL Too Long" error for large batches
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `q=${encodeURIComponent(combinedText)}`
  });
  
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  
  const data = await response.json();
  const translatedCombined = data[0].map(item => item[0]).join('');
  
  // Clean up the split just in case Google added spaces around the delimiter
  return translatedCombined.split(/\n?\s*\^\^\^\s*\n?/).map(s => s.trim());
}

async function run() {
  const enPath = path.join(localesDir, 'en.json');
  if (!fs.existsSync(enPath)) {
    console.error("❌ Error: en.json not found.");
    return;
  }

  const enRaw = fs.readFileSync(enPath, 'utf-8').trim();
  const enStrings = enRaw ? JSON.parse(enRaw) : {};

  for (const lang of TARGET_LANGS) {
    console.log(`\n🌐 Processing language: ${lang}`);
    const langPath = path.join(localesDir, `${lang}.json`);
    let existingStrings = {};
    
    if (fs.existsSync(langPath)) {
      const rawData = fs.readFileSync(langPath, 'utf-8').trim();
      existingStrings = rawData ? JSON.parse(rawData) : {};
    }

    const keysToTranslate = Object.keys(enStrings).filter(key => !existingStrings[key]);
    
    if (keysToTranslate.length === 0) {
      console.log(`⚡ ${lang}.json is already up to date.`);
      continue;
    }

    console.log(`Found ${keysToTranslate.length} missing keys. Translating in batches...`);
    const batches = chunkArray(keysToTranslate, BATCH_SIZE);
    let updated = false;

    for (let i = 0; i < batches.length; i++) {
      const batchKeys = batches[i];
      const batchTexts = batchKeys.map(k => enStrings[k]);
      
      console.log(`Translating batch ${i + 1} of ${batches.length}...`);
      
      try {
        const translatedTexts = await translateBatch(batchTexts, lang);
        
        batchKeys.forEach((key, index) => {
          if (translatedTexts[index]) {
            existingStrings[key] = translatedTexts[index];
            updated = true;
          }
        });
        
        // 🚀 Wait 2 seconds between batches to completely avoid rate limits
        await new Promise(r => setTimeout(r, 2000));
        
      } catch (err) {
        console.error(`❌ Failed to translate batch ${i + 1}:`, err.message);
      }
    }

    if (updated) {
      fs.writeFileSync(langPath, JSON.stringify(existingStrings, null, 2));
      console.log(`✅ Successfully saved ${lang}.json`);
    }
  }
}

run();