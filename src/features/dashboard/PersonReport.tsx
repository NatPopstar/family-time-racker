import { useI18n } from '@/lib/i18n'
import { formatHours } from '@/lib/time'
import { formatMoney } from '@/lib/money'
import { CATEGORY_COLORS, CHART_INK } from '@/lib/chartColors'
import type { PersonRow, CategorySummary } from './stats'
import { percentOfTotal } from './stats'

/**
 * Отчёт по одному человеку — карточка из технического задания:
 * всего времени, разбивка по категориям, оценка стоимости труда.
 *
 * Здесь нет графика намеренно. Отчёт читают и распечатывают, а для
 * этого числа удобнее картинки: их можно сравнить, сложить и переписать.
 */
export function PersonReport({
  person,
  categories,
  earningsCurrency,
  estimatedCurrency,
}: {
  person: PersonRow
  categories: CategorySummary[]
  /** У двух сумм валюта может отличаться, поэтому их две. */
  earningsCurrency: string
  estimatedCurrency: string
}) {
  const { t, locale } = useI18n()

  return (
    <section className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-lg font-semibold text-slate-900">{person.name}</h3>
        <p className="text-sm text-slate-500">
          {t('report.totalTime')}:{' '}
          <span className="font-semibold text-slate-900">
            {formatHours(person.totalMinutes, locale)}
          </span>
        </p>
      </div>

      {categories.length === 0 ? (
        <p className="mt-3 text-sm text-slate-400">{t('report.noData')}</p>
      ) : (
        <ul className="mt-4 space-y-2">
          {categories.map((category) => (
            <li key={category.slug} className="flex items-center gap-3 text-sm">
              <span
                aria-hidden="true"
                className="h-3 w-3 shrink-0 rounded-sm"
                style={{ backgroundColor: CATEGORY_COLORS[category.slug] ?? CHART_INK.muted }}
              />
              <span className="flex-1 text-slate-700">{category.name}</span>
              <span className="tabular-nums text-slate-900">
                {formatHours(category.minutes, locale)}
              </span>
              <span className="w-10 text-right tabular-nums text-slate-400">
                {percentOfTotal(category.minutes, person.totalMinutes)}%
              </span>
            </li>
          ))}
        </ul>
      )}

      {/* Оценка стоимости — главная цифра отчёта, поэтому она
          отделена чертой и набрана крупнее остальных. */}
      {/* Две цифры раздельно: реальная зарплата и условная оценка
          неоплачиваемого труда. Их сумма не имела бы смысла. */}
      <div className="mt-4 space-y-1 border-t border-slate-100 pt-3">
        {person.totalEarnings > 0 && (
          <div className="flex items-baseline justify-between">
            <span className="text-sm font-medium text-slate-600">{t('report.earned')}</span>
            <span className="text-xl font-bold text-emerald-700">
              {formatMoney(person.totalEarnings, earningsCurrency, locale)}
            </span>
          </div>
        )}
        <div className="flex items-baseline justify-between">
          <span className="text-sm font-medium text-slate-600">{t('report.estimatedValue')}</span>
          <span className="text-xl font-bold text-indigo-700">
            {formatMoney(person.totalEstimated, estimatedCurrency, locale)}
          </span>
        </div>
      </div>
    </section>
  )
}
