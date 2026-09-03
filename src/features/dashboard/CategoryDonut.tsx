import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'
import { useI18n } from '@/lib/i18n'
import { formatMinutes } from '@/lib/time'
import { formatMoney } from '@/lib/money'
import { CATEGORY_COLORS, CHART_SURFACE, CHART_INK } from '@/lib/chartColors'
import type { CategorySummary } from './stats'
import { percentOfTotal } from './stats'

/**
 * Распределение времени по категориям — кольцевая диаграмма.
 *
 * ПРО ЧИТАЕМОСТЬ. Кольцевая диаграмма хорошо показывает «на глаз, чего
 * больше», но плохо — точное сравнение близких долей. Поэтому рядом
 * обязательно идёт легенда С ЧИСЛАМИ: время, деньги и процент.
 * Цвет здесь помогает, но ничего не решает в одиночку — то же самое
 * можно прочитать словами. Это же требование выдал валидатор палитры:
 * два наших цвета имеют низкий контраст к фону и обязаны сопровождаться
 * видимыми подписями.
 */
export function CategoryDonut({
  data,
  totalMinutes,
}: {
  data: CategorySummary[]
  totalMinutes: number
}) {
  const { t, locale } = useI18n()

  if (data.length === 0) {
    return (
      <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
        <h2 className="text-base font-semibold text-slate-900">{t('dashboard.byCategory')}</h2>
        <p className="mt-3 text-sm text-slate-400">{t('dashboard.noData')}</p>
      </div>
    )
  }

  return (
    <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
      <h2 className="text-base font-semibold text-slate-900">{t('dashboard.byCategory')}</h2>

      <div className="mt-4 flex flex-col items-center gap-6 sm:flex-row">
        <div className="h-48 w-48 shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                dataKey="minutes"
                nameKey="name"
                // Кольцо, а не сплошной круг: центр не несёт данных,
                // а дырка облегчает фигуру.
                innerRadius="58%"
                outerRadius="100%"
                // 2 градуса зазора + обводка цветом фона — те самые «2px
                // пустоты», которые отделяют соседние сегменты. Рамку
                // вокруг сегмента не рисуем: это была бы лишняя краска.
                paddingAngle={2}
                stroke={CHART_SURFACE}
                strokeWidth={2}
                isAnimationActive={false}
              >
                {data.map((entry) => (
                  <Cell
                    key={entry.slug}
                    // Цвет привязан к категории, а не к её месту в списке:
                    // при фильтрации «Дом» остаётся бирюзовым, а не
                    // перекрашивается в цвет первого места.
                    fill={CATEGORY_COLORS[entry.slug] ?? CHART_INK.muted}
                  />
                ))}
              </Pie>

              <Tooltip
                // Recharts описывает значение подсказки широким типом,
                // поэтому приводим его сами, а не подставляем number.
                formatter={(value, name) => [formatMinutes(Number(value), locale), String(name)]}
                contentStyle={{
                  borderRadius: 8,
                  border: `1px solid ${CHART_INK.grid}`,
                  fontSize: 13,
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Легенда с числами. Именно она делает диаграмму пригодной
            для точного чтения, а не только «на глаз». */}
        <ul className="w-full space-y-2">
          {data.map((entry) => (
            <li key={entry.slug} className="flex items-center gap-3 text-sm">
              <span
                aria-hidden="true"
                className="h-3 w-3 shrink-0 rounded-sm"
                style={{ backgroundColor: CATEGORY_COLORS[entry.slug] ?? CHART_INK.muted }}
              />
              {/* Текст остаётся обычного цвета: подписи не красим
                  в цвет данных — светлые оттенки нечитаемы как текст. */}
              <span className="flex-1 text-slate-700">{entry.name}</span>
              <span className="tabular-nums text-slate-900">
                {formatMinutes(entry.minutes, locale)}
              </span>
              <span className="w-10 text-right tabular-nums text-slate-400">
                {percentOfTotal(entry.minutes, totalMinutes)}%
              </span>
              <span className="w-14 text-right tabular-nums text-emerald-700">
                {entry.value > 0 ? formatMoney(entry.value, 'GBP', locale) : ''}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
