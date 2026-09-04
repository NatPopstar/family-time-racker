import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useI18n } from '@/lib/i18n'
import { getPeriodRange, getWeekDays, type PeriodId } from '@/lib/periods'
import { formatHours } from '@/lib/time'
import { formatMoney } from '@/lib/money'
import { fetchActivities } from '@/features/activities/api'
import { fetchAllProfiles } from '@/features/profile/api'
import { PeriodFilter } from '@/features/activities/PeriodFilter'
import { summarizeByPerson, buildTimeline, detectCurrencies } from '@/features/dashboard/stats'
import { FamilyBars } from '@/features/dashboard/FamilyBars'
import { FamilyTimeline } from '@/features/dashboard/FamilyTimeline'

/**
 * Семейный дашборд: таблица с точными числами, сравнение по людям
 * и ход недели.
 *
 * Порядок не случаен. Сначала ТАБЛИЦА — она отвечает на вопрос точно
 * («у кого сколько»), и её можно прочитать даже тому, кто не различает
 * цвета. Графики идут следом и показывают то, что таблица показывает
 * плохо: соотношение долей и движение по дням.
 */
export function FamilyPage() {
  const { t, locale } = useI18n()

  const [period, setPeriod] = useState<PeriodId>('thisWeek')
  const [range, setRange] = useState(() => getPeriodRange('thisWeek'))

  const { data: profiles } = useQuery({ queryKey: ['profiles'], queryFn: fetchAllProfiles })

  const { data: activities, isPending } = useQuery({
    queryKey: ['activities', range.from, range.to],
    queryFn: () => fetchActivities({ from: range.from, to: range.to }),
  })

  const people = profiles ?? []
  const rows = summarizeByPerson(activities ?? [], people)
  // Валюта итогов берётся из самих записей, а не зашита в код.
  const { earnings: earningsCurrency, estimated: estimatedCurrency } = detectCurrencies(
    activities ?? [],
  )

  // Шкала недели показывается только для недельных периодов:
  // растягивать её на месяц значило бы рисовать 30 точек на узкой оси.
  const isWeekPeriod = period === 'thisWeek' || period === 'lastWeek'
  const timelineDays = getWeekDays(period === 'lastWeek' ? -1 : 0)
  const timeline = buildTimeline(activities ?? [], timelineDays, people)

  const totals = rows.reduce(
    (acc, row) => ({
      minutes: acc.minutes + row.totalMinutes,
      earnings: acc.earnings + row.totalEarnings,
      estimated: acc.estimated + row.totalEstimated,
    }),
    { minutes: 0, earnings: 0, estimated: 0 },
  )

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t('page.family.title')}</h1>
        <p className="mt-1 text-sm text-slate-500">{t('page.family.subtitle')}</p>
      </div>

      <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
        <PeriodFilter
          period={period}
          range={range}
          onChange={(nextPeriod, nextRange) => {
            setPeriod(nextPeriod)
            setRange(nextRange)
          }}
        />
      </div>

      {isPending && <p className="text-slate-400">{t('common.loading')}</p>}

      {!isPending && people.length === 0 && (
        <p className="rounded-lg border border-dashed border-slate-300 bg-white p-6 text-center text-sm text-slate-500">
          {t('family.noPeople')}
        </p>
      )}

      {people.length > 0 && (
        <>
          <div className="overflow-x-auto rounded-xl bg-white shadow-sm ring-1 ring-slate-200">
            <table className="w-full text-sm">
              <caption className="px-4 pt-4 text-left text-base font-semibold text-slate-900">
                {t('family.tableTitle')}
              </caption>
              <thead className="border-b border-slate-200 text-left text-slate-500">
                <tr>
                  <th scope="col" className="px-4 py-3 font-medium">{t('family.person')}</th>
                  <th scope="col" className="px-4 py-3 text-right font-medium">{t('family.work')}</th>
                  <th scope="col" className="px-4 py-3 text-right font-medium">{t('family.study')}</th>
                  <th scope="col" className="px-4 py-3 text-right font-medium">{t('family.household')}</th>
                  <th scope="col" className="px-4 py-3 text-right font-medium">{t('family.childcare')}</th>
                  <th scope="col" className="px-4 py-3 text-right font-medium">{t('family.totalHours')}</th>
                  <th scope="col" className="px-4 py-3 text-right font-medium">{t('family.earnings')}</th>
                  <th scope="col" className="px-4 py-3 text-right font-medium">{t('family.marketValue')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((row) => (
                  <tr key={row.userId}>
                    <th scope="row" className="px-4 py-3 text-left font-medium text-slate-900">
                      {row.name}
                    </th>
                    <td className="px-4 py-3 text-right tabular-nums">{formatHours(row.work, locale)}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{formatHours(row.study, locale)}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{formatHours(row.household, locale)}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{formatHours(row.childcare, locale)}</td>
                    <td className="px-4 py-3 text-right font-semibold tabular-nums">
                      {formatHours(row.totalMinutes, locale)}
                    </td>
                    {/* Две колонки, а не одна сумма: зарплата и оценка
                        неоплачиваемого труда — разные по смыслу вещи. */}
                    <td className="px-4 py-3 text-right tabular-nums text-emerald-700">
                      {row.totalEarnings > 0 ? formatMoney(row.totalEarnings, earningsCurrency, locale) : '—'}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-indigo-700">
                      {row.totalEstimated > 0 ? formatMoney(row.totalEstimated, estimatedCurrency, locale) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="border-t border-slate-200 bg-slate-50 font-semibold">
                <tr>
                  <td className="px-4 py-3">{t('common.total')}</td>
                  <td colSpan={4} />
                  <td className="px-4 py-3 text-right tabular-nums">
                    {formatHours(totals.minutes, locale)}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-emerald-700">
                    {totals.earnings > 0 ? formatMoney(totals.earnings, earningsCurrency, locale) : '—'}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-indigo-700">
                    {totals.estimated > 0 ? formatMoney(totals.estimated, estimatedCurrency, locale) : '—'}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          <FamilyBars rows={rows} />

          {isWeekPeriod && <FamilyTimeline data={timeline} people={people} />}
        </>
      )}
    </div>
  )
}
