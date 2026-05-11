import { cookies, headers } from "next/headers";
import { DEFAULT_LOCALE, LOCALE_COOKIE, type Locale, normalizeLocale } from "./config";
import { getDictionary } from "./dictionaries";

export async function getServerLocale(): Promise<Locale> {
  const cookieStore = await cookies();
  const fromCookie = cookieStore.get(LOCALE_COOKIE)?.value;

  if (fromCookie) {
    return normalizeLocale(fromCookie);
  }

  try {
    const headerStore = await headers();
    const acceptLanguage = headerStore.get("accept-language");

    if (acceptLanguage) {
      const first = acceptLanguage.split(",")[0]?.trim();

      if (first) {
        return normalizeLocale(first);
      }
    }
  } catch {
    // headers() may be unavailable in some contexts; fall through to default.
  }

  return DEFAULT_LOCALE;
}

export async function getServerDictionary() {
  const locale = await getServerLocale();

  return { locale, t: getDictionary(locale) };
}
