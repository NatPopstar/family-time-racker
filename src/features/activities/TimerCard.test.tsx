import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '@/test/renderWithProviders'
import { TimerCard } from './TimerCard'

vi.mock('@/features/auth/AuthProvider', () => ({
  useAuth: vi.fn(() => ({
    session: {} as never,
    user: { id: 'user-1', email: 'mama@example.com', user_metadata: {} } as never,
    isLoading: false,
  })),
  AuthProvider: ({ children }: { children: React.ReactNode }) => children,
}))

vi.mock('@/features/categories/api', () => ({
  fetchCategories: vi.fn(),
  fetchSubcategories: vi.fn(),
  fetchSubcategoriesWithRates: vi.fn(),
}))

vi.mock('./api', async () => {
  const actual = await vi.importActual<typeof import('./api')>('./api')
  return {
    // elapsedMinutes — чистая функция, берём настоящую:
    // тогда тест проверяет и подсчёт времени тоже.
    elapsedMinutes: actual.elapsedMinutes,
    startTimer: vi.fn(),
    stopTimer: vi.fn(),
    fetchRunningTimer: vi.fn(),
    deleteActivity: vi.fn(),
  }
})

import { fetchCategories, fetchSubcategoriesWithRates } from '@/features/categories/api'
import { startTimer, stopTimer, fetchRunningTimer, deleteActivity } from './api'

const categories = [
  { id: 'cat-household', slug: 'household', name: 'Домашние обязанности', icon: '🏠', sort_order: 3 },
]

const subcategories = [
  {
    id: 'sub-cleaning',
    category_id: 'cat-household',
    rate_id: 'rate-cleaning',
    name: 'Уборка',
    sort_order: 1,
    is_active: true,
    market_rates: { name: 'Cleaning', hourly_rate: 20, currency: 'GBP' },
  },
]

/**
 * Идущий таймер, показывающий ровно 45 минут.
 *
 * Старт берём на 10 секунд ПОЗЖЕ круглых 45 минут назад.
 * Причина: elapsedMinutes округляет вверх, и ровно 45 минут назад
 * за время выполнения теста успевают превратиться в 45.001 → 46.
 * Со сдвигом получается 44.8 минуты, что округляется в устойчивые 45.
 */
function runningTimer() {
  return {
    id: 'act-running',
    user_id: 'user-1',
    title: 'Уборка ванной',
    date: '2026-09-03',
    comment: null,
    planned_minutes: null,
    actual_minutes: null,
    status: 'planned',
    completed_at: null,
    subcategory_id: 'sub-cleaning',
    subcategory_name: 'Уборка',
    category_id: 'cat-household',
    category_slug: 'household',
    category_name: 'Домашние обязанности',
    rate_snapshot: null,
    currency_snapshot: null,
    value: 0,
    timer_started_at: new Date(Date.now() - (45 * 60_000 - 10_000)).toISOString(),
  }
}

