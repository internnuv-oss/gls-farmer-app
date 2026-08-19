import { createClient } from '@supabase/supabase-js';
import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') }); 

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml2aWRnc2xsYmN3cGR5ZGhybmNyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NjMxNjY0OCwiZXhwIjoyMDkxODkyNjQ4fQ.KHztsw8AmNVVL751osJI8K484b_JbMmiCeiIhGlCpcE"; 
const geminiApiKey = process.env.GEMINI_API_KEY;

if (!supabaseUrl || !supabaseServiceKey || !geminiApiKey) {
  console.error("❌ Missing environment variables.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);
const genAI = new GoogleGenerativeAI(geminiApiKey);
const model = genAI.getGenerativeModel({ model: "gemini-3.5-flash-lite" });

async function hydrateAllMissing() {
  console.log("🔍 Fetching words from all 5 Master Tables...");

  const [params, crops, stages, products, uoms] = await Promise.all([
    supabase.from('master_parameters').select('parameter_label, options_data'),
    supabase.from('master_crops').select('crop_name, crop_category'),
    supabase.from('master_crop_stages').select('stage_name'),
    supabase.from('master_gls_products').select('product_name'),
    supabase.from('master_uom').select('uom_name')
  ]);

  const allKeys = new Set();

  params.data?.forEach(p => {
    if (p.parameter_label) allKeys.add(p.parameter_label.trim());
    if (Array.isArray(p.options_data)) {
      p.options_data.forEach(opt => { if (typeof opt === 'string' && opt.trim()) allKeys.add(opt.trim()); });
    }
  });

  crops.data?.forEach(c => {
    if (c.crop_name) allKeys.add(c.crop_name.trim());
    if (c.crop_category) allKeys.add(c.crop_category.trim());
  });

  stages.data?.forEach(s => { if (s.stage_name) allKeys.add(s.stage_name.trim()); });
  products.data?.forEach(p => { if (p.product_name) allKeys.add(p.product_name.trim()); });
  uoms.data?.forEach(u => { if (u.uom_name) allKeys.add(u.uom_name.trim()); });

  const { data: existing } = await supabase.from('dynamic_translations').select('english_key');
  const existingSet = new Set((existing || []).map(e => e.english_key));
  
  const missing = Array.from(allKeys).filter(k => !existingSet.has(k));

  console.log(`🧠 Found ${allKeys.size} UNIQUE words across all tables.`);
  console.log(`✅ Found ${existingSet.size} already translated.`);

  if (missing.length === 0) {
    console.log("⚡ All words are already translated!");
    return;
  }

  console.log(`🌐 Translating ${missing.length} missing strings in 1 single API call...`);

  const prompt = `You are an expert translator for an Indian Agricultural Application.
    Translate this JSON array of English agricultural terms into Hindi and Gujarati. 
    
    STRICT RULES:
    1. The "hi" value MUST be in the Hindi Devanagari script.
    2. The "gu" value MUST be in the Gujarati script. Do NOT put Hindi text in the "gu" field.
    
    Return ONLY a valid JSON object format: { "EnglishTerm": { "hi": "HindiTranslation", "gu": "GujaratiTranslation" } }
    Data: ${JSON.stringify(missing, null, 2)}`;

  try {
    const result = await model.generateContent(prompt);
    const cleanedText = result.response.text().replace(/```json/g, '').replace(/```/g, '').trim();
    const translationJSON = JSON.parse(cleanedText);

    const dbPayload = Object.keys(translationJSON).map(engKey => ({
      english_key: engKey,
      hindi_val: translationJSON[engKey].hi,
      gujarati_val: translationJSON[engKey].gu
    }));

    const { error } = await supabase.from('dynamic_translations').upsert(dbPayload, { onConflict: 'english_key' });
    if (error) throw error;

    console.log(`🎉 Successfully translated and saved ${dbPayload.length} new words!`);
  } catch (error) {
    console.error("❌ Translation Error:", error);
  }
}

hydrateAllMissing();