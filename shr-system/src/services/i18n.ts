import { useEffect, useMemo, useState } from 'react';

export type LocaleCode = 'en' | 'fr' | 'yo' | 'ig' | 'ha';

interface LocaleOption {
  readonly code: LocaleCode;
  readonly label: string;
}

export const LOCALE_OPTIONS: readonly LocaleOption[] = [
  { code: 'en', label: 'English' },
  { code: 'fr', label: 'Francais' },
  { code: 'yo', label: 'Yoruba' },
  { code: 'ig', label: 'Igbo' },
  { code: 'ha', label: 'Hausa' },
] as const;

const LOCALE_KEY = 'shr_locale';
const AUTH_SESSION_KEY = 'shr_auth_session';
const USERS_KEY = 'shr_system_users';
const LOCALE_CHANGED_EVENT = 'shr:locale-changed';

const EN_STRINGS = {
  workflowCenter: 'Workflow Center',
  roleOperationsWorkspace: 'Role Operations Workspace',
  roleWorkspaceSubtitle: 'Unified inbox, notifications, follow-ups, timeline, and quality visibility.',
  roleInboxWithSla: 'Role Inbox with Service Level Agreement',
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
  languagePreferences: 'Language Preferences',
  languagePreferencesDescription: 'Choose your preferred language. This setting is saved per signed-in user and role.',
  currentLanguage: 'Current language',
  languageCoverageNote: 'Supported pages translate all static labels and messages when available.',
  settingsEyebrow: 'System Settings',
  settingsTitle: 'Settings and Technical Tools',
  settingsSubtitle: 'Keep diagnostics and platform-level utilities here so daily workspace screens stay focused and uncluttered.',
  pwaInstallDiagnosticsTitle: 'Progressive Web App Install Diagnostics',
  pwaInstallDiagnosticsDescription: 'Check install readiness, service worker status, and device/browser conditions in one place.',
  openDiagnostics: 'Open Diagnostics',
  legalCenterTitle: 'Legal Center',
  legalCenterDescription: 'Review privacy, terms, data rights, and policy lifecycle pages from a single hub.',
  openLegalCenter: 'Open Legal Center',
  faqCenterTitle: 'Role Frequently Asked Questions Center',
  faqCenterDescription: 'Find role-specific operational answers and compliance guidance.',
  openFaqCenter: 'Open Frequently Asked Questions Center',
  technicalToolsGrouped: 'Technical tools are intentionally grouped on this page to keep dashboard and clinical workflows focused on core tasks.',
  unableUpdateTaskStatus: 'Unable to update task status.',
  taskMarkedDoneToast: 'Task marked as done.',
  unableCompleteAppointment: 'Unable to complete appointment.',
  appointmentMarkedCompletedToast: 'Appointment marked completed.',
  notificationMarkedReadToast: 'Notification marked as read.',
  slaOverdue: 'Overdue',
  slaDueSoon: 'Due Soon',
  slaOnTrack: 'On Track',
  escalationLabel: 'Escalation',
  suggestionLabel: 'Suggestion',
  securityModelDescription: 'Fine-grained permission scopes are active for each role. Actions in this workspace are filtered by role capability checks.',
  observabilityWithAccessDescription: 'Telemetry and operational traces are captured globally. You have visibility from admin observability pages.',
  observabilityNoAccessDescription: 'Telemetry and operational traces are captured globally. Admin role can access full observability dashboards.',
  roleStudent: 'Student',
  roleMedicalStaff: 'Medical Staff',
  roleTechnician: 'Technician',
  rolePharmacy: 'Pharmacy',
  roleSpecialist: 'Specialist',
  roleAdmin: 'Administrator',
  studentWorkspace: 'Student Workspace',
  medicalStaffWorkspace: 'Medical Staff Workspace',
  technicianWorkspace: 'Technician Workspace',
  pharmacyWorkspace: 'Pharmacy Workspace',
  specialistWorkspace: 'Specialist Workspace',
  adminWorkspace: 'Administrator Workspace',
  pageScrollProgress: 'Page scroll progress',
  deviceOfflineRetrySync: 'Device is offline. Reconnect and retry sync.',
  syncCompletedWithFailuresPrefix: 'Sync completed with',
  syncCompletedWithFailuresSuffix: 'failed item(s).',
  syncCompletePrefix: 'Sync complete:',
  syncCompleteSuffix: 'change(s) sent.',
  offlineModeEnabled: 'Offline mode enabled. Changes are saved locally and will sync automatically when connectivity returns.',
  pendingSyncItems: 'Pending sync items',
  retrySync: 'Retry Sync',
  backOnlinePrefix: 'Back online.',
  changesWaitingSync: 'change(s) waiting to sync.',
  syncNow: 'Sync Now',
  syncing: 'Syncing...',
  policies: 'Policies',
  settings: 'Settings',
  complaints: 'Complaints',
  legalCenter: 'Legal Center',
  privacy: 'Privacy',
  terms: 'Terms',
  dataRights: 'Data Rights',
  dataRequests: 'Data Requests',
  acceptanceHistory: 'Acceptance History',
  roleMatrix: 'Role Matrix',
  openComplaintsCenter: 'Open complaints center',
  top: 'Top',
  scrollToTop: 'Scroll to top',
} as const;

