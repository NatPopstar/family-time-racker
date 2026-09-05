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
import { PageHeader } from '@/components/PageHeader'

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
      <PageHeader title={t('page.family.title')} subtitle={t('page.family.subtitle')} />

      <div className="rounded-xl bg-surface p-5 shadow-sm ring-1 ring-line">
        <PeriodFilter
          period={period}
          range={range}
          onChange={(nextPeriod, nextRange) => {
            setPeriod(nextPeriod)
            setRange(nextRange)
          }}
        />
      </div>

      {isPending && <p className="text-ink-5">{t('common.loading')}</p>}

      {!isPending && people.length === 0 && (
        <p className="rounded-lg border border-dashed border-line-strong bg-surface p-6 text-center text-sm text-ink-4">
          {t('family.noPeople')}
        </p>
      )}

      {people.length > 0 && (
        <>
          <div className="overflow-x-auto rounded-xl bg-surface shadow-sm ring-1 ring-line">
            <table className="w-full text-sm">
              <caption className="px-4 pt-4 text-left text-base font-semibold text-ink">
                {t('family.tableTitle')}
              </caption>
              <thead className="border-b border-line text-left text-ink-4">
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
                    <th scope="row" className="px-4 py-3 text-left font-medium text-ink">
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
                    <td className="px-4 py-3 text-right tabular-nums text-positive">
                      {row.totalEarnings > 0 ? formatMoney(row.totalEarnings, earningsCurrency, locale) : '—'}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-estimate">
                      {row.totalEstimated > 0 ? formatMoney(row.totalEstimated, estimatedCurrency, locale) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="border-t border-line bg-surface-2 font-semibold">
                <tr>
                  <td className="px-4 py-3">{t('common.total')}</td>
                  <td colSpan={4} />
                  <td className="px-4 py-3 text-right tabular-nums">
                    {formatHours(totals.minutes, locale)}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-positive">
                    {totals.earnings > 0 ? formatMoney(totals.earnings, earningsCurrency, locale) : '—'}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-estimate">
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
