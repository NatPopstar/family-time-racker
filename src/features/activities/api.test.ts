import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import type { SubcategoryWithRate } from '@/features/categories/api'

/**
 * Подделка запроса к Supabase.
 *
 * Настоящий запрос — это «цепочка»: .select().gte().lte().order().eq(),
 * где каждый вызов возвращает тот же объект, а в конце его можно
 * дождаться через await. Поэтому наш поддельный объект тоже возвращает
 * сам себя из каждого метода и умеет then — это и делает его «ожидаемым».
 *
 * Первая версия этой подделки была плоской и развалилась именно там,
 * где фильтр по пользователю применяется ПОСЛЕ сортировки.
 */
let queryResult: { data: unknown; error: unknown } = { data: [], error: null }

const mockSelect = vi.fn()
const mockGte = vi.fn()
const mockLte = vi.fn()
const mockOrder = vi.fn()
const mockEq = vi.fn()
const mockNot = vi.fn()
const mockLimit = vi.fn()
const mockMaybeSingle = vi.fn()
const mockInsert = vi.fn()
const mockUpdate = vi.fn()
const mockDelete = vi.fn()

const builder = {
  select: (...a: unknown[]) => (mockSelect(...a), builder),
  gte: (...a: unknown[]) => (mockGte(...a), builder),
  lte: (...a: unknown[]) => (mockLte(...a), builder),
  order: (...a: unknown[]) => (mockOrder(...a), builder),
  eq: (...a: unknown[]) => (mockEq(...a), builder),
  not: (...a: unknown[]) => (mockNot(...a), builder),
  limit: (...a: unknown[]) => (mockLimit(...a), builder),
  maybeSingle: (...a: unknown[]) => {
    mockMaybeSingle(...a)
    return Promise.resolve(queryResult)
  },
  delete: (...a: unknown[]) => (mockDelete(...a), builder),
  update: (...a: unknown[]) => (mockUpdate(...a), builder),
  insert: (...a: unknown[]) => {
    mockInsert(...a)
    return Promise.resolve(queryResult)
  },
  // then делает объект «ожидаемым»: await builder вернёт queryResult.
  then: (resolve: (value: unknown) => unknown) => resolve(queryResult),
}

const mockFrom = vi.fn(() => builder)

vi.mock('@/lib/supabase', () => ({
  supabase: { from: (...args: unknown[]) => mockFrom(...(args as [])) },
}))

import {
  buildActivityInsert,
  buildActivityUpdate,
  createActivity,
  updateActivity,
  fetchActivities,
  deleteActivity,
  elapsedMinutes,
  startTimer,
  stopTimer,
  fetchRunningTimer,
  createPlannedActivity,
  completePlannedActivity,
} from './api'

/** Подкатегория со ставкой — уборка по £20/час. */
const cleaning: SubcategoryWithRate = {
  id: 'sub-cleaning',
  category_id: 'cat-household',
  rate_id: 'rate-cleaning',
  name: 'Уборка',
  sort_order: 1,
  is_active: true,
  market_rates: { name: 'Cleaning', hourly_rate: 20, currency: 'GBP', is_earnings: false },
}

/** Подкатегория без ставки — оплачиваемая работа. */
const paidWork: SubcategoryWithRate = {
  id: 'sub-work',
  category_id: 'cat-work',
  rate_id: null,
  name: 'Основная работа',
  sort_order: 1,
  is_active: true,
  market_rates: null,
}

/** Подкатегория со ставкой-ЗАРПЛАТОЙ — настоящие деньги, а не оценка. */
const salary: SubcategoryWithRate = {
  id: 'sub-work1',
  category_id: 'cat-work',
  rate_id: 'rate-work1',
  name: 'Работа Andrei (инвест)',
  sort_order: 1,
  is_active: true,
  market_rates: {
    name: 'Работа Andrei (инвест)',
    hourly_rate: 47.45,
    currency: 'EUR',
    is_earnings: true,
  },
}

const baseInput = {
  userId: 'user-1',
  title: 'Уборка кухни',
  date: '2026-09-03',
  actualMinutes: 90,
}

