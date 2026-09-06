import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '@/test/renderWithProviders'
import { SettingsPage } from './SettingsPage'

vi.mock('@/features/settings/api', () => ({
  fetchMarketRates: vi.fn(),
  updateMarketRate: vi.fn(),
  createMarketRate: vi.fn(),
  changeCurrency: vi.fn(),
  setRateActive: vi.fn(),
  createSubcategory: vi.fn(),
  setSubcategoryRate: vi.fn(),
}))

vi.mock('@/features/categories/api', () => ({
  fetchCategories: vi.fn(),
  fetchSubcategories: vi.fn(),
  fetchSubcategoriesWithRates: vi.fn(),
}))

import {
  fetchMarketRates,
  updateMarketRate,
  createMarketRate,
  changeCurrency,
  setSubcategoryRate,
} from '@/features/settings/api'
import { fetchCategories, fetchSubcategoriesWithRates } from '@/features/categories/api'

const rates = [
  { id: 'rate-clean', name: 'Cleaning', hourly_rate: 20, currency: 'GBP', is_active: true, is_earnings: false, created_at: '' },
  { id: 'rate-chef', name: 'Private Chef', hourly_rate: 35, currency: 'GBP', is_active: true, is_earnings: false, created_at: '' },
]

const categories = [
  { id: 'cat-household', slug: 'household', name: 'Домашние обязанности', icon: '🏠', sort_order: 3 },
  { id: 'cat-work', slug: 'work', name: 'Работа', icon: '💼', sort_order: 1 },
]

const subcategories = [
  {
    id: 'sub-cleaning',
    category_id: 'cat-household',
    rate_id: 'rate-clean',
    name: 'Уборка',
    sort_order: 1,
    is_active: true,
    market_rates: { name: 'Cleaning', hourly_rate: 20, currency: 'GBP', is_earnings: false },
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

describe('SettingsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
    vi.mocked(fetchMarketRates).mockResolvedValue(rates)
    vi.mocked(fetchCategories).mockResolvedValue(categories)
    vi.mocked(fetchSubcategoriesWithRates).mockResolvedValue(subcategories)
    vi.mocked(updateMarketRate).mockResolvedValue(undefined)
    vi.mocked(createMarketRate).mockResolvedValue(undefined)
    vi.mocked(changeCurrency).mockResolvedValue(undefined)
    vi.mocked(setSubcategoryRate).mockResolvedValue(undefined)
  })

  it('показывает таблицу ставок', async () => {
    renderWithProviders(<SettingsPage />)

    // Ищем именно ЯЧЕЙКУ таблицы: названия ставок встречаются ещё
    // и в выпадающих списках привязки видов работы.
    expect(await screen.findByRole('cell', { name: 'Cleaning' })).toBeInTheDocument()
    expect(screen.getByRole('cell', { name: 'Private Chef' })).toBeInTheDocument()
  })

  it('предупреждает, что правка ставки не меняет прошлые записи', async () => {
    // Это главное обещание проекта, и человек должен видеть его
    // прямо там, где меняет цифру.
    renderWithProviders(<SettingsPage />)

    expect(
      await screen.findByText(/хранят свою копию ставки и не пересчитываются/),
    ).toBeInTheDocument()
  })

  it('сохраняет новую ставку при уходе из поля', async () => {
    const user = userEvent.setup()
    renderWithProviders(<SettingsPage />)

    const field = await screen.findByLabelText('Ставка в час: Cleaning')
    await user.clear(field)
    await user.type(field, '25')
    await user.tab()

    await waitFor(() => expect(updateMarketRate).toHaveBeenCalledTimes(1))
    expect(vi.mocked(updateMarketRate).mock.calls[0][0]).toEqual({
      id: 'rate-clean',
      hourlyRate: 25,
    })
  })

  it('не шлёт запрос, если цифру не изменили', async () => {
    const user = userEvent.setup()
    renderWithProviders(<SettingsPage />)

    const field = await screen.findByLabelText('Ставка в час: Cleaning')
    await user.click(field)
    await user.tab()

    expect(updateMarketRate).not.toHaveBeenCalled()
  })

  it('добавляет новый тип работы', async () => {
    const user = userEvent.setup()
    renderWithProviders(<SettingsPage />)

    await user.type(await screen.findByLabelText('Название услуги'), 'Dog Walker')
    await user.type(screen.getByLabelText('Ставка в час'), '15')
    // Кнопок «Сохранить» на странице две — берём первую, из карточки ставок.
    await user.click(screen.getAllByRole('button', { name: 'Сохранить' })[0])

    await waitFor(() => expect(createMarketRate).toHaveBeenCalledTimes(1))
    const sent = vi.mocked(createMarketRate).mock.calls[0][0]
    expect(sent.name).toBe('Dog Walker')
    expect(sent.hourlyRate).toBe(15)
    // Валюта берётся из уже существующих ставок, а не спрашивается заново.
    expect(sent.currency).toBe('GBP')
  })

  it('требует название и ставку больше нуля', async () => {
    const user = userEvent.setup()
    renderWithProviders(<SettingsPage />)

    await screen.findByRole('cell', { name: 'Cleaning' })
    await user.click(screen.getAllByRole('button', { name: 'Сохранить' })[0])

    expect(await screen.findByRole('alert')).toHaveTextContent('Введите название')
    expect(createMarketRate).not.toHaveBeenCalled()
  })

  it('меняет валюту у всех ставок и предупреждает о курсе', async () => {
    const user = userEvent.setup()
    renderWithProviders(<SettingsPage />)

    expect(await screen.findByText(/Суммы не пересчитываются по курсу/)).toBeInTheDocument()

    await user.selectOptions(screen.getByLabelText('Валюта'), 'EUR')

    await waitFor(() => expect(changeCurrency).toHaveBeenCalledTimes(1))
    expect(vi.mocked(changeCurrency).mock.calls[0][0]).toBe('EUR')
  })

  it('показывает вид работы без ставки как «без денежной оценки»', async () => {
    renderWithProviders(<SettingsPage />)

    const select = await screen.findByLabelText('Тип работы: Основная работа')
    // Работа деньгами не оценивается — и это видно, а не спрятано в коде.
    expect(select).toHaveValue('')
  })

  it('привязывает вид работы к другой ставке', async () => {
    const user = userEvent.setup()
    renderWithProviders(<SettingsPage />)

    const select = await screen.findByLabelText('Тип работы: Уборка')
    await user.selectOptions(select, 'rate-chef')

    await waitFor(() => expect(setSubcategoryRate).toHaveBeenCalledTimes(1))
    expect(vi.mocked(setSubcategoryRate).mock.calls[0][0]).toEqual({
      subcategoryId: 'sub-cleaning',
      rateId: 'rate-chef',
    })
  })

  it('снимает ставку с вида работы', async () => {
    const user = userEvent.setup()
    renderWithProviders(<SettingsPage />)

    const select = await screen.findByLabelText('Тип работы: Уборка')
    await user.selectOptions(select, '')

    await waitFor(() => expect(setSubcategoryRate).toHaveBeenCalledTimes(1))
    expect(vi.mocked(setSubcategoryRate).mock.calls[0][0].rateId).toBeNull()
  })
})
