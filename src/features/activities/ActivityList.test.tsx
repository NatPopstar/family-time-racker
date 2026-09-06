import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen } from '@testing-library/react'
import { renderWithProviders } from '@/test/renderWithProviders'
import type { ActivityWithValue } from '@/types/models'

vi.mock('@/features/auth/AuthProvider', () => ({
  useAuth: vi.fn(() => ({
    session: {} as never,
    user: { id: 'user-1', email: 'mama@example.com', user_metadata: {} } as never,
    isLoading: false,
  })),
  AuthProvider: ({ children }: { children: React.ReactNode }) => children,
}))

vi.mock('./api', () => ({
  fetchActivities: vi.fn(),
  deleteActivity: vi.fn(),
}))

import { fetchActivities } from './api'
import { ActivityList } from './ActivityList'

function activity(over: Partial<ActivityWithValue> = {}): ActivityWithValue {
  return {
    id: 'act-1',
    user_id: 'user-1',
    title: 'Отвела в школу',
    date: '2026-09-01',
    comment: null,
    planned_minutes: null,
    actual_minutes: 0,
    travel_minutes: 40,
    status: 'done',
    subcategory_id: 'sub-logistics',
    subcategory_name: 'Логистика (отвезти/забрать)',
    category_id: 'cat-child',
    category_slug: 'childcare',
    category_name: 'Ребёнок',
    rate_snapshot: 24,
    currency_snapshot: 'EUR',
    value: 16,
    ...over,
  } as ActivityWithValue
}

/**
 * СТОРОЖ ПРОТИВ ПОТЕРЯННОЙ ДОРОГИ.
 *
 * Список показывал только actual_minutes. Запись «отвела в школу»,
 * которая целиком состоит из дороги, выводилась как «0 мин» — при том
 * что карточка «Сегодня» на том же экране честно считала полтора часа.
 * Одна строка спорила с другой, и понять, какая права, было нельзя.
 */
describe('ActivityList: дорога — это тоже потраченное время', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('в строке показывает время вместе с дорогой, а не одно actual', async () => {
    vi.mocked(fetchActivities).mockResolvedValue([activity()])

    renderWithProviders(<ActivityList from="2026-09-01" to="2026-09-01" />)

    // 0 минут дела + 40 минут дороги = 40 минут.
    expect(await screen.findByText('40 мин')).toBeInTheDocument()
    expect(screen.queryByText('0 мин')).not.toBeInTheDocument()
  })

  it('дорогу показывает отдельной строкой — видно, из чего сложилось', async () => {
    vi.mocked(fetchActivities).mockResolvedValue([
      activity({ actual_minutes: 60, travel_minutes: 30 }),
    ])

    renderWithProviders(<ActivityList from="2026-09-01" to="2026-09-01" />)

    expect(await screen.findByText('1 ч 30 мин')).toBeInTheDocument()
    expect(screen.getByText(/🚗/)).toBeInTheDocument()
  })

  it('итог списка тоже считает дорогу', async () => {
    // Иначе итог списка расходился бы с итогом на дашборде,
    // который считает через ту же функцию activityMinutes.
    vi.mocked(fetchActivities).mockResolvedValue([
      activity({ id: 'a', actual_minutes: 0, travel_minutes: 40 }),
      activity({ id: 'b', actual_minutes: 0, travel_minutes: 50 }),
    ])

    renderWithProviders(<ActivityList from="2026-09-01" to="2026-09-01" />)

    // 40 + 50 = 90 минут = 1.5 часа.
    expect(await screen.findByText('1.5 ч')).toBeInTheDocument()
  })

  it('без дороги значок машины не появляется', async () => {
    vi.mocked(fetchActivities).mockResolvedValue([
      activity({ actual_minutes: 120, travel_minutes: 0 }),
    ])

    renderWithProviders(<ActivityList from="2026-09-01" to="2026-09-01" />)

    // «2 ч» встречается дважды — в строке и в итоге, поэтому findAll.
    expect(await screen.findAllByText('2 ч')).toHaveLength(2)
    expect(screen.queryByText(/🚗/)).not.toBeInTheDocument()
  })
})
