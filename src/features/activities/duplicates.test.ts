import { describe, it, expect } from 'vitest'
import type { ActivityWithValue } from '@/types/models'
import {
  significantWords,
  stem,
  titleSimilarity,
  findDuplicates,
  SIMILARITY_THRESHOLD,
} from './duplicates'

const ME = 'mama'
const OTHER = 'papa'
const LOGISTICS = 'sub-logistics'
const CLEANING = 'sub-cleaning'

function activity(over: Partial<ActivityWithValue> = {}): ActivityWithValue {
  return {
    id: 'act-1',
    user_id: ME,
    title: 'Дело',
    date: '2026-09-04',
    status: 'done',
    subcategory_id: LOGISTICS,
    actual_minutes: 30,
    planned_minutes: null,
    ...over,
  } as ActivityWithValue
}

describe('significantWords', () => {
  it('разделяет слова, склеенные знаками препинания', () => {
    expect(significantWords('Отвести/Привести из школы')).toEqual([
      'отвести',
      'привести',
      'школы',
    ])
  })

  it('выбрасывает предлоги и союзы', () => {
    // Иначе «сходить в магазин» совпало бы с «поиграть в мяч».
    expect(significantWords('отвела в школу и забрала')).toEqual([
      'отвела',
      'школу',
      'забрала',
    ])
  })

  it('считает ё и е одной буквой', () => {
    // Одно и то же слово пишут и так, и так.
    expect(significantWords('привёл ребёнка')).toEqual(significantWords('привел ребенка'))
  })

  it('на названии из одних знаков препинания не падает', () => {
    expect(significantWords('   ...   ')).toEqual([])
  })
})

describe('stem', () => {
  it('сводит падежи к одной основе', () => {
    expect(stem('школу')).toBe(stem('школы'))
    expect(stem('отвела')).toBe(stem('отвести'))
  })

  it('короткие слова не режет', () => {
    expect(stem('суп')).toBe('суп')
    expect(stem('мясо')).toBe('мясо')
  })
})

describe('titleSimilarity', () => {
  it('узнаёт один и тот же школьный рейс, названный по-разному', () => {
    // Настоящая пара из базы за 31 августа.
    const value = titleSimilarity(
      'Отвела в школу, забрать из школы, посидеть на собрании',
      'Отвести/Привести из школы',
    )
    expect(value).toBeGreaterThanOrEqual(SIMILARITY_THRESHOLD)
  })

  it('узнаёт короткую запись в подробной', () => {
    const value = titleSimilarity('Отвела/забрала', 'Отвела, забрала из школы')
    expect(value).toBe(1)
  })

  it('не путает разные дела', () => {
    const value = titleSimilarity(
      'Убралась поверхностно по всей квартире',
      'Забрала ребенка из школы',
    )
    expect(value).toBe(0)
  })

  it('пустое название ни на что не похоже', () => {
    expect(titleSimilarity('', 'Уборка кухни')).toBe(0)
  })

  it('порядок слов значения не имеет', () => {
    expect(titleSimilarity('забрала из школы', 'школы забрала')).toBe(1)
  })
})

