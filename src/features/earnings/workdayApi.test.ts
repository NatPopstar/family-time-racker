import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockRpc = vi.fn()

vi.mock('@/lib/supabase', () => ({
  supabase: { rpc: (...args: unknown[]) => mockRpc(...args) },
}))

import { fillWorkdays } from './workdayApi'

describe('fillWorkdays', () => {
  beforeEach(() => vi.clearAllMocks())

  it('зовёт функцию базы, а не пишет записи сам', async () => {
    // Записи создаются на имя другого человека, а обычные правила это
    // запрещают: каждый пишет только за себя. Исключение сделано ровно
    // для этой функции в базе — из приложения так писать нельзя.
    mockRpc.mockResolvedValue({ data: 4, error: null })

    await fillWorkdays()

    expect(mockRpc).toHaveBeenCalledWith('fill_workdays')
  })

  it('возвращает число созданных записей', async () => {
    mockRpc.mockResolvedValue({ data: 4, error: null })

    expect(await fillWorkdays()).toBe(4)
  })

  it('ноль созданных — это нормально, а не ошибка', async () => {
    // Так бывает каждый второй запуск: всё уже заполнено.
    mockRpc.mockResolvedValue({ data: 0, error: null })

    expect(await fillWorkdays()).toBe(0)
  })

  it('странный ответ не роняет приложение', async () => {
    // Сбой подсчёта не должен мешать работать: число нужно только
    // чтобы понять, обновлять ли списки на экране.
    mockRpc.mockResolvedValue({ data: null, error: null })

    expect(await fillWorkdays()).toBe(0)
  })

  it('об отказе базы сообщает', async () => {
    // Например, если запускает ребёнок: функция такое запрещает.
    mockRpc.mockResolvedValue({
      data: null,
      error: { message: 'Заполнять рабочие дни может только взрослый' },
    })

    await expect(fillWorkdays()).rejects.toThrow('только взрослый')
  })
})
