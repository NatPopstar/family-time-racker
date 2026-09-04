import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '@/test/renderWithProviders'
import { HistoryPage } from './HistoryPage'

vi.mock('@/features/auth/AuthProvider', () => ({
  useAuth: vi.fn(() => ({
    session: {} as never,
    user: { id: 'user-mama', email: 'mama@example.com', user_metadata: {} } as never,
    isLoading: false,
  })),
  AuthProvider: ({ children }: { children: React.ReactNode }) => children,
}))

vi.mock('@/features/activities/api', () => ({
  fetchActivities: vi.fn(),
  deleteActivity: vi.fn(),
  updateActivity: vi.fn(),
}))

vi.mock('@/features/categories/api', () => ({
  fetchCategories: vi.fn(),
  fetchSubcategories: vi.fn(),
  fetchSubcategoriesWithRates: vi.fn(),
}))

vi.mock('@/features/profile/api', () => ({
  fetchAllProfiles: vi.fn(),
  fetchMyProfile: vi.fn(),
}))

import { fetchActivities, deleteActivity } from '@/features/activities/api'
import { fetchCategories, fetchSubcategoriesWithRates } from '@/features/categories/api'
import { fetchAllProfiles } from '@/features/profile/api'

const profiles = [
  { id: 'user-mama', display_name: 'Мама', color: '#6366f1', role: 'adult', created_at: '2026-09-01T00:00:00Z' },
  { id: 'user-papa', display_name: 'Папа', color: '#10b981', role: 'adult', created_at: '2026-09-01T00:00:00Z' },
]

const categories = [
  { id: 'cat-household', slug: 'household', name: 'Домашние обязанности', icon: '🏠', sort_order: 3 },
  { id: 'cat-work', slug: 'work', name: 'Работа', icon: '💼', sort_order: 1 },
]

/** Три записи: две мамины (уборка и работа) и одна папина. */
const activities = [
  {
    id: 'act-1',
    user_id: 'user-mama',
    title: 'Уборка кухни',
    date: '2026-09-03',
    comment: 'генеральная',
    planned_minutes: null,
    actual_minutes: 90,
    status: 'done',
    completed_at: '2026-09-03T10:00:00Z',
    subcategory_id: 'sub-cleaning',
    subcategory_name: 'Уборка',
    category_id: 'cat-household',
    category_slug: 'household',
    category_name: 'Домашние обязанности',
    rate_snapshot: 20,
    currency_snapshot: 'GBP',
    value: 30,
  },
  {
    id: 'act-2',
    user_id: 'user-mama',
    title: 'Работа над проектом',
    date: '2026-09-03',
    comment: null,
    planned_minutes: null,
    actual_minutes: 480,
    status: 'done',
    completed_at: '2026-09-03T18:00:00Z',
    subcategory_id: 'sub-work',
    subcategory_name: 'Основная работа',
    category_id: 'cat-work',
    category_slug: 'work',
    category_name: 'Работа',
    rate_snapshot: null,
    currency_snapshot: null,
    value: 0,
  },
  {
    id: 'act-3',
    user_id: 'user-papa',
    title: 'Приготовление ужина',
    date: '2026-09-02',
    comment: null,
    planned_minutes: null,
    actual_minutes: 60,
    status: 'done',
    completed_at: '2026-09-02T19:00:00Z',
    subcategory_id: 'sub-cooking',
    subcategory_name: 'Приготовление еды',
    category_id: 'cat-household',
    category_slug: 'household',
    category_name: 'Домашние обязанности',
    rate_snapshot: 35,
    currency_snapshot: 'GBP',
    value: 35,
  },
]

