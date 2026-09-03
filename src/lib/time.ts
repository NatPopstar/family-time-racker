/**
 * Работа со временем.
 *
 * ГЛАВНОЕ ПРАВИЛО ПРОЕКТА: время везде хранится и считается в МИНУТАХ,
 * целым числом. Часы с дробью (1.5 ч) при суммировании накапливают
 * ошибку округления, минуты — нет. В часы переводим только в момент
 * умножения на ставку и только для показа на экране.
 */

export type Locale = 'ru' | 'en'

/**
 * Собирает часы и минуты из формы в одно число минут.
 * Пример: hoursAndMinutesToMinutes(1, 30) → 90
 */
export function hoursAndMinutesToMinutes(hours: number, minutes: number): number {
  return Math.round(hours) * 60 + Math.round(minutes)
}

/**
 * Обратное действие: разбирает минуты на часы и минуты для полей формы.
 * Пример: minutesToHoursAndMinutes(90) → { hours: 1, minutes: 30 }
 */
export function minutesToHoursAndMinutes(totalMinutes: number): {
  hours: number
  minutes: number
} {
  const safe = Math.max(0, Math.round(totalMinutes))
  return {
    hours: Math.floor(safe / 60),
    minutes: safe % 60,
  }
}

/**
 * Переводит минуты в часы для денежных расчётов.
 * Пример: minutesToDecimalHours(90) → 1.5
 */
export function minutesToDecimalHours(totalMinutes: number): number {
  return totalMinutes / 60
}

/**
 * Красиво показывает минуты пользователю.
 *
 *   formatMinutes(90)         → '1 ч 30 мин'
 *   formatMinutes(90, 'en')   → '1h 30m'
 *   formatMinutes(120)        → '2 ч'          (нулевые минуты не пишем)
 *   formatMinutes(45)         → '45 мин'       (нулевые часы не пишем)
 *   formatMinutes(0)          → '0 мин'
 */
export function formatMinutes(totalMinutes: number, locale: Locale = 'ru'): string {
  const { hours, minutes } = minutesToHoursAndMinutes(totalMinutes)
  const labels = locale === 'ru' ? { h: ' ч', m: ' мин' } : { h: 'h', m: 'm' }

  const parts: string[] = []
  if (hours > 0) parts.push(`${hours}${labels.h}`)
  if (minutes > 0) parts.push(`${minutes}${labels.m}`)

  // Если время нулевое — показываем «0 мин», а не пустую строку.
  if (parts.length === 0) return `0${labels.m}`

  return parts.join(' ')
}

/**
 * Сравнение плана и факта.
 *
 * Ради этого сравнения план и факт с самого начала живут в разных полях:
 * «планировали час, вышло час сорок» — то, что нельзя увидеть,
 * если хранить только одно число.
 *
 * Возвращает направление отклонения и его величину в минутах.
 * Если плана не было (задача записана сразу выполненной) — null.
 */
export function comparePlanToFact(
  plannedMinutes: number | null,
  actualMinutes: number | null,
): { direction: 'longer' | 'shorter' | 'exact'; diffMinutes: number } | null {
  if (plannedMinutes === null || actualMinutes === null) return null
  if (plannedMinutes <= 0) return null

  const diff = actualMinutes - plannedMinutes

  if (diff === 0) return { direction: 'exact', diffMinutes: 0 }
  return {
    direction: diff > 0 ? 'longer' : 'shorter',
    diffMinutes: Math.abs(diff),
  }
}

/**
 * Показывает суммарное время в часах с одним знаком после запятой —
 * такой формат нужен в таблицах статистики («42.5 ч»).
 */
export function formatHours(totalMinutes: number, locale: Locale = 'ru'): string {
  const hours = minutesToDecimalHours(Math.max(0, totalMinutes))
  const rounded = Math.round(hours * 10) / 10
  return locale === 'ru' ? `${rounded} ч` : `${rounded}h`
}