describe('TimerCard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
    vi.mocked(fetchCategories).mockResolvedValue(categories)
    vi.mocked(fetchSubcategoriesWithRates).mockResolvedValue(subcategories)
    vi.mocked(fetchRunningTimer).mockResolvedValue(null)
    vi.mocked(startTimer).mockResolvedValue(undefined)
    vi.mocked(stopTimer).mockResolvedValue(undefined)
    vi.mocked(deleteActivity).mockResolvedValue(undefined)
  })

  it('без запущенного таймера показывает форму запуска', async () => {
    renderWithProviders(<TimerCard />)

    expect(await screen.findByRole('button', { name: /Запустить/ })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Остановить/ })).not.toBeInTheDocument()
  })

  it('запускает таймер с выбранным видом работы', async () => {
    const user = userEvent.setup()
    renderWithProviders(<TimerCard />)

    await screen.findByRole('option', { name: /Домашние обязанности/ })
    await user.selectOptions(screen.getByLabelText('Категория'), 'cat-household')
    await user.selectOptions(screen.getByLabelText('Вид работы'), 'sub-cleaning')
    await user.type(screen.getByLabelText('Что делали'), 'Уборка ванной')
    await user.click(screen.getByRole('button', { name: /Запустить/ }))

    await waitFor(() => expect(startTimer).toHaveBeenCalledTimes(1))
    const sent = vi.mocked(startTimer).mock.calls[0][0]
    expect(sent.userId).toBe('user-1')
    expect(sent.subcategoryId).toBe('sub-cleaning')
    expect(sent.title).toBe('Уборка ванной')
  })

  it('требует название перед запуском', async () => {
    const user = userEvent.setup()
    renderWithProviders(<TimerCard />)

    await screen.findByRole('option', { name: /Домашние обязанности/ })
    await user.selectOptions(screen.getByLabelText('Категория'), 'cat-household')
    await user.selectOptions(screen.getByLabelText('Вид работы'), 'sub-cleaning')
    await user.click(screen.getByRole('button', { name: /Запустить/ }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Напишите, что вы делали')
    expect(startTimer).not.toHaveBeenCalled()
  })

  it('требует выбрать вид работы перед запуском', async () => {
    const user = userEvent.setup()
    renderWithProviders(<TimerCard />)

    await screen.findByRole('option', { name: /Домашние обязанности/ })
    await user.type(screen.getByLabelText('Что делали'), 'Уборка ванной')
    await user.click(screen.getByRole('button', { name: /Запустить/ }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Выберите вид работы')
    expect(startTimer).not.toHaveBeenCalled()
  })

  it('показывает идущий таймер и накопленное время', async () => {
    // Главная проверка: таймер запущен 45 минут назад и продолжается,
    // хотя страницу могли перезагрузить — время взято из базы.
    vi.mocked(fetchRunningTimer).mockResolvedValue(runningTimer() as never)
    renderWithProviders(<TimerCard />)

    expect(await screen.findByText('Уборка ванной')).toBeInTheDocument()
    expect(screen.getByText('45 мин')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Остановить/ })).toBeInTheDocument()
    // Формы запуска при идущем таймере быть не должно.
    expect(screen.queryByRole('button', { name: /Запустить/ })).not.toBeInTheDocument()
  })

  it('останавливает таймер и передаёт вид работы для заморозки ставки', async () => {
    const user = userEvent.setup()
    vi.mocked(fetchRunningTimer).mockResolvedValue(runningTimer() as never)
    renderWithProviders(<TimerCard />)

    await user.click(await screen.findByRole('button', { name: /Остановить/ }))

    await waitFor(() => expect(stopTimer).toHaveBeenCalledTimes(1))
    const sent = vi.mocked(stopTimer).mock.calls[0][0]
    expect(sent.activityId).toBe('act-running')
    // Без вида работы ставку заморозить не из чего.
    expect(sent.subcategory.market_rates?.hourly_rate).toBe(20)
  })

  it('отменяет таймер без сохранения записи', async () => {
    const user = userEvent.setup()
    vi.mocked(fetchRunningTimer).mockResolvedValue(runningTimer() as never)
    renderWithProviders(<TimerCard />)

    await user.click(await screen.findByRole('button', { name: 'Отменить' }))

    await waitFor(() => expect(deleteActivity).toHaveBeenCalledTimes(1))
    expect(vi.mocked(deleteActivity).mock.calls[0][0]).toBe('act-running')
    expect(stopTimer).not.toHaveBeenCalled()
  })

  it('объявляет счётчик для программ чтения с экрана', async () => {
    vi.mocked(fetchRunningTimer).mockResolvedValue(runningTimer() as never)
    renderWithProviders(<TimerCard />)

    const counter = await screen.findByText('45 мин')
    // polite, а не assertive: иначе счётчик перебивал бы человека
    // каждую секунду.
    expect(counter).toHaveAttribute('aria-live', 'polite')
  })
})
