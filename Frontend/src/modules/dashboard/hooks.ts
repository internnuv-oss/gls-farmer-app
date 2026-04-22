import i18n from "../../core/i18n";
import { useAuthStore } from "../../store/authStore";

export function useProfileActions() {
  const logout = useAuthStore((s) => s.logout);
  const switchLanguage = (lng: "en" | "gu" | "hi") => i18n.changeLanguage(lng);
  return { logout, switchLanguage };
}
