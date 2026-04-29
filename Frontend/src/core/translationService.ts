import AsyncStorage from '@react-native-async-storage/async-storage';

const CACHE_PREFIX = 'trans_cache_';

export async function translateText(text: string, targetLang: string): Promise<string> {
  // If English or empty, return original
  if (!text || targetLang === 'en') return text; 
  
  const cacheKey = `${CACHE_PREFIX}${targetLang}_${text}`;
  const cached = await AsyncStorage.getItem(cacheKey);
  
  // Return cached translation if we've seen this word before
  if (cached) return cached;

  try {
    // Using a public translation endpoint (Great for MVPs. For heavy production, use Google Cloud Translation API)
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=${targetLang}&dt=t&q=${encodeURIComponent(text)}`;
    
    const response = await fetch(url);
    const data = await response.json();
    
    // Extract the translated string from the nested array response
    const translatedText = data[0].map((item: any) => item[0]).join('');
    
    // Save to cache for next time
    await AsyncStorage.setItem(cacheKey, translatedText);
    return translatedText;
  } catch (error) {
    console.error('Translation error:', error);
    return text; // Fallback to English if offline or API fails
  }
}