import { useMemo, useState } from 'react';

export type LocaleCode = 'en' | 'fr' | 'yo';

const LOCALE_KEY = 'shr_locale';

const STRINGS: Record<LocaleCode, Record<string, string>> = {
  en: {
    inbox: 'Role Inbox',
    appointments: 'Follow-Up Appointments',
    timeline: 'Patient Timeline',
    quality: 'Data Quality',
    security: 'Security',
    observability: 'Observability',
    reports: 'Reports',
    language: 'Language',
  },
  fr: {
    inbox: 'Boite de Reception de Role',
    appointments: 'Rendez-vous de Suivi',
    timeline: 'Chronologie Patient',
    quality: 'Qualite des Donnees',
    security: 'Securite',
    observability: 'Observabilite',
    reports: 'Rapports',
    language: 'Langue',
  },
  yo: {
    inbox: 'Apo Ise Fun Ipo',
    appointments: 'Ipade Atunwo',
    timeline: 'Aago Itan Alaisan',
    quality: 'Didara Data',
    security: 'Aabo',
    observability: 'Abojuto Eto',
    reports: 'Iroyin',
    language: 'Ede',
  },
};

export function getLocale(): LocaleCode {
  const raw = localStorage.getItem(LOCALE_KEY) as LocaleCode | null;
  if (raw === 'fr' || raw === 'yo' || raw === 'en') return raw;
  return 'en';
}

export function setLocale(locale: LocaleCode): void {
  localStorage.setItem(LOCALE_KEY, locale);
}

export function t(key: string, locale: LocaleCode = getLocale()): string {
  return STRINGS[locale]?.[key] ?? STRINGS.en[key] ?? key;
}

export function useLocale() {
  const [locale, setLocaleState] = useState<LocaleCode>(getLocale());

  const translate = useMemo(() => {
    return (key: string) => t(key, locale);
  }, [locale]);

  return {
    locale,
    setLocale: (value: LocaleCode) => {
      setLocale(value);
      setLocaleState(value);
    },
    t: translate,
  };
}
