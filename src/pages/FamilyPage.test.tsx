import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '@/test/renderWithProviders'
import { FamilyPage } from './FamilyPage'
import { getWeekDays } from '@/lib/periods'

vi.mock('@/features/activities/api', () => ({
  fetchActivities: vi.fn(),
}))

vi.mock('@/features/profile/api', () => ({
  fetchAllProfiles: vi.fn(),
  fetchMyProfile: vi.fn(),
}))

vi.mock('@/features/categories/api', () => ({
  fetchCategories: vi.fn(),
  fetchSubcategories: vi.fn(),
  fetchSubcategoriesWithRates: vi.fn(),
}))

import { fetchActivities } from '@/features/activities/api'
import { fetchAllProfiles } from '@/features/profile/api'
import { fetchCategories } from '@/features/categories/api'

const profiles = [
  { id: 'mama', display_name: 'Мама', color: '#6366f1', created_at: '2026-09-01T00:00:00Z' },
  { id: 'papa', display_name: 'Папа', color: '#6366f1', created_at: '2026-09-01T00:00:00Z' },
  { id: 'kid', display_name: 'Даня', color: '#6366f1', created_at: '2026-09-01T00:00:00Z' },
]

const days = getWeekDays(0)

function entry(over: Record<string, unknown>) {
  return {
    id: Math.random().toString(),
    user_id: 'mama',
    title: 'Задача',
    date: days[0],
    comment: null,
    planned_minutes: null,
    actual_minutes: 60,
    status: 'done',
    completed_at: null,
    timer_started_at: null,
    subcategory_id: 'sub',
    subcategory_name: 'Уборка',
    category_id: 'cat',
    category_slug: 'household',
    category_name: 'Домашние обязанности',
    rate_snapshot: 20,
    currency_snapshot: 'GBP',
    value: 20,
    ...over,
  }
}

describe('FamilyPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
    vi.mocked(fetchAllProfiles).mockResolvedValue(profiles)
    vi.mocked(fetchCategories).mockResolvedValue([])
    vi.mocked(fetchActivities).mockResolvedValue([])
  })

  it('показывает таблицу со всеми членами семьи', async () => {
    renderWithProviders(<FamilyPage />)

    const table = await screen.findByRole('table')
    expect(within(table).getByText('Мама')).toBeInTheDocument()
    expect(within(table).getByText('Папа')).toBeInTheDocument()
    expect(within(table).getByText('Даня')).toBeInTheDocument()
  })

  it('содержит все колонки из технического задания', async () => {
    renderWithProviders(<FamilyPage />)

    const table = await screen.findByRole('table')
    for (const heading of ['Пользователь', 'Работа', 'Учёба', 'Быт', 'Ребёнок', 'Всего часов']) {
      expect(within(table).getByRole('columnheader', { name: heading })).toBeInTheDocument()
    }
  })

  it('раскладывает часы человека по нужным колонкам', async () => {
    vi.mocked(fetchActivities).mockResolvedValue([
      entry({ user_id: 'mama', category_slug: 'work', actual_minutes: 300, value: 0 }),
      entry({ user_id: 'mama', category_slug: 'household', actual_minutes: 120, value: 40 }),
    ] as never)

    renderWithProviders(<FamilyPage />)

    const row = (await screen.findByRole('row', { name: /Мама/ }))
    // 300 минут = 5 ч работы, 120 = 2 ч быта, итого 7 ч и £40
    expect(within(row).getByText('5 ч')).toBeInTheDocument()
    expect(within(row).getByText('2 ч')).toBeInTheDocument()
    expect(within(row).getByText('7 ч')).toBeInTheDocument()
  })

  it('показывает человека без записей строкой нулей', async () => {
    vi.mocked(fetchActivities).mockResolvedValue([
      entry({ user_id: 'mama', actual_minutes: 60 }),
    ] as never)

    renderWithProviders(<FamilyPage />)

    const row = await screen.findByRole('row', { name: /Даня/ })
    // Ноль, а не пустота: иначе «ничего не делал» читается
    // как «его нет в семье».
    expect(within(row).getAllByText('0 ч').length).toBeGreaterThan(0)
  })

  it('шкала недели видна для недельного периода', async () => {
    renderWithProviders(<FamilyPage />)

    expect(await screen.findByText('Как прошла неделя')).toBeInTheDocument()
  })

  it('шкала недели прячется для месячного периода', async () => {
    const user = userEvent.setup()
    renderWithProviders(<FamilyPage />)

    await screen.findByText('Как прошла неделя')
    await user.selectOptions(screen.getByLabelText('Период'), 'thisMonth')

    // Тридцать точек на узкой оси нечитаемы — для месяца шкала не нужна.
    expect(screen.queryByText('Как прошла неделя')).not.toBeInTheDocument()
  })

  it('показывает сравнение по людям', async () => {
    renderWithProviders(<FamilyPage />)

    expect(await screen.findByText('Сравнение по людям')).toBeInTheDocument()
  })

  it('честно сообщает, что в семье никого нет', async () => {
    vi.mocked(fetchAllProfiles).mockResolvedValue([])

    renderWithProviders(<FamilyPage />)

    expect(
      await screen.findByText('В семье пока нет ни одного зарегистрированного пользователя.'),
    ).toBeInTheDocument()
  })
})
