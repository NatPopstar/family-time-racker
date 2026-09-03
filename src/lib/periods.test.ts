import { describe, it, expect } from 'vitest'
import { getPeriodRange, getWeekDays, getWeekRange } from './periods'

// Четверг, 3 сентября 2026 года. Неделя с понедельника 31 августа
// по воскресенье 6 сентября.
const thursday = new Date(2026, 8, 3, 14, 0, 0)

describe('getPeriodRange', () => {
  it('сегодня — это один день', () => {
    expect(getPeriodRange('today', thursday)).toEqual({
      from: '2026-09-03',
      to: '2026-09-03',
    })
  })

  it('неделя начинается с понедельника, а не с воскресенья', () => {
    // Главная проверка. По умолчанию date-fns начинает неделю
    // с воскресенья — тогда воскресные дела уехали бы в следующую
    // неделю, и недельный отчёт не сошёлся бы с ожиданиями.
    expect(getPeriodRange('thisWeek', thursday)).toEqual({
      from: '2026-08-31',
      to: '2026-09-06',
    })
  })

  it('прошлая неделя — предыдущие понедельник и воскресенье', () => {
    expect(getPeriodRange('lastWeek', thursday)).toEqual({
      from: '2026-08-24',
      to: '2026-08-30',
    })
  })

  it('этот месяц — с первого по последнее число', () => {
    expect(getPeriodRange('thisMonth', thursday)).toEqual({
      from: '2026-09-01',
      to: '2026-09-30',
    })
  })

  it('прошлый месяц — с первого по последнее число', () => {
    expect(getPeriodRange('lastMonth', thursday)).toEqual({
      from: '2026-08-01',
      to: '2026-08-31',
    })
  })

  it('в воскресенье «эта неделя» ещё текущая, а не следующая', () => {
    // Воскресенье 6 сентября — последний день той же недели.
    const sunday = new Date(2026, 8, 6, 22, 0, 0)
    expect(getPeriodRange('thisWeek', sunday)).toEqual({
      from: '2026-08-31',
      to: '2026-09-06',
    })
  })

  it('в понедельник «прошлая неделя» — действительно предыдущая', () => {
    const monday = new Date(2026, 7, 31, 9, 0, 0)
    expect(getPeriodRange('lastWeek', monday)).toEqual({
      from: '2026-08-24',
      to: '2026-08-30',
    })
  })

  it('правильно берёт февраль високосного года', () => {
    // 2028 — високосный, в феврале 29 дней.
    const march2028 = new Date(2028, 2, 15, 12, 0, 0)
    expect(getPeriodRange('lastMonth', march2028)).toEqual({
      from: '2028-02-01',
      to: '2028-02-29',
    })
  })

  it('в январе «прошлый месяц» — декабрь прошлого года', () => {
    const january = new Date(2026, 0, 15, 12, 0, 0)
    expect(getPeriodRange('lastMonth', january)).toEqual({
      from: '2025-12-01',
      to: '2025-12-31',
    })
  })
})

describe('getWeekDays', () => {
  it('возвращает семь дней с понедельника по воскресенье', () => {
    expect(getWeekDays(0, thursday)).toEqual([
      '2026-08-31',
      '2026-09-01',
      '2026-09-02',
      '2026-09-03',
      '2026-09-04',
      '2026-09-05',
      '2026-09-06',
    ])
  })

  it('сдвигается на прошлую неделю', () => {
    const days = getWeekDays(-1, thursday)
    expect(days[0]).toBe('2026-08-24')
    expect(days[6]).toBe('2026-08-30')
  })

  it('сдвигается на следующую неделю', () => {
    const days = getWeekDays(1, thursday)
    expect(days[0]).toBe('2026-09-07')
    expect(days[6]).toBe('2026-09-13')
  })

  it('правильно перешагивает через границу месяца', () => {
    // Неделя 31 августа — 6 сентября лежит в двух месяцах.
    const days = getWeekDays(0, thursday)
    expect(days[0].startsWith('2026-08')).toBe(true)
    expect(days[6].startsWith('2026-09')).toBe(true)
  })
})

describe('getWeekRange', () => {
  it('даёт границы недели одним объектом', () => {
    expect(getWeekRange(0, thursday)).toEqual({ from: '2026-08-31', to: '2026-09-06' })
  })
})