describe('buildActivityInsert: «заморозка» ставки', () => {
  it('копирует ставку в запись', () => {
    // Это защита истории: изменение ставки в настройках
    // не должно переписывать прошлые отчёты.
    const row = buildActivityInsert({ ...baseInput, subcategory: cleaning })

    expect(row.rate_snapshot).toBe(20)
    expect(row.currency_snapshot).toBe('GBP')
  })

  it('оставляет ставку пустой, если работа не оценивается деньгами', () => {
    const row = buildActivityInsert({
      ...baseInput,
      subcategory: paidWork,
      title: 'Работа над проектом',
    })

    expect(row.rate_snapshot).toBeNull()
    expect(row.currency_snapshot).toBeNull()
  })

  it('записывает задачу сразу выполненной', () => {
    const row = buildActivityInsert({ ...baseInput, subcategory: cleaning })

    expect(row.status).toBe('done')
    expect(row.completed_at).toBeTruthy()
    expect(row.actual_minutes).toBe(90)
  })

  it('не заполняет плановое время', () => {
    // План и факт — разные поля. Запись «сделал» не должна
    // притворяться, что это было запланировано.
    const row = buildActivityInsert({ ...baseInput, subcategory: cleaning })

    expect(row.planned_minutes).toBeUndefined()
  })

  it('обрезает лишние пробелы в названии', () => {
    const row = buildActivityInsert({
      ...baseInput,
      subcategory: cleaning,
      title: '   Уборка кухни   ',
    })

    expect(row.title).toBe('Уборка кухни')
  })

  it('пустой комментарий сохраняет как null, а не пустую строку', () => {
    // Одно значение «ничего нет» вместо двух разных упрощает
    // все последующие проверки.
    expect(buildActivityInsert({ ...baseInput, subcategory: cleaning, comment: '   ' }).comment)
      .toBeNull()
    expect(buildActivityInsert({ ...baseInput, subcategory: cleaning }).comment).toBeNull()
  })

  it('сохраняет непустой комментарий', () => {
    const row = buildActivityInsert({
      ...baseInput,
      subcategory: cleaning,
      comment: ' генеральная уборка ',
    })

    expect(row.comment).toBe('генеральная уборка')
  })

  it('связывает запись с автором и видом работы', () => {
    const row = buildActivityInsert({ ...baseInput, subcategory: cleaning })

    expect(row.user_id).toBe('user-1')
    expect(row.subcategory_id).toBe('sub-cleaning')
    expect(row.date).toBe('2026-09-03')
  })
})

describe('признак заработка едет вместе со ставкой', () => {
  /**
   * Зарплата и оценка неоплачиваемого труда — два разных смысла,
   * и приложение существует ради того, чтобы их не путать.
   * Пока признак не копировался, зарплата мужа попадала в «оценку
   * стоимости труда»: 2359 евро реальных денег складывались с тем,
   * во сколько обошлось бы нанять человека вместо жены.
   */
  it('зарплата помечается заработком', () => {
    const row = buildActivityInsert({ ...baseInput, subcategory: salary })
    expect(row.is_earnings_snapshot).toBe(true)
  })

  it('домашний труд заработком НЕ помечается', () => {
    const row = buildActivityInsert({ ...baseInput, subcategory: cleaning })
    expect(row.is_earnings_snapshot).toBe(false)
  })

  it('без ставки заработком тоже не помечается', () => {
    const row = buildActivityInsert({ ...baseInput, subcategory: paidWork })
    expect(row.is_earnings_snapshot).toBe(false)
  })

  it('при смене вида работы признак берётся у нового', () => {
    // Записали как уборку, оказалось — рабочие часы.
    const row = buildActivityUpdate({
      ...baseInput,
      previousSubcategoryId: 'sub-cleaning',
      subcategory: salary,
    })
    expect(row.is_earnings_snapshot).toBe(true)
  })
})