const STRINGS: Record<LocaleCode, Record<string, string>> = {
  en: EN_STRINGS,
  fr: {
    ...EN_STRINGS,
    workflowCenter: 'Centre de Flux',
    roleOperationsWorkspace: 'Espace des Operations de Role',
    roleWorkspaceSubtitle: 'Boite unifiee, notifications, suivis, chronologie et visibilite qualite.',
    roleInboxWithSla: 'Boite de Role avec SLA',
    unifiedPatientTimelineSearch: 'Recherche de Chronologie Patient Unifiee',
    realTimeNotifications: 'Notifications en Temps Reel',
    followUpScheduling: 'Planification de Suivi',
    dataQualitySignals: 'Signaux de Qualite des Donnees',
    securityPermissionModel: 'Securite et Modele de Permissions',
    observabilityVisibility: 'Visibilite Observabilite',
    searchTimelinePlaceholder: 'Rechercher par nom etudiant, evenement ou detail',
    noTimelineFound: 'Aucun evenement de chronologie.',
    markDone: 'Marquer Fait',
    markCompleted: 'Marquer Termine',
    qualityRestricted: 'Le detail qualite exige une permission elevee.',
    language: 'Langue',
    languagePreferences: 'Preferences de Langue',
    languagePreferencesDescription: 'Choisissez votre langue preferee. Ce parametre est enregistre par utilisateur et par role.',
    currentLanguage: 'Langue actuelle',
    languageCoverageNote: 'Les pages prises en charge traduisent les etiquettes et messages statiques.',
    settingsEyebrow: 'Parametres Systeme',
    settingsTitle: 'Parametres et Outils Techniques',
    settingsSubtitle: 'Gardez ici les diagnostics et utilitaires pour des ecrans de travail plus clairs.',
    pwaInstallDiagnosticsTitle: 'Diagnostic Installation PWA',
    pwaInstallDiagnosticsDescription: 'Verifiez la disponibilite d installation, le service worker et les conditions appareil/navigateur.',
    openDiagnostics: 'Ouvrir Diagnostic',
    legalCenterTitle: 'Centre Juridique',
    legalCenterDescription: 'Consultez confidentialite, conditions, droits de donnees et cycle des politiques.',
    openLegalCenter: 'Ouvrir Centre Juridique',
    faqCenterTitle: 'Centre FAQ des Roles',
    faqCenterDescription: 'Trouvez des reponses operationnelles et des conseils de conformite par role.',
    openFaqCenter: 'Ouvrir FAQ',
    technicalToolsGrouped: 'Les outils techniques sont regroupes ici pour garder les flux cliniques centres sur les taches.',
    unableUpdateTaskStatus: 'Impossible de mettre a jour le statut de la tache.',
    taskMarkedDoneToast: 'Tache marquee comme terminee.',
    unableCompleteAppointment: 'Impossible de terminer le rendez-vous.',
    appointmentMarkedCompletedToast: 'Rendez-vous marque termine.',
    notificationMarkedReadToast: 'Notification marquee comme lue.',
    slaOverdue: 'En retard',
    slaDueSoon: 'Bientot Echu',
    slaOnTrack: 'Dans les Delais',
    escalationLabel: 'Escalade',
    suggestionLabel: 'Suggestion',
    securityModelDescription: 'Les permissions fines sont actives pour chaque role. Les actions sont filtrees selon les capacites du role.',
    observabilityWithAccessDescription: 'Les traces operationnelles sont capturees globalement. Vous avez acces aux pages d observabilite admin.',
    observabilityNoAccessDescription: 'Les traces operationnelles sont capturees globalement. Le role admin accede aux tableaux observabilite complets.',
    roleStudent: 'Etudiant',
    roleMedicalStaff: 'Personnel Medical',
    roleTechnician: 'Technicien',
    rolePharmacy: 'Pharmacie',
    roleSpecialist: 'Specialiste',
    roleAdmin: 'Administrateur',
    studentWorkspace: 'Espace Etudiant',
    medicalStaffWorkspace: 'Espace Personnel Medical',
    technicianWorkspace: 'Espace Technicien',
    pharmacyWorkspace: 'Espace Pharmacie',
    specialistWorkspace: 'Espace Specialiste',
    adminWorkspace: 'Espace Administrateur',
    pageScrollProgress: 'Progression du defilement de page',
    deviceOfflineRetrySync: 'L appareil est hors ligne. Reconnectez-vous puis relancez la synchronisation.',
    syncCompletedWithFailuresPrefix: 'Synchronisation terminee avec',
    syncCompletedWithFailuresSuffix: 'element(s) en echec.',
    syncCompletePrefix: 'Synchronisation terminee :',
    syncCompleteSuffix: 'changement(s) envoye(s).',
    offlineModeEnabled: 'Mode hors ligne active. Les changements sont enregistres localement puis synchronises automatiquement.',
    pendingSyncItems: 'Elements en attente de sync',
    retrySync: 'Relancer Sync',
    backOnlinePrefix: 'Connexion retablie.',
    changesWaitingSync: 'changement(s) en attente de sync.',
    syncNow: 'Synchroniser',
    syncing: 'Synchronisation...',
    policies: 'Politiques',
    settings: 'Parametres',
    complaints: 'Plaintes',
    legalCenter: 'Centre Juridique',
    privacy: 'Confidentialite',
    terms: 'Conditions',
    dataRights: 'Droits de Donnees',
    dataRequests: 'Demandes de Donnees',
    acceptanceHistory: 'Historique d Acceptation',
    roleMatrix: 'Matrice des Roles',
    openComplaintsCenter: 'Ouvrir le centre des plaintes',
    top: 'Haut',
    scrollToTop: 'Defiler en haut',
  },
  yo: {
    ...EN_STRINGS,
    workflowCenter: 'Aarin Ise',
    roleOperationsWorkspace: 'Agbegbe Ise Ipo',
    roleWorkspaceSubtitle: 'Apo ise papo, ifitonileti, atuntele, itan-akoko ati hihan didara data.',
    roleInboxWithSla: 'Apo Ise Ipo pelu SLA',
    unifiedPatientTimelineSearch: 'Wiwa Itan-Akoko Alaisan To Po',
    realTimeNotifications: 'Ifitonileti Akoko Gidi',
    followUpScheduling: 'Eto Atuntele',
    dataQualitySignals: 'Ami Didara Data',
    securityPermissionModel: 'Aabo ati Eto Ase',
    observabilityVisibility: 'Hihan Abojuto',
    searchTimelinePlaceholder: 'Wa itan-akoko nipa oruko akeko, isele, tabi alaye',
    noTimelineFound: 'Ko si isele itan-akoko.',
    markDone: 'Samisi Ti Pari',
    markCompleted: 'Samisi Ti Pari Patapata',
    qualityRestricted: 'Alawe didara nilo ase to ga.',
    language: 'Ede',
    languagePreferences: 'Ayanfẹ Ede',
    languagePreferencesDescription: 'Yan ede re. Eto yii wa fun olumulo ati ipa ti o forukọsilẹ.',
    currentLanguage: 'Ede Bayii',
    languageCoverageNote: 'Awon oju-iwe to ni atilẹyin maa n tumo gbogbo awon ifiranse aimi.',
    settingsEyebrow: 'Eto Eto',
    settingsTitle: 'Eto ati Awon Irinse Imo-Ero',
    settingsSubtitle: 'Tọju awon irinse idanwo ati irinse eto nibi ki oju-iṣẹ ojoojumọ le mo.',
    pwaInstallDiagnosticsTitle: 'Ayewo Fifi PWA Sori Ero',
    pwaInstallDiagnosticsDescription: 'Ṣayẹwo imurasilẹ fifi sori ẹrọ, ipo service worker ati ipo ẹrọ/awako.',
    openDiagnostics: 'Si Ayewo',
    legalCenterTitle: 'Aarin Ofin',
    legalCenterDescription: 'Ka asiri, ofin lilo, eto ẹtọ data ati ayika imulo ni ibi kan.',
    openLegalCenter: 'Si Aarin Ofin',
    faqCenterTitle: 'Aarin FAQ Ipa',
    faqCenterDescription: 'Wa idahun iṣẹ pato ati itọnisọna ibamu.',
    openFaqCenter: 'Si Aarin FAQ',
    technicalToolsGrouped: 'A ko awon irinse imọ-ẹrọ jo ni oju-iwe yii ki iṣẹ pataki le wa ni iwaju.',
    unableUpdateTaskStatus: 'Ko le mu ipo ise dojuiwọn.',
    taskMarkedDoneToast: 'A samisi ise gege bi ti pari.',
    unableCompleteAppointment: 'Ko le pari ipade yii.',
    appointmentMarkedCompletedToast: 'A samisi ipade gege bi ti pari.',
    notificationMarkedReadToast: 'A samisi ifitonileti gege bi ti ka.',
    slaOverdue: 'Ti pẹ ju',
    slaDueSoon: 'N sunmo ipari',
    slaOnTrack: 'N lo daadaa',
    escalationLabel: 'Gbigbe Soke',
    suggestionLabel: 'Imoran',
    securityModelDescription: 'Aabo ase-kekere wa fun ipa kọọkan. A n fọ awọn iṣe da lori agbara ipa.',
    observabilityWithAccessDescription: 'A n gba telemetri ati itẹle iṣẹ kaakiri. O ni hihan lati oju-iwe observability admin.',
    observabilityNoAccessDescription: 'A n gba telemetri ati itẹle iṣẹ kaakiri. Ipa admin nikan ni hihan observability kikun.',
    roleStudent: 'Akeko',
    roleMedicalStaff: 'Osise Isegun',
    roleTechnician: 'Tekinisan',
    rolePharmacy: 'Elegbogi',
    roleSpecialist: 'Amoye',
    roleAdmin: 'Alabojuto',
    studentWorkspace: 'Agbegbe Ise Akeko',
    medicalStaffWorkspace: 'Agbegbe Ise Osise Isegun',
    technicianWorkspace: 'Agbegbe Ise Tekinisan',
    pharmacyWorkspace: 'Agbegbe Ise Elegbogi',
    specialistWorkspace: 'Agbegbe Ise Amoye',
    adminWorkspace: 'Agbegbe Ise Alabojuto',
    pageScrollProgress: 'Ilosiwaju yiya oju-iwe',
    deviceOfflineRetrySync: 'Ẹrọ wa ni offline. So pada ki o tun sync.',
    syncCompletedWithFailuresPrefix: 'Sync pari pelu',
    syncCompletedWithFailuresSuffix: 'nkan to kuna.',
    syncCompletePrefix: 'Sync pari:',
    syncCompleteSuffix: 'ayipada ni a fi ranṣẹ.',
    offlineModeEnabled: 'Ipo offline ti wa ni titan. Awon ayipada wa ni fipamo ni agbegbe ati pe yoo sync laifọwọyi nigbamii.',
    pendingSyncItems: 'Awon nkan sync to ku',
    retrySync: 'Tun Sync Se',
    backOnlinePrefix: 'Ti pada si online.',
    changesWaitingSync: 'ayipada nduro fun sync.',
    syncNow: 'Sync Bayii',
    syncing: 'N Sync...',
    policies: 'Awon Imulo',
    settings: 'Eto',
    complaints: 'Awon Edekun',
    legalCenter: 'Aarin Ofin',
    privacy: 'Asiri',
    terms: 'Ofin Lilo',
    dataRights: 'Eto Data',
    dataRequests: 'Ibere Data',
    acceptanceHistory: 'Itan Gbigba',
    roleMatrix: 'Maatiriksi Ipa',
    openComplaintsCenter: 'Si aarin awin ẹdun',
    top: 'Oke',
    scrollToTop: 'Yi si oke',
  },
  ig: {
    ...EN_STRINGS,
    workflowCenter: 'Ebe Oru',
    roleOperationsWorkspace: 'Ebe Oru Oru Maka Oru',
    roleWorkspaceSubtitle: 'Inbox jikotara, nkwuputa, nnwale sochirinụ, timeline na ngosi ogo data.',
    roleInboxWithSla: 'Inbox Oru na SLA',
    unifiedPatientTimelineSearch: 'Nchọ Timeline Onye Oria jikotara',
    realTimeNotifications: 'Nkwuputa Oge Nke Ozi',
    followUpScheduling: 'Ndokwa Nlekota',
    dataQualitySignals: 'Ihe ngosi Ogo Data',
    securityPermissionModel: 'Nche na Udi Ikikere',
    observabilityVisibility: 'Nlele Observability',
    searchTimelinePlaceholder: 'Choo timeline site n aha nwa akwukwo, omume, ma obu nkowa',
    noTimelineFound: 'Enweghi omume timeline achotara.',
    markDone: 'Kaa ka Emere',
    markCompleted: 'Kaa ka Emezuru',
    qualityRestricted: 'Nkowa ogo choro ikike di elu.',
    language: 'Asusu',
    languagePreferences: 'Nhoro Asusu',
    languagePreferencesDescription: 'Horo asusu gi. A na echekwa ntọala a n onye nbanye na oru ya.',
    currentLanguage: 'Asusu Ugbu a',
    languageCoverageNote: 'Peeji akwadoro na atu asusu ederede na ozi nile di na ya.',
    settingsEyebrow: 'Ntọala Sistem',
    settingsTitle: 'Ntọala na Ngwa Oruma Teknụzụ',
    settingsSubtitle: 'Debe diagnostics na ngwa teknuzu ebe a ka peeji oru kwa ubochi di mfe.',
    pwaInstallDiagnosticsTitle: 'Nyocha Ntinye PWA',
    pwaInstallDiagnosticsDescription: 'Lelee njikere ntinye, onodu service worker na onodu ngwaọrụ/brawza.',
    openDiagnostics: 'Mepee Nyocha',
    legalCenterTitle: 'Ebe Iwu',
    legalCenterDescription: 'Lelee nzuzo, okwu na ọnọdụ, ikike data na usoro iwu n otu ebe.',
    openLegalCenter: 'Mepee Ebe Iwu',
    faqCenterTitle: 'Ebe FAQ Oru',
    faqCenterDescription: 'Choo azịza oru dabere na oru na nduzi mmezu iwu.',
    openFaqCenter: 'Mepee FAQ',
    technicalToolsGrouped: 'A chịkọtara ngwa teknuzu na peeji a ka dashboard na oru klinik lekwasịrị anya na isi oru.',
    unableUpdateTaskStatus: 'Enweghi ike imelite onodu task.',
    taskMarkedDoneToast: 'A kaa task dika emere.',
    unableCompleteAppointment: 'Enweghi ike mezue appointment.',
    appointmentMarkedCompletedToast: 'A kaa appointment dika emezuru.',
    notificationMarkedReadToast: 'A kaa nkwuputa dika agugoro ya.',
    slaOverdue: 'Gafere Oge',
    slaDueSoon: 'Na-abia ngwa ngwa',
    slaOnTrack: 'Na-aga nke oma',
    escalationLabel: 'Mbuli Elu',
    suggestionLabel: 'Ntuziaka',
    securityModelDescription: 'Ikikere zuru oke di maka oru obula. A na asacha omume n ebe a site na ikike oru.',
    observabilityWithAccessDescription: 'A na anakota telemetry na trace oru n uwa nile. I nwere nlele site na peeji observability nke admin.',
    observabilityNoAccessDescription: 'A na anakota telemetry na trace oru n uwa nile. Oru admin nwere nlele observability zuru oke.',
    roleStudent: 'Nwa Akwukwo',
    roleMedicalStaff: 'Ndi Oru Ahike',
    roleTechnician: 'Teknishian',
    rolePharmacy: 'Farmasi',
    roleSpecialist: 'Okachamara',
    roleAdmin: 'Onye Nlekota',
    studentWorkspace: 'Ebe Oru Nwa Akwukwo',
    medicalStaffWorkspace: 'Ebe Oru Ndi Oru Ahike',
    technicianWorkspace: 'Ebe Oru Teknishian',
    pharmacyWorkspace: 'Ebe Oru Farmasi',
    specialistWorkspace: 'Ebe Oru Okachamara',
    adminWorkspace: 'Ebe Oru Onye Nlekota',
    pageScrollProgress: 'Ogologo mgbagharị peeji',
    deviceOfflineRetrySync: 'Ngwaọrụ adighi online. Jikota ọzọ ma nwalee sync ọzọ.',
    syncCompletedWithFailuresPrefix: 'Sync gwuchara na',
    syncCompletedWithFailuresSuffix: 'ihe dara ada.',
    syncCompletePrefix: 'Sync gwuchara:',
    syncCompleteSuffix: 'mgbanwe ezitere.',
    offlineModeEnabled: 'Udi offline di. A na echekwa mgbanwe n ime obodo ma ga-emelite akpaka mgbe netwọk laghachiri.',
    pendingSyncItems: 'Ihe ndi na-eche sync',
    retrySync: 'Nwale Sync Ozo',
    backOnlinePrefix: 'A laghachila online.',
    changesWaitingSync: 'mgbanwe na-eche sync.',
    syncNow: 'Sync Ugbu a',
    syncing: 'Na-eme Sync...',
    policies: 'Atumatu',
    settings: 'Ntọala',
    complaints: 'Mkpebi Mkpesa',
    legalCenter: 'Ebe Iwu',
    privacy: 'Nzuzo',
    terms: 'Usoro',
    dataRights: 'Ikike Data',
    dataRequests: 'Aririo Data',
    acceptanceHistory: 'Akuko Nnabata',
    roleMatrix: 'Maatriks Oru',
    openComplaintsCenter: 'Mepee ebe mkpesa',
    top: 'Elu',
    scrollToTop: 'Gaa n elu',
  },
  ha: {
    ...EN_STRINGS,
    workflowCenter: 'Cibiyar Aiki',
    roleOperationsWorkspace: 'Wurin Aikin Matsayi',
    roleWorkspaceSubtitle: 'Akwatin saqo daya, sanarwa, bibiyar aiki, timeline da ganin ingancin bayanai.',
    roleInboxWithSla: 'Akwatin Aiki da SLA',
    unifiedPatientTimelineSearch: 'Binciken Timeline na Mara Lafiya Daya',
    realTimeNotifications: 'Sanarwar Lokaci-na-Gaskiya',
    followUpScheduling: 'Tsarin Bibiyar Ganawa',
    dataQualitySignals: 'Alamun Ingancin Bayanai',
    securityPermissionModel: 'Tsaro da Tsarin Izini',
    observabilityVisibility: 'Ganin Observability',
    searchTimelinePlaceholder: 'Nemi timeline ta sunan dalibi, lamari, ko bayani',
    noTimelineFound: 'Ba a samu abubuwan timeline ba.',
    markDone: 'Alama Anyi',
    markCompleted: 'Alama An Kammala',
    qualityRestricted: 'Cikakken bayanin inganci na bukatar izini mafi girma.',
    language: 'Harshe',
    languagePreferences: 'Zaɓin Harshe',
    languagePreferencesDescription: 'Zaɓi harshen da ka fi so. Ana adana wannan ga mai amfani da matsayinsa.',
    currentLanguage: 'Harshe na Yanzu',
    languageCoverageNote: 'Shafukan da aka tallafa suna fassara dukkan rubutun da sakonni na tsaye.',
    settingsEyebrow: 'Saitunan Tsari',
    settingsTitle: 'Saituna da Kayan Aikin Fasaha',
    settingsSubtitle: 'Ajiye diagnostics da kayan aikin dandali anan domin manyan shafuka su kasance masu tsabta.',
    pwaInstallDiagnosticsTitle: 'Binciken Shigar PWA',
    pwaInstallDiagnosticsDescription: 'Duba shirye-shiryen shigarwa, halin service worker, da yanayin naura/browser.',
    openDiagnostics: 'Bude Bincike',
    legalCenterTitle: 'Cibiyar Doka',
    legalCenterDescription: 'Duba sirri, sharudda, hakkokin bayanai, da zagayowar manufofi a wuri daya.',
    openLegalCenter: 'Bude Cibiyar Doka',
    faqCenterTitle: 'Cibiyar FAQ ta Matsayi',
    faqCenterDescription: 'Nemi amsoshin aiki na matsayi da jagorar bin kaida.',
    openFaqCenter: 'Bude Cibiyar FAQ',
    technicalToolsGrouped: 'An hada kayan aikin fasaha a wannan shafi domin dashboard da aikin asibiti su maida hankali kan ainihin aiki.',
    unableUpdateTaskStatus: 'An kasa sabunta matsayin aiki.',
    taskMarkedDoneToast: 'An yi alamar aikin a matsayin an kammala.',
    unableCompleteAppointment: 'An kasa kammala wannan alawari.',
    appointmentMarkedCompletedToast: 'An yi alamar alawari a matsayin an kammala.',
    notificationMarkedReadToast: 'An yi alamar sanarwa a matsayin an karanta.',
    slaOverdue: 'Ya Wuce Lokaci',
    slaDueSoon: 'Lokaci na Gabatowa',
    slaOnTrack: 'Yana Kan Hanya',
    escalationLabel: 'Dagawa Sama',
    suggestionLabel: 'Shawara',
    securityModelDescription: 'An kunna izinin daidaitacce ga kowane matsayi. Ayyuka suna bin ikon matsayi a wannan wurin.',
    observabilityWithAccessDescription: 'Ana tattara telemetry da traces a duniya baki daya. Kana da gani daga shafukan observability na admin.',
    observabilityNoAccessDescription: 'Ana tattara telemetry da traces a duniya baki daya. Matsayin admin ne kawai ke da cikakken dashboard na observability.',
    roleStudent: 'Dalibi',
    roleMedicalStaff: 'Maikatan Lafiya',
    roleTechnician: 'Masanin Fasaha',
    rolePharmacy: 'Pharmacy',
    roleSpecialist: 'Kwararre',
    roleAdmin: 'Mai Gudanarwa',
    studentWorkspace: 'Wurin Aikin Dalibi',
    medicalStaffWorkspace: 'Wurin Aikin Maikatan Lafiya',
    technicianWorkspace: 'Wurin Aikin Masanin Fasaha',
    pharmacyWorkspace: 'Wurin Aikin Pharmacy',
    specialistWorkspace: 'Wurin Aikin Kwararre',
    adminWorkspace: 'Wurin Aikin Mai Gudanarwa',
    pageScrollProgress: 'Ci gaban nadewa shafi',
    deviceOfflineRetrySync: 'Naurar tana offline. Sake haɗawa sannan ka sake gwada sync.',
    syncCompletedWithFailuresPrefix: 'An gama sync da',
    syncCompletedWithFailuresSuffix: 'abubuwan da suka gaza.',
    syncCompletePrefix: 'An gama sync:',
    syncCompleteSuffix: 'canje-canje an tura.',
    offlineModeEnabled: 'An kunna offline mode. Ana adana canje-canje a gida kuma za a sync su da kansu idan intanet ta dawo.',
    pendingSyncItems: 'Abubuwan sync da suke jira',
    retrySync: 'Sake Gwada Sync',
    backOnlinePrefix: 'An dawo online.',
    changesWaitingSync: 'canje-canje suna jiran sync.',
    syncNow: 'Yi Sync Yanzu',
    syncing: 'Ana Sync...',
    policies: 'Manufofi',
    settings: 'Saituna',
    complaints: 'Korafe-Korafe',
    legalCenter: 'Cibiyar Doka',
    privacy: 'Sirri',
    terms: 'Sharudda',
    dataRights: 'Hakkokin Bayanai',
    dataRequests: 'Bukatun Bayanai',
    acceptanceHistory: 'Tarihin Karba',
    roleMatrix: 'Teburin Matsayi',
    openComplaintsCenter: 'Bude cibiyar korafe-korafe',
    top: 'Sama',
    scrollToTop: 'Koma sama',
  },
};