describe('findDuplicates: незакрытые задачи', () => {
  it('находит запланированную задачу того же вида работы', () => {
    // Главный случай: задача висит невыполненной, а человек
    // записывает то же самое дело заново через форму.
    const planned = activity({
      id: 'planned-1',
      status: 'planned',
      title: 'Отвести/Привести из школы',
      planned_minutes: 60,
      actual_minutes: null,
    })

    const found = findDuplicates({
      title: 'Забрала ребенка из школы',
      date: '2026-09-04',
      subcategoryId: LOGISTICS,
      userId: ME,
      existing: [planned],
    })

    expect(found).toHaveLength(1)
    expect(found[0].kind).toBe('planned')
    expect(found[0].activity.id).toBe('planned-1')
  })

  it('находит запланированную задачу по словам, даже если вид работы другой', () => {
    const planned = activity({
      id: 'planned-2',
      status: 'planned',
      subcategory_id: CLEANING,
      title: 'Отвести в школу',
      actual_minutes: null,
    })

    const found = findDuplicates({
      title: 'Отвела в школу',
      date: '2026-09-04',
      subcategoryId: LOGISTICS,
      userId: ME,
      existing: [planned],
    })

    expect(found).toHaveLength(1)
  })

  it('ничью задачу считает своей', () => {
    // Её может закрыть любой взрослый — значит и предупредить о ней надо.
    const planned = activity({
      id: 'planned-3',
      user_id: null,
      status: 'planned',
      title: 'Отвести на музыку',
      actual_minutes: null,
    })

    const found = findDuplicates({
      title: 'Отвела на музыку',
      date: '2026-09-04',
      subcategoryId: LOGISTICS,
      userId: ME,
      existing: [planned],
    })

    expect(found).toHaveLength(1)
  })

  it('показывает незакрытые задачи ПЕРЕД выполненными', () => {
    // С незакрытой можно что-то сделать — отметить её выполненной.
    // Про выполненную можно только предупредить.
    const existing = [
      activity({ id: 'done-1', title: 'Отвела в школу' }),
      activity({
        id: 'planned-1',
        status: 'planned',
        title: 'Отвести в школу',
        actual_minutes: null,
      }),
    ]

    const found = findDuplicates({
      title: 'Отвела в школу',
      date: '2026-09-04',
      subcategoryId: LOGISTICS,
      userId: ME,
      existing,
    })

    expect(found.map((match) => match.activity.id)).toEqual(['planned-1', 'done-1'])
  })
})

describe('findDuplicates: выполненные записи', () => {
  it('предупреждает о повторной записи того же дела', () => {
    const found = findDuplicates({
      title: 'Готовка обеда',
      date: '2026-09-04',
      subcategoryId: CLEANING,
      userId: ME,
      existing: [activity({ id: 'done-1', title: 'Готовка обеда' })],
    })

    expect(found).toHaveLength(1)
    expect(found[0].kind).toBe('done')
  })

  it('НЕ придирается к одинаковому виду работы при разных словах', () => {
    // Убралась утром и вечером — это два честных дела, а не дубль.
    const found = findDuplicates({
      title: 'Помыла посуду',
      date: '2026-09-04',
      subcategoryId: CLEANING,
      userId: ME,
      existing: [
        activity({ id: 'done-1', subcategory_id: CLEANING, title: 'Пропылесосила спальню' }),
      ],
    })

    expect(found).toEqual([])
  })
})

describe('findDuplicates: что в расчёт не берём', () => {
  it('другой день — не дубль', () => {
    // Одно и то же дело каждый день — это норма, а не ошибка.
    const found = findDuplicates({
      title: 'Отвела в школу',
      date: '2026-09-04',
      subcategoryId: LOGISTICS,
      userId: ME,
      existing: [activity({ date: '2026-09-03', title: 'Отвела в школу' })],
    })

    expect(found).toEqual([])
  })

  it('чужая запись — не дубль', () => {
    // Оба родителя могут по-своему поучаствовать в одном деле.
    const found = findDuplicates({
      title: 'Отвела в школу',
      date: '2026-09-04',
      subcategoryId: LOGISTICS,
      userId: ME,
      existing: [activity({ user_id: OTHER, title: 'Отвела в школу' })],
    })

    expect(found).toEqual([])
  })

  it('сама с собой запись не совпадает', () => {
    // Нужно при правке: иначе форма ругалась бы на запись,
    // которую человек прямо сейчас и редактирует.
    const found = findDuplicates({
      title: 'Отвела в школу',
      date: '2026-09-04',
      subcategoryId: LOGISTICS,
      userId: ME,
      existing: [activity({ id: 'act-1', title: 'Отвела в школу' })],
      excludeId: 'act-1',
    })

    expect(found).toEqual([])
  })

  it('на пустом списке возвращает пусто', () => {
    const found = findDuplicates({
      title: 'Отвела в школу',
      date: '2026-09-04',
      subcategoryId: LOGISTICS,
      userId: ME,
      existing: [],
    })

    expect(found).toEqual([])
  })
})
