import type { ActivityWithValue } from '@/types/models'

/**
 * Подсчёты для дашбордов.
 *
 * Все функции здесь — ЧИСТЫЕ: получают массив записей, возвращают числа,
 * никуда не ходят. Поэтому их легко покрыть тестами, а ошибка в подсчёте
 * статистики — это ровно та ошибка, которую пользователь заметит последней.
 */

export type CategorySummary = {
  slug: string
  name: string
  minutes: number
  value: number
}

export type Summary = {
  totalMinutes: number
  totalValue: number
  /** По категориям, от большей к меньшей. Пустые категории не включаются. */
  byCategory: CategorySummary[]
}

/** Суммирует записи: всего времени, всего денег и разбивка по категориям. */
export function summarize(activities: ActivityWithValue[]): Summary {
  const buckets = new Map<string, CategorySummary>()

  let totalMinutes = 0
  let totalValue = 0

  for (const activity of activities) {
    const minutes = activity.actual_minutes ?? 0
    const value = activity.value ?? 0

    totalMinutes += minutes
    totalValue += value

    const slug = activity.category_slug ?? 'unknown'
    const existing = buckets.get(slug)

    if (existing) {
      existing.minutes += minutes
      existing.value += value
    } else {
      buckets.set(slug, {
        slug,
        name: activity.category_name ?? slug,
        minutes,
        value,
      })
    }
  }

  return {
    totalMinutes,
    totalValue,
    // Сортируем по убыванию: читателю важнее всего самая крупная доля,
    // и она должна быть первой и в легенде, и в диаграмме.
    byCategory: [...buckets.values()].sort((a, b) => b.minutes - a.minutes),
  }
}

/** Оставляет записи, попадающие в диапазон дат включительно. */
export function filterByRange(
  activities: ActivityWithValue[],
  from: string,
  to: string,
): ActivityWithValue[] {
  // Даты хранятся строками 'YYYY-MM-DD', поэтому обычное строковое
  // сравнение работает как сравнение дат — формат для этого и выбран.
  return activities.filter((a) => a.date !== null && a.date >= from && a.date <= to)
}

/** Доля категории в общем времени, в процентах от 0 до 100. */
export function percentOfTotal(minutes: number, totalMinutes: number): number {
  if (totalMinutes <= 0) return 0
  return Math.round((minutes / totalMinutes) * 100)
}
