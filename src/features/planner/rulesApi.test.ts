import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { RecurringRule } from '@/types/models'

let queryResult: { data: unknown; error: unknown } = { data: [], error: null }

const mockSelect = vi.fn()
const mockOrder = vi.fn()
const mockEq = vi.fn()
const mockUpdate = vi.fn()
const mockInsert = vi.fn()
const mockUpsert = vi.fn()

const builder = {
  select: (...a: unknown[]) => (mockSelect(...a), builder),
  order: (...a: unknown[]) => (mockOrder(...a), builder),
  eq: (...a: unknown[]) => (mockEq(...a), builder),
  update: (...a: unknown[]) => (mockUpdate(...a), builder),
  insert: (...a: unknown[]) => {
    mockInsert(...a)
    return Promise.resolve(queryResult)
  },
  upsert: (...a: unknown[]) => {
    mockUpsert(...a)
    return Promise.resolve(queryResult)
  },
  then: (resolve: (value: unknown) => unknown) => resolve(queryResult),
}

const mockFrom = vi.fn(() => builder)

vi.mock('@/lib/supabase', () => ({
  supabase: { from: (...args: unknown[]) => mockFrom(...(args as [])) },
}))

import {
  fetchRecurringRules,
  createRecurringRule,
  deactivateRecurringRule,
  materialiseRules,
  claimActivity,
} from './rulesApi'

/** Неделя с понедельника 31 августа по воскресенье 6 сентября. */
const days = [
  '2026-08-31',
  '2026-09-01',
  '2026-09-02',
  '2026-09-03',
  '2026-09-04',
  '2026-09-05',
  '2026-09-06',
]

/** Правило: каждую субботу занятие у Саши, ехать 30 минут. */
function saturdayRule(over: Partial<RecurringRule> = {}): RecurringRule {
  return {
    id: 'rule-1',
    created_by: 'mama',
    subcategory_id: 'sub-math',
    title: 'Занятие у Саши',
    address: 'ул. Ленина 5',
    weekday: 6,
    planned_minutes: 60,
    travel_minutes: 30,
    default_user_id: null,
    is_active: true,
    created_at: '2026-09-01T00:00:00Z',
    ...over,
  } as RecurringRule
}

describe('fetchRecurringRules', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    queryResult = { data: [], error: null }
  })

  it('берёт только действующие правила', async () => {
    await fetchRecurringRules()

    expect(mockFrom).toHaveBeenCalledWith('recurring_rules')
    expect(mockEq).toHaveBeenCalledWith('is_active', true)
  })
})

describe('createRecurringRule', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    queryResult = { data: null, error: null }
  })

  it('сохраняет день недели, адрес и время в дороге', async () => {
    await createRecurringRule({
      createdBy: 'mama',
      subcategoryId: 'sub-math',
      title: '  Занятие у Саши  ',
      address: '  ул. Ленина 5  ',
      weekday: 6,
      plannedMinutes: 60,
      travelMinutes: 30,
      defaultUserId: null,
    })

    const row = mockInsert.mock.calls[0][0]
    expect(row.title).toBe('Занятие у Саши')
    expect(row.address).toBe('ул. Ленина 5')
    expect(row.weekday).toBe(6)
    expect(row.travel_minutes).toBe(30)
    // NULL — задача будет появляться ничьей.
    expect(row.default_user_id).toBeNull()
  })
})

describe('deactivateRecurringRule', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    queryResult = { data: null, error: null }
  })

  it('выключает правило, а не удаляет его', async () => {
    // Удаление оборвало бы связь с уже созданными задачами.
    await deactivateRecurringRule('rule-1')

    expect(mockUpdate).toHaveBeenCalledWith({ is_active: false })
    expect(mockEq).toHaveBeenCalledWith('id', 'rule-1')
  })
})

describe('materialiseRules: подстановка задач в дни недели', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    queryResult = { data: null, error: null }
  })

  it('ставит субботнее правило на СУББОТУ', async () => {
    await materialiseRules({ rules: [saturdayRule()], days })

    const rows = mockUpsert.mock.calls[0][0]
    expect(rows).toHaveLength(1)
    // weekday 6 — суббота, шестой день недели с понедельника.
    expect(rows[0].date).toBe('2026-09-05')
  })

  it('понедельник это первый день, воскресенье — седьмой', async () => {
    await materialiseRules({
      rules: [saturdayRule({ id: 'r1', weekday: 1 }), saturdayRule({ id: 'r2', weekday: 7 })],
      days,
    })

    const rows = mockUpsert.mock.calls[0][0]
    expect(rows[0].date).toBe('2026-08-31')
    expect(rows[1].date).toBe('2026-09-06')
  })

  it('переносит адрес и время в дороге в задачу', async () => {
    await materialiseRules({ rules: [saturdayRule()], days })

    const row = mockUpsert.mock.calls[0][0][0]
    expect(row.address).toBe('ул. Ленина 5')
    expect(row.travel_minutes).toBe(30)
    expect(row.planned_minutes).toBe(60)
    expect(row.status).toBe('planned')
  })

  it('без назначенного делает задачу НИЧЬЕЙ', async () => {
    // Главное в сценарии: родители не договорились заранее,
    // поэтому задача появляется без хозяина.
    await materialiseRules({ rules: [saturdayRule({ default_user_id: null })], days })

    expect(mockUpsert.mock.calls[0][0][0].user_id).toBeNull()
  })

  it('назначенное правило сразу отдаёт задачу человеку', async () => {
    await materialiseRules({ rules: [saturdayRule({ default_user_id: 'papa' })], days })

    expect(mockUpsert.mock.calls[0][0][0].user_id).toBe('papa')
  })

  it('просит базу молча пропускать дубли', async () => {
    // Защита от повторного создания: Планер открывают много раз,
    // и каждый раз правило пытается подставить ту же задачу.
    await materialiseRules({ rules: [saturdayRule()], days })

    expect(mockUpsert.mock.calls[0][1]).toEqual({
      onConflict: 'recurring_rule_id,date',
      ignoreDuplicates: true,
    })
  })

  it('связывает задачу с правилом', async () => {
    await materialiseRules({ rules: [saturdayRule()], days })

    expect(mockUpsert.mock.calls[0][0][0].recurring_rule_id).toBe('rule-1')
  })

  it('без правил в базу не ходит', async () => {
    await materialiseRules({ rules: [], days })

    expect(mockUpsert).not.toHaveBeenCalled()
  })
})

describe('claimActivity', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    queryResult = { data: null, error: null }
  })

  it('назначает ничью задачу на человека', async () => {
    await claimActivity({ activityId: 'act-1', userId: 'papa' })

    expect(mockUpdate).toHaveBeenCalledWith({ user_id: 'papa' })
    expect(mockEq).toHaveBeenCalledWith('id', 'act-1')
  })

  it('сообщает об отказе базы', async () => {
    // Забрать общую задачу может только взрослый — это проверяет RLS.
    queryResult = { data: null, error: { message: 'нет прав' } }

    await expect(claimActivity({ activityId: 'act-1', userId: 'kid' })).rejects.toThrow('нет прав')
  })
})
