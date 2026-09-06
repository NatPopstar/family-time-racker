import { describe, it, expect } from 'vitest'
import { plannedTimeHintKey } from './plannedTimeHint'
import { ru, en } from '@/lib/i18n'

/** Все категории, которые есть в базе. */
const SLUGS = ['work', 'study', 'household', 'childcare', 'admin']

describe('подсказка под полем времени', () => {
  it('у каждой категории своя', () => {
    const keys = SLUGS.map(plannedTimeHintKey)
    // Одинаковых быть не должно: смысл затеи в том, чтобы объяснять
    // правило на примере того, что человек сейчас записывает.
    expect(new Set(keys).size).toBe(SLUGS.length)
  })

  it('для «Ребёнка» говорит про занятие, а не про уборку', () => {
    const key = plannedTimeHintKey('childcare')
    expect(ru[key]).toContain('ребёнок')
  })

  it('для «Работы» про ребёнка не упоминает', () => {
    // Ровно та нелепость, из-за которой подсказки и разделили:
    // общая фраза про ребёнка на «Работе» выглядела глупо.
    const key = plannedTimeHintKey('work')
    expect(ru[key]).not.toContain('ребён')
  })

  it('без выбранной категории даёт общую формулировку', () => {
    expect(plannedTimeHintKey(undefined)).toBe('planner.plannedTimeHint.default')
    expect(plannedTimeHintKey('')).toBe('planner.plannedTimeHint.default')
  })

  it('незнакомая категория не роняет форму, а берёт общую', () => {
    // Появится шестая категория — подсказка будет общей, но верной,
    // а не пустой строкой на месте объяснения.
    expect(plannedTimeHintKey('garden')).toBe('planner.plannedTimeHint.default')
  })

  it('каждая подсказка переведена на оба языка', () => {
    for (const slug of [...SLUGS, undefined]) {
      const key = plannedTimeHintKey(slug)
      expect(ru[key], `нет русского для ${key}`).toBeTruthy()
      expect(en[key], `нет английского для ${key}`).toBeTruthy()
    }
  })
})
