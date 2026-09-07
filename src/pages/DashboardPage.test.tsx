import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, within } from '@testing-library/react'
import { renderWithProviders } from '@/test/renderWithProviders'
import { DashboardPage } from './DashboardPage'
import { todayISO } from '@/lib/dates'
import { getPeriodRange } from '@/lib/periods'

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
  createActivity: vi.fn(),
  completePlannedActivity: vi.fn(),
  deleteActivity: vi.fn(),
  startTimer: vi.fn(),
  stopTimer: vi.fn(),
  fetchRunningTimer: vi.fn(),
  elapsedMinutes: vi.fn(() => 0),
  startPomodoro: vi.fn(),
  advancePomodoro: vi.fn(),
  stopPomodoro: vi.fn(),
}))

vi.mock('@/features/categories/api', () => ({
  fetchCategories: vi.fn(),
  fetchSubcategories: vi.fn(),
  fetchSubcategoriesWithRates: vi.fn(),
}))

import { fetchActivities, fetchRunningTimer } from '@/features/activities/api'
import { fetchCategories, fetchSubcategoriesWithRates } from '@/features/categories/api'

const today = todayISO()
const month = getPeriodRange('thisMonth')

function entry(over: Record<string, unknown>) {
  return {
    id: 'x',
    user_id: 'user-1',
    title: 'Задача',
    date: today,
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

/** Дата внутри этого месяца, но заведомо не сегодня и не на этой неделе. */
const otherDayThisMonth = month.from === today ? month.to : month.from

describe('DashboardPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
    vi.mocked(fetchActivities).mockResolvedValue([])
    vi.mocked(fetchRunningTimer).mockResolvedValue(null)
    vi.mocked(fetchCategories).mockResolvedValue([])
    vi.mocked(fetchSubcategoriesWithRates).mockResolvedValue([])
  })

  it('показывает три карточки: сегодня, неделя, месяц', async () => {
    renderWithProviders(<DashboardPage />)

    expect(await screen.findByText('Сегодня')).toBeInTheDocument()
    expect(screen.getByText('Эта неделя')).toBeInTheDocument()
    expect(screen.getByText('Этот месяц')).toBeInTheDocument()
  })

  it('на три карточки берёт данные ОДНИМ запросом', async () => {
    // Три отдельных запроса на «сегодня», «неделю» и «месяц» дали бы
    // мерцание «одна карточка загрузилась, другая ещё нет» и лишнюю
    // нагрузку на базу. Поэтому дашборд берёт месяц разом и режет его
    // на периоды уже у себя.
    //
    // Три запроса на странице — потолок, и каждый со своей причиной:
    //   1. месяц выполненных записей — три карточки и круговая диаграмма
    //   2. сегодняшние записи — список «Записи за сегодня»
    //   3. всё за выбранный в форме день, включая НЕЗАКРЫТЫЕ задачи, —
    //      проверка на дубль. Первые два тут не годятся: они берут
    //      только выполненное и только своё, а дубль чаще всего
    //      прячется именно в незакрытой или ничьей задаче.
    //
    // Четвёртый запрос — повод остановиться и подумать, а не поднять
    // это число ещё раз.
    renderWithProviders(<DashboardPage />)

    await screen.findByText('Сегодня')
    const activityCalls = vi
      .mocked(fetchActivities)
      .mock.calls.filter((c) => c[0].from !== undefined)
    expect(activityCalls.length).toBeLessThanOrEqual(3)
  })

  it('разделяет сегодняшнее время и месячное', async () => {
    vi.mocked(fetchActivities).mockResolvedValue([
      entry({ id: 'a', date: today, actual_minutes: 90 }),
      entry({ id: 'b', date: otherDayThisMonth, actual_minutes: 300 }),
    ] as never)

    renderWithProviders(<DashboardPage />)

    // Ждём МЕСЯЧНОЕ число: оно встречается на экране один раз,
    // а «1.5 ч» может совпасть у карточек «Сегодня» и «Эта неделя» —
    // это зависит от того, попала ли вторая запись в текущую неделю,
    // то есть от сегодняшней даты. Тест, ждавший «1.5 ч», исправно
    // работал месяцами и упал, когда неделя перевалила через число.
    await screen.findByText('6.5 ч')

    const todayTile = screen.getByText('Сегодня').closest('div')!
    const monthTile = screen.getByText('Этот месяц').closest('div')!

    // Сегодня — только 90 минут, за месяц — обе записи.
    expect(within(todayTile).getByText('1.5 ч')).toBeInTheDocument()
    expect(within(monthTile).getByText('6.5 ч')).toBeInTheDocument()
  })

  it('показывает распределение по категориям с числами, а не только цветом', async () => {
    vi.mocked(fetchActivities).mockResolvedValue([
      entry({ id: 'a', category_slug: 'work', category_name: 'Работа', actual_minutes: 480, value: 0 }),
      entry({ id: 'b', category_slug: 'household', category_name: 'Дом', actual_minutes: 120, value: 40 }),
    ] as never)

    renderWithProviders(<DashboardPage />)

    // Легенда с числами обязательна: цвет не должен быть единственным
    // носителем смысла — этого же требует проверка палитры.
    expect(await screen.findByText('Работа')).toBeInTheDocument()
    expect(screen.getByText('Дом')).toBeInTheDocument()
    expect(screen.getByText('80%')).toBeInTheDocument()
    expect(screen.getByText('20%')).toBeInTheDocument()
  })

  it('честно говорит, что данных нет', async () => {
    renderWithProviders(<DashboardPage />)

    expect(await screen.findByText('За этот период записей пока нет.')).toBeInTheDocument()
  })

  it('на месте остаются таймер, форма и список за сегодня', async () => {
    renderWithProviders(<DashboardPage />)

    expect(await screen.findByText('Таймер')).toBeInTheDocument()
    expect(screen.getByText('Записать выполненную работу')).toBeInTheDocument()
    expect(screen.getByText('Записи за сегодня')).toBeInTheDocument()
  })
})
