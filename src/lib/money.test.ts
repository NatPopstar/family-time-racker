import { describe, it, expect } from 'vitest'
import { formatMoney, calculateValue } from './money'

describe('calculateValue', () => {
  it('считает стоимость: часы × ставку', () => {
    // 3 часа уборки по £20 = £60
    expect(calculateValue(180, 20)).toBe(60)
  })

  it('правильно считает неполные часы', () => {
    // 1 час 30 минут по £20 = £30
    expect(calculateValue(90, 20)).toBe(30)
  })

  it('возвращает ноль, если ставки нет', () => {
    // Работа и учёба деньгами не оцениваются — это главное правило проекта.
    expect(calculateValue(480, null)).toBe(0)
  })

  it('возвращает ноль при нулевом времени', () => {
    expect(calculateValue(0, 20)).toBe(0)
  })

  it('не выдаёт отрицательную стоимость', () => {
    expect(calculateValue(-60, 20)).toBe(0)
  })

  it('считает пример из технического задания', () => {
    // 5 часов уборки × £20 = £100
    expect(calculateValue(300, 20)).toBe(100)
    // 7 часов готовки × £30 = £210
    expect(calculateValue(420, 30)).toBe(210)
    // 10 часов няни × £18 = £180
    expect(calculateValue(600, 18)).toBe(180)
  })
})

describe('formatMoney', () => {
  it('показывает фунты без копеек', () => {
    // toContain, а не toBe: разные системы ставят разные пробелы
    // между числом и знаком валюты.
    expect(formatMoney(100, 'GBP', 'en')).toContain('100')
    expect(formatMoney(100, 'GBP', 'en')).toContain('£')
  })

  it('округляет до целых', () => {
    expect(formatMoney(99.6, 'GBP', 'en')).toContain('100')
  })

  it('умеет другую валюту', () => {
    expect(formatMoney(50, 'EUR', 'en')).toContain('€')
  })
})
