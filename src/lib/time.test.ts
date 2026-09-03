import { describe, it, expect } from 'vitest'
import {
  hoursAndMinutesToMinutes,
  minutesToHoursAndMinutes,
  minutesToDecimalHours,
  formatMinutes,
  formatHours,
  comparePlanToFact,
} from './time'

// describe — «раздел» тестов, it — один конкретный проверяемый случай.
// Читается как предложение: "hoursAndMinutesToMinutes converts 1 h 30 m to 90".

describe('hoursAndMinutesToMinutes', () => {
  it('складывает часы и минуты в одно число', () => {
    expect(hoursAndMinutesToMinutes(1, 30)).toBe(90)
    expect(hoursAndMinutesToMinutes(8, 0)).toBe(480)
    expect(hoursAndMinutesToMinutes(0, 45)).toBe(45)
  })

  it('обрабатывает нули', () => {
    expect(hoursAndMinutesToMinutes(0, 0)).toBe(0)
  })
})

describe('minutesToHoursAndMinutes', () => {
  it('разбирает минуты обратно на часы и минуты', () => {
    expect(minutesToHoursAndMinutes(90)).toEqual({ hours: 1, minutes: 30 })
    expect(minutesToHoursAndMinutes(480)).toEqual({ hours: 8, minutes: 0 })
    expect(minutesToHoursAndMinutes(45)).toEqual({ hours: 0, minutes: 45 })
  })

  it('не даёт отрицательного времени', () => {
    // Защита от кривых данных: минус в базе не должен ломать интерфейс.
    expect(minutesToHoursAndMinutes(-10)).toEqual({ hours: 0, minutes: 0 })
  })

  it('туда и обратно даёт исходное число', () => {
    // Важная проверка: две функции должны быть строго обратны друг другу.
    const { hours, minutes } = minutesToHoursAndMinutes(215)
    expect(hoursAndMinutesToMinutes(hours, minutes)).toBe(215)
  })
})

describe('minutesToDecimalHours', () => {
  it('переводит минуты в дробные часы для расчёта денег', () => {
    expect(minutesToDecimalHours(90)).toBe(1.5)
    expect(minutesToDecimalHours(30)).toBe(0.5)
    expect(minutesToDecimalHours(60)).toBe(1)
  })
})

describe('formatMinutes', () => {
  it('показывает часы и минуты по-русски', () => {
    expect(formatMinutes(90)).toBe('1 ч 30 мин')
  })

  it('показывает часы и минуты по-английски', () => {
    expect(formatMinutes(90, 'en')).toBe('1h 30m')
  })

  it('прячет нулевые минуты', () => {
    expect(formatMinutes(120)).toBe('2 ч')
    expect(formatMinutes(120, 'en')).toBe('2h')
  })

  it('прячет нулевые часы', () => {
    expect(formatMinutes(45)).toBe('45 мин')
    expect(formatMinutes(45, 'en')).toBe('45m')
  })

  it('для нуля показывает 0, а не пустую строку', () => {
    expect(formatMinutes(0)).toBe('0 мин')
    expect(formatMinutes(0, 'en')).toBe('0m')
  })
})

describe('comparePlanToFact', () => {
  it('видит превышение плана', () => {
    // Пример прямо из технического задания:
    // планировали уборку 1 час, потратили 1 час 40 минут.
    expect(comparePlanToFact(60, 100)).toEqual({ direction: 'longer', diffMinutes: 40 })
  })

  it('видит опережение плана', () => {
    expect(comparePlanToFact(120, 90)).toEqual({ direction: 'shorter', diffMinutes: 30 })
  })

  it('узнаёт точное совпадение', () => {
    expect(comparePlanToFact(60, 60)).toEqual({ direction: 'exact', diffMinutes: 0 })
  })

  it('ничего не сравнивает, если плана не было', () => {
    // Запись, сделанную сразу «по факту», сравнивать не с чем.
    expect(comparePlanToFact(null, 90)).toBeNull()
  })

  it('ничего не сравнивает, если задача ещё не выполнена', () => {
    expect(comparePlanToFact(60, null)).toBeNull()
  })

  it('не делит на нулевой план', () => {
    expect(comparePlanToFact(0, 90)).toBeNull()
  })
})

describe('formatHours', () => {
  it('округляет до одного знака после запятой', () => {
    expect(formatHours(150)).toBe('2.5 ч')
    expect(formatHours(150, 'en')).toBe('2.5h')
  })

  it('не показывает лишний ноль у целых часов', () => {
    expect(formatHours(120)).toBe('2 ч')
  })

  it('округляет длинную дробь', () => {
    // 100 минут = 1.666… часа → 1.7
    expect(formatHours(100)).toBe('1.7 ч')
  })
})
