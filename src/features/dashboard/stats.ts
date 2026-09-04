import type { ActivityWithValue } from '@/types/models'

/**
 * Сколько времени труда в записи.
 *
 * Дорога считается наравне с самим делом: отвезти ребёнка на занятие —
 * это работа, а не пауза между делами. Хранится отдельно, чтобы
 * в интерфейсе было видно «занятие 1 ч + дорога 30 мин»,
 * но во всех итогах складывается.
 */
export function activityMinutes(activity: ActivityWithValue): number {
  return (activity.actual_minutes ?? 0) + (activity.travel_minutes ?? 0)
}

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
    const minutes = activityMinutes(activity)
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

/**
 * Определяет, в какой валюте показывать ИТОГОВЫЕ суммы.
 *
 * Раньше здесь было жёстко написано 'GBP', и после смены валюты
 * в настройках дашборд продолжал рисовать фунты. Теперь валюту
 * берём из самих записей: каждая хранит ту, что была на момент
 * выполнения (currency_snapshot).
 *
 * isMixed — честный признак беды. Если часть записей в фунтах,
 * а часть в евро, складывать их вместе бессмысленно: получится
 * число, которое не значит ничего. Интерфейс обязан об этом сказать,
 * а не тихо показать сумму с одним значком.
 */
export function detectCurrency(
  activities: ActivityWithValue[],
  fallback = 'GBP',
): { currency: string; isMixed: boolean } {
  const found = new Set<string>()

  for (const activity of activities) {
    // Записи без денежной оценки (работа, учёба) валюты не имеют
    // и на выбор не влияют.
    if (activity.currency_snapshot) found.add(activity.currency_snapshot)
  }

  if (found.size === 0) return { currency: fallback, isMixed: false }

  const [first] = found
  return { currency: first, isMixed: found.size > 1 }
}

/** Строка семейной таблицы: один человек и его время по категориям. */
export type PersonRow = {
  userId: string
  name: string
  /** Минуты по каждой из четырёх категорий. Отсутствующие — нули. */
  work: number
  study: number
  household: number
  childcare: number
  totalMinutes: number
  totalValue: number
}

/**
 * Сводка по людям — сердце семейного дашборда.
 *
 * Людей берём из списка профилей, а НЕ из записей: человек без единой
 * записи всё равно должен появиться в таблице с нулями. Иначе
 * «ничего не делал» выглядело бы как «его нет в семье», и сравнение
 * теряло бы смысл.
 */
export function summarizeByPerson(
  activities: ActivityWithValue[],
  people: { id: string; display_name: string }[],
): PersonRow[] {
  const rows = new Map<string, PersonRow>(
    people.map((person) => [
      person.id,
      {
        userId: person.id,
        name: person.display_name,
        work: 0,
        study: 0,
        household: 0,
        childcare: 0,
        totalMinutes: 0,
        totalValue: 0,
      },
    ]),
  )

  for (const activity of activities) {
    const row = rows.get(activity.user_id ?? '')
    // Запись человека, которого нет в списке профилей, пропускаем:
    // приписать её некому.
    if (!row) continue

    const minutes = activityMinutes(activity)
    row.totalMinutes += minutes
    row.totalValue += activity.value ?? 0

    switch (activity.category_slug) {
      case 'work':
        row.work += minutes
        break
      case 'study':
        row.study += minutes
        break
      case 'household':
        row.household += minutes
        break
      case 'childcare':
        row.childcare += minutes
        break
    }
  }

  return [...rows.values()].sort((a, b) => b.totalMinutes - a.totalMinutes)
}

/** Точка недельной шкалы: день и сколько в этот день потратил каждый. */
export type TimelinePoint = {
  date: string
  /** Минуты по идентификатору человека. */
  [userId: string]: string | number
}

/**
 * Раскладывает время по дням недели для линейного графика.
 *
 * Дни задаём СПИСКОМ снаружи, а не берём из записей: день без записей
 * должен остаться на графике нулём, иначе линия «перепрыгнет» пустой
 * день и создаст ложное впечатление непрерывной работы.
 */
export function buildTimeline(
  activities: ActivityWithValue[],
  days: string[],
  people: { id: string }[],
): TimelinePoint[] {
  return days.map((date) => {
    const point: TimelinePoint = { date }

    for (const person of people) {
      point[person.id] = 0
    }

    for (const activity of activities) {
      if (activity.date !== date) continue
      const key = activity.user_id ?? ''
      if (!(key in point)) continue
      point[key] = (point[key] as number) + activityMinutes(activity)
    }

    return point
  })
}

/** Доля категории в общем времени, в процентах от 0 до 100. */
export function percentOfTotal(minutes: number, totalMinutes: number): number {
  if (totalMinutes <= 0) return 0
  return Math.round((minutes / totalMinutes) * 100)
}
