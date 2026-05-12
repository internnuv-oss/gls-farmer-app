import dotenv from 'dotenv';
dotenv.config();

const API_KEY = process.env.GEMINI_API_KEY;

if (!API_KEY) {
  console.error("❌ Error: GEMINI_API_KEY is missing in your .env file.");
  process.exit(1);
}

async function checkModels() {
  console.log("🔍 Fetching available models for your API key...");
  
  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${API_KEY}`);
    const data = await response.json();
    
    if (data.error) {
      console.error("❌ API Error:", data.error.message);
      return;
    }
    
    console.log("\n✅ You can use the following models for generation:");
    console.log("-------------------------------------------------");
    data.models.forEach(model => {
      // We only care about models that support generating content (text/json)
      if (model.supportedGenerationMethods.includes("generateContent")) {
          // Remove the "models/" prefix to get the exact string we need
          console.log(`-> ${model.name.replace('models/', '')}`);
      }
    });
    console.log("-------------------------------------------------\n");
    
  } catch (error) {
    console.error("❌ Fetch Error:", error.message);
  }
}

checkModels();