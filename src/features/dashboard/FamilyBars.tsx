import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { useI18n } from '@/lib/i18n'
import { formatMinutes } from '@/lib/time'
import { CATEGORY_COLORS, CHART_SURFACE, CHART_INK } from '@/lib/chartColors'
import type { PersonRow } from './stats'

/**
 * Сравнение членов семьи — горизонтальные полосы, разбитые по категориям.
 *
 * ПОЧЕМУ ГОРИЗОНТАЛЬНЫЕ. Имена людей — длинные слова. У вертикальных
 * столбиков подписи под ними пришлось бы наклонять или обрезать;
 * у горизонтальных имя спокойно помещается слева.
 *
 * Одна полоса отвечает сразу на два вопроса: её общая длина — «кто
 * потратил больше», а цвета внутри — «на что именно». Отдельная
 * диаграмма для второго вопроса не нужна.
 */
export function FamilyBars({ rows }: { rows: PersonRow[] }) {
  const { t, locale } = useI18n()

  // Категории в фиксированном порядке — он же порядок сегментов
  // в каждой полосе. Одинаковый у всех, иначе полосы не сравнить.
  const segments = [
    { key: 'work' as const, slug: 'work', label: t('family.work') },
    { key: 'study' as const, slug: 'study', label: t('family.study') },
    { key: 'household' as const, slug: 'household', label: t('family.household') },
    { key: 'childcare' as const, slug: 'childcare', label: t('family.childcare') },
  ]

  // Recharts работает с часами удобнее, чем с минутами: ось получается
  // с круглыми числами. Пересчёт делаем только для рисования.
  const data = rows.map((row) => ({
    name: row.name,
    work: row.work / 60,
    study: row.study / 60,
    household: row.household / 60,
    childcare: row.childcare / 60,
  }))

  return (
    <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
      <h2 className="text-base font-semibold text-slate-900">{t('family.compareTitle')}</h2>
      <p className="mt-1 text-sm text-slate-500">{t('family.compareHint')}</p>

      <div className="mt-4" style={{ height: Math.max(180, rows.length * 64 + 60) }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ left: 8, right: 16 }}>
            {/* Сетка только по горизонтали: вертикальные линии за полосами
                добавляли бы шум, ничего не поясняя. */}
            <CartesianGrid horizontal={false} stroke={CHART_INK.grid} />
            <XAxis
              type="number"
              tickLine={false}
              axisLine={{ stroke: CHART_INK.axis }}
              tick={{ fill: CHART_INK.muted, fontSize: 12 }}
              // Единицы подписываем один раз у оси, а не у каждого столбика.
              unit={locale === 'ru' ? ' ч' : 'h'}
            />
            <YAxis
              type="category"
              dataKey="name"
              width={110}
              tickLine={false}
              axisLine={false}
              tick={{ fill: CHART_INK.secondary, fontSize: 13 }}
            />

            <Tooltip
              formatter={(value, name) => [formatMinutes(Number(value) * 60, locale), String(name)]}
              contentStyle={{
                borderRadius: 8,
                border: `1px solid ${CHART_INK.grid}`,
                fontSize: 13,
              }}
              // Подсветка всей строки вместо одного сегмента: так понятно,
              // к кому относится подсказка.
              cursor={{ fill: CHART_INK.grid, fillOpacity: 0.35 }}
            />

            {/* Легенда обязательна: четыре категории нельзя различать
                по одному лишь цвету. */}
            {/* Встроенную легенду Recharts не используем: она переставляет
                подписи по алфавиту, и порядок перестаёт совпадать
                с порядком сегментов внутри полосы. Свою рисуем ниже —
                заодно она выглядит так же, как у кольцевой диаграммы. */}

            {segments.map((segment, index) => (
              <Bar
                key={segment.key}
                dataKey={segment.key}
                name={segment.label}
                stackId="total"
                fill={CATEGORY_COLORS[segment.slug]}
                // Обводка цветом фона — тот самый зазор в 2 пикселя,
                // который отделяет соседние сегменты друг от друга.
                stroke={CHART_SURFACE}
                strokeWidth={2}
                // Полосу не раздуваем на всю доступную высоту: воздух
                // между полосами читается лучше, чем плотная заливка.
                barSize={24}
                // Скругление только у последнего сегмента — там,
                // где полоса кончается. У начала она стоит на оси.
                radius={index === segments.length - 1 ? [0, 4, 4, 0] : undefined}
                isAnimationActive={false}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Легенда в том же порядке, что и сегменты полосы. */}
      <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-2">
        {segments.map((segment) => (
          <li key={segment.key} className="flex items-center gap-2 text-sm">
            <span
              aria-hidden="true"
              className="h-3 w-3 rounded-sm"
              style={{ backgroundColor: CATEGORY_COLORS[segment.slug] }}
            />
            {/* Подпись обычного цвета: текст никогда не красим
                в цвет данных — светлые оттенки нечитаемы. */}
            <span className="text-slate-700">{segment.label}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
