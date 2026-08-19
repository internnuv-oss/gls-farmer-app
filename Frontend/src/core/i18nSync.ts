// Frontend/src/core/i18nSync.ts
import i18n from 'i18next'; 
import { supabase } from './supabase'; 

export const loadDynamicTranslations = async () => {
  try {
    // 1. Fetch live dynamic strings from Supabase
    const { data, error } = await supabase
      .from('dynamic_translations')
      .select('*');

    if (error || !data) {
      console.error("Failed to fetch dynamic translations", error);
      return;
    }

    // 2. Format them to match i18next structure
    const hindiDynamic: Record<string, string> = {};
    const gujaratiDynamic: Record<string, string> = {};

    data.forEach((row) => {
      if (row.hindi_val) hindiDynamic[row.english_key] = row.hindi_val;
      if (row.gujarati_val) gujaratiDynamic[row.english_key] = row.gujarati_val;
    });

    // 3. Inject them directly into i18next
    i18n.addResourceBundle('hi', 'translation', hindiDynamic, true, true);
    i18n.addResourceBundle('gu', 'translation', gujaratiDynamic, true, true);

    console.log("✅ Live database translations merged successfully!");
  } catch (error) {
    console.error("❌ Error loading dynamic translations:", error);
  }
};