import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '@/test/renderWithProviders'
import type { RecurringRule } from '@/types/models'

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

vi.mock('@/features/profile/api', () => ({ fetchAllProfiles: vi.fn() }))

vi.mock('./rulesApi', () => ({
  fetchRecurringRules: vi.fn(),
  createRecurringRule: vi.fn(),
  deactivateRecurringRule: vi.fn(),
}))

import { fetchCategories, fetchSubcategoriesWithRates } from '@/features/categories/api'
import { fetchAllProfiles } from '@/features/profile/api'
import { fetchRecurringRules } from './rulesApi'
import { RecurringRulesCard } from './RecurringRulesCard'

function rule(over: Partial<RecurringRule> = {}): RecurringRule {
  return {
    id: 'rule-1',
    created_by: 'user-1',
    subcategory_id: 'sub-logistics',
    title: 'Отвести в школу',
    address: null,
    weekday: 1,
    planned_minutes: 0,
    travel_one_way_minutes: 20,
    travel_legs: 2,
    travel_minutes: 40,
    default_user_id: null,
    is_active: true,
    created_at: '2026-09-06T00:00:00Z',
    ...over,
  } as RecurringRule
}

describe('RecurringRulesCard: список свёрнут', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(fetchCategories).mockResolvedValue([])
    vi.mocked(fetchSubcategoriesWithRates).mockResolvedValue([])
    vi.mocked(fetchAllProfiles).mockResolvedValue([] as never)
    vi.mocked(fetchRecurringRules).mockResolvedValue([
      rule({ id: 'r1', title: 'Отвести в школу' }),
      rule({ id: 'r2', title: 'Забрать из школы' }),
      rule({ id: 'r3', title: 'Плавание', weekday: 3 }),
    ])
  })

  /**
   * Когда правил на всю неделю, развёрнутый список занимает целый экран
   * и отодвигает сам Планер — ради которого на страницу и заходят.
   * Настройка, которую меняют раз в месяц, не должна заслонять то,
   * что смотрят каждый день.
   */
  it('по умолчанию показывает только количество, а не сами правила', async () => {
    renderWithProviders(<RecurringRulesCard />)

    expect(await screen.findByText(/Повторяющихся событий: 3/)).toBeInTheDocument()
    expect(screen.queryByText('Отвести в школу')).not.toBeInTheDocument()
  })

  it('раскрывается по нажатию и сворачивается обратно', async () => {
    const user = userEvent.setup()
    renderWithProviders(<RecurringRulesCard />)

    const toggle = await screen.findByRole('button', { name: /Повторяющихся событий/ })
    await user.click(toggle)
    expect(screen.getByText('Отвести в школу')).toBeInTheDocument()

    await user.click(toggle)
    expect(screen.queryByText('Отвести в школу')).not.toBeInTheDocument()
  })

  it('сообщает о своём состоянии программам чтения с экрана', async () => {
    // По стрелке ▸ видно только глазами; aria-expanded говорит словами.
    const user = userEvent.setup()
    renderWithProviders(<RecurringRulesCard />)

    const toggle = await screen.findByRole('button', { name: /Повторяющихся событий/ })
    expect(toggle).toHaveAttribute('aria-expanded', 'false')

    await user.click(toggle)
    expect(toggle).toHaveAttribute('aria-expanded', 'true')
  })

  it('без правил переключателя нет — сворачивать нечего', async () => {
    vi.mocked(fetchRecurringRules).mockResolvedValue([])
    renderWithProviders(<RecurringRulesCard />)

    expect(await screen.findByText(/Повторяющихся событий пока нет/)).toBeInTheDocument()
    expect(screen.queryByText(/Повторяющихся событий: /)).not.toBeInTheDocument()
  })
})
