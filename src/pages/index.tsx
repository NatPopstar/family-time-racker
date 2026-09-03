import { Link } from 'react-router-dom'
import { useI18n } from '@/lib/i18n'
import { PagePlaceholder } from '@/components/PagePlaceholder'

/**
 * Страницы приложения.
 *
 * Пока это заготовки — каждая следующая фаза заменяет одну из них
 * настоящим содержимым. Собраны в одном файле, потому что сейчас
 * в каждой по две строки; как только страница наполнится,
 * она переедет в свой файл.
 */

// «Мой день» уже наполнен и переехал в свой файл.
export { DashboardPage } from './DashboardPage'

export function FamilyPage() {
  return <PagePlaceholder titleKey="page.family.title" subtitleKey="page.family.subtitle" />
}

export function PlannerPage() {
  return <PagePlaceholder titleKey="page.planner.title" subtitleKey="page.planner.subtitle" />
}

export function HistoryPage() {
  return <PagePlaceholder titleKey="page.history.title" subtitleKey="page.history.subtitle" />
}

export function ReportsPage() {
  return <PagePlaceholder titleKey="page.reports.title" subtitleKey="page.reports.subtitle" />
}

export function SettingsPage() {
  return <PagePlaceholder titleKey="page.settings.title" subtitleKey="page.settings.subtitle" />
}

/** Показывается, если человек набрал несуществующий адрес. */
export function NotFoundPage() {
  const { t } = useI18n()

  return (
    <div className="text-center">
      <h1 className="text-2xl font-bold tracking-tight">{t('page.notFound.title')}</h1>
      <Link to="/" className="mt-4 inline-block text-sm text-indigo-600 hover:text-indigo-500">
        {t('page.notFound.back')}
      </Link>
    </div>
  )
}
