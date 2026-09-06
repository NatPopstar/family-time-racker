import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '@/test/renderWithProviders'
import { PlannerPage } from './PlannerPage'
import { getWeekDays } from '@/lib/periods'

vi.mock('@/features/auth/AuthProvider', () => ({
  useAuth: vi.fn(() => ({
    session: {} as never,
    user: { id: 'user-1', email: 'mama@example.com', user_metadata: {} } as never,
    isLoading: false,
  })),
  AuthProvider: ({ children }: { children: React.ReactNode }) => children,
}))

vi.mock('@/features/activities/api', () => ({
  fetchActivities: vi.fn(),
  createPlannedActivity: vi.fn(),
  completePlannedActivity: vi.fn(),
  deleteActivity: vi.fn(),
}))

vi.mock('@/features/profile/api', () => ({
  fetchAllProfiles: vi.fn(),
  fetchMyProfile: vi.fn(),
}))

vi.mock('@/features/planner/rulesApi', () => ({
  fetchRecurringRules: vi.fn(),
  createRecurringRule: vi.fn(),
  deactivateRecurringRule: vi.fn(),
  materialiseRules: vi.fn(),
  claimActivity: vi.fn(),
  updatePlannedActivity: vi.fn(),
}))

vi.mock('@/features/categories/api', () => ({
  fetchCategories: vi.fn(),
  fetchSubcategories: vi.fn(),
  fetchSubcategoriesWithRates: vi.fn(),
}))

import { fetchActivities, completePlannedActivity, deleteActivity } from '@/features/activities/api'
import { fetchCategories, fetchSubcategoriesWithRates } from '@/features/categories/api'
import { fetchAllProfiles } from '@/features/profile/api'
import { fetchRecurringRules, materialiseRules } from '@/features/planner/rulesApi'

const people = [
  { id: 'user-1', display_name: 'Мама', color: '#6366f1', role: 'adult', created_at: '' },
  { id: 'papa', display_name: 'Папа', color: '#eb6834', role: 'adult', created_at: '' },
  { id: 'kid', display_name: 'Даня', color: '#1baf7a', role: 'child', created_at: '' },
]

const subcategories = [
  {
    id: 'sub-cleaning',
    category_id: 'cat-household',
    rate_id: 'rate-cleaning',
    name: 'Уборка',
    sort_order: 1,
    is_active: true,
    market_rates: { name: 'Cleaning', hourly_rate: 20, currency: 'GBP', is_earnings: false },
  },
]

const categories = [
  { id: 'cat-household', slug: 'household', name: 'Домашние обязанности', icon: '🏠', sort_order: 3 },
]

/** Заготовка задачи Планера на заданный день недели. */
function task(overrides: Record<string, unknown>) {
  const days = getWeekDays(0)
  return {
    id: 'task-1',
    user_id: 'user-1',
    title: 'Уборка ванной',
    date: days[0],
    comment: null,
    planned_minutes: 60,
    actual_minutes: null,
    status: 'planned',
    completed_at: null,
    timer_started_at: null,
    subcategory_id: 'sub-cleaning',
    subcategory_name: 'Уборка',
    category_id: 'cat-household',
    category_slug: 'household',
    category_name: 'Домашние обязанности',
    rate_snapshot: null,
    currency_snapshot: null,
    value: 0,
    ...overrides,
  }
}

