import AsyncStorage from '@react-native-async-storage/async-storage';

// Standard Google Translate free tier URL
const translateAPI = async (text: string, targetLang: string) => {
  const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=${targetLang}&dt=t&q=${encodeURIComponent(text)}`;
  const response = await fetch(url);
  const data = await response.json();
  return data[0].map((item: any) => item[0]).join('');
};

export async function translateDBFields<T>(
  data: T | T[], 
  fieldsToTranslate: string[], 
  targetLang: string
): Promise<T | T[]> {
  if (targetLang === 'en' || !data) return data;

  const cachePrefix = `db_trans_${targetLang}_`;

  const translateObject = async (obj: any): Promise<any> => {
    let translatedObj = { ...obj };
    
    for (const key of fieldsToTranslate) {
      if (typeof obj[key] === 'string' && obj[key].trim() !== '') {
        const text = obj[key];
        const cacheKey = `${cachePrefix}${text}`;
        
        // 1. Check local cache
        const cached = await AsyncStorage.getItem(cacheKey);
        if (cached) {
          translatedObj[key] = cached;
        } else {
          // 2. Fetch from API and cache
          try {
            const translatedText = await translateAPI(text, targetLang);
            await AsyncStorage.setItem(cacheKey, translatedText);
            translatedObj[key] = translatedText;
          } catch (e) {
            console.error(`Failed to translate DB text: ${text}`, e);
          }
        }
      }
    }
    return translatedObj;
  };

  // Handle arrays (e.g., list of dealers) or single objects (e.g., profile screen)
  if (Array.isArray(data)) {
    return Promise.all(data.map(item => translateObject(item))) as Promise<T[]>;
  } else {
    return translateObject(data) as Promise<T>;
  }
}