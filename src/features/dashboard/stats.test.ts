import { describe, it, expect } from 'vitest'
import {
  summarize,
  filterByRange,
  percentOfTotal,
  summarizeByPerson,
  buildTimeline,
  detectCurrency,
  activityMinutes,
} from './stats'
import type { ActivityWithValue } from '@/types/models'

/** Короткая заготовка записи — в тестах важны лишь несколько полей. */
function entry(over: Partial<ActivityWithValue>): ActivityWithValue {
  return {
    id: 'x',
    user_id: 'user-1',
    title: 'Задача',
    date: '2026-09-03',
    comment: null,
    planned_minutes: null,
    actual_minutes: 60,
    status: 'done',
    completed_at: null,
    timer_started_at: null,
    subcategory_id: 'sub',
    subcategory_name: 'Подкатегория',
    category_id: 'cat',
    category_slug: 'household',
    category_name: 'Домашние обязанности',
    rate_snapshot: null,
    currency_snapshot: null,
    value: 0,
    ...over,
  } as ActivityWithValue
}

describe('summarize', () => {
  it('складывает время и деньги', () => {
    const result = summarize([
      entry({ actual_minutes: 90, value: 30 }),
      entry({ actual_minutes: 60, value: 20 }),
    ])

    expect(result.totalMinutes).toBe(150)
    expect(result.totalValue).toBe(50)
  })

  it('разносит время по категориям', () => {
    const result = summarize([
      entry({ category_slug: 'work', category_name: 'Работа', actual_minutes: 480, value: 0 }),
      entry({ category_slug: 'household', category_name: 'Дом', actual_minutes: 90, value: 30 }),
      entry({ category_slug: 'household', category_name: 'Дом', actual_minutes: 30, value: 10 }),
    ])

    expect(result.byCategory).toHaveLength(2)
    const household = result.byCategory.find((c) => c.slug === 'household')!
    // Две записи одной категории должны сложиться в одну строку.
    expect(household.minutes).toBe(120)
    expect(household.value).toBe(40)
  })

  it('сортирует категории от большей к меньшей', () => {
    const result = summarize([
      entry({ category_slug: 'household', actual_minutes: 60 }),
      entry({ category_slug: 'work', actual_minutes: 480 }),
      entry({ category_slug: 'study', actual_minutes: 120 }),
    ])

    expect(result.byCategory.map((c) => c.slug)).toEqual(['work', 'study', 'household'])
  })

  it('считает пустой список без ошибки', () => {
    const result = summarize([])

    expect(result.totalMinutes).toBe(0)
    expect(result.totalValue).toBe(0)
    expect(result.byCategory).toEqual([])
  })

  it('не спотыкается на записях без времени', () => {
    // Запись может быть без факта: например, запланированная задача.
    const result = summarize([entry({ actual_minutes: null, value: null })])

    expect(result.totalMinutes).toBe(0)
    expect(result.totalValue).toBe(0)
  })

  it('считает пример из технического задания', () => {
    // Пользователь 1: работа 35 ч, учёба 10 ч, дом 12 ч, ребёнок 15 ч
    const result = summarize([
      entry({ category_slug: 'work', actual_minutes: 35 * 60 }),
      entry({ category_slug: 'study', actual_minutes: 10 * 60 }),
      entry({ category_slug: 'household', actual_minutes: 12 * 60 }),
      entry({ category_slug: 'childcare', actual_minutes: 15 * 60 }),
    ])

    expect(result.totalMinutes).toBe(72 * 60)
    expect(result.byCategory[0].slug).toBe('work')
  })
})

describe('filterByRange', () => {
  const activities = [
    entry({ id: 'a', date: '2026-08-31' }),
    entry({ id: 'b', date: '2026-09-03' }),
    entry({ id: 'c', date: '2026-09-06' }),
    entry({ id: 'd', date: '2026-09-10' }),
  ]

  it('берёт записи внутри диапазона', () => {
    const result = filterByRange(activities, '2026-09-01', '2026-09-07')
    expect(result.map((a) => a.id)).toEqual(['b', 'c'])
  })

  it('включает обе границы', () => {
    // Диапазон включительный с обеих сторон: иначе понедельник
    // или воскресенье выпадали бы из недельной статистики.
    const result = filterByRange(activities, '2026-08-31', '2026-09-06')
    expect(result.map((a) => a.id)).toEqual(['a', 'b', 'c'])
  })

  it('возвращает пустой список, если ничего не подходит', () => {
    expect(filterByRange(activities, '2026-10-01', '2026-10-31')).toEqual([])
  })

  it('один день — это диапазон из одной даты', () => {
    const result = filterByRange(activities, '2026-09-03', '2026-09-03')
    expect(result.map((a) => a.id)).toEqual(['b'])
  })
})

describe('summarizeByPerson', () => {
  const people = [
    { id: 'mama', display_name: 'Мама' },
    { id: 'papa', display_name: 'Папа' },
    { id: 'kid', display_name: 'Даня' },
  ]

  it('раскладывает время по людям и категориям', () => {
    const rows = summarizeByPerson(
      [
        entry({ user_id: 'mama', category_slug: 'work', actual_minutes: 300 }),
        entry({ user_id: 'mama', category_slug: 'household', actual_minutes: 120, value: 40 }),
        entry({ user_id: 'papa', category_slug: 'childcare', actual_minutes: 60, value: 16 }),
      ],
      people,
    )

    const mama = rows.find((r) => r.userId === 'mama')!
    expect(mama.work).toBe(300)
    expect(mama.household).toBe(120)
    expect(mama.totalMinutes).toBe(420)
    expect(mama.totalValue).toBe(40)

    const papa = rows.find((r) => r.userId === 'papa')!
    expect(papa.childcare).toBe(60)
  })

  it('показывает человека без записей строкой из нулей', () => {
    // Иначе «ничего не делал» выглядело бы как «его нет в семье»,
    // и сравнение теряло бы смысл.
    const rows = summarizeByPerson([entry({ user_id: 'mama', actual_minutes: 60 })], people)

    expect(rows).toHaveLength(3)
    const kid = rows.find((r) => r.userId === 'kid')!
    expect(kid.totalMinutes).toBe(0)
    expect(kid.name).toBe('Даня')
  })

  it('сортирует по общему времени, от большего к меньшему', () => {
    const rows = summarizeByPerson(
      [
        entry({ user_id: 'kid', actual_minutes: 600 }),
        entry({ user_id: 'mama', actual_minutes: 120 }),
      ],
      people,
    )

    expect(rows.map((r) => r.userId)).toEqual(['kid', 'mama', 'papa'])
  })

  it('пропускает записи неизвестного человека', () => {
    const rows = summarizeByPerson(
      [entry({ user_id: 'stranger', actual_minutes: 999 })],
      people,
    )

    expect(rows.every((r) => r.totalMinutes === 0)).toBe(true)
  })

  it('считает пример из технического задания', () => {
    // Пользователь 2: работа 45 ч, дом 10 ч, ребёнок 6 ч = 61 час
    const rows = summarizeByPerson(
      [
        entry({ user_id: 'papa', category_slug: 'work', actual_minutes: 45 * 60 }),
        entry({ user_id: 'papa', category_slug: 'household', actual_minutes: 10 * 60 }),
        entry({ user_id: 'papa', category_slug: 'childcare', actual_minutes: 6 * 60 }),
      ],
      people,
    )

    expect(rows.find((r) => r.userId === 'papa')!.totalMinutes).toBe(61 * 60)
  })
})

describe('buildTimeline', () => {
  const people = [{ id: 'mama' }, { id: 'papa' }]
  const days = ['2026-08-31', '2026-09-01', '2026-09-02']

  it('раскладывает минуты по дням и людям', () => {
    const result = buildTimeline(
      [
        entry({ user_id: 'mama', date: '2026-08-31', actual_minutes: 60 }),
        entry({ user_id: 'mama', date: '2026-08-31', actual_minutes: 30 }),
        entry({ user_id: 'papa', date: '2026-09-02', actual_minutes: 120 }),
      ],
      days,
      people,
    )

    expect(result[0]).toEqual({ date: '2026-08-31', mama: 90, papa: 0 })
    expect(result[2]).toEqual({ date: '2026-09-02', mama: 0, papa: 120 })
  })

  it('оставляет пустой день нулём, а не пропускает его', () => {
    // Пропущенный день заставил бы линию «перепрыгнуть» его и создал
    // ложное впечатление непрерывной работы.
    const result = buildTimeline([], days, people)

    expect(result).toHaveLength(3)
    expect(result[1]).toEqual({ date: '2026-09-01', mama: 0, papa: 0 })
  })

  it('игнорирует записи вне заданных дней', () => {
    const result = buildTimeline(
      [entry({ user_id: 'mama', date: '2026-09-20', actual_minutes: 300 })],
      days,
      people,
    )

    expect(result.every((p) => p.mama === 0)).toBe(true)
  })
})

describe('percentOfTotal', () => {
  it('считает долю в процентах', () => {
    expect(percentOfTotal(30, 120)).toBe(25)
    expect(percentOfTotal(60, 120)).toBe(50)
  })

  it('округляет до целых', () => {
    expect(percentOfTotal(1, 3)).toBe(33)
  })

  it('не делит на ноль', () => {
    expect(percentOfTotal(0, 0)).toBe(0)
  })
})