describe('PlannerPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
    vi.mocked(fetchActivities).mockResolvedValue([])
    vi.mocked(fetchSubcategoriesWithRates).mockResolvedValue(subcategories)
    vi.mocked(fetchCategories).mockResolvedValue(categories)
    vi.mocked(completePlannedActivity).mockResolvedValue(undefined)
    vi.mocked(deleteActivity).mockResolvedValue(undefined)
    vi.mocked(fetchAllProfiles).mockResolvedValue(people as never)
    vi.mocked(fetchRecurringRules).mockResolvedValue([])
    vi.mocked(materialiseRules).mockResolvedValue(undefined)
  })

  it('показывает все семь дней недели', async () => {
    renderWithProviders(<PlannerPage />)

    const weekdays = ['понедельник', 'вторник', 'среда', 'четверг', 'пятница', 'суббота', 'воскресенье']
    for (const day of weekdays) {
      expect(await screen.findByRole('heading', { name: day })).toBeInTheDocument()
    }
  })

  it('запрашивает записи любого статуса', async () => {
    // Планеру нужны и запланированные, и уже выполненные: иначе
    // отмеченная задача исчезала бы, и сравнить план с фактом
    // стало бы негде.
    renderWithProviders(<PlannerPage />)

    await waitFor(() => expect(fetchActivities).toHaveBeenCalled())
    expect(vi.mocked(fetchActivities).mock.calls[0][0].status).toBe('all')
  })

  it('раскладывает задачи по своим дням', async () => {
    const days = getWeekDays(0)
    vi.mocked(fetchActivities).mockResolvedValue([
      task({ id: 'a', title: 'Уборка ванной', date: days[0] }),
      task({ id: 'b', title: 'Приготовить ужин', date: days[2] }),
    ] as never)

    renderWithProviders(<PlannerPage />)

    // Ждём именно ЗАДАЧУ, а не заголовок дня: дни рисуются сразу,
    // а задачи приходят запросом, и проверка успела бы сработать
    // до их загрузки.
    await screen.findByText('Уборка ванной')

    const monday = screen.getByRole('heading', { name: 'понедельник' }).closest('section')!
    expect(within(monday).getByText('Уборка ванной')).toBeInTheDocument()
    expect(within(monday).queryByText('Приготовить ужин')).not.toBeInTheDocument()
  })

  it('прячет записи без плана', async () => {
    // Записи, сделанные сразу «по факту» через форму или таймер,
    // задачами Планера не являются.
    vi.mocked(fetchActivities).mockResolvedValue([
      task({ id: 'c', title: 'Записано по факту', planned_minutes: null, status: 'done' }),
    ] as never)

    renderWithProviders(<PlannerPage />)

    await screen.findByRole('heading', { name: 'понедельник' })
    expect(screen.queryByText('Записано по факту')).not.toBeInTheDocument()
  })

  it('показывает план невыполненной задачи', async () => {
    vi.mocked(fetchActivities).mockResolvedValue([task({})] as never)

    renderWithProviders(<PlannerPage />)

    // Ищем внутри самой задачи: «план: 1 ч» встречается ещё
    // и в итоге за неделю внизу страницы.
    const item = (await screen.findByText('Уборка ванной')).closest('li')!
    expect(within(item).getByText(/план: 1 ч/)).toBeInTheDocument()
  })

  it('показывает превышение плана у выполненной задачи', async () => {
    // Пример из технического задания: планировали час, вышло час сорок.
    vi.mocked(fetchActivities).mockResolvedValue([
      task({ status: 'done', planned_minutes: 60, actual_minutes: 100 }),
    ] as never)

    renderWithProviders(<PlannerPage />)

    expect(await screen.findByText(/дольше плана на 40 мин/)).toBeInTheDocument()
  })

  it('показывает опережение плана', async () => {
    vi.mocked(fetchActivities).mockResolvedValue([
      task({ status: 'done', planned_minutes: 120, actual_minutes: 90 }),
    ] as never)

    renderWithProviders(<PlannerPage />)

    expect(await screen.findByText(/быстрее плана на 30 мин/)).toBeInTheDocument()
  })

  it('отмечает задачу выполненной с фактическим временем', async () => {
    const user = userEvent.setup()
    vi.mocked(fetchActivities).mockResolvedValue([task({})] as never)

    renderWithProviders(<PlannerPage />)

    await user.click(await screen.findByRole('button', { name: 'Выполнено' }))
    await user.type(screen.getByLabelText('часов'), '1')
    await user.type(screen.getByLabelText('минут'), '40')
    await user.click(screen.getByRole('button', { name: 'Отметить выполненной' }))

    await waitFor(() => expect(completePlannedActivity).toHaveBeenCalledTimes(1))
    const sent = vi.mocked(completePlannedActivity).mock.calls[0][0]
    expect(sent.actualMinutes).toBe(100)
    expect(sent.activityId).toBe('task-1')
  })

  it('переключает неделю вперёд и назад', async () => {
    const user = userEvent.setup()
    renderWithProviders(<PlannerPage />)

    await screen.findByRole('heading', { name: 'понедельник' })
    const callsBefore = vi.mocked(fetchActivities).mock.calls.length

    await user.click(screen.getByRole('button', { name: /Следующая неделя/ }))

    await waitFor(() =>
      expect(vi.mocked(fetchActivities).mock.calls.length).toBeGreaterThan(callsBefore),
    )
    const lastCall = vi.mocked(fetchActivities).mock.calls.at(-1)![0]
    // Запрошенная неделя должна начинаться позже текущей.
    expect(lastCall.from > getWeekDays(0)[0]).toBe(true)
  })

  it('кнопка «текущая неделя» появляется только при сдвиге', async () => {
    const user = userEvent.setup()
    renderWithProviders(<PlannerPage />)

    await screen.findByRole('heading', { name: 'понедельник' })
    expect(screen.queryByRole('button', { name: 'Текущая неделя' })).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /Следующая неделя/ }))

    expect(screen.getByRole('button', { name: 'Текущая неделя' })).toBeInTheDocument()
  })

  it('показывает итог недели: план и факт', async () => {
    vi.mocked(fetchActivities).mockResolvedValue([
      task({ id: 'a', planned_minutes: 60, actual_minutes: 100, status: 'done' }),
      task({ id: 'b', planned_minutes: 120, actual_minutes: null }),
    ] as never)

    renderWithProviders(<PlannerPage />)

    // План 60 + 120 = 180 минут = 3 часа, факт 100 минут ≈ 1.7 часа
    expect(await screen.findByText(/план: 3 ч/)).toBeInTheDocument()
    expect(screen.getByText(/факт: 1.7 ч/)).toBeInTheDocument()
  })

  it('удаляет задачу', async () => {
    const user = userEvent.setup()
    vi.mocked(fetchActivities).mockResolvedValue([task({})] as never)

    renderWithProviders(<PlannerPage />)

    await user.click(await screen.findByRole('button', { name: /Удалить: Уборка ванной/ }))

    await waitFor(() => expect(deleteActivity).toHaveBeenCalledTimes(1))
    expect(vi.mocked(deleteActivity).mock.calls[0][0]).toBe('task-1')
  })
})

