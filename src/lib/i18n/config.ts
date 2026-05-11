export const LOCALES = ["tr", "en"] as const;

export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "tr";

export const LOCALE_COOKIE = "hb_locale";

export const LOCALE_LABELS: Record<Locale, string> = {
  tr: "Türkçe",
  en: "English",
};

export const LOCALE_SHORT_LABELS: Record<Locale, string> = {
  tr: "TR",
  en: "EN",
};

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && (LOCALES as readonly string[]).includes(value);
}

export function normalizeLocale(value: unknown): Locale {
  if (isLocale(value)) {
    return value;
  }

  if (typeof value === "string") {
    const lower = value.toLowerCase();

    if (lower.startsWith("tr")) {
      return "tr";
    }

    if (lower.startsWith("en")) {
      return "en";
    }
  }

  return DEFAULT_LOCALE;
}