function isLocaleCode(value: string | null): value is LocaleCode {
  return value === 'en' || value === 'fr' || value === 'yo' || value === 'ig' || value === 'ha';
}

function applyDocumentLocale(locale: LocaleCode): void {
  if (typeof document === 'undefined') return;
  document.documentElement.lang = locale;
}

function broadcastLocaleChange(locale: LocaleCode): void {
  if (globalThis.window === undefined) return;
  globalThis.dispatchEvent(new CustomEvent<LocaleCode>(LOCALE_CHANGED_EVENT, { detail: locale }));
}

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
  if (isLocaleCode(raw)) return raw;

  const fallbackRaw = localStorage.getItem(LOCALE_KEY) as LocaleCode | null;
  if (isLocaleCode(fallbackRaw)) return fallbackRaw;

  return 'en';
}

export function setLocale(locale: LocaleCode): void {
  const scopedKey = getScopedLocaleKey();
  localStorage.setItem(scopedKey, locale);

  if (scopedKey === LOCALE_KEY) {
    localStorage.setItem(LOCALE_KEY, locale);
  }

  applyDocumentLocale(locale);
  broadcastLocaleChange(locale);
}

export function t(key: string, locale: LocaleCode = getLocale()): string {
  return STRINGS[locale]?.[key] ?? STRINGS.en[key] ?? key;
}