describe('buildActivityUpdate: правка записи', () => {
  const editBase = {
    title: 'Уборка кухни',
    date: '2026-09-03',
    actualMinutes: 120,
    previousSubcategoryId: 'sub-cleaning',
  }

  it('НЕ трогает ставку, если вид работы не менялся', () => {
    // Самое важное правило правки: исправление опечатки в минутах
    // не должно пересчитывать старую запись по сегодняшней ставке.
    const row = buildActivityUpdate({ ...editBase, subcategory: cleaning })

    expect(row).not.toHaveProperty('rate_snapshot')
    expect(row).not.toHaveProperty('currency_snapshot')
    expect(row.actual_minutes).toBe(120)
  })

  it('берёт новую ставку, если вид работы поменяли', () => {
    // Была уборка (£20), оказалась готовка (£35) — прежняя ставка
    // относилась к другой профессии и больше не имеет смысла.
    const cooking = {
      ...cleaning,
      id: 'sub-cooking',
      name: 'Приготовление еды',
      market_rates: { name: 'Private Chef', hourly_rate: 35, currency: 'GBP', is_earnings: false },
    }

    const row = buildActivityUpdate({ ...editBase, subcategory: cooking })

    expect(row.rate_snapshot).toBe(35)
    expect(row.currency_snapshot).toBe('GBP')
    expect(row.subcategory_id).toBe('sub-cooking')
  })

  it('обнуляет ставку при переходе на работу без денежной оценки', () => {
    const row = buildActivityUpdate({ ...editBase, subcategory: paidWork })

    expect(row.rate_snapshot).toBeNull()
    expect(row.currency_snapshot).toBeNull()
  })

  it('обрезает пробелы и превращает пустой комментарий в null', () => {
    const row = buildActivityUpdate({
      ...editBase,
      subcategory: cleaning,
      title: '  Уборка ванной  ',
      comment: '   ',
    })

    expect(row.title).toBe('Уборка ванной')
    expect(row.comment).toBeNull()
  })
})

describe('updateActivity', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    queryResult = { data: null, error: null }
  })

  it('обновляет запись по идентификатору', async () => {
    await updateActivity('activity-1', {
      title: 'Уборка кухни',
      date: '2026-09-03',
      actualMinutes: 120,
      previousSubcategoryId: 'sub-cleaning',
      subcategory: cleaning,
    })

    expect(mockFrom).toHaveBeenCalledWith('activities')
    expect(mockUpdate).toHaveBeenCalled()
    expect(mockEq).toHaveBeenCalledWith('id', 'activity-1')
  })

  it('сообщает об ошибке правки', async () => {
    queryResult = { data: null, error: { message: 'чужая запись' } }

    await expect(
      updateActivity('activity-1', {
        title: 'Уборка',
        date: '2026-09-03',
        actualMinutes: 60,
        previousSubcategoryId: 'sub-cleaning',
        subcategory: cleaning,
      }),
    ).rejects.toThrow('чужая запись')
  })
})

describe('createActivity', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    queryResult = { data: [], error: null }
  })

  it('сохраняет запись в таблицу activities', async () => {
    await createActivity({ ...baseInput, subcategory: cleaning })

    expect(mockFrom).toHaveBeenCalledWith('activities')
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Уборка кухни', rate_snapshot: 20 }),
    )
  })

  it('превращает ошибку Supabase в исключение', async () => {
    queryResult = { data: null, error: { message: 'нет прав' } }

    await expect(createActivity({ ...baseInput, subcategory: cleaning })).rejects.toThrow(
      'нет прав',
    )
  })
})

