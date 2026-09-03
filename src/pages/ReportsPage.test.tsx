import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, within, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '@/test/renderWithProviders'
import { ReportsPage } from './ReportsPage'
import { getWeekRange, getMonthRange } from '@/lib/periods'

vi.mock('@/features/activities/api', () => ({
  fetchActivities: vi.fn(),
}))

vi.mock('@/features/profile/api', () => ({
  fetchAllProfiles: vi.fn(),
  fetchMyProfile: vi.fn(),
}))

import { fetchActivities } from '@/features/activities/api'
import { fetchAllProfiles } from '@/features/profile/api'

const profiles = [
  { id: 'mama', display_name: 'Мама', color: '#6366f1', created_at: '2026-09-01T00:00:00Z' },
  { id: 'papa', display_name: 'Папа', color: '#6366f1', created_at: '2026-09-01T00:00:00Z' },
]

const week = getWeekRange(0)

function entry(over: Record<string, unknown>) {
  return {
    id: Math.random().toString(),
    user_id: 'mama',
    title: 'Задача',
    date: week.from,
    comment: null,
    planned_minutes: null,
    actual_minutes: 60,
    status: 'done',
    completed_at: null,
    timer_started_at: null,
    subcategory_id: 'sub',
    subcategory_name: 'Уборка',
    category_id: 'cat-household',
    category_slug: 'household',
    category_name: 'Домашние обязанности',
    rate_snapshot: 20,
    currency_snapshot: 'GBP',
    value: 20,
    ...over,
  }
}

describe('ReportsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
    vi.mocked(fetchAllProfiles).mockResolvedValue(profiles)
    vi.mocked(fetchActivities).mockResolvedValue([])
  })

  it('по умолчанию показывает недельный отчёт', async () => {
    renderWithProviders(<ReportsPage />)

    const weekButton = await screen.findByRole('button', { name: 'За неделю' })
    // aria-pressed сообщает выбранный режим тем, кто не видит подсветку.
    expect(weekButton).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: 'За месяц' })).toHaveAttribute(
      'aria-pressed',
      'false',
    )
  })

  it('запрашивает границы недели', async () => {
    renderWithProviders(<ReportsPage />)

    await waitFor(() => expect(fetchActivities).toHaveBeenCalled())
    const call = vi.mocked(fetchActivities).mock.calls[0][0]
    expect(call.from).toBe(week.from)
    expect(call.to).toBe(week.to)
  })

  it('переключается на месяц и запрашивает границы месяца', async () => {
    const user = userEvent.setup()
    renderWithProviders(<ReportsPage />)

    await user.click(await screen.findByRole('button', { name: 'За месяц' }))

    await waitFor(() => {
      const last = vi.mocked(fetchActivities).mock.calls.at(-1)![0]
      expect(last.from).toBe(getMonthRange(0).from)
    })
  })

  it('показывает карточку на каждого человека с записями', async () => {
    vi.mocked(fetchActivities).mockResolvedValue([
      entry({ user_id: 'mama', actual_minutes: 300, value: 100 }),
      entry({ user_id: 'papa', actual_minutes: 120, value: 40 }),
    ] as never)

    renderWithProviders(<ReportsPage />)

    expect(await screen.findByRole('heading', { name: 'Мама' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Папа' })).toBeInTheDocument()
  })

  it('считает разбивку по категориям отдельно для каждого человека', async () => {
    vi.mocked(fetchActivities).mockResolvedValue([
      entry({ user_id: 'mama', category_slug: 'household', category_name: 'Дом', actual_minutes: 120 }),
      entry({ user_id: 'papa', category_slug: 'work', category_name: 'Работа', actual_minutes: 480, value: 0 }),
    ] as never)

    renderWithProviders(<ReportsPage />)

    const mamaCard = (await screen.findByRole('heading', { name: 'Мама' })).closest('section')!
    // У мамы только «Дом»; «Работа» — папина и в её карточку попасть не должна.
    expect(within(mamaCard).getByText('Дом')).toBeInTheDocument()
    expect(within(mamaCard).queryByText('Работа')).not.toBeInTheDocument()
  })

  it('показывает Estimated Market Value у каждого', async () => {
    vi.mocked(fetchActivities).mockResolvedValue([
      entry({ user_id: 'mama', actual_minutes: 300, value: 100 }),
    ] as never)

    renderWithProviders(<ReportsPage />)

    const mamaCard = (await screen.findByRole('heading', { name: 'Мама' })).closest('section')!
    expect(within(mamaCard).getByText('Estimated Market Value')).toBeInTheDocument()
  })

  it('подводит итог по семье', async () => {
    vi.mocked(fetchActivities).mockResolvedValue([
      entry({ user_id: 'mama', actual_minutes: 300, value: 100 }),
      entry({ user_id: 'papa', actual_minutes: 120, value: 40 }),
    ] as never)

    renderWithProviders(<ReportsPage />)

    // 300 + 120 = 420 минут = 7 часов
    expect(await screen.findByText('Итого по семье')).toBeInTheDocument()
    expect(screen.getByText('7 ч')).toBeInTheDocument()
  })

  it('не пускает в будущее дальше текущего периода', async () => {
    renderWithProviders(<ReportsPage />)

    // Отчёта о ещё не наступившей неделе не существует.
    expect(await screen.findByRole('button', { name: /Позже/ })).toBeDisabled()
  })

  it('листает назад и разблокирует кнопку «вперёд»', async () => {
    const user = userEvent.setup()
    renderWithProviders(<ReportsPage />)

    await user.click(await screen.findByRole('button', { name: /Раньше/ }))

    expect(screen.getByRole('button', { name: /Позже/ })).toBeEnabled()
    expect(screen.getByRole('button', { name: 'Текущий период' })).toBeInTheDocument()
  })

  it('сбрасывает сдвиг при смене режима', async () => {
    const user = userEvent.setup()
    renderWithProviders(<ReportsPage />)

    await user.click(await screen.findByRole('button', { name: /Раньше/ }))
    await user.click(screen.getByRole('button', { name: 'За месяц' }))

    // «Неделя назад» и «месяц назад» — разное, поэтому сдвиг обнуляем.
    expect(screen.queryByRole('button', { name: 'Текущий период' })).not.toBeInTheDocument()
  })

  it('честно сообщает, что за период записей нет', async () => {
    renderWithProviders(<ReportsPage />)

    expect(await screen.findByText('За этот период записей нет.')).toBeInTheDocument()
  })
})
