import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
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
/** Раскрывает свёрнутый список записей. */
async function openList() {
  const user = userEvent.setup()
  await user.click(await screen.findByRole('button', { name: /Записей:/ }))
}

describe('ActivityList: список свёрнут, итог на виду', () => {
  beforeEach(() => vi.clearAllMocks())

  it('по умолчанию показывает счётчик и итог, но не сами записи', async () => {
    // За день записей набирается много, и они отодвигают всё остальное.
    // Заходят чаще с вопросом «сколько вышло», чем «покажи каждую строку».
    vi.mocked(fetchActivities).mockResolvedValue([
      activity({ id: 'a', actual_minutes: 60, travel_minutes: 0, title: 'Уборка кухни' }),
      activity({ id: 'b', actual_minutes: 30, travel_minutes: 0, title: 'Готовка' }),
    ])

    renderWithProviders(<ActivityList from="2026-09-01" to="2026-09-01" />)

    expect(await screen.findByText(/Записей: 2/)).toBeInTheDocument()
    // Заголовок блока — внутри самой карточки.
    expect(screen.getByText('Записи за сегодня')).toBeInTheDocument()
    // А строки спрятаны.
    expect(screen.queryByText('Уборка кухни')).not.toBeInTheDocument()
  })

  it('раскрывается и сворачивается обратно', async () => {
    vi.mocked(fetchActivities).mockResolvedValue([
      activity({ id: 'a', title: 'Уборка кухни' }),
    ])

    renderWithProviders(<ActivityList from="2026-09-01" to="2026-09-01" />)
    await openList()
    expect(screen.getByText('Уборка кухни')).toBeInTheDocument()

    await openList()
    expect(screen.queryByText('Уборка кухни')).not.toBeInTheDocument()
  })
})

describe('ActivityList: дорога — это тоже потраченное время', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('в строке показывает время вместе с дорогой, а не одно actual', async () => {
    vi.mocked(fetchActivities).mockResolvedValue([activity()])

    renderWithProviders(<ActivityList from="2026-09-01" to="2026-09-01" />)
    await openList()

    // 0 минут дела + 40 минут дороги = 40 минут.
    expect(await screen.findByText('40 мин')).toBeInTheDocument()
    expect(screen.queryByText('0 мин')).not.toBeInTheDocument()
  })

  it('дорогу показывает отдельной строкой — видно, из чего сложилось', async () => {
    vi.mocked(fetchActivities).mockResolvedValue([
      activity({ actual_minutes: 60, travel_minutes: 30 }),
    ])

    renderWithProviders(<ActivityList from="2026-09-01" to="2026-09-01" />)
    await openList()

    expect(await screen.findByText('1 ч 30 мин')).toBeInTheDocument()
    expect(screen.getByText(/🚗/)).toBeInTheDocument()
  })

  it('каждая строка считает дорогу отдельно', async () => {
    // Итог переехал в карточку диаграммы: там он стоит рядом с кругом,
    // который показывает те же данные. Список отвечает за строки.
    vi.mocked(fetchActivities).mockResolvedValue([
      activity({ id: 'a', actual_minutes: 0, travel_minutes: 40 }),
      activity({ id: 'b', actual_minutes: 0, travel_minutes: 50 }),
    ])

    renderWithProviders(<ActivityList from="2026-09-01" to="2026-09-01" />)
    await openList()

    expect(await screen.findByText('40 мин')).toBeInTheDocument()
    expect(screen.getByText('50 мин')).toBeInTheDocument()
  })

  it('выходной с ребёнком объясняет, почему нет денег', async () => {
    // Прочерк или общее «без денежной оценки» здесь врут: ставка есть,
    // просто по правилу семьи суббота и воскресенье с ребёнком —
    // это семейное время, а не работа, которую нанимают.
    vi.mocked(fetchActivities).mockResolvedValue([
      activity({ date: '2026-09-05', value: 0, is_unpaid_weekend: true }),
    ])

    renderWithProviders(<ActivityList from="2026-09-05" to="2026-09-05" />)
    await openList()

    expect(await screen.findByText(/выходной с ребёнком/)).toBeInTheDocument()
    expect(screen.queryByText('без денежной оценки')).not.toBeInTheDocument()
  })

  it('работа без ставки говорит другое — там ставки нет вовсе', async () => {
    vi.mocked(fetchActivities).mockResolvedValue([
      activity({ value: 0, is_unpaid_weekend: false, rate_snapshot: null }),
    ])

    renderWithProviders(<ActivityList from="2026-09-01" to="2026-09-01" />)
    await openList()

    expect(await screen.findByText('без денежной оценки')).toBeInTheDocument()
  })

  it('без дороги значок машины не появляется', async () => {
    vi.mocked(fetchActivities).mockResolvedValue([
      activity({ actual_minutes: 120, travel_minutes: 0 }),
    ])

    renderWithProviders(<ActivityList from="2026-09-01" to="2026-09-01" />)
    await openList()

    // Итога в списке больше нет — «2 ч» встречается один раз, в строке.
    expect(await screen.findByText('2 ч')).toBeInTheDocument()
    expect(screen.queryByText(/🚗/)).not.toBeInTheDocument()
  })
})