describe('HistoryPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
    vi.mocked(fetchActivities).mockResolvedValue(activities as never)
    vi.mocked(fetchAllProfiles).mockResolvedValue(profiles)
    vi.mocked(fetchCategories).mockResolvedValue(categories)
    vi.mocked(fetchSubcategoriesWithRates).mockResolvedValue([])
    // mockResolvedValue обязателен: React Query ждёт обещание,
    // а простая vi.fn() вернула бы undefined и мутация не завершилась бы.
    vi.mocked(deleteActivity).mockResolvedValue(undefined)
  })

  it('показывает записи всей семьи', async () => {
    renderWithProviders(<HistoryPage />)

    expect(await screen.findByText('Уборка кухни')).toBeInTheDocument()

    // Ищем внутри таблицы: имена есть ещё и в выпадающем списке фильтра,
    // и поиск по всей странице нашёл бы два совпадения.
    const table = screen.getByRole('table')
    expect(within(table).getByText('Приготовление ужина')).toBeInTheDocument()
    // У мамы две записи, поэтому имя в таблице встречается дважды —
    // проверяем количество, а не единственность.
    expect(within(table).getAllByText('Мама')).toHaveLength(2)
    expect(within(table).getAllByText('Папа')).toHaveLength(1)
  })

  it('фильтрует по человеку', async () => {
    const user = userEvent.setup()
    renderWithProviders(<HistoryPage />)

    await screen.findByText('Уборка кухни')
    await user.selectOptions(screen.getByLabelText('Кто'), 'user-papa')

    expect(screen.getByText('Приготовление ужина')).toBeInTheDocument()
    expect(screen.queryByText('Уборка кухни')).not.toBeInTheDocument()
  })

  it('фильтрует по категории', async () => {
    const user = userEvent.setup()
    renderWithProviders(<HistoryPage />)

    await screen.findByText('Уборка кухни')
    await user.selectOptions(screen.getByLabelText('Категория'), 'cat-work')

    expect(screen.getByText('Работа над проектом')).toBeInTheDocument()
    expect(screen.queryByText('Уборка кухни')).not.toBeInTheDocument()
  })

  it('складывает два фильтра сразу', async () => {
    const user = userEvent.setup()
    renderWithProviders(<HistoryPage />)

    await screen.findByText('Уборка кухни')
    await user.selectOptions(screen.getByLabelText('Кто'), 'user-mama')
    await user.selectOptions(screen.getByLabelText('Категория'), 'cat-household')

    expect(screen.getByText('Уборка кухни')).toBeInTheDocument()
    expect(screen.queryByText('Работа над проектом')).not.toBeInTheDocument()
    expect(screen.queryByText('Приготовление ужина')).not.toBeInTheDocument()
  })

  it('пересчитывает итоги после фильтрации', async () => {
    const user = userEvent.setup()
    renderWithProviders(<HistoryPage />)

    await screen.findByText('Уборка кухни')

    // Итог ищем строго в подвале таблицы: «1 ч» встречается ещё
    // и в самой строке записи, и поиск по таблице нашёл бы оба.
    const footer = () => within(screen.getByRole('table').querySelector('tfoot')!)

    // Все три записи: 90 + 480 + 60 = 630 минут = 10.5 часа
    expect(footer().getByText('10.5 ч')).toBeInTheDocument()

    // Только папина запись: 60 минут = 1 час
    await user.selectOptions(screen.getByLabelText('Кто'), 'user-papa')
    expect(footer().getByText('1 ч')).toBeInTheDocument()
  })

  it('показывает прочерк вместо стоимости у работы без ставки', async () => {
    const user = userEvent.setup()
    renderWithProviders(<HistoryPage />)

    await screen.findByText('Уборка кухни')
    await user.selectOptions(screen.getByLabelText('Категория'), 'cat-work')

    const row = screen.getByText('Работа над проектом').closest('tr')!
    expect(within(row).getByText('—')).toBeInTheDocument()
  })

  it('даёт кнопки правки только для своих записей', async () => {
    renderWithProviders(<HistoryPage />)

    await screen.findByText('Уборка кухни')

    const myRow = screen.getByText('Уборка кухни').closest('tr')!
    expect(within(myRow).getByRole('button', { name: 'Изменить' })).toBeInTheDocument()

    // Папина запись — кнопок быть не должно, они всё равно не сработали бы:
    // база запрещает менять чужое.
    const foreignRow = screen.getByText('Приготовление ужина').closest('tr')!
    expect(within(foreignRow).queryByRole('button', { name: 'Изменить' })).not.toBeInTheDocument()
  })

  it('спрашивает подтверждение перед удалением', async () => {
    const user = userEvent.setup()
    // Отвечаем «нет» — запись должна остаться.
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false)
    renderWithProviders(<HistoryPage />)

    await screen.findByText('Уборка кухни')
    const myRow = screen.getByText('Уборка кухни').closest('tr')!
    await user.click(within(myRow).getByRole('button', { name: 'Удалить' }))

    expect(confirmSpy).toHaveBeenCalled()
    expect(deleteActivity).not.toHaveBeenCalled()

    confirmSpy.mockRestore()
  })

  it('удаляет запись после подтверждения', async () => {
    const user = userEvent.setup()
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true)
    renderWithProviders(<HistoryPage />)

    await screen.findByText('Уборка кухни')
    const myRow = screen.getByText('Уборка кухни').closest('tr')!
    await user.click(within(myRow).getByRole('button', { name: 'Удалить' }))

    // Проверяем ПЕРВЫЙ аргумент, а не весь список.
    // React Query передаёт в mutationFn второй, служебный аргумент,
    // поэтому toHaveBeenCalledWith('act-1') не совпал бы, хотя
    // идентификатор передан правильно.
    await waitFor(() => expect(deleteActivity).toHaveBeenCalledTimes(1))
    expect(vi.mocked(deleteActivity).mock.calls[0][0]).toBe('act-1')

    confirmSpy.mockRestore()
  })

  it('поля своего периода появляются только при его выборе', async () => {
    const user = userEvent.setup()
    renderWithProviders(<HistoryPage />)

    await screen.findByText('Уборка кухни')
    expect(screen.queryByLabelText('С')).not.toBeInTheDocument()

    await user.selectOptions(screen.getByLabelText('Период'), 'custom')

    expect(screen.getByLabelText('С')).toBeInTheDocument()
    expect(screen.getByLabelText('По')).toBeInTheDocument()
  })

  it('открывает окно правки своей записи', async () => {
    const user = userEvent.setup()
    renderWithProviders(<HistoryPage />)

    await screen.findByText('Уборка кухни')
    const myRow = screen.getByText('Уборка кухни').closest('tr')!
    await user.click(within(myRow).getByRole('button', { name: 'Изменить' }))

    const dialog = await screen.findByRole('dialog')
    // Поля заполнены текущими значениями: 90 минут = 1 час 30 минут.
    expect(within(dialog).getByLabelText('Что делали')).toHaveValue('Уборка кухни')
    expect(within(dialog).getByLabelText('часов')).toHaveValue(1)
    expect(within(dialog).getByLabelText('минут')).toHaveValue(30)
  })
})