describe('fetchActivities', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    queryResult = { data: [], error: null }
  })

  it('берёт данные из представления с посчитанной стоимостью', async () => {
    await fetchActivities({ from: '2026-09-01', to: '2026-09-07' })

    // Не из таблицы activities: во view уже посчитана стоимость
    // и подставлены названия категорий.
    expect(mockFrom).toHaveBeenCalledWith('v_activity_value')
    expect(mockGte).toHaveBeenCalledWith('date', '2026-09-01')
    expect(mockLte).toHaveBeenCalledWith('date', '2026-09-07')
  })

  it('фильтрует по пользователю, когда он указан', async () => {
    await fetchActivities({ from: '2026-09-01', to: '2026-09-07', userId: 'user-1' })

    expect(mockEq).toHaveBeenCalledWith('user_id', 'user-1')
  })

  it('по умолчанию берёт только выполненные записи', async () => {
    // Иначе в списке появился бы идущий сейчас таймер:
    // он лежит в той же таблице со статусом planned и нулём минут.
    await fetchActivities({ from: '2026-09-01', to: '2026-09-07' })

    expect(mockEq).toHaveBeenCalledWith('status', 'done')
  })

  it('умеет вернуть записи любого статуса', async () => {
    await fetchActivities({ from: '2026-09-01', to: '2026-09-07', status: 'all' })

    expect(mockEq).not.toHaveBeenCalledWith('status', expect.anything())
  })

  it('умеет вернуть запланированные записи для Планера', async () => {
    await fetchActivities({ from: '2026-09-01', to: '2026-09-07', status: 'planned' })

    expect(mockEq).toHaveBeenCalledWith('status', 'planned')
  })

  it('без указания пользователя возвращает записи всей семьи', async () => {
    await fetchActivities({ from: '2026-09-01', to: '2026-09-07' })

    // Проверяем именно отсутствие фильтра по пользователю: фильтр
    // по статусу при этом ставится всегда, поэтому «eq вообще не звали»
    // здесь уже не годится.
    expect(mockEq).not.toHaveBeenCalledWith('user_id', expect.anything())
  })

  it('возвращает пустой список, если база прислала null', async () => {
    queryResult = { data: null, error: null }

    await expect(fetchActivities({ from: '2026-09-01', to: '2026-09-07' })).resolves.toEqual([])
  })

  it('превращает ошибку Supabase в исключение', async () => {
    queryResult = { data: null, error: { message: 'нет доступа' } }

    await expect(fetchActivities({ from: '2026-09-01', to: '2026-09-07' })).rejects.toThrow(
      'нет доступа',
    )
  })
})

describe('createPlannedActivity', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    queryResult = { data: null, error: null }
  })

  it('заполняет план, но не факт и не ставку', async () => {
    await createPlannedActivity({
      userId: 'user-1',
      subcategoryId: 'sub-cleaning',
      title: '  Уборка ванной  ',
      date: '2026-09-04',
      plannedMinutes: 60,
    })

    const row = mockInsert.mock.calls[0][0]
    expect(row.planned_minutes).toBe(60)
    expect(row.status).toBe('planned')
    expect(row.title).toBe('Уборка ванной')
    // Работа ещё не сделана: ни факта, ни ставки быть не должно.
    expect(row.actual_minutes).toBeUndefined()
    expect(row.rate_snapshot).toBeUndefined()
  })
})

describe('completePlannedActivity', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    queryResult = { data: null, error: null }
  })

  it('пишет факт и замораживает ставку, НЕ трогая план', async () => {
    await completePlannedActivity({
      activityId: 'act-1',
      actualMinutes: 100,
      subcategory: cleaning,
    })

    const row = mockUpdate.mock.calls[0][0]
    expect(row.actual_minutes).toBe(100)
    expect(row.status).toBe('done')
    expect(row.rate_snapshot).toBe(20)
    // Главное: план остаётся нетронутым, иначе сравнивать
    // «планировали час — вышло час сорок» станет не с чем.
    expect(row).not.toHaveProperty('planned_minutes')
  })

  it('не ставит ставку работе без денежной оценки', async () => {
    await completePlannedActivity({
      activityId: 'act-1',
      actualMinutes: 480,
      subcategory: paidWork,
    })

    expect(mockUpdate.mock.calls[0][0].rate_snapshot).toBeNull()
  })
})

describe('elapsedMinutes: сколько натикал таймер', () => {
  const started = '2026-09-03T10:00:00.000Z'

  it('считает целые минуты', () => {
    expect(elapsedMinutes(started, new Date('2026-09-03T11:30:00.000Z'))).toBe(90)
  })

  it('округляет вверх неполную минуту', () => {
    // 5 минут 10 секунд -> 6 минут. Округление вниз выглядело бы
    // как потеря времени: человек работал, а минута пропала.
    expect(elapsedMinutes(started, new Date('2026-09-03T10:05:10.000Z'))).toBe(6)
  })

  it('никогда не даёт ноль', () => {
    // Запустил и сразу остановил — запись с нулём выглядела бы
    // как поломка приложения.
    expect(elapsedMinutes(started, new Date('2026-09-03T10:00:05.000Z'))).toBe(1)
    expect(elapsedMinutes(started, new Date('2026-09-03T10:00:00.000Z'))).toBe(1)
  })

  it('не уходит в минус, если часы перевели назад', () => {
    expect(elapsedMinutes(started, new Date('2026-09-03T09:00:00.000Z'))).toBe(1)
  })

  it('справляется с длинным таймером', () => {
    expect(elapsedMinutes(started, new Date('2026-09-03T18:00:00.000Z'))).toBe(480)
  })
})

