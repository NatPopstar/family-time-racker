import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '@/test/renderWithProviders'
import { ActivityForm } from './ActivityForm'

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
  return { ...actual, createActivity: vi.fn() }
})

import { fetchCategories, fetchSubcategoriesWithRates } from '@/features/categories/api'
import { createActivity } from './api'

const categories = [
  { id: 'cat-household', slug: 'household', name: 'Домашние обязанности', icon: '🏠', sort_order: 3 },
  { id: 'cat-work', slug: 'work', name: 'Работа', icon: '💼', sort_order: 1 },
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
  {
    id: 'sub-cooking',
    category_id: 'cat-household',
    rate_id: 'rate-chef',
    name: 'Приготовление еды',
    sort_order: 2,
    is_active: true,
    market_rates: { name: 'Private Chef', hourly_rate: 35, currency: 'GBP' },
  },
  {
    id: 'sub-work',
    category_id: 'cat-work',
    rate_id: null,
    name: 'Основная работа',
    sort_order: 1,
    is_active: true,
    market_rates: null,
  },
]

/** Заполняет форму целиком: категория, вид работы, название, время. */
async function fillForm(
  user: ReturnType<typeof userEvent.setup>,
  opts: { category?: string; subcategory?: string; title?: string; hours?: string; minutes?: string } = {},
) {
  if (opts.category) {
    await user.selectOptions(screen.getByLabelText('Категория'), opts.category)
  }
  if (opts.subcategory) {
    await user.selectOptions(screen.getByLabelText('Вид работы'), opts.subcategory)
  }
  if (opts.title) {
    await user.type(screen.getByLabelText('Что делали'), opts.title)
  }
  if (opts.hours) {
    await user.type(screen.getByLabelText('часов'), opts.hours)
  }
  if (opts.minutes) {
    await user.type(screen.getByLabelText('минут'), opts.minutes)
  }
}

describe('ActivityForm', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
    vi.mocked(fetchCategories).mockResolvedValue(categories)
    vi.mocked(fetchSubcategoriesWithRates).mockResolvedValue(subcategories)
    vi.mocked(createActivity).mockResolvedValue(undefined)
  })

  it('пока категория не выбрана, список видов работы заблокирован', async () => {
    renderWithProviders(<ActivityForm />)

    await screen.findByRole('option', { name: /Домашние обязанности/ })
    expect(screen.getByLabelText('Вид работы')).toBeDisabled()
  })

  it('показывает только виды работы выбранной категории', async () => {
    const user = userEvent.setup()
    renderWithProviders(<ActivityForm />)

    await screen.findByRole('option', { name: /Домашние обязанности/ })
    await fillForm(user, { category: 'cat-household' })

    expect(screen.getByRole('option', { name: 'Уборка' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'Приготовление еды' })).toBeInTheDocument()
    // Из другой категории — не должно быть.
    expect(screen.queryByRole('option', { name: 'Основная работа' })).not.toBeInTheDocument()
  })

  it('сбрасывает вид работы при смене категории', async () => {
    const user = userEvent.setup()
    renderWithProviders(<ActivityForm />)

    await screen.findByRole('option', { name: /Домашние обязанности/ })
    await fillForm(user, { category: 'cat-household', subcategory: 'sub-cleaning' })
    await fillForm(user, { category: 'cat-work' })

    // Иначе осталась бы «Уборка», не относящаяся к категории «Работа».
    expect(screen.getByLabelText('Вид работы')).toHaveValue('')
  })

  it('показывает оценку стоимости до сохранения', async () => {
    const user = userEvent.setup()
    renderWithProviders(<ActivityForm />)

    await screen.findByRole('option', { name: /Домашние обязанности/ })
    // 1 час 30 минут уборки по £20 = £30
    await fillForm(user, {
      category: 'cat-household',
      subcategory: 'sub-cleaning',
      hours: '1',
      minutes: '30',
    })

    expect(await screen.findByText(/30/)).toBeInTheDocument()
  })

  it('не показывает стоимость для работы без ставки', async () => {
    const user = userEvent.setup()
    renderWithProviders(<ActivityForm />)

    await screen.findByRole('option', { name: /Домашние обязанности/ })
    await fillForm(user, { category: 'cat-work', subcategory: 'sub-work', hours: '8' })

    expect(screen.queryByText(/≈/)).not.toBeInTheDocument()
  })

  it('сохраняет запись со «замороженной» ставкой', async () => {
    const user = userEvent.setup()
    renderWithProviders(<ActivityForm />)

    await screen.findByRole('option', { name: /Домашние обязанности/ })
    await fillForm(user, {
      category: 'cat-household',
      subcategory: 'sub-cleaning',
      title: 'Уборка кухни',
      hours: '1',
      minutes: '30',
    })
    await user.click(screen.getByRole('button', { name: 'Записать' }))

    await waitFor(() => expect(createActivity).toHaveBeenCalledTimes(1))

    // Проверяем аргументы по одному: так при поломке сразу видно,
    // какое именно поле разъехалось.
    const sent = vi.mocked(createActivity).mock.calls[0][0]
    expect(sent.userId).toBe('user-1')
    expect(sent.title).toBe('Уборка кухни')
    expect(sent.actualMinutes).toBe(90)
    expect(sent.subcategory.id).toBe('sub-cleaning')
    // Ставка едет вместе с записью — из неё потом получится rate_snapshot.
    expect(sent.subcategory.market_rates?.hourly_rate).toBe(20)
  })

  it('требует название задачи', async () => {
    const user = userEvent.setup()
    renderWithProviders(<ActivityForm />)

    await screen.findByRole('option', { name: /Домашние обязанности/ })
    await fillForm(user, {
      category: 'cat-household',
      subcategory: 'sub-cleaning',
      hours: '1',
    })
    await user.click(screen.getByRole('button', { name: 'Записать' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Напишите, что вы делали')
    expect(createActivity).not.toHaveBeenCalled()
  })

  it('требует выбрать вид работы', async () => {
    const user = userEvent.setup()
    renderWithProviders(<ActivityForm />)

    await screen.findByRole('option', { name: /Домашние обязанности/ })
    await fillForm(user, { category: 'cat-household', title: 'Что-то', hours: '1' })
    await user.click(screen.getByRole('button', { name: 'Записать' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Выберите вид работы')
    expect(createActivity).not.toHaveBeenCalled()
  })

  it('не сохраняет запись с нулевым временем', async () => {
    const user = userEvent.setup()
    renderWithProviders(<ActivityForm />)

    await screen.findByRole('option', { name: /Домашние обязанности/ })
    await fillForm(user, {
      category: 'cat-household',
      subcategory: 'sub-cleaning',
      title: 'Уборка кухни',
    })
    await user.click(screen.getByRole('button', { name: 'Записать' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Укажите потраченное время')
    expect(createActivity).not.toHaveBeenCalled()
  })

  it('не принимает больше 24 часов', async () => {
    const user = userEvent.setup()
    renderWithProviders(<ActivityForm />)

    await screen.findByRole('option', { name: /Домашние обязанности/ })
    await fillForm(user, {
      category: 'cat-household',
      subcategory: 'sub-cleaning',
      title: 'Уборка кухни',
      hours: '25',
    })
    await user.click(screen.getByRole('button', { name: 'Записать' }))

    // Защита от опечатки: 25 вместо 2.5 испортило бы всю статистику.
    expect(await screen.findByRole('alert')).toHaveTextContent('В сутках 24 часа')
    expect(createActivity).not.toHaveBeenCalled()
  })

  it('очищает поля после сохранения, но оставляет категорию', async () => {
    const user = userEvent.setup()
    renderWithProviders(<ActivityForm />)

    await screen.findByRole('option', { name: /Домашние обязанности/ })
    await fillForm(user, {
      category: 'cat-household',
      subcategory: 'sub-cleaning',
      title: 'Уборка кухни',
      hours: '1',
    })
    await user.click(screen.getByRole('button', { name: 'Записать' }))

    await waitFor(() => expect(screen.getByLabelText('Что делали')).toHaveValue(''))
    // Категорию оставляем: подряд обычно записывают несколько дел одного дня.
    expect(screen.getByLabelText('Категория')).toHaveValue('cat-household')
  })
})
