import i18n from "i18next";
import { initReactI18next } from "react-i18next";

const resources = {
  en: { translation: { login: "Login", register: "Register", onboarding: "Dealer Onboarding" } },
  gu: { translation: { login: "પ્રવેશ", register: "નોંધણી", onboarding: "ડિલર ઓનબોર્ડિંગ" } },
  hi: { translation: { login: "लॉगिन", register: "रजिस्टर", onboarding: "डीलर ऑनबोर्डिंग" } },
};

i18n.use(initReactI18next).init({
  resources,
  lng: "en",
  fallbackLng: "en",
  interpolation: { escapeValue: false },
});

export default i18n;