describe('detectCurrency', () => {
  it('берёт валюту из самих записей, а не из кода', () => {
    // Ошибка, ради которой написана эта функция: в итогах было
    // жёстко напечатано 'GBP', и после смены валюты в настройках
    // дашборд продолжал рисовать фунты.
    const result = detectCurrency([entry({ currency_snapshot: 'EUR' })])

    expect(result.currency).toBe('EUR')
    expect(result.isMixed).toBe(false)
  })

  it('без записей возвращает валюту по умолчанию', () => {
    expect(detectCurrency([]).currency).toBe('GBP')
    expect(detectCurrency([], 'USD').currency).toBe('USD')
  })

  it('не сбивается на записях без денежной оценки', () => {
    // У работы и учёбы валюты нет — они на выбор влиять не должны.
    const result = detectCurrency([
      entry({ currency_snapshot: null }),
      entry({ currency_snapshot: 'EUR' }),
    ])

    expect(result.currency).toBe('EUR')
    expect(result.isMixed).toBe(false)
  })

  it('ЧЕСТНО СООБЩАЕТ о смешанных валютах', () => {
    // Складывать фунты с евро бессмысленно. Интерфейс обязан сказать
    // об этом, а не тихо показать сумму с одним значком.
    const result = detectCurrency([
      entry({ currency_snapshot: 'GBP' }),
      entry({ currency_snapshot: 'EUR' }),
    ])

    expect(result.isMixed).toBe(true)
  })

  it('одна валюта у всех записей смешанной не считается', () => {
    const result = detectCurrency([
      entry({ currency_snapshot: 'EUR' }),
      entry({ currency_snapshot: 'EUR' }),
      entry({ currency_snapshot: null }),
    ])

    expect(result.isMixed).toBe(false)
  })
})

describe('activityMinutes: дорога считается трудом', () => {
  it('складывает время дела и время в дороге', () => {
    // Отвезти ребёнка на занятие — это работа, а не пауза между делами.
    expect(activityMinutes(entry({ actual_minutes: 60, travel_minutes: 30 }))).toBe(90)
  })

  it('без дороги возвращает только время дела', () => {
    expect(activityMinutes(entry({ actual_minutes: 60, travel_minutes: 0 }))).toBe(60)
  })

  it('не спотыкается на пустых значениях', () => {
    expect(activityMinutes(entry({ actual_minutes: null, travel_minutes: null }))).toBe(0)
  })
})

describe('дорога попадает в итоги', () => {
  it('summarize складывает дорогу вместе с делом', () => {
    const result = summarize([
      entry({ actual_minutes: 60, travel_minutes: 30 }),
      entry({ actual_minutes: 60, travel_minutes: 0 }),
    ])

    expect(result.totalMinutes).toBe(150)
  })

  it('summarizeByPerson тоже учитывает дорогу', () => {
    const rows = summarizeByPerson(
      [entry({ user_id: 'mama', category_slug: 'childcare', actual_minutes: 60, travel_minutes: 30 })],
      [{ id: 'mama', display_name: 'Мама' }],
    )

    expect(rows[0].childcare).toBe(90)
    expect(rows[0].totalMinutes).toBe(90)
  })

  it('шкала недели тоже учитывает дорогу', () => {
    const result = buildTimeline(
      [entry({ user_id: 'mama', date: '2026-08-31', actual_minutes: 60, travel_minutes: 30 })],
      ['2026-08-31'],
      [{ id: 'mama' }],
    )

    expect(result[0].mama).toBe(90)
  })
})

describe('заработок и оценка труда НЕ СКЛАДЫВАЮТСЯ', () => {
  it('summarize держит их раздельно', () => {
    // «Заработал 2000» и «его труд стоил бы 2000, если бы его покупали» —
    // разные утверждения. Их сумма не значит ничего.
    const result = summarize([
      entry({ value: 1000, is_earnings_snapshot: true }),
      entry({ value: 300, is_earnings_snapshot: false }),
    ])

    expect(result.totalEarnings).toBe(1000)
    expect(result.totalEstimated).toBe(300)
  })

  it('запись без признака считается оценкой', () => {
    // Так устроены все записи, сделанные до появления зарплат.
    const result = summarize([entry({ value: 50, is_earnings_snapshot: false })])

    expect(result.totalEarnings).toBe(0)
    expect(result.totalEstimated).toBe(50)
  })

  it('summarizeByPerson тоже делит по людям', () => {
    const rows = summarizeByPerson(
      [
        entry({ user_id: 'papa', value: 1000, is_earnings_snapshot: true }),
        entry({ user_id: 'mama', value: 300, is_earnings_snapshot: false }),
      ],
      [
        { id: 'papa', display_name: 'Папа' },
        { id: 'mama', display_name: 'Мама' },
      ],
    )

    const papa = rows.find((r) => r.userId === 'papa')!
    const mama = rows.find((r) => r.userId === 'mama')!

    // У папы зарплата, у мамы оценка неоплачиваемого труда.
    expect(papa.totalEarnings).toBe(1000)
    expect(papa.totalEstimated).toBe(0)
    expect(mama.totalEarnings).toBe(0)
    expect(mama.totalEstimated).toBe(300)
  })

  it('считает пример с настоящими данными', () => {
    // Андрей: 22.93 ч по 47.45 и 21.43 ч по 43.75.
    const result = summarize([
      entry({ value: 1088.2, is_earnings_snapshot: true }),
      entry({ value: 937.71, is_earnings_snapshot: true }),
    ])

    expect(Math.round(result.totalEarnings)).toBe(2026)
    expect(result.totalEstimated).toBe(0)
  })
})
