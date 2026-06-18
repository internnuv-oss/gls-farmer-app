// FieldCommander/Frontend/src/core/translationService.ts

/**
 * Translates any given text (Gujarati/Hindi) to English automatically.
 */
export async function translateToEnglish(text: string): Promise<string> {
    // If empty or not a string, return as is
    if (!text || typeof text !== 'string' || text.trim() === '') return text; 
  
    try {
      // sl=auto detects if it's Hindi or Gujarati, tl=en converts to English
      const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=en&dt=t&q=${encodeURIComponent(text)}`;
      
      const response = await fetch(url);
      const data = await response.json();
      
      // Extract the translated string
      const translatedText = data[0].map((item: any) => item[0]).join('');
      return translatedText;
    } catch (error) {
      console.error(`Failed to translate input "${text}" to English:`, error);
      return text; // Fallback to original text if API fails so we don't lose data
    }
  }
  
  /**
   * Helper function to translate specific fields in a form data object to English
   * before sending to Supabase.
   */
  export async function translatePayloadToEnglish<T>(
    data: T, 
    fieldsToTranslate: (keyof T)[]
  ): Promise<T> {
    if (!data) return data;
  
    const translatedData = { ...data };
  
    // Loop through only the fields we want to translate
    for (const key of fieldsToTranslate) {
      if (typeof translatedData[key] === 'string' && (translatedData[key] as string).trim() !== '') {
        // @ts-ignore - TypeScript workaround for dynamic key assignment
        translatedData[key] = await translateToEnglish(translatedData[key] as string);
      }
    }
  
    return translatedData;
  }