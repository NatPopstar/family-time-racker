import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import { useI18n } from '@/lib/i18n'
import { formatMinutes } from '@/lib/time'
import { CHART_SURFACE, CHART_INK, colorForIndex } from '@/lib/chartColors'
import type { TimelinePoint } from './stats'

/**
 * Как прошла неделя: по одной линии на человека, дни по горизонтали.
 *
 * ЛИНИЯ, А НЕ СТОЛБИКИ. Здесь важен ход времени — «во вторник провал,
 * в субботу всплеск». Линия показывает это движение, набор столбиков —
 * нет.
 *
 * ОДНА ОСЬ. Все линии меряются в часах, поэтому шкала общая. Вторая
 * ось справа (например, деньги) сделала бы график неправдивым:
 * две линии выглядели бы сравнимыми, не будучи такими.
 */
export function FamilyTimeline({
  data,
  people,
}: {
  data: TimelinePoint[]
  people: { id: string; display_name: string }[]
}) {
  const { t, locale } = useI18n()

  const weekdayFormatter = new Intl.DateTimeFormat(locale === 'ru' ? 'ru-RU' : 'en-GB', {
    weekday: 'short',
  })

  // Переводим минуты в часы для рисования и подписываем дни неделей.
  const chartData = data.map((point) => {
    const row: Record<string, string | number> = {
      label: weekdayFormatter.format(new Date(`${point.date}T00:00:00`)),
    }
    for (const person of people) {
      row[person.id] = ((point[person.id] as number) ?? 0) / 60
    }
    return row
  })

  return (
    <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
      <h2 className="text-base font-semibold text-slate-900">{t('family.timelineTitle')}</h2>
      <p className="mt-1 text-sm text-slate-500">{t('family.timelineHint')}</p>

      <div className="mt-4 h-64">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ left: 0, right: 16, top: 8 }}>
            <CartesianGrid vertical={false} stroke={CHART_INK.grid} />
            <XAxis
              dataKey="label"
              tickLine={false}
              axisLine={{ stroke: CHART_INK.axis }}
              tick={{ fill: CHART_INK.muted, fontSize: 12 }}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tick={{ fill: CHART_INK.muted, fontSize: 12 }}
              width={40}
              unit={locale === 'ru' ? ' ч' : 'h'}
            />

            <Tooltip
              formatter={(value, name) => [formatMinutes(Number(value) * 60, locale), String(name)]}
              contentStyle={{
                borderRadius: 8,
                border: `1px solid ${CHART_INK.grid}`,
                fontSize: 13,
              }}
            />
            <Legend wrapperStyle={{ fontSize: 13, paddingTop: 8 }} />

            {people.map((person, index) => (
              <Line
                key={person.id}
                // ПРЯМЫЕ отрезки, а не сглаженная кривая.
                // Сглаживание нарисовало бы плавный переход между
                // понедельником и вторником — то есть значения, которых
                // не существует: время считается по целым дням.
                // Кривая красивее, но врёт.
                type="linear"
                dataKey={person.id}
                name={person.display_name}
                // Цвет берём по НЕИЗМЕННОМУ порядку людей, а не по тому,
                // кто сегодня впереди: иначе при смене лидера все линии
                // перекрашивались бы и график невозможно было бы читать.
                stroke={colorForIndex(index)}
                strokeWidth={2}
                // Точки заметного размера с обводкой цветом фона:
                // там, где линии пересекаются, они не сливаются.
                dot={{ r: 4, strokeWidth: 2, stroke: CHART_SURFACE }}
                isAnimationActive={false}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
