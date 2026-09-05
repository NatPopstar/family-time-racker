import { describe, it, expect } from 'vitest'
import {
  getPeriodRange,
  getWeekDays,
  getWeekRange,
  getMonthRange,
  formatPeriodTitle,
  BEGINNING_OF_TIME,
} from './periods'

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

describe('getPeriodRange: год и всё время', () => {
  it('последние 12 месяцев отсчитываются от сегодня, а не от января', () => {
    // «Последний год» — это скользящее окно. Календарный год,
    // если понадобится, задаётся своим периодом.
    expect(getPeriodRange('lastYear', thursday)).toEqual({
      from: '2025-09-03',
      to: '2026-09-03',
    })
  })

  it('високосный февраль не сдвигает границу', () => {
    // 29 февраля существует не каждый год, и наивное вычитание
    // могло бы дать несуществующую дату.
    const leapDay = new Date(2028, 1, 29, 12, 0, 0)
    expect(getPeriodRange('lastYear', leapDay).from).toBe('2027-02-28')
  })

  it('всё время начинается заведомо раньше любых записей', () => {
    // Нижняя граница нужна запросу к базе. Человек её не видит:
    // поля дат показываются только для своего периода.
    expect(getPeriodRange('allTime', thursday)).toEqual({
      from: BEGINNING_OF_TIME,
      to: '2026-09-03',
    })
  })

  it('всё время накрывает самую раннюю запись Натальи', () => {
    // Поиск работы начался 6 августа 2025 — он обязан попадать
    // в период, иначе «всё время» показывает не всё.
    const range = getPeriodRange('allTime', thursday)
    expect(range.from < '2025-08-06').toBe(true)
    expect(range.to >= '2026-09-03').toBe(true)
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

describe('getMonthRange', () => {
  it('текущий месяц — с первого по последнее число', () => {
    expect(getMonthRange(0, thursday)).toEqual({ from: '2026-09-01', to: '2026-09-30' })
  })

  it('сдвигается на месяц назад', () => {
    expect(getMonthRange(-1, thursday)).toEqual({ from: '2026-08-01', to: '2026-08-31' })
  })

  it('сдвигается на месяц вперёд', () => {
    expect(getMonthRange(1, thursday)).toEqual({ from: '2026-10-01', to: '2026-10-31' })
  })

  it('перешагивает через границу года назад', () => {
    const january = new Date(2026, 0, 15, 12, 0, 0)
    expect(getMonthRange(-1, january)).toEqual({ from: '2025-12-01', to: '2025-12-31' })
  })

  it('правильно берёт февраль високосного года', () => {
    const feb2028 = new Date(2028, 1, 10, 12, 0, 0)
    expect(getMonthRange(0, feb2028)).toEqual({ from: '2028-02-01', to: '2028-02-29' })
  })
})

describe('formatPeriodTitle', () => {
  it('месяц пишет с заглавной буквы', () => {
    // Intl отдаёт месяц строчным, а это заголовок отчёта.
    // «г.» после года добавляет сама русская локаль — так принято
    // по типографике, и мы её не переучиваем.
    const title = formatPeriodTitle('month', getMonthRange(0, thursday), 'ru')
    expect(title).toBe('Сентябрь 2026 г.')
  })

  it('месяц по-английски', () => {
    expect(formatPeriodTitle('month', getMonthRange(0, thursday), 'en')).toBe('September 2026')
  })

  it('неделю показывает как диапазон с годом', () => {
    const title = formatPeriodTitle('week', getWeekRange(0, thursday), 'ru')
    expect(title).toBe('31 августа — 6 сентября 2026')
  })
})