describe('PlannerPage: задачи общие для родителей', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
    vi.mocked(fetchActivities).mockResolvedValue([])
    vi.mocked(fetchSubcategoriesWithRates).mockResolvedValue(subcategories)
    vi.mocked(fetchCategories).mockResolvedValue(categories)
    vi.mocked(completePlannedActivity).mockResolvedValue(undefined)
    vi.mocked(deleteActivity).mockResolvedValue(undefined)
    vi.mocked(fetchAllProfiles).mockResolvedValue(people as never)
    vi.mocked(fetchRecurringRules).mockResolvedValue([])
    vi.mocked(materialiseRules).mockResolvedValue(undefined)
  })

  it('запрашивает задачи ВСЕЙ семьи, а не только свои', async () => {
    // Иначе задача, назначенная на второго родителя, была бы ему
    // не видна, и отметить её он бы не смог.
    renderWithProviders(<PlannerPage />)

    await waitFor(() => expect(fetchActivities).toHaveBeenCalled())
    expect(vi.mocked(fetchActivities).mock.calls[0][0].userId).toBeUndefined()
  })

  it('показывает задачу, назначенную на другого родителя', async () => {
    vi.mocked(fetchActivities).mockResolvedValue([
      task({ user_id: 'papa', title: 'Отвести с Show lab' }),
    ] as never)

    renderWithProviders(<PlannerPage />)

    expect(await screen.findByText('Отвести с Show lab')).toBeInTheDocument()
    expect(screen.getByText(/Назначено: Папа/)).toBeInTheDocument()
  })

  it('отметку записывает на того, кто нажал, а не на назначенного', async () => {
    const user = userEvent.setup()
    vi.mocked(fetchActivities).mockResolvedValue([task({ user_id: 'papa' })] as never)

    renderWithProviders(<PlannerPage />)

    await user.click(await screen.findByRole('button', { name: 'Выполнено' }))
    await user.type(screen.getByLabelText('часов'), '1')
    await user.click(screen.getByRole('button', { name: 'Отметить выполненной' }))

    await waitFor(() => expect(completePlannedActivity).toHaveBeenCalledTimes(1))
    // Назначена была на папу, отметила мама — значит труд мамин.
    expect(vi.mocked(completePlannedActivity).mock.calls[0][0].claimForUserId).toBe('user-1')
  })

  it('ЗАДАЧУ РЕБЁНКА не забирает себе', async () => {
    const user = userEvent.setup()
    vi.mocked(fetchActivities).mockResolvedValue([
      task({ user_id: 'kid', title: 'Сделать уроки' }),
    ] as never)

    renderWithProviders(<PlannerPage />)

    await screen.findByText('Сделать уроки')
    expect(screen.getByText(/Задача ребёнка/)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Выполнено' }))
    await user.type(screen.getByLabelText('часов'), '1')
    await user.click(screen.getByRole('button', { name: 'Отметить выполненной' }))

    await waitFor(() => expect(completePlannedActivity).toHaveBeenCalledTimes(1))
    // null означает «владельца не менять»: труд остаётся ребёнкиным,
    // иначе родитель обнулил бы его статистику одной кнопкой.
    expect(vi.mocked(completePlannedActivity).mock.calls[0][0].claimForUserId).toBeNull()
  })

  it('даёт кнопку правки у запланированной задачи', async () => {
    vi.mocked(fetchActivities).mockResolvedValue([task({})] as never)

    renderWithProviders(<PlannerPage />)

    expect(await screen.findByRole('button', { name: 'Изменить' })).toBeInTheDocument()
  })

  it('открывает окно правки с заполненными полями', async () => {
    const user = userEvent.setup()
    vi.mocked(fetchActivities).mockResolvedValue([
      task({
        title: 'Отвести с Show lab',
        address: 'Vukalovica, 6',
        travel_one_way_minutes: 15,
        travel_legs: 4,
        travel_minutes: 60,
      }),
    ] as never)

    renderWithProviders(<PlannerPage />)

    await user.click(await screen.findByRole('button', { name: 'Изменить' }))

    const dialog = await screen.findByRole('dialog')
    expect(within(dialog).getByLabelText('Что делали')).toHaveValue('Отвести с Show lab')
    expect(within(dialog).getByLabelText('Адрес')).toHaveValue('Vukalovica, 6')
    // Вводится ОДНА сторона, форма поездки выбирается отдельно.
    expect(within(dialog).getByLabelText('Дорога в одну сторону, минут')).toHaveValue(15)
    expect(within(dialog).getByLabelText('Как ездили')).toHaveValue('4')
    // Итог виден сразу, считать в уме не нужно.
    expect(within(dialog).getByText(/Всего в дороге: 1 ч/)).toBeInTheDocument()
  })

  it('у выполненной задачи правки нет', async () => {
    // Выполненная запись — уже история труда её владельца,
    // и чужие руки в ней не нужны.
    vi.mocked(fetchActivities).mockResolvedValue([
      task({ status: 'done', actual_minutes: 60 }),
    ] as never)

    renderWithProviders(<PlannerPage />)

    await screen.findByText('Уборка ванной')
    expect(screen.queryByRole('button', { name: 'Изменить' })).not.toBeInTheDocument()
  })
})
