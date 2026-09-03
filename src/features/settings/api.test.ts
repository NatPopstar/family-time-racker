import { describe, it, expect, vi, beforeEach } from 'vitest'

let queryResult: { data: unknown; error: unknown } = { data: [], error: null }

const mockSelect = vi.fn()
const mockOrder = vi.fn()
const mockEq = vi.fn()
const mockNot = vi.fn()
const mockUpdate = vi.fn()
const mockInsert = vi.fn()

const builder = {
  select: (...a: unknown[]) => (mockSelect(...a), builder),
  order: (...a: unknown[]) => (mockOrder(...a), builder),
  eq: (...a: unknown[]) => (mockEq(...a), builder),
  not: (...a: unknown[]) => (mockNot(...a), builder),
  update: (...a: unknown[]) => (mockUpdate(...a), builder),
  insert: (...a: unknown[]) => {
    mockInsert(...a)
    return Promise.resolve(queryResult)
  },
  then: (resolve: (value: unknown) => unknown) => resolve(queryResult),
}

const mockFrom = vi.fn(() => builder)

vi.mock('@/lib/supabase', () => ({
  supabase: { from: (...args: unknown[]) => mockFrom(...(args as [])) },
}))

import {
  fetchMarketRates,
  updateMarketRate,
  createMarketRate,
  changeCurrency,
  setRateActive,
  createSubcategory,
  setSubcategoryRate,
} from './api'

describe('fetchMarketRates', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    queryResult = { data: [], error: null }
  })

  it('берёт все ставки, включая скрытые', async () => {
    await fetchMarketRates()

    expect(mockFrom).toHaveBeenCalledWith('market_rates')
    // В настройках нужно видеть и выключенные ставки, иначе их
    // невозможно будет включить обратно.
    expect(mockEq).not.toHaveBeenCalledWith('is_active', true)
  })

  it('превращает ошибку в исключение', async () => {
    queryResult = { data: null, error: { message: 'нет доступа' } }
    await expect(fetchMarketRates()).rejects.toThrow('нет доступа')
  })
})

describe('updateMarketRate', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    queryResult = { data: null, error: null }
  })

  it('меняет размер ставки у одной строки', async () => {
    await updateMarketRate({ id: 'rate-1', hourlyRate: 25 })

    expect(mockUpdate).toHaveBeenCalledWith({ hourly_rate: 25 })
    expect(mockEq).toHaveBeenCalledWith('id', 'rate-1')
  })
})

describe('createMarketRate', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    queryResult = { data: null, error: null }
  })

  it('добавляет новую профессию и обрезает пробелы', async () => {
    await createMarketRate({ name: '  Dog Walker  ', hourlyRate: 15, currency: 'GBP' })

    expect(mockInsert).toHaveBeenCalledWith({
      name: 'Dog Walker',
      hourly_rate: 15,
      currency: 'GBP',
    })
  })
})

describe('changeCurrency', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    queryResult = { data: null, error: null }
  })

  it('меняет валюту у всех ставок сразу', async () => {
    await changeCurrency('EUR')

    expect(mockUpdate).toHaveBeenCalledWith({ currency: 'EUR' })
    // Supabase требует хотя бы один фильтр, иначе откажется
    // обновлять таблицу целиком.
    expect(mockNot).toHaveBeenCalledWith('id', 'is', null)
  })
})

describe('setRateActive', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    queryResult = { data: null, error: null }
  })

  it('прячет ставку, не удаляя её', async () => {
    await setRateActive({ id: 'rate-1', isActive: false })

    // Именно скрытие, а не удаление: на удалённую ставку
    // могли бы ссылаться прошлые записи.
    expect(mockUpdate).toHaveBeenCalledWith({ is_active: false })
  })
})

describe('createSubcategory', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    queryResult = { data: null, error: null }
  })

  it('создаёт вид работы со ставкой', async () => {
    await createSubcategory({ categoryId: 'cat-1', name: ' Полив цветов ', rateId: 'rate-1' })

    expect(mockInsert).toHaveBeenCalledWith({
      category_id: 'cat-1',
      name: 'Полив цветов',
      rate_id: 'rate-1',
    })
  })

  it('создаёт вид работы БЕЗ денежной оценки', async () => {
    // Так устроены «Работа» и «Учёба»: null означает
    // «деньгами не оценивается».
    await createSubcategory({ categoryId: 'cat-1', name: 'Совещание', rateId: null })

    expect(mockInsert.mock.calls[0][0].rate_id).toBeNull()
  })
})

describe('setSubcategoryRate', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    queryResult = { data: null, error: null }
  })

  it('привязывает вид работы к другой ставке', async () => {
    await setSubcategoryRate({ subcategoryId: 'sub-1', rateId: 'rate-2' })

    expect(mockUpdate).toHaveBeenCalledWith({ rate_id: 'rate-2' })
    expect(mockEq).toHaveBeenCalledWith('id', 'sub-1')
  })

  it('снимает ставку совсем', async () => {
    await setSubcategoryRate({ subcategoryId: 'sub-1', rateId: null })

    expect(mockUpdate).toHaveBeenCalledWith({ rate_id: null })
  })
})
