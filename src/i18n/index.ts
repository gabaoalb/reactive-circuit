import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import ptBR from "./pt-BR.json";
import en from "./en.json";
import es from "./es.json";

export const languageStorageKey = "reactive-circuit.language";
export function supportedLanguage(language: string): "pt-BR" | "en" | "es" | undefined {
  const base = language.toLowerCase().split("-")[0];
  if (base === "pt") return "pt-BR";
  if (base === "en" || base === "es") return base;
  return undefined;
}
function initialLanguage() {
  try {
    const saved = localStorage.getItem(languageStorageKey);
    if (saved && supportedLanguage(saved)) return supportedLanguage(saved);
  } catch {
    /* Storage may be unavailable in private or restricted contexts. */
  }
  return navigator.languages.map(supportedLanguage).find(Boolean) ?? "pt-BR";
}
function updateDocument(language: string) {
  document.documentElement.lang = language;
  document.title = i18n.t("title");
  document
    .querySelector('meta[name="description"]')
    ?.setAttribute("content", i18n.t("description"));
  try {
    localStorage.setItem(languageStorageKey, language);
  } catch {
    /* Translation works without storage. */
  }
}
void i18n.use(initReactI18next).init({
  resources: { "pt-BR": { translation: ptBR }, en: { translation: en }, es: { translation: es } },
  lng: initialLanguage(),
  fallbackLng: "pt-BR",
  supportedLngs: ["pt-BR", "en", "es"],
  load: "currentOnly",
  keySeparator: false,
  nsSeparator: false,
  interpolation: { escapeValue: false },
});
i18n.on("languageChanged", updateDocument);
updateDocument(i18n.resolvedLanguage ?? "pt-BR");
export default i18n;
