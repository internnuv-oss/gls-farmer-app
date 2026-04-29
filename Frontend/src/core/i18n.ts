import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import AsyncStorage from "@react-native-async-storage/async-storage";

// Automatically import the generated JSON files
import en from "../../locales/en.json";
import gu from "../../locales/gu.json";
import hi from "../../locales/hi.json";

const STORE_LANGUAGE_KEY = "settings.lang";

const languageDetectorPlugin = {
  type: "languageDetector" as const,
  async: true,
  init: () => {},
  detect: async function (callback: (lang: string) => void) {
    try {
      const language = await AsyncStorage.getItem(STORE_LANGUAGE_KEY);
      callback(language || "en");
    } catch (error) {
      callback("en");
    }
  },
  cacheUserLanguage: async function (language: string) {
    try {
      await AsyncStorage.setItem(STORE_LANGUAGE_KEY, language);
    } catch (error) {}
  },
};

i18n
  .use(languageDetectorPlugin)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      gu: { translation: gu },
      hi: { translation: hi },
    },
    compatibilityJSON: 'v4', 
    fallbackLng: "en",
    react: {
      useSuspense: false, 
    },
    interpolation: { escapeValue: false },
  });

export default i18n;