import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '@/test/renderWithProviders'
import { AddPlannedTaskDialog } from './AddPlannedTaskDialog'

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

vi.mock('@/features/activities/api', () => ({ createPlannedActivity: vi.fn() }))

vi.mock('./rulesApi', () => ({ createRecurringRule: vi.fn() }))

import { fetchCategories, fetchSubcategoriesWithRates } from '@/features/categories/api'
import { fetchAllProfiles } from '@/features/profile/api'
import { createPlannedActivity } from '@/features/activities/api'
import { createRecurringRule } from './rulesApi'

/** Понедельник 7 сентября 2026 года. */
const MONDAY = '2026-09-07'

const categories = [
  { id: 'cat-child', slug: 'childcare', name: 'Ребёнок', icon: '🧒', sort_order: 4 },
]

const subcategories = [
  {
    id: 'sub-logistics',
    category_id: 'cat-child',
    rate_id: 'rate-nanny',
    name: 'Логистика (отвезти/забрать)',
    sort_order: 2,
    is_active: true,
    market_rates: { name: 'Babysitter / Nanny', hourly_rate: 18.56, currency: 'EUR' },
  },
]

const profiles = [
  { id: 'user-1', display_name: 'Natalia', role: 'adult' },
  { id: 'user-2', display_name: 'Andrei', role: 'adult' },
]

/** Заполняет обязательные поля: вид работы, название, время. */
async function fill(user: ReturnType<typeof userEvent.setup>) {
  await user.selectOptions(screen.getByLabelText('Категория'), 'cat-child')
  await user.selectOptions(screen.getByLabelText('Вид работы'), 'sub-logistics')
  await user.type(screen.getByLabelText('Что делали'), 'Отвести в школу')
  await user.type(screen.getByLabelText('минут'), '30')
}

describe('AddPlannedTaskDialog: повтор каждую неделю', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
    vi.mocked(fetchCategories).mockResolvedValue(categories)
    vi.mocked(fetchSubcategoriesWithRates).mockResolvedValue(subcategories)
    vi.mocked(fetchAllProfiles).mockResolvedValue(profiles as never)
    vi.mocked(createPlannedActivity).mockResolvedValue(undefined)
    vi.mocked(createRecurringRule).mockResolvedValue(undefined)
  })

  it('называет день недели, в который дело будет повторяться', async () => {
    // Человек выбрал ДАТУ, а повторяться будет ДЕНЬ НЕДЕЛИ.
    // Если не написать какой — придётся считать в уме.
    renderWithProviders(<AddPlannedTaskDialog date={MONDAY} onClose={() => {}} />)

    expect(await screen.findByText(/каждый понедельник/)).toBeInTheDocument()
  })

  it('без галочки создаёт разовую задачу и никаких правил', async () => {
    const user = userEvent.setup()
    renderWithProviders(<AddPlannedTaskDialog date={MONDAY} onClose={() => {}} />)

    await screen.findByRole('option', { name: /Ребёнок/ })
    await fill(user)
    await user.click(screen.getByRole('button', { name: 'Сохранить' }))

    await waitFor(() => expect(createPlannedActivity).toHaveBeenCalledTimes(1))
    expect(createRecurringRule).not.toHaveBeenCalled()
  })

  it('с галочкой создаёт ПРАВИЛО повтора на этот день недели', async () => {
    const user = userEvent.setup()
    renderWithProviders(<AddPlannedTaskDialog date={MONDAY} onClose={() => {}} />)

    await screen.findByRole('option', { name: /Ребёнок/ })
    await fill(user)
    await user.click(screen.getByLabelText(/Повторять каждую неделю/))
    await user.click(screen.getByRole('button', { name: 'Сохранить' }))

    await waitFor(() => expect(createRecurringRule).toHaveBeenCalledTimes(1))

    // React Query передаёт в mutationFn второй аргумент, поэтому
    // проверяем первый по отдельности.
    const rule = vi.mocked(createRecurringRule).mock.calls[0][0]
    expect(rule.title).toBe('Отвести в школу')
    // 1 — понедельник. Спрашивать день недели незачем: он следует из даты.
    expect(rule.weekday).toBe(1)
    expect(rule.plannedMinutes).toBe(30)
    expect(rule.subcategoryId).toBe('sub-logistics')
  })

  it('с галочкой НЕ создаёт разовую задачу отдельно', async () => {
    // Иначе на этот день пришлись бы сразу две одинаковые задачи:
    // наша и подставленная Планером из правила.
    const user = userEvent.setup()
    renderWithProviders(<AddPlannedTaskDialog date={MONDAY} onClose={() => {}} />)

    await screen.findByRole('option', { name: /Ребёнок/ })
    await fill(user)
    await user.click(screen.getByLabelText(/Повторять каждую неделю/))
    await user.click(screen.getByRole('button', { name: 'Сохранить' }))

    await waitFor(() => expect(createRecurringRule).toHaveBeenCalled())
    expect(createPlannedActivity).not.toHaveBeenCalled()
  })

  it('пустое название не сохраняет даже с галочкой', async () => {
    const user = userEvent.setup()
    renderWithProviders(<AddPlannedTaskDialog date={MONDAY} onClose={() => {}} />)

    await screen.findByRole('option', { name: /Ребёнок/ })
    await user.selectOptions(screen.getByLabelText('Категория'), 'cat-child')
    await user.selectOptions(screen.getByLabelText('Вид работы'), 'sub-logistics')
    await user.type(screen.getByLabelText('минут'), '30')
    await user.click(screen.getByLabelText(/Повторять каждую неделю/))
    await user.click(screen.getByRole('button', { name: 'Сохранить' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Напишите, что вы делали')
    expect(createRecurringRule).not.toHaveBeenCalled()
  })
})
