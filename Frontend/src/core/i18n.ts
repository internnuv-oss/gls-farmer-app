import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import AsyncStorage from "@react-native-async-storage/async-storage";

const STORE_LANGUAGE_KEY = "settings.lang";

// Custom plugin to load and save language to device storage
const languageDetectorPlugin = {
  type: "languageDetector" as const,
  async: true,
  init: () => {},
  detect: async function (callback: (lang: string) => void) {
    try {
      const language = await AsyncStorage.getItem(STORE_LANGUAGE_KEY);
      if (language) {
        callback(language);
      } else {
        callback("en");
      }
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

const resources = {
  en: { 
    translation: { 
      "Profile": "Profile", "Dealers": "Dealers", "Farmers": "Farmers", "Distributors": "Distributors",
      "My Network Summary": "My Network Summary", "Change Language": "Change Language", "Logout": "Logout",
      "Dealer Onboarding": "Dealer Onboarding", "Edit Dealer Profile": "Edit Dealer Profile",
      "Basic Information": "Basic Information", "Profiling & Scoring": "Profiling & Scoring",
      "Business Area & Status": "Business Area & Status", "GLS Commitments": "GLS Commitments",
      "Regulatory Compliance": "Regulatory Compliance", "Documents & Photos": "Documents & Photos",
      "SE Evaluation & Annexures": "SE Evaluation & Annexures", "Dealer Agreement": "Dealer Agreement",
      "Final Review": "Final Review", "Next": "Next", "Save Draft": "Save Draft",
      "Submit Profile": "Submit Profile", "Save Changes": "Save Changes", "Return to Review": "Return to Review"
    } 
  },
  gu: { 
    translation: { 
      "Profile": "પ્રોફાઇલ", "Dealers": "ડીલરો", "Farmers": "ખેડૂતો", "Distributors": "વિતરકો",
      "My Network Summary": "મારું નેટવર્ક સારાંશ", "Change Language": "ભાષા બદલો", "Logout": "લોગઆઉટ",
      "Dealer Onboarding": "ડીલર ઓનબોર્ડિંગ", "Edit Dealer Profile": "ડીલર પ્રોફાઇલ સંપાદિત કરો",
      "Basic Information": "મૂળભૂત માહિતી", "Profiling & Scoring": "પ્રોફાઇલિંગ અને સ્કોરિંગ",
      "Business Area & Status": "વ્યવસાય ક્ષેત્ર અને સ્થિતિ", "GLS Commitments": "GLS પ્રતિબદ્ધતાઓ",
      "Regulatory Compliance": "નિયમનકારી અનુપાલન", "Documents & Photos": "દસ્તાવેજો અને ફોટા",
      "SE Evaluation & Annexures": "SE મૂલ્યાંકન અને જોડાણો", "Dealer Agreement": "ડીલર કરાર",
      "Final Review": "અંતિમ સમીક્ષા", "Next": "આગળ", "Save Draft": "ડ્રાફ્ટ સાચવો",
      "Submit Profile": "પ્રોફાઇલ સબમિટ કરો", "Save Changes": "ફેરફારો સાચવો", "Return to Review": "સમીક્ષા પર પાછા ફરો"
    } 
  },
  hi: { 
    translation: { 
      "Profile": "प्रोफ़ाइल", "Dealers": "डीलर", "Farmers": "किसान", "Distributors": "वितरक",
      "My Network Summary": "मेरा नेटवर्क सारांश", "Change Language": "भाषा बदलें", "Logout": "लॉग आउट",
      "Dealer Onboarding": "डीलर ऑनबोर्डिंग", "Edit Dealer Profile": "डीलर प्रोफ़ाइल संपादित करें",
      "Basic Information": "बुनियादी जानकारी", "Profiling & Scoring": "प्रोफाइलिंग और स्कोरिंग",
      "Business Area & Status": "व्यवसाय क्षेत्र और स्थिति", "GLS Commitments": "GLS प्रतिबद्धताएं",
      "Regulatory Compliance": "नियामक अनुपालन", "Documents & Photos": "दस्तावेज़ और तस्वीरें",
      "SE Evaluation & Annexures": "SE मूल्यांकन और अनुलग्नक", "Dealer Agreement": "डीलर समझौता",
      "Final Review": "अंतिम समीक्षा", "Next": "अगला", "Save Draft": "ड्राफ्ट सहेजें",
      "Submit Profile": "प्रोफ़ाइल सबमिट करें", "Save Changes": "परिवर्तन सहेजें", "Return to Review": "समीक्षा पर लौटें"
    } 
  },
};

i18n
  .use(languageDetectorPlugin)
  .use(initReactI18next)
  .init({
    resources,
    // ✅ FIX: Upgraded to v4 to match your library version
    compatibilityJSON: 'v4', 
    fallbackLng: "en",
    react: {
      useSuspense: false, 
    },
    interpolation: { escapeValue: false },
  });

export default i18n;

