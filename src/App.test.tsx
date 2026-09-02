import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '@/test/renderWithProviders'
import App from './App'

/**
 * Подменяем настоящий запрос к базе на выдуманные данные.
 *
 * Зачем: тест должен проверять ПОВЕДЕНИЕ КОМПОНЕНТА, а не работу
 * базы данных. К тому же настоящая база может быть не запущена,
 * и тогда тесты падали бы не по вине кода.
 */
vi.mock('@/features/categories/api', () => ({
  fetchCategories: vi.fn(),
}))

// Импортируем уже подменённую версию, чтобы управлять её ответами.
import { fetchCategories } from '@/features/categories/api'

const fakeCategories = [
  { id: '1', slug: 'work', name: 'Работа', icon: '💼', sort_order: 1 },
  { id: '2', slug: 'study', name: 'Учёба', icon: '📚', sort_order: 2 },
]

describe('App', () => {
  beforeEach(() => {
    vi.mocked(fetchCategories).mockResolvedValue(fakeCategories)
  })

  it('по умолчанию показывает русский заголовок', () => {
    renderWithProviders(<App />)
    expect(screen.getByRole('heading', { name: 'Семейный учёт времени' })).toBeInTheDocument()
  })

  it('по умолчанию форматирует время по-русски', () => {
    renderWithProviders(<App />)
    expect(screen.getByText('1 ч 30 мин')).toBeInTheDocument()
  })

  it('переключает язык на английский по клику на EN', async () => {
    const user = userEvent.setup()
    renderWithProviders(<App />)

    await user.click(screen.getByRole('button', { name: 'EN' }))

    expect(screen.getByRole('heading', { name: 'Family Time Tracker' })).toBeInTheDocument()
    expect(screen.getByText('1h 30m')).toBeInTheDocument()
  })

  it('переключает язык обратно на русский', async () => {
    const user = userEvent.setup()
    renderWithProviders(<App />)

    await user.click(screen.getByRole('button', { name: 'EN' }))
    await user.click(screen.getByRole('button', { name: 'RU' }))

    expect(screen.getByRole('heading', { name: 'Семейный учёт времени' })).toBeInTheDocument()
  })

  it('показывает категории, загруженные из базы', async () => {
    renderWithProviders(<App />)

    // waitFor ждёт, пока запрос «выполнится»: данные приходят не мгновенно.
    await waitFor(() => {
      expect(screen.getByText('Работа')).toBeInTheDocument()
    })
    expect(screen.getByText('Учёба')).toBeInTheDocument()
  })

  it('объясняет пустой список правилами доступа, а не молчит', async () => {
    // Пока пользователь не вошёл, RLS честно отдаёт ноль строк.
    // Страница не должна выглядеть сломанной — она должна объяснить причину.
    vi.mocked(fetchCategories).mockResolvedValue([])

    renderWithProviders(<App />)

    await waitFor(() => {
      expect(screen.getByText(/RLS/)).toBeInTheDocument()
    })
  })

  it('показывает понятное сообщение, если база недоступна', async () => {
    vi.mocked(fetchCategories).mockRejectedValue(new Error('connection refused'))

    renderWithProviders(<App />)

    await waitFor(() => {
      expect(screen.getByText(/connection refused/)).toBeInTheDocument()
    })
  })
})
