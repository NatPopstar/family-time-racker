import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useI18n } from '@/lib/i18n'
import { getWeekRange, getMonthRange, formatPeriodTitle } from '@/lib/periods'
import { formatHours } from '@/lib/time'
import { formatMoney } from '@/lib/money'
import { fetchActivities } from '@/features/activities/api'
import { fetchAllProfiles } from '@/features/profile/api'
import { summarize, summarizeByPerson } from '@/features/dashboard/stats'
import { PersonReport } from '@/features/dashboard/PersonReport'
import { Button } from '@/components/ui/Button'

/**
 * Отчёты за неделю и за месяц.
 *
 * Отличие от семейного дашборда: там сравнение «кто больше», здесь —
 * итог периода по каждому человеку отдельно, в том виде, в каком его
 * описывает техническое задание. Дашборд смотрят каждый день,
 * отчёт — раз в неделю или месяц.
 */
export function ReportsPage() {
  const { t, locale } = useI18n()

  const [mode, setMode] = useState<'week' | 'month'>('week')
  // Сдвиг назад: 0 — текущий период, -1 — предыдущий.
  const [offset, setOffset] = useState(0)

  const range = mode === 'week' ? getWeekRange(offset) : getMonthRange(offset)
  const title = formatPeriodTitle(mode, range, locale)

  const { data: profiles } = useQuery({ queryKey: ['profiles'], queryFn: fetchAllProfiles })

  const { data: activities, isPending } = useQuery({
    queryKey: ['activities', range.from, range.to],
    queryFn: () => fetchActivities({ from: range.from, to: range.to }),
  })

  const people = profiles ?? []
  const all = activities ?? []
  const rows = summarizeByPerson(all, people)
  const familyTotal = summarize(all)

  /** Переключение режима сбрасывает сдвиг: «неделя назад» и «месяц назад» — разное. */
  function switchMode(next: 'week' | 'month') {
    setMode(next)
    setOffset(0)
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t('page.reports.title')}</h1>
        <p className="mt-1 text-sm text-slate-500">{t('page.reports.subtitle')}</p>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
        <div className="flex gap-2">
          <Button
            variant={mode === 'week' ? 'primary' : 'secondary'}
            aria-pressed={mode === 'week'}
            onClick={() => switchMode('week')}
          >
            {t('report.week')}
          </Button>
          <Button
            variant={mode === 'month' ? 'primary' : 'secondary'}
            aria-pressed={mode === 'month'}
            onClick={() => switchMode('month')}
          >
            {t('report.month')}
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="secondary" onClick={() => setOffset((n) => n - 1)}>
            {t('report.prev')}
          </Button>
          {offset !== 0 && (
            <Button variant="ghost" onClick={() => setOffset(0)}>
              {t('report.current')}
            </Button>
          )}
          <Button
            variant="secondary"
            // Вперёд дальше текущего периода не пускаем: отчёта
            // о ещё не наступившей неделе не существует.
            disabled={offset >= 0}
            onClick={() => setOffset((n) => n + 1)}
          >
            {t('report.next')}
          </Button>
        </div>
      </div>

      <h2 className="text-xl font-bold text-slate-900">{title}</h2>

      {isPending && <p className="text-slate-400">{t('common.loading')}</p>}

      {!isPending && all.length === 0 && (
        <p className="rounded-lg border border-dashed border-slate-300 bg-white p-6 text-center text-sm text-slate-500">
          {t('report.noData')}
        </p>
      )}

      {all.length > 0 && (
        <>
          <div className="grid gap-4 lg:grid-cols-2">
            {rows.map((row) => (
              <PersonReport
                key={row.userId}
                person={row}
                // Разбивку по категориям считаем из записей именно
                // этого человека, а не делим общую.
                categories={
                  summarize(all.filter((a) => a.user_id === row.userId)).byCategory
                }
              />
            ))}
          </div>

          <div className="rounded-xl bg-slate-900 p-5 text-white">
            <div className="flex flex-wrap items-baseline justify-between gap-3">
              <span className="text-sm font-medium text-slate-300">{t('report.familyTotal')}</span>
              <span className="flex flex-wrap items-baseline gap-6">
                <span className="text-lg font-semibold tabular-nums">
                  {formatHours(familyTotal.totalMinutes, locale)}
                </span>
                <span className="text-2xl font-bold tabular-nums text-emerald-400">
                  {formatMoney(familyTotal.totalValue, 'GBP', locale)}
                </span>
              </span>
            </div>
            <p className="mt-1 text-xs text-slate-400">{t('report.unpaidShare')}</p>
          </div>
        </>
      )}
    </div>
  )
}