export function useLocale() {
  const [currentLocale, setCurrentLocale] = useState<LocaleCode>(getLocale());

  useEffect(() => {
    applyDocumentLocale(currentLocale);
  }, [currentLocale]);

  useEffect(() => {
    function syncLocaleFromStorage() {
      const nextLocale = getLocale();
      setCurrentLocale((prev) => (prev === nextLocale ? prev : nextLocale));
    }

    function onLocaleChanged() {
      syncLocaleFromStorage();
    }

    function onStorage(event: StorageEvent) {
      if (event.key && !event.key.startsWith(LOCALE_KEY)) return;
      syncLocaleFromStorage();
    }

    globalThis.addEventListener(LOCALE_CHANGED_EVENT, onLocaleChanged as EventListener);
    globalThis.addEventListener('storage', onStorage);

    return () => {
      globalThis.removeEventListener(LOCALE_CHANGED_EVENT, onLocaleChanged as EventListener);
      globalThis.removeEventListener('storage', onStorage);
    };
  }, []);

  const translate = useMemo(() => {
    return (key: string) => t(key, currentLocale);
  }, [currentLocale]);

  return {
    locale: currentLocale,
    setLocale: (value: LocaleCode) => {
      setLocale(value);
      setCurrentLocale(value);
    },
    t: translate,
  };
}
