import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '@/test/renderWithProviders'
import { AuthPage } from './AuthPage'

// Подменяем обращения к серверу — проверяем поведение формы, а не сеть.
vi.mock('./api', async () => {
  const actual = await vi.importActual<typeof import('./api')>('./api')
  return {
    // mapAuthError — чистая функция без сети, её берём настоящую,
    // чтобы тест проверял и перевод ошибок тоже.
    mapAuthError: actual.mapAuthError,
    signIn: vi.fn(),
    signUp: vi.fn(),
    signOut: vi.fn(),
  }
})

import { signIn, signUp } from './api'

describe('AuthPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
  })

  it('сначала показывает форму входа, а не регистрации', () => {
    renderWithProviders(<AuthPage />)

    expect(screen.getByRole('heading', { name: 'Вход' })).toBeInTheDocument()
    // Поля «Имя» на форме входа быть не должно.
    expect(screen.queryByLabelText('Имя')).not.toBeInTheDocument()
  })

  it('переключается на регистрацию и показывает поле имени', async () => {
    const user = userEvent.setup()
    renderWithProviders(<AuthPage />)

    await user.click(screen.getByRole('button', { name: /Нет аккаунта/ }))

    expect(screen.getByRole('heading', { name: 'Регистрация' })).toBeInTheDocument()
    expect(screen.getByLabelText('Имя')).toBeInTheDocument()
  })

  it('входит с введёнными почтой и паролем', async () => {
    const user = userEvent.setup()
    vi.mocked(signIn).mockResolvedValue({} as never)
    renderWithProviders(<AuthPage />)

    await user.type(screen.getByLabelText('Электронная почта'), 'mama@example.com')
    await user.type(screen.getByLabelText('Пароль'), 'secret123')
    await user.click(screen.getByRole('button', { name: 'Войти' }))

    await waitFor(() => {
      expect(signIn).toHaveBeenCalledWith('mama@example.com', 'secret123')
    })
  })

  it('регистрирует с именем и обрезает лишние пробелы', async () => {
    const user = userEvent.setup()
    vi.mocked(signUp).mockResolvedValue({} as never)
    renderWithProviders(<AuthPage />)

    await user.click(screen.getByRole('button', { name: /Нет аккаунта/ }))
    await user.type(screen.getByLabelText('Имя'), '  Мама  ')
    await user.type(screen.getByLabelText('Электронная почта'), 'mama@example.com')
    await user.type(screen.getByLabelText('Пароль'), 'secret123')
    await user.click(screen.getByRole('button', { name: 'Создать аккаунт' }))

    await waitFor(() => {
      expect(signUp).toHaveBeenCalledWith('mama@example.com', 'secret123', 'Мама')
    })
  })

  it('не отправляет запрос, если при регистрации не введено имя', async () => {
    const user = userEvent.setup()
    renderWithProviders(<AuthPage />)

    await user.click(screen.getByRole('button', { name: /Нет аккаунта/ }))
    await user.type(screen.getByLabelText('Электронная почта'), 'mama@example.com')
    await user.type(screen.getByLabelText('Пароль'), 'secret123')
    await user.click(screen.getByRole('button', { name: 'Создать аккаунт' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Введите имя')
    // Проверка должна срабатывать ДО обращения к серверу.
    expect(signUp).not.toHaveBeenCalled()
  })

  it('показывает понятное сообщение вместо английской ошибки Supabase', async () => {
    const user = userEvent.setup()
    vi.mocked(signIn).mockRejectedValue(new Error('Invalid login credentials'))
    renderWithProviders(<AuthPage />)

    await user.type(screen.getByLabelText('Электронная почта'), 'mama@example.com')
    await user.type(screen.getByLabelText('Пароль'), 'wrong-password')
    await user.click(screen.getByRole('button', { name: 'Войти' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Неверная почта или пароль')
  })

  it('стирает ошибку при переключении между входом и регистрацией', async () => {
    const user = userEvent.setup()
    vi.mocked(signIn).mockRejectedValue(new Error('Invalid login credentials'))
    renderWithProviders(<AuthPage />)

    await user.type(screen.getByLabelText('Электронная почта'), 'mama@example.com')
    await user.type(screen.getByLabelText('Пароль'), 'wrong-password')
    await user.click(screen.getByRole('button', { name: 'Войти' }))
    expect(await screen.findByRole('alert')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /Нет аккаунта/ }))

    // Старая ошибка относилась к другому действию — она должна исчезнуть.
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('блокирует кнопку на время отправки, чтобы не отправить дважды', async () => {
    const user = userEvent.setup()
    // Запрос, который «висит» — имитируем медленную сеть.
    vi.mocked(signIn).mockImplementation(() => new Promise(() => {}))
    renderWithProviders(<AuthPage />)

    await user.type(screen.getByLabelText('Электронная почта'), 'mama@example.com')
    await user.type(screen.getByLabelText('Пароль'), 'secret123')
    await user.click(screen.getByRole('button', { name: 'Войти' }))

    expect(await screen.findByRole('button', { name: 'Секунду…' })).toBeDisabled()
  })

  it('работает и на английском языке', async () => {
    const user = userEvent.setup()
    renderWithProviders(<AuthPage />)

    await user.click(screen.getByRole('button', { name: 'EN' }))

    expect(screen.getByRole('heading', { name: 'Sign in' })).toBeInTheDocument()
    expect(screen.getByLabelText('Email')).toBeInTheDocument()
  })
})
