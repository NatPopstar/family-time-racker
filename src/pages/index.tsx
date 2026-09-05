import { Link } from 'react-router-dom'
import { useI18n } from '@/lib/i18n'

/**
 * Единая точка, из которой App берёт все страницы.
 *
 * Каждая страница живёт в своём файле; здесь только сборка списка.
 * Раньше тут же лежали заготовки-«пустышки», но все шесть разделов
 * теперь наполнены, и заготовки удалены.
 */

export { DashboardPage } from './DashboardPage'
export { FamilyPage } from './FamilyPage'
export { PlannerPage } from './PlannerPage'
export { HistoryPage } from './HistoryPage'
export { ReportsPage } from './ReportsPage'
export { SettingsPage } from './SettingsPage'

/** Показывается, если человек набрал несуществующий адрес. */
export function NotFoundPage() {
  const { t } = useI18n()

  return (
    <div className="text-center">
      <h1 className="text-2xl font-bold tracking-tight">{t('page.notFound.title')}</h1>
      <Link to="/" className="mt-4 inline-block text-sm text-accent hover:text-accent-lite">
        {t('page.notFound.back')}
      </Link>
    </div>
  )
}
