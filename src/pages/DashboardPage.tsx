import { useQuery } from '@tanstack/react-query'
import { useI18n } from '@/lib/i18n'
import { useAuth } from '@/features/auth/AuthProvider'
import { todayISO } from '@/lib/dates'
import { getPeriodRange } from '@/lib/periods'
import { fetchActivities } from '@/features/activities/api'
import { ActivityForm } from '@/features/activities/ActivityForm'
import { ActivityList } from '@/features/activities/ActivityList'
import { TimerCard } from '@/features/activities/TimerCard'
import { StatTile } from '@/features/dashboard/StatTile'
import { CategoryDonut } from '@/features/dashboard/CategoryDonut'
import { summarize, filterByRange } from '@/features/dashboard/stats'

/**
 * «Мой день» — личный кабинет.
 *
 * Сверху три показателя и распределение по категориям, ниже —
 * инструменты записи и сегодняшние записи.
 *
 * ОДИН ЗАПРОС НА ВСЁ. Мы могли бы сделать три запроса — за сегодня,
 * за неделю, за месяц. Но неделя и день лежат внутри месяца (почти
 * всегда), поэтому берём один самый широкий диапазон и складываем
 * подмножества в браузере. Меньше обращений к базе и никакого
 * мерцания «одна карточка загрузилась, другая ещё нет».
 */
export function DashboardPage() {
  const { t } = useI18n()
  const { user } = useAuth()

  const today = todayISO()
  const week = getPeriodRange('thisWeek')
  const month = getPeriodRange('thisMonth')

  // Неделя может начинаться в прошлом месяце (например, 31 августа),
  // поэтому берём самую раннюю из двух дат и самую позднюю.
  const from = week.from < month.from ? week.from : month.from
  const to = week.to > month.to ? week.to : month.to

  const { data: activities, isPending } = useQuery({
    queryKey: ['activities', from, to, user?.id],
    queryFn: () => fetchActivities({ from, to, userId: user?.id }),
    enabled: Boolean(user?.id),
  })

  const all = activities ?? []
  const todayStats = summarize(filterByRange(all, today, today))
  const weekStats = summarize(filterByRange(all, week.from, week.to))
  const monthStats = summarize(filterByRange(all, month.from, month.to))

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t('page.dashboard.title')}</h1>
        <p className="mt-1 text-sm text-slate-500">{t('page.dashboard.subtitle')}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatTile
          label={t('dashboard.today')}
          minutes={todayStats.totalMinutes}
          value={todayStats.totalValue}
          isLoading={isPending}
        />
        <StatTile
          label={t('dashboard.week')}
          minutes={weekStats.totalMinutes}
          value={weekStats.totalValue}
          isLoading={isPending}
        />
        <StatTile
          label={t('dashboard.month')}
          minutes={monthStats.totalMinutes}
          value={monthStats.totalValue}
          isLoading={isPending}
        />
      </div>

      {/* Распределение показываем за НЕДЕЛЮ: за день данных обычно
          слишком мало, за месяц картина слишком усреднена. */}
      <CategoryDonut data={weekStats.byCategory} totalMinutes={weekStats.totalMinutes} />

      <TimerCard />

      <ActivityForm />

      <section>
        <h2 className="text-base font-semibold text-slate-900">{t('activity.todayTitle')}</h2>
        <div className="mt-3">
          <ActivityList from={today} to={today} />
        </div>
      </section>
    </div>
  )
}
