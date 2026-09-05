import { describe, it, expect } from 'vitest'
import {
  WORK_SOURCE_KEYS,
  WORK_SOURCE_SUBCATEGORY,
  subcategoryNameForSource,
  isWorkSourceKey,
} from './workSources'

describe('соответствие полей источника видам работы', () => {
  it('work1 — это инвест', () => {
    expect(subcategoryNameForSource('work1')).toBe('Работа Andrei (инвест)')
  })

  it('work2 — это epam', () => {
    expect(subcategoryNameForSource('work2')).toBe('Работа Andrei (epam)')
  })

  it('незнакомое поле не подставляет чужую работу', () => {
    // Если в приложении-источнике заведут work3, часы должны остаться
    // незаписанными и заметными, а не тихо приплюсоваться к epam.
    expect(subcategoryNameForSource('work3')).toBeNull()
    expect(subcategoryNameForSource('')).toBeNull()
  })

  it('названия видов работы не повторяются', () => {
    // Одинаковые названия означали бы, что часы двух разных работ
    // попадут в одну строку и разделить их будет уже нельзя.
    const names = Object.values(WORK_SOURCE_SUBCATEGORY)
    expect(new Set(names).size).toBe(names.length)
  })

  it('у каждого известного поля есть название', () => {
    for (const key of WORK_SOURCE_KEYS) {
      expect(subcategoryNameForSource(key)).not.toBeNull()
    }
  })

  it('isWorkSourceKey отличает знакомое поле от чужого', () => {
    expect(isWorkSourceKey('work1')).toBe(true)
    expect(isWorkSourceKey('work3')).toBe(false)
  })
})
