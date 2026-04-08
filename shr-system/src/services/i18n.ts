import { useMemo, useState } from 'react';

export type LocaleCode = 'en' | 'fr' | 'yo';

const LOCALE_KEY = 'shr_locale';
const AUTH_SESSION_KEY = 'shr_auth_session';
const USERS_KEY = 'shr_system_users';

const STRINGS: Record<LocaleCode, Record<string, string>> = {
  en: {
    workflowCenter: 'Workflow Center',
    roleOperationsWorkspace: 'Role Operations Workspace',
    roleWorkspaceSubtitle: 'Unified inbox, notifications, follow-ups, timeline, and quality visibility.',
    roleInboxWithSla: 'Role Inbox with SLA',
    unifiedPatientTimelineSearch: 'Unified Patient Timeline Search',
    realTimeNotifications: 'Real-Time Notifications',
    followUpScheduling: 'Follow-Up Scheduling',
    dataQualitySignals: 'Data Quality Signals',
    securityPermissionModel: 'Security and Permission Model',
    observabilityVisibility: 'Observability Visibility',
    searchTimelinePlaceholder: 'Search timeline by student name, event, or detail',
    noTimelineFound: 'No timeline events found.',
    markDone: 'Mark Done',
    markCompleted: 'Mark Completed',
    qualityRestricted: 'Quality detail requires elevated permission.',
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
    workflowCenter: 'Centre de Flux',
    roleOperationsWorkspace: 'Espace de Travail de Role',
    roleWorkspaceSubtitle: 'Boite, notifications, suivis, chronologie et visibilite qualite unifies.',
    roleInboxWithSla: 'Boite de Role avec SLA',
    unifiedPatientTimelineSearch: 'Recherche Chronologie Patient Unifiee',
    realTimeNotifications: 'Notifications en Temps Reel',
    followUpScheduling: 'Planification de Suivi',
    dataQualitySignals: 'Signaux de Qualite des Donnees',
    securityPermissionModel: 'Modele Securite et Permissions',
    observabilityVisibility: 'Visibilite Observabilite',
    searchTimelinePlaceholder: 'Rechercher par nom, evenement ou detail',
    noTimelineFound: 'Aucun evenement trouve.',
    markDone: 'Marquer Fait',
    markCompleted: 'Marquer Termine',
    qualityRestricted: 'Le detail qualite exige une permission elevee.',
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
    workflowCenter: 'Ile Ise',
    roleOperationsWorkspace: 'Aye Ise Ipo',
    roleWorkspaceSubtitle: 'Apo ise, ifitonileti, ipade, itan akoko ati ayewo data.',
    roleInboxWithSla: 'Apo Ise Pẹlu SLA',
    unifiedPatientTimelineSearch: 'Wiwa Itan Akoko Alaisan',
    realTimeNotifications: 'Ifitonileti Lojuto',
    followUpScheduling: 'Eto Ipade Atunwo',
    dataQualitySignals: 'Ami Didara Data',
    securityPermissionModel: 'Aabo ati Eto Ase',
    observabilityVisibility: 'Hihan Abojuto Eto',
    searchTimelinePlaceholder: 'Wa nipa oruko, isele, tabi alaye',
    noTimelineFound: 'Ko si isele itan akoko.',
    markDone: 'Samisi Ti Pari',
    markCompleted: 'Samisi Ti Pari Patapata',
    qualityRestricted: 'Alaye didara nilo ase giga.',
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

function getScopedLocaleKey(): string {
  try {
    const sessionUserId = localStorage.getItem(AUTH_SESSION_KEY);
    if (!sessionUserId) return LOCALE_KEY;

    const usersRaw = localStorage.getItem(USERS_KEY);
    const users = usersRaw ? (JSON.parse(usersRaw) as Array<{ id: string; role?: string }>) : [];
    const user = users.find((item) => item.id === sessionUserId);

    if (user?.role) return `${LOCALE_KEY}_${sessionUserId}_${user.role}`;
    return `${LOCALE_KEY}_${sessionUserId}`;
  } catch {
    return LOCALE_KEY;
  }
}

export function getLocale(): LocaleCode {
  const scopedKey = getScopedLocaleKey();
  const raw = localStorage.getItem(scopedKey) as LocaleCode | null;
  if (raw === 'fr' || raw === 'yo' || raw === 'en') return raw;

  const fallbackRaw = localStorage.getItem(LOCALE_KEY) as LocaleCode | null;
  if (fallbackRaw === 'fr' || fallbackRaw === 'yo' || fallbackRaw === 'en') return fallbackRaw;

  return 'en';
}

export function setLocale(locale: LocaleCode): void {
  const scopedKey = getScopedLocaleKey();
  localStorage.setItem(scopedKey, locale);

  if (scopedKey === LOCALE_KEY) {
    localStorage.setItem(LOCALE_KEY, locale);
  }
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
