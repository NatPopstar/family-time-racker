import { describe, it, expect, vi, beforeEach } from 'vitest'

/**
 * Здесь подменяем сам Supabase, чтобы проверить нашу обёртку над ним:
 * правильно ли мы обрабатываем ответ и, главное, ошибку.
 *
 * Особенность Supabase: при неудаче он НЕ выбрасывает исключение,
 * а возвращает объект { data: null, error }. Легко забыть проверить error
 * и получить пустой список вместо сообщения о проблеме — эти тесты
 * следят, чтобы такого не случилось.
 */

// Заготовка «цепочки» вызовов вида .select().order()
const mockOrder = vi.fn()
const mockEq = vi.fn(() => ({ order: mockOrder }))
const mockSelect = vi.fn(() => ({ order: mockOrder, eq: mockEq }))
const mockFrom = vi.fn(() => ({ select: mockSelect }))

vi.mock('@/lib/supabase', () => ({
  supabase: { from: (...args: unknown[]) => mockFrom(...(args as [])) },
}))

import { fetchCategories, fetchSubcategories } from './api'

describe('fetchCategories', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('возвращает категории из базы', async () => {
    const rows = [{ id: '1', slug: 'work', name: 'Работа', icon: '💼', sort_order: 1 }]
    mockOrder.mockResolvedValue({ data: rows, error: null })

    const result = await fetchCategories()

    expect(result).toEqual(rows)
    expect(mockFrom).toHaveBeenCalledWith('categories')
  })

  it('сортирует по полю sort_order', async () => {
    mockOrder.mockResolvedValue({ data: [], error: null })

    await fetchCategories()

    // Порядок категорий задаём мы, а не база: без явной сортировки
    // PostgreSQL вправе вернуть строки в любом порядке.
    expect(mockOrder).toHaveBeenCalledWith('sort_order', { ascending: true })
  })

  it('превращает ошибку Supabase в исключение', async () => {
    mockOrder.mockResolvedValue({ data: null, error: { message: 'нет связи с базой' } })

    await expect(fetchCategories()).rejects.toThrow('нет связи с базой')
  })

  it('возвращает пустой список, если база прислала null', async () => {
    mockOrder.mockResolvedValue({ data: null, error: null })

    // Важно вернуть [], а не null: иначе компоненты придётся защищать
    // проверкой на null в каждом месте, где они перебирают список.
    await expect(fetchCategories()).resolves.toEqual([])
  })
})

describe('fetchSubcategories', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('запрашивает только активные подкатегории', async () => {
    mockOrder.mockResolvedValue({ data: [], error: null })

    await fetchSubcategories()

    expect(mockFrom).toHaveBeenCalledWith('subcategories')
    // Скрытые подкатегории не должны попадать в выпадающие списки.
    expect(mockEq).toHaveBeenCalledWith('is_active', true)
  })

  it('превращает ошибку Supabase в исключение', async () => {
    mockOrder.mockResolvedValue({ data: null, error: { message: 'таблица не найдена' } })

    await expect(fetchSubcategories()).rejects.toThrow('таблица не найдена')
  })
})