describe('startTimer', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    queryResult = { data: null, error: null }
  })

  it('создаёт запись со временем старта и статусом «запланировано»', async () => {
    await startTimer({
      userId: 'user-1',
      subcategoryId: 'sub-cleaning',
      title: '  Уборка ванной  ',
      date: '2026-09-03',
    })

    const row = mockInsert.mock.calls[0][0]
    expect(row.timer_started_at).toBeTruthy()
    expect(row.status).toBe('planned')
    expect(row.title).toBe('Уборка ванной')
    // Фактического времени ещё нет — работа только началась.
    expect(row.actual_minutes).toBeUndefined()
    // И ставки тоже нет: её замораживаем в момент остановки.
    expect(row.rate_snapshot).toBeUndefined()
  })

  it('сообщает об ошибке', async () => {
    queryResult = { data: null, error: { message: 'нет прав' } }

    await expect(
      startTimer({ userId: 'u', subcategoryId: 's', title: 'x', date: '2026-09-03' }),
    ).rejects.toThrow('нет прав')
  })
})

describe('stopTimer', () => {
  // Замораживаем «сейчас»: иначе между вычислением времени старта
  // и вызовом функции проходят миллисекунды, округление вверх
  // превращает 90 минут в 91, и тест падает через раз.
  const now = new Date('2026-09-03T12:00:00.000Z')

  beforeEach(() => {
    vi.clearAllMocks()
    queryResult = { data: null, error: null }
    vi.useFakeTimers()
    vi.setSystemTime(now)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('замораживает ставку именно при остановке', async () => {
    await stopTimer({
      activityId: 'act-1',
      startedAt: '2026-09-03T10:30:00.000Z',
      subcategory: cleaning,
    })

    const row = mockUpdate.mock.calls[0][0]
    expect(row.rate_snapshot).toBe(20)
    expect(row.currency_snapshot).toBe('GBP')
    expect(row.status).toBe('done')
    expect(row.actual_minutes).toBe(90)
    // Признак «идёт» снимаем, иначе таймер остался бы вечным.
    expect(row.timer_started_at).toBeNull()
  })

  it('не ставит ставку работе без денежной оценки', async () => {
    await stopTimer({
      activityId: 'act-1',
      startedAt: '2026-09-03T11:00:00.000Z',
      subcategory: paidWork,
    })

    const row = mockUpdate.mock.calls[0][0]
    expect(row.rate_snapshot).toBeNull()
    expect(row.actual_minutes).toBe(60)
  })
})

describe('fetchRunningTimer', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    queryResult = { data: null, error: null }
  })

  it('ищет запись с непустым временем старта', async () => {
    await fetchRunningTimer('user-1')

    expect(mockEq).toHaveBeenCalledWith('user_id', 'user-1')
    expect(mockNot).toHaveBeenCalledWith('timer_started_at', 'is', null)
    expect(mockLimit).toHaveBeenCalledWith(1)
  })

  it('возвращает null, если таймер не запущен', async () => {
    await expect(fetchRunningTimer('user-1')).resolves.toBeNull()
  })
})

describe('deleteActivity', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    queryResult = { data: null, error: null }
  })

  it('удаляет запись по идентификатору', async () => {
    await deleteActivity('activity-1')

    expect(mockDelete).toHaveBeenCalled()
    expect(mockEq).toHaveBeenCalledWith('id', 'activity-1')
  })

  it('сообщает об ошибке удаления', async () => {
    queryResult = { data: null, error: { message: 'запись не найдена' } }

    await expect(deleteActivity('activity-1')).rejects.toThrow('запись не найдена')
  })
})
