import { useI18n } from '@/lib/i18n'
import { formatHours } from '@/lib/time'
import { formatMoney } from '@/lib/money'
import { useChartPalette } from '@/lib/chartColors'
import type { PersonRow, CategorySummary } from './stats'
import { percentOfTotal } from './stats'
import { LoneMountain } from '@/components/ornaments'

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
  periodTitle,
}: {
  person: PersonRow
  categories: CategorySummary[]
  /** У двух сумм валюта может отличаться, поэтому их две. */
  earningsCurrency: string
  /** За какие числа посчитано. Подписывается прямо на карточке. */
  periodTitle?: string
  estimatedCurrency: string
}) {
  const { t, locale } = useI18n()
  // Цвета зависят от темы: Recharts принимает значения,
  // а не классы, поэтому берём их хуком, а не из CSS.
  const palette = useChartPalette()

  return (
    <section className="rounded-xl bg-surface p-5 shadow-sm ring-1 ring-line">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-lg font-semibold text-ink">{person.name}</h3>
        <p className="text-sm text-ink-4">
          {t('report.totalTime')}:{' '}
          <span className="font-semibold text-ink">
            {formatHours(person.totalMinutes, locale)}
          </span>
        </p>
      </div>

      {categories.length === 0 ? (
        <p className="mt-3 flex items-center gap-2 text-sm text-ink-5">
          <LoneMountain className="size-4 shrink-0" />
          {t('report.noData')}
        </p>
      ) : (
        <ul className="mt-4 space-y-2">
          {categories.map((category) => (
            <li key={category.slug} className="flex items-center gap-3 text-sm">
              <span
                aria-hidden="true"
                className="h-3 w-3 shrink-0 rounded-sm"
                style={{ backgroundColor: palette.categoryColors[category.slug] ?? palette.ink.muted }}
              />
              <span className="flex-1 text-ink-2">{category.name}</span>
              <span className="tabular-nums text-ink">
                {formatHours(category.minutes, locale)}
              </span>
              <span className="w-10 text-right tabular-nums text-ink-5">
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
      <div className="mt-4 space-y-1 border-t border-line-soft pt-3">
        {person.totalEarnings > 0 && (
          <div className="flex items-baseline justify-between">
            <span className="text-sm font-medium text-ink-3">{t('report.earned')}</span>
            <span className="text-xl font-bold text-positive">
              {formatMoney(person.totalEarnings, earningsCurrency, locale)}
            </span>
          </div>
        )}
        <div className="flex items-baseline justify-between">
          <span className="text-sm font-medium text-ink-3">
            {t('report.estimatedValue')}
            {/* Период прямо под суммой. Заголовок страницы его называет,
                но карточку часто смотрят вырезанной — на снимке экрана,
                в пересылке — и тогда число остаётся без периода.
                Две карточки за разные недели выглядят как пропажа денег,
                хотя оба числа верные. */}
            {periodTitle && (
              <span className="block text-xs font-normal text-ink-5">{periodTitle}</span>
            )}
          </span>
          <span className="text-xl font-bold text-estimate">
            {formatMoney(person.totalEstimated, estimatedCurrency, locale)}
          </span>
        </div>
      </div>
    </section>
  )
}
