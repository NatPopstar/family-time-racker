import { useTheme } from './theme'

/**
 * Цвета графиков.
 *
 * Это не «подобранные на глаз» цвета. Каждая палитра прогнана через
 * валидатор, который проверяет сразу пять вещей: полосу светлоты,
 * насыщенность, различимость при дальтонизме, различимость обычным
 * зрением и контраст к фону, на котором лежит график.
 *
 * ПОЧЕМУ ДВЕ ПАЛИТРЫ, А НЕ ОДНА «ПЕРЕВЁРНУТАЯ».
 * Тёмная тема — не светлая наоборот. Те же самые цвета на тёмном фоне
 * теряют насыщенность и сливаются: проверка это показала прямо —
 * первая попытка просто осветлить палитру провалилась по трём пунктам
 * из пяти. Поэтому у каждой темы свои цвета, подобранные под её фон
 * и проверенные отдельно.
 *
 * ВАЖНО: цвета назначаются по ПОРЯДКУ и никогда не «прокручиваются
 * по кругу». Шестая категория не получит заново синий — если категорий
 * станет больше, лишние сводятся в «Прочее».
 */

/** Слоты категориальной палитры — строго в этом порядке. */
const FOREST_CATEGORICAL = [
  '#16719f', // 1 — озёрная синь
  '#c23a10', // 2 — осенний лист
  '#0d8b63', // 3 — хвоя
  '#8a4f88', // 4 — вереск
  '#a5842a', // 5 — золото мэллорна
] as const

const MOON_CATEGORICAL = [
  '#4f8fd0', // 1 — отражённый свет
  '#cc6a44', // 2 — далёкий костёр
  '#2b9b76', // 3 — мох под луной
  '#a96fb5', // 4 — аметист
  '#ab9134', // 5 — тусклое золото
] as const

/** Фон, на котором рисуются графики. Валидатор считает контраст к нему. */
const FOREST_SURFACE = '#fbfcf7'
const MOON_SURFACE = '#171a2e'

/** Оттенки оформления графика: сетка, оси, подписи. */
const FOREST_INK = {
  grid: '#dde2d3',
  axis: '#c2cbb3',
  muted: '#8a9781',
  secondary: '#4d5c46',
} as const

const MOON_INK = {
  grid: '#2b3050',
  axis: '#3d4568',
  muted: '#7a83a6',
  secondary: '#aeb6d4',
} as const

export type ChartPalette = {
  categorical: readonly string[]
  surface: string
  ink: { grid: string; axis: string; muted: string; secondary: string }
  /** Цвет категории по её slug. */
  categoryColors: Record<string, string>
  /** Цвет по номеру слота — для сущностей, которые не категории (людей). */
  colorForIndex: (index: number) => string
}

/**
 * Порядок закрепления цветов за категориями.
 *
 * Цвет привязан к slug, а НЕ к позиции в отфильтрованном списке:
 * иначе, убрав из фильтра «Работу», человек увидел бы, как «Учёба»
 * перекрашивается в её синий, — и решил бы, что смотрит на другие данные.
 */
const CATEGORY_ORDER = ['work', 'study', 'household', 'childcare', 'admin'] as const

function buildPalette(
  categorical: readonly string[],
  surface: string,
  ink: ChartPalette['ink'],
): ChartPalette {
  const categoryColors: Record<string, string> = {}
  CATEGORY_ORDER.forEach((slug, index) => {
    categoryColors[slug] = categorical[index]
  })

  return {
    categorical,
    surface,
    ink,
    categoryColors,
    // Если сущностей больше, чем слотов, повторно цвета НЕ выдаём:
    // возвращаем серый, а вызывающий код сводит хвост в «Прочее».
    colorForIndex: (index: number) => categorical[index] ?? ink.muted,
  }
}

export const FOREST_PALETTE = buildPalette(FOREST_CATEGORICAL, FOREST_SURFACE, FOREST_INK)
export const MOON_PALETTE = buildPalette(MOON_CATEGORICAL, MOON_SURFACE, MOON_INK)

/**
 * Палитра текущей темы.
 *
 * Recharts принимает цвета значениями, а не классами, поэтому взять их
 * из CSS-переменных нельзя — нужен именно такой хук.
 */
export function useChartPalette(): ChartPalette {
  const { isDark } = useTheme()
  return isDark ? MOON_PALETTE : FOREST_PALETTE
}
