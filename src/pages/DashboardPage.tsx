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
import { summarize, filterByRange, detectCurrencies } from '@/features/dashboard/stats'
import { LeafRule } from '@/components/ornaments'

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

  // Валюту берём из самих записей: каждая помнит ту, что была
  // на момент выполнения. Раньше здесь стояло жёсткое 'GBP',
  // и после смены валюты в настройках дашборд продолжал рисовать фунты.
  const { earnings: earningsCurrency, estimated: estimatedCurrency, isMixed } =
    detectCurrencies(all)

  return (
    <div className="space-y-6">
      {/* Заголовок и три плитки — ОДИН блок: это один ответ на один
          вопрос «сколько у меня вышло». Разделённые, они читались как
          подпись отдельно и цифры отдельно. */}
      <section className="rounded-xl bg-surface p-5 shadow-sm ring-1 ring-line">
        <h1 className="text-2xl font-bold tracking-tight text-ink">
          {t('page.dashboard.title')}
        </h1>
        <p className="mt-1 text-sm text-ink-4">{t('page.dashboard.subtitle')}</p>
        <LeafRule className="mt-3" />

        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <StatTile
            label={t('dashboard.today')}
            minutes={todayStats.totalMinutes}
            earnings={todayStats.totalEarnings}
            estimated={todayStats.totalEstimated}
            earningsCurrency={earningsCurrency}
            estimatedCurrency={estimatedCurrency}
            isLoading={isPending}
          />
          <StatTile
            label={t('dashboard.week')}
            minutes={weekStats.totalMinutes}
            earnings={weekStats.totalEarnings}
            estimated={weekStats.totalEstimated}
            earningsCurrency={earningsCurrency}
            estimatedCurrency={estimatedCurrency}
            isLoading={isPending}
          />
          <StatTile
            label={t('dashboard.month')}
            minutes={monthStats.totalMinutes}
            earnings={monthStats.totalEarnings}
            estimated={monthStats.totalEstimated}
            earningsCurrency={earningsCurrency}
            estimatedCurrency={estimatedCurrency}
            isLoading={isPending}
          />
        </div>
      </section>

      {/* Складывать фунты с евро бессмысленно — говорим об этом прямо,
          а не показываем сумму с одним значком. */}
      {isMixed && (
        <p role="alert" className="rounded-md bg-warn-soft p-3 text-sm text-warn-deep">
          {t('money.mixedWarning')}
        </p>
      )}

      {/* Порядок: сначала то, чем ПОЛЬЗУЮТСЯ (таймер, форма записи),
          потом то, на что СМОТРЯТ (диаграмма, записи за день).
          Раньше диаграмма стояла выше формы и каждый раз отодвигала
          её вниз — а заходят на страницу обычно записать дело. */}
      <TimerCard />

      <ActivityForm />

      {/* Диаграмма и итог — за СЕГОДНЯ, как и вся страница.
          Раньше круг показывал неделю, а итог под ним — день; два числа
          за разные периоды в одной карточке читались бы как ошибка. */}
      <CategoryDonut
        data={todayStats.byCategory}
        totalMinutes={todayStats.totalMinutes}
        totalValue={todayStats.totalEstimated}
        currency={estimatedCurrency}
      />

      <ActivityList from={today} to={today} />
    </div>
  )
}
