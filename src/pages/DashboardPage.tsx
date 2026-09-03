import { useI18n } from '@/lib/i18n'
import { todayISO } from '@/lib/dates'
import { ActivityForm } from '@/features/activities/ActivityForm'
import { ActivityList } from '@/features/activities/ActivityList'

/**
 * «Мой день» — главная рабочая страница.
 * Сверху форма записи, снизу сегодняшние записи с итогами.
 */
export function DashboardPage() {
  const { t } = useI18n()
  const today = todayISO()

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t('page.dashboard.title')}</h1>
        <p className="mt-1 text-sm text-slate-500">{t('page.dashboard.subtitle')}</p>
      </div>

      <ActivityForm />

      <section>
        <h2 className="text-base font-semibold text-slate-900">{t('activity.todayTitle')}</h2>
        <div className="mt-3">
          {/* За сегодня: начало и конец периода — один и тот же день. */}
          <ActivityList from={today} to={today} />
        </div>
      </section>
    </div>
  )
}
