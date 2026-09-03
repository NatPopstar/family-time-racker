import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '@/test/renderWithProviders'
import App from './App'

/**
 * App — «регулировщик»: он решает, какой экран показать,
 * и заодно отвечает за защиту страниц. Проверяем именно это.
 */
vi.mock('@/features/auth/AuthProvider', () => ({
  useAuth: vi.fn(),
  AuthProvider: ({ children }: { children: React.ReactNode }) => children,
}))

vi.mock('@/features/profile/api', () => ({
  fetchMyProfile: vi.fn(),
  fetchAllProfiles: vi.fn(),
}))

vi.mock('@/features/auth/api', async () => {
  const actual = await vi.importActual<typeof import('@/features/auth/api')>('@/features/auth/api')
  return { ...actual, signIn: vi.fn(), signUp: vi.fn(), signOut: vi.fn() }
})

import { useAuth } from '@/features/auth/AuthProvider'
import { fetchMyProfile } from '@/features/profile/api'

const signedOut = { session: null, user: null, isLoading: false }
const signedIn = {
  session: {} as never,
  user: { id: 'user-1', email: 'mama@example.com', user_metadata: {} } as never,
  isLoading: false,
}

describe('App: какой экран показывать', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
    vi.mocked(fetchMyProfile).mockResolvedValue({
      id: 'user-1',
      display_name: 'Мама',
      color: '#6366f1',
      created_at: '2026-09-01T00:00:00Z',
    })
  })

  it('пока проверяет сессию, показывает «Загружаем», а не форму входа', () => {
    // Защита от неприятного мигания формой входа у того, кто уже вошёл.
    vi.mocked(useAuth).mockReturnValue({ session: null, user: null, isLoading: true })

    renderWithProviders(<App />)

    expect(screen.getByText('Загружаем…')).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Вход' })).not.toBeInTheDocument()
  })

  it('показывает форму входа, если пользователь не вошёл', () => {
    vi.mocked(useAuth).mockReturnValue(signedOut)

    renderWithProviders(<App />)

    expect(screen.getByRole('heading', { name: 'Вход' })).toBeInTheDocument()
  })

  it('не пускает на внутренний адрес того, кто не вошёл', () => {
    // Главная проверка защиты: даже набрав адрес раздела вручную,
    // невошедший человек увидит форму входа, а не содержимое.
    vi.mocked(useAuth).mockReturnValue(signedOut)

    renderWithProviders(<App />, { route: '/reports' })

    expect(screen.getByRole('heading', { name: 'Вход' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Отчёты' })).not.toBeInTheDocument()
  })

  it('вошедшему показывает раздел «Мой день»', () => {
    vi.mocked(useAuth).mockReturnValue(signedIn)

    renderWithProviders(<App />)

    expect(screen.getByRole('heading', { name: 'Мой день' })).toBeInTheDocument()
  })
})

describe('App: переходы между разделами', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
    vi.mocked(useAuth).mockReturnValue(signedIn)
    vi.mocked(fetchMyProfile).mockResolvedValue({
      id: 'user-1',
      display_name: 'Мама',
      color: '#6366f1',
      created_at: '2026-09-01T00:00:00Z',
    })
  })

  it('открывает раздел по прямому адресу', () => {
    renderWithProviders(<App />, { route: '/settings' })

    expect(screen.getByRole('heading', { name: 'Настройки' })).toBeInTheDocument()
  })

  it('переходит в другой раздел по клику в меню', async () => {
    const user = userEvent.setup()
    renderWithProviders(<App />)

    // getAllByRole: ссылка есть и в меню для широкого экрана,
    // и в меню для телефона — берём первую.
    await user.click(screen.getAllByRole('link', { name: 'Отчёты' })[0])

    expect(screen.getByRole('heading', { name: 'Отчёты' })).toBeInTheDocument()
  })

  it('показывает страницу «не найдено» на несуществующем адресе', () => {
    // Без этого маршрута опечатка в адресе давала бы пустой экран.
    renderWithProviders(<App />, { route: '/чего-то-нет' })

    expect(screen.getByRole('heading', { name: 'Страница не найдена' })).toBeInTheDocument()
  })

  it('показывает имя из таблицы профилей, а не из сессии', async () => {
    renderWithProviders(<App />)

    await waitFor(() => {
      expect(screen.getByText('Мама')).toBeInTheDocument()
    })
  })
})
