import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * Модуль supabase.ts выполняет проверку прямо при импорте.
 * Поэтому импортируем его здесь динамически (await import) — так мы можем
 * сначала подменить переменные окружения, а потом загрузить модуль заново.
 *
 * vi.resetModules() стирает кэш импортов: без него второй import вернул бы
 * уже загруженную копию, и подмена переменных не подействовала бы.
 */
describe('клиент Supabase', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.unstubAllEnvs()
  })

  it('создаётся, когда переменные окружения заданы', async () => {
    vi.stubEnv('VITE_SUPABASE_URL', 'http://localhost:54321')
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'test-anon-key')

    const { supabase } = await import('./supabase')

    expect(supabase).toBeDefined()
    expect(supabase.auth).toBeDefined()
    expect(supabase.from).toBeTypeOf('function')
  })

  it('падает с понятной ошибкой, если не задан адрес', async () => {
    vi.stubEnv('VITE_SUPABASE_URL', '')
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'test-anon-key')

    // Ошибка должна называть конкретный файл, а не быть загадочной.
    await expect(import('./supabase')).rejects.toThrow(/\.env\.local/)
  })

  it('падает с понятной ошибкой, если не задан ключ', async () => {
    vi.stubEnv('VITE_SUPABASE_URL', 'http://localhost:54321')
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', '')

    await expect(import('./supabase')).rejects.toThrow(/VITE_SUPABASE_ANON_KEY/)
  })
})
