export type LocaleCode = 'en-us' | 'vi-vn';

export interface LocaleDefinition {
  code: LocaleCode;
  /** Alternative codes that normalize to this locale (e.g. 'en' -> 'en-us', 'vn'/'vi' -> 'vi-vn') */
  aliases: string[];
  label: string;
  nativeLabel: string;
  htmlLang: string;
  ogLocale: string;
  dir: 'ltr' | 'rtl';
  enabled: boolean;
}

export const DEFAULT_LOCALE: LocaleCode = 'en-us';

export const LOCALE_REGISTRY: Record<LocaleCode, LocaleDefinition> = {
  'en-us': {
    code: 'en-us',
    aliases: ['en', 'en_us', 'en-gb'],
    label: 'English (US)',
    nativeLabel: 'English (en-US)',
    htmlLang: 'en-US',
    ogLocale: 'en_US',
    dir: 'ltr',
    enabled: true,
  },
  'vi-vn': {
    code: 'vi-vn',
    aliases: ['vi', 'vn', 'vi_vn'],
    label: 'Vietnamese',
    nativeLabel: 'Tiếng Việt (vi-VN)',
    htmlLang: 'vi-VN',
    ogLocale: 'vi_VN',
    dir: 'ltr',
    // Currently ported for English ('en-us') first; flip to `true` when adding docs under `src/content/docs/vi-vn/`
    enabled: false,
  },
};

export const ALL_LOCALE_CODES = Object.keys(LOCALE_REGISTRY) as LocaleCode[];

export const ENABLED_LOCALES: LocaleCode[] = ALL_LOCALE_CODES.filter(
  (code) => LOCALE_REGISTRY[code].enabled
);
