// Frontend/scripts/extract-en.mjs
import fs from 'fs';
import path from 'path';

// Define paths
const SRC_DIR = path.resolve('./src');
const EN_JSON_PATH = path.resolve('./locales/en.json');

// Regular expression to find t("...") or t('...') or t(`...`)
// It safely captures the string inside the quotes
const tRegex = /(?<=[^a-zA-Z0-9])t\(\s*(['"`])((?:(?!\1)[^\\]|\\.)*)\1/g;

// Helper function to recursively find all .ts and .tsx files
function walkDir(dir, callback) {
  if (!fs.existsSync(dir)) return;
  fs.readdirSync(dir).forEach(f => {
    const dirPath = path.join(dir, f);
    const isDirectory = fs.statSync(dirPath).isDirectory();
    if (isDirectory) {
      walkDir(dirPath, callback);
    } else if (dirPath.endsWith('.ts') || dirPath.endsWith('.tsx')) {
      callback(dirPath);
    }
  });
}

async function runExtractor() {
  console.log('🔍 Scanning codebase for translation strings...');
  
  const extractedKeys = new Set();
  let filesScanned = 0;

  // 1. Scan all files and extract strings
  walkDir(SRC_DIR, (filePath) => {
    filesScanned++;
    const content = fs.readFileSync(filePath, 'utf-8');
    
    let match;
    while ((match = tRegex.exec(content)) !== null) {
      // match[2] contains the actual string without the quotes
      const translationString = match[2];
      // Skip empty strings
      if (translationString.trim() !== '') {
        extractedKeys.add(translationString);
      }
    }
  });

  console.log(`📂 Scanned ${filesScanned} files.`);
  console.log(`🧩 Found ${extractedKeys.size} unique translation strings in code.`);

  // 2. Load existing en.json
  let enStrings = {};
  if (fs.existsSync(EN_JSON_PATH)) {
    const raw = fs.readFileSync(EN_JSON_PATH, 'utf-8');
    enStrings = raw ? JSON.parse(raw) : {};
  }

  // 3. Compare and add missing keys
  let addedCount = 0;
  extractedKeys.forEach(key => {
    if (!enStrings.hasOwnProperty(key)) {
      enStrings[key] = key; // Set key and value to be the same for English
      addedCount++;
    }
  });

  // 4. Save updated en.json (Sorted alphabetically for neatness)
  if (addedCount > 0) {
    const sortedEnStrings = Object.keys(enStrings)
      .sort((a, b) => a.localeCompare(b))
      .reduce((obj, key) => {
        obj[key] = enStrings[key];
        return obj;
      }, {});

    fs.writeFileSync(EN_JSON_PATH, JSON.stringify(sortedEnStrings, null, 2));
    console.log(`✅ Successfully added ${addedCount} NEW strings to en.json!`);
  } else {
    console.log(`⚡ en.json is already up to date. No new strings found.`);
  }
}

runExtractor();