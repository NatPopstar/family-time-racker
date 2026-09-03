import {
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  subWeeks,
  subMonths,
  addWeeks,
  addDays,
} from 'date-fns'
import { todayISO } from './dates'

/**
 * Готовые периоды для фильтров: сегодня, эта неделя, прошлый месяц и т.д.
 *
 * Неделя начинается с ПОНЕДЕЛЬНИКА (weekStartsOn: 1).
 * По умолчанию date-fns считает началом недели воскресенье — американская
 * привычка. Для нас это означало бы, что воскресные дела попадают
 * в следующую неделю, и недельный отчёт не сходился бы с ожиданиями.
 */

export type PeriodId =
  | 'today'
  | 'thisWeek'
  | 'lastWeek'
  | 'thisMonth'
  | 'lastMonth'
  | 'custom'

export type DateRange = {
  /** Начало периода, 'YYYY-MM-DD', включительно. */
  from: string
  /** Конец периода, 'YYYY-MM-DD', включительно. */
  to: string
}

const WEEK_OPTIONS = { weekStartsOn: 1 } as const

/**
 * Границы периода по его названию.
 * Параметр now нужен только тестам — в приложении берётся текущий момент.
 */
export function getPeriodRange(period: Exclude<PeriodId, 'custom'>, now: Date = new Date()): DateRange {
  switch (period) {
    case 'today':
      return { from: todayISO(now), to: todayISO(now) }

    case 'thisWeek':
      return {
        from: todayISO(startOfWeek(now, WEEK_OPTIONS)),
        to: todayISO(endOfWeek(now, WEEK_OPTIONS)),
      }

    case 'lastWeek': {
      const weekAgo = subWeeks(now, 1)
      return {
        from: todayISO(startOfWeek(weekAgo, WEEK_OPTIONS)),
        to: todayISO(endOfWeek(weekAgo, WEEK_OPTIONS)),
      }
    }

    case 'thisMonth':
      return { from: todayISO(startOfMonth(now)), to: todayISO(endOfMonth(now)) }

    case 'lastMonth': {
      const monthAgo = subMonths(now, 1)
      return { from: todayISO(startOfMonth(monthAgo)), to: todayISO(endOfMonth(monthAgo)) }
    }
  }
}

/**
 * Семь дат недели, начиная с понедельника: ['2026-08-31', ... '2026-09-06'].
 * Нужны Планеру, который показывает неделю по дням.
 *
 * offsetWeeks сдвигает неделю: 0 — текущая, -1 — прошлая, 1 — следующая.
 */
export function getWeekDays(offsetWeeks = 0, now: Date = new Date()): string[] {
  const monday = startOfWeek(addWeeks(now, offsetWeeks), WEEK_OPTIONS)
  return Array.from({ length: 7 }, (_, index) => todayISO(addDays(monday, index)))
}

/** Границы недели со сдвигом — для запроса задач Планера одним разом. */
export function getWeekRange(offsetWeeks = 0, now: Date = new Date()): DateRange {
  const days = getWeekDays(offsetWeeks, now)
  return { from: days[0], to: days[6] }
}

/** Границы месяца со сдвигом: 0 — текущий, -1 — прошлый. */
export function getMonthRange(offsetMonths = 0, now: Date = new Date()): DateRange {
  const target = subMonths(now, -offsetMonths)
  return { from: todayISO(startOfMonth(target)), to: todayISO(endOfMonth(target)) }
}

/**
 * Название периода для заголовка отчёта:
 * «31 августа — 6 сентября 2026» или «Сентябрь 2026».
 */
export function formatPeriodTitle(
  mode: 'week' | 'month',
  range: DateRange,
  locale: 'ru' | 'en',
): string {
  const tag = locale === 'ru' ? 'ru-RU' : 'en-GB'
  const from = new Date(`${range.from}T00:00:00`)

  if (mode === 'month') {
    const text = new Intl.DateTimeFormat(tag, { month: 'long', year: 'numeric' }).format(from)
    // С заглавной буквы: это заголовок, а Intl отдаёт месяц строчным.
    return text.charAt(0).toUpperCase() + text.slice(1)
  }

  const to = new Date(`${range.to}T00:00:00`)
  const dayMonth = new Intl.DateTimeFormat(tag, { day: 'numeric', month: 'long' })
  return `${dayMonth.format(from)} — ${dayMonth.format(to)} ${to.getFullYear()}`
}
