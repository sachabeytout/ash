import en from './en.json';
import fr from './fr.json';

/** Une entrée est soit un texte, soit un jeu de formes plurielles (catégories Intl.PluralRules + `zero`). */
type PluralForms = Partial<Record<Intl.LDMLPluralRule, string>> & { other: string };
type Entry = string | PluralForms;
export type Dictionary = Record<string, Entry>;

export type Locale = 'fr' | 'en';
export type TextKey = keyof typeof fr;
export type Vars = Record<string, string | number>;

const dictionaries: Record<Locale, Dictionary> = { fr, en };

let current: Locale = 'fr';

export function setLocale(locale: Locale): void {
  current = locale;
  if (typeof document !== 'undefined') document.documentElement.lang = locale;
}

export function getLocale(): Locale {
  return current;
}

/** Langue de l'appareil si on la connaît, sinon français. */
export function detectLocale(languages: readonly string[]): Locale {
  for (const lang of languages) {
    const short = lang.slice(0, 2).toLowerCase();
    if (short === 'fr' || short === 'en') return short;
  }
  return 'fr';
}

function interpolate(text: string, vars: Vars | undefined): string {
  if (!vars) return text;
  return text.replace(/\{(\w+)\}/g, (match, name: string) =>
    name in vars ? String(vars[name]) : match,
  );
}

/**
 * Typographie française : l'espace avant « ? ! : ; » et à l'intérieur des guillemets devient
 * insécable, pour qu'un retour à la ligne ne laisse jamais un « ? » seul en début de ligne.
 */
export function frenchSpacing(text: string): string {
  return text.replace(/ ([?!:;»])/g, '\u00a0$1').replace(/« /g, '«\u00a0');
}

/** Traduit une clé. Pour un pluriel, passer `count` dans `vars`. */
export function translate(dict: Dictionary, locale: Locale, key: string, vars?: Vars): string {
  const text = translateRaw(dict, locale, key, vars);
  return locale === 'fr' ? frenchSpacing(text) : text;
}

function translateRaw(dict: Dictionary, locale: Locale, key: string, vars?: Vars): string {
  const entry = dict[key];
  if (entry === undefined) return key;
  if (typeof entry === 'string') return interpolate(entry, vars);

  const count = Number(vars?.count ?? 0);
  const form =
    (count === 0 ? entry.zero : undefined) ??
    entry[new Intl.PluralRules(locale).select(count)] ??
    entry.other;
  return interpolate(form, vars);
}

export function t(key: TextKey, vars?: Vars): string {
  return translate(dictionaries[current], current, key, vars);
}

export const allDictionaries = dictionaries;
