import { describe, it, expect } from 'vitest'
import { todayISO, formatDateShort } from './dates'

describe('todayISO', () => {
  it('собирает дату в формате YYYY-MM-DD', () => {
    expect(todayISO(new Date(2026, 8, 3, 12, 0, 0))).toBe('2026-09-03')
  })

  it('дописывает ведущие нули', () => {
    expect(todayISO(new Date(2026, 0, 5, 12, 0, 0))).toBe('2026-01-05')
  })

  it('поздним вечером остаётся ТЕКУЩИМ днём, а не завтрашним', () => {
    // Главная проверка. Привычное toISOString() вернуло бы здесь дату
    // по Гринвичу, и вечерняя запись уехала бы в следующий день,
    // испортив недельную статистику.
    const lateEvening = new Date(2026, 8, 3, 23, 45, 0)
    expect(todayISO(lateEvening)).toBe('2026-09-03')
  })

  it('ранним утром остаётся текущим днём, а не вчерашним', () => {
    const earlyMorning = new Date(2026, 8, 3, 0, 15, 0)
    expect(todayISO(earlyMorning)).toBe('2026-09-03')
  })

  it('правильно обрабатывает последний день года', () => {
    expect(todayISO(new Date(2026, 11, 31, 23, 59, 0))).toBe('2026-12-31')
  })
})

describe('formatDateShort', () => {
  it('показывает день и месяц по-русски', () => {
    expect(formatDateShort('2026-09-03', 'ru')).toBe('3 сентября')
  })

  it('показывает день и месяц по-английски', () => {
    expect(formatDateShort('2026-09-03', 'en')).toBe('3 September')
  })

  it('не сдвигает дату на соседний день', () => {
    // Строку 'YYYY-MM-DD' браузер считает временем по Гринвичу.
    // Без добавления 'T00:00:00' первое число месяца могло бы
    // показаться как последнее число предыдущего.
    expect(formatDateShort('2026-09-01', 'ru')).toBe('1 сентября')
  })
})
