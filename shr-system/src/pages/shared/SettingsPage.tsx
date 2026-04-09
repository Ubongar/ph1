import { Link } from 'react-router-dom';
import { Cpu, Languages, LifeBuoy, Settings2, ShieldCheck, Smartphone } from 'lucide-react';
import { LOCALE_OPTIONS, type LocaleCode, useLocale } from '../../services/i18n';

interface SettingsCard {
  readonly titleKey: string;
  readonly descriptionKey: string;
  readonly to: string;
  readonly ctaKey: string;
  readonly icon: React.ComponentType<{ className?: string }>;
}

const SETTINGS_CARDS: readonly SettingsCard[] = [
  {
    titleKey: 'pwaInstallDiagnosticsTitle',
    descriptionKey: 'pwaInstallDiagnosticsDescription',
    to: '/legal/pwa-diagnostics',
    ctaKey: 'openDiagnostics',
    icon: Smartphone,
  },
  {
    titleKey: 'legalCenterTitle',
    descriptionKey: 'legalCenterDescription',
    to: '/legal',
    ctaKey: 'openLegalCenter',
    icon: ShieldCheck,
  },
  {
    titleKey: 'faqCenterTitle',
    descriptionKey: 'faqCenterDescription',
    to: '/legal/faq',
    ctaKey: 'openFaqCenter',
    icon: LifeBuoy,
  },
] as const;

export default function SettingsPage() {
  const { locale, setLocale, t } = useLocale();

  return (
    <section className="mx-auto w-full max-w-6xl space-y-6">
      <header className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex items-start gap-3">
          <div className="rounded-xl bg-blue-50 p-2.5 text-blue-700">
            <Settings2 className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">{t('settingsEyebrow')}</p>
            <h1 className="mt-1 text-2xl font-bold text-gray-900">{t('settingsTitle')}</h1>
            <p className="mt-2 text-sm text-gray-600">
              {t('settingsSubtitle')}
            </p>
          </div>
        </div>
      </header>

      <section className="rounded-2xl border border-blue-100 bg-blue-50 p-5 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="rounded-xl bg-white p-2.5 text-blue-700 shadow-sm">
            <Languages className="h-5 w-5" />
          </div>
          <div className="w-full">
            <h2 className="text-base font-semibold text-blue-900">{t('languagePreferences')}</h2>
            <p className="mt-1 text-sm text-blue-800">{t('languagePreferencesDescription')}</p>

            <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">{t('currentLanguage')}</p>
              <select
                value={locale}
                onChange={(event) => setLocale(event.target.value as LocaleCode)}
                aria-label={t('currentLanguage')}
                title={t('currentLanguage')}
                className="w-full rounded-lg border border-blue-200 bg-white px-3 py-2 text-sm font-medium text-blue-900 outline-none focus:border-blue-400 sm:w-auto"
              >
                {LOCALE_OPTIONS.map((option) => (
                  <option key={option.code} value={option.code}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <p className="mt-3 text-xs text-blue-800">{t('languageCoverageNote')}</p>
          </div>
        </div>
      </section>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {SETTINGS_CARDS.map(({ titleKey, descriptionKey, to, ctaKey, icon: Icon }) => (
          <article key={to} className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="mb-3 inline-flex rounded-lg bg-gray-100 p-2 text-gray-700">
              <Icon className="h-4 w-4" />
            </div>
            <h2 className="text-base font-semibold text-gray-900">{t(titleKey)}</h2>
            <p className="mt-2 text-sm text-gray-600">{t(descriptionKey)}</p>
            <Link
              to={to}
              className="mt-4 inline-flex items-center gap-1 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700"
            >
              {t(ctaKey)}
            </Link>
          </article>
        ))}
      </div>

      <section className="rounded-2xl border border-blue-100 bg-blue-50 p-4 text-sm text-blue-900">
        <div className="flex items-start gap-2">
          <Cpu className="mt-0.5 h-4 w-4 shrink-0" />
          <p>
            {t('technicalToolsGrouped')}
          </p>
        </div>
      </section>
    </section>
  );
}
