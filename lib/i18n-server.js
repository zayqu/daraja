import { cookies } from "next/headers";
import { LOCALE_COOKIE, normalizeLocale, translate } from "@/lib/i18n";

// Server components: const { t, locale } = await getServerT();
export async function getServerT() {
  const locale = normalizeLocale((await cookies()).get(LOCALE_COOKIE)?.value);
  return { locale, t: (text, values) => translate(locale, text, values) };
}
