import {
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  subWeeks,
  subMonths,
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
