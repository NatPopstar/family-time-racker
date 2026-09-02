import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import { renderWithProviders } from '@/test/renderWithProviders'
import App from './App'

/**
 * App — «регулировщик»: он решает, какой экран показать.
 * Здесь проверяем именно это решение, поэтому подменяем и сведения
 * о пользователе, и запрос категорий.
 */
vi.mock('@/features/auth/AuthProvider', () => ({
  useAuth: vi.fn(),
  AuthProvider: ({ children }: { children: React.ReactNode }) => children,
}))

vi.mock('@/features/categories/api', () => ({
  fetchCategories: vi.fn(),
  fetchSubcategories: vi.fn(),
}))

vi.mock('@/features/auth/api', async () => {
  const actual = await vi.importActual<typeof import('@/features/auth/api')>('@/features/auth/api')
  return { ...actual, signIn: vi.fn(), signUp: vi.fn(), signOut: vi.fn() }
})

import { useAuth } from '@/features/auth/AuthProvider'
import { fetchCategories } from '@/features/categories/api'

const fakeCategories = [
  { id: '1', slug: 'work', name: 'Работа', icon: '💼', sort_order: 1 },
  { id: '2', slug: 'study', name: 'Учёба', icon: '📚', sort_order: 2 },
]

/** Собирает объект пользователя такой формы, какую отдаёт Supabase. */
function fakeUser(displayName?: string) {
  return {
    id: 'user-1',
    email: 'mama@example.com',
    user_metadata: displayName ? { display_name: displayName } : {},
  }
}

describe('App', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
    vi.mocked(fetchCategories).mockResolvedValue(fakeCategories)
  })

  it('пока проверяет сессию, показывает «Загружаем», а не форму входа', () => {
    // Это защита от неприятного мигания формой входа у того,
    // кто на самом деле уже вошёл.
    vi.mocked(useAuth).mockReturnValue({ session: null, user: null, isLoading: true })

    renderWithProviders(<App />)

    expect(screen.getByText('Загружаем…')).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Вход' })).not.toBeInTheDocument()
  })

  it('показывает форму входа, если пользователь не вошёл', () => {
    vi.mocked(useAuth).mockReturnValue({ session: null, user: null, isLoading: false })

    renderWithProviders(<App />)

    expect(screen.getByRole('heading', { name: 'Вход' })).toBeInTheDocument()
  })

  it('показывает личный кабинет вошедшему пользователю', () => {
    vi.mocked(useAuth).mockReturnValue({
      session: {} as never,
      user: fakeUser('Мама') as never,
      isLoading: false,
    })

    renderWithProviders(<App />)

    expect(screen.getByText('Мама')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Выйти' })).toBeInTheDocument()
  })

  it('после входа категории из базы становятся видны', async () => {
    vi.mocked(useAuth).mockReturnValue({
      session: {} as never,
      user: fakeUser('Мама') as never,
      isLoading: false,
    })

    renderWithProviders(<App />)

    await waitFor(() => {
      expect(screen.getByText('Работа')).toBeInTheDocument()
    })
    expect(screen.getByText('Учёба')).toBeInTheDocument()
  })

  it('показывает почту, если имя не задано', () => {
    // Аккаунт, созданный в обход формы регистрации, остался бы без имени —
    // пустое место в шапке выглядело бы как поломка.
    vi.mocked(useAuth).mockReturnValue({
      session: {} as never,
      user: fakeUser() as never,
      isLoading: false,
    })

    renderWithProviders(<App />)

    expect(screen.getByText('mama@example.com')).toBeInTheDocument()
  })
})
