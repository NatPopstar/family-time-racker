import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockMaybeSingle = vi.fn()
const mockOrder = vi.fn()
const mockEq = vi.fn(() => ({ maybeSingle: mockMaybeSingle }))
const mockSelect = vi.fn(() => ({ eq: mockEq, order: mockOrder }))
const mockFrom = vi.fn(() => ({ select: mockSelect }))

vi.mock('@/lib/supabase', () => ({
  supabase: { from: (...args: unknown[]) => mockFrom(...(args as [])) },
}))

import { fetchMyProfile, fetchAllProfiles } from './api'

const profile = {
  id: 'user-1',
  display_name: 'Мама',
  color: '#6366f1',
  created_at: '2026-09-01T00:00:00Z',
}

describe('fetchMyProfile', () => {
  beforeEach(() => vi.clearAllMocks())

  it('возвращает профиль по идентификатору пользователя', async () => {
    mockMaybeSingle.mockResolvedValue({ data: profile, error: null })

    await expect(fetchMyProfile('user-1')).resolves.toEqual(profile)
    expect(mockFrom).toHaveBeenCalledWith('profiles')
    expect(mockEq).toHaveBeenCalledWith('id', 'user-1')
  })

  it('возвращает null, а не ошибку, если профиля ещё нет', async () => {
    // Профиль создаёт триггер базы, и в редком случае запрос может
    // прийти раньше. Это не поломка, приложение должно пережить.
    mockMaybeSingle.mockResolvedValue({ data: null, error: null })

    await expect(fetchMyProfile('user-1')).resolves.toBeNull()
  })

  it('превращает ошибку Supabase в исключение', async () => {
    mockMaybeSingle.mockResolvedValue({ data: null, error: { message: 'нет доступа' } })

    await expect(fetchMyProfile('user-1')).rejects.toThrow('нет доступа')
  })
})

describe('fetchAllProfiles', () => {
  beforeEach(() => vi.clearAllMocks())

  it('возвращает всех членов семьи в порядке появления', async () => {
    mockOrder.mockResolvedValue({ data: [profile], error: null })

    await expect(fetchAllProfiles()).resolves.toEqual([profile])
    expect(mockOrder).toHaveBeenCalledWith('created_at', { ascending: true })
  })

  it('возвращает пустой список, если база прислала null', async () => {
    mockOrder.mockResolvedValue({ data: null, error: null })

    await expect(fetchAllProfiles()).resolves.toEqual([])
  })

  it('превращает ошибку Supabase в исключение', async () => {
    mockOrder.mockResolvedValue({ data: null, error: { message: 'таблица недоступна' } })

    await expect(fetchAllProfiles()).rejects.toThrow('таблица недоступна')
  })
})
