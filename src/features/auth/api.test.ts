import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockSignUp = vi.fn()
const mockSignInWithPassword = vi.fn()
const mockSignOut = vi.fn()

vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      signUp: (...args: unknown[]) => mockSignUp(...args),
      signInWithPassword: (...args: unknown[]) => mockSignInWithPassword(...args),
      signOut: () => mockSignOut(),
    },
  },
}))

import { signUp, signIn, signOut, mapAuthError } from './api'

describe('mapAuthError', () => {
  it('узнаёт неверный пароль', () => {
    expect(mapAuthError('Invalid login credentials')).toBe('auth.error.invalidCredentials')
  })

  it('узнаёт занятую почту', () => {
    expect(mapAuthError('User already registered')).toBe('auth.error.emailTaken')
  })

  it('узнаёт слишком короткий пароль', () => {
    expect(mapAuthError('Password should be at least 6 characters')).toBe(
      'auth.error.weakPassword',
    )
  })

  it('на незнакомую ошибку отвечает общим сообщением, а не падает', () => {
    expect(mapAuthError('Something we have never seen')).toBe('auth.error.generic')
  })

  it('не зависит от регистра букв', () => {
    expect(mapAuthError('INVALID LOGIN CREDENTIALS')).toBe('auth.error.invalidCredentials')
  })
})

describe('signUp', () => {
  beforeEach(() => vi.clearAllMocks())

  it('передаёт имя в metadata, откуда его заберёт триггер базы', async () => {
    mockSignUp.mockResolvedValue({ data: { user: { id: '1' } }, error: null })

    await signUp('mama@example.com', 'secret123', 'Мама')

    // Это главная проверка: без options.data.display_name триггер
    // handle_new_user создал бы профиль с именем из почты.
    expect(mockSignUp).toHaveBeenCalledWith({
      email: 'mama@example.com',
      password: 'secret123',
      options: { data: { display_name: 'Мама' } },
    })
  })

  it('превращает ошибку Supabase в исключение', async () => {
    mockSignUp.mockResolvedValue({ data: null, error: { message: 'User already registered' } })

    await expect(signUp('a@b.c', 'secret123', 'Имя')).rejects.toThrow('User already registered')
  })
})

describe('signIn', () => {
  beforeEach(() => vi.clearAllMocks())

  it('передаёт почту и пароль в Supabase', async () => {
    mockSignInWithPassword.mockResolvedValue({ data: { session: {} }, error: null })

    await signIn('papa@example.com', 'secret123')

    expect(mockSignInWithPassword).toHaveBeenCalledWith({
      email: 'papa@example.com',
      password: 'secret123',
    })
  })

  it('превращает ошибку Supabase в исключение', async () => {
    mockSignInWithPassword.mockResolvedValue({
      data: null,
      error: { message: 'Invalid login credentials' },
    })

    await expect(signIn('a@b.c', 'wrong')).rejects.toThrow('Invalid login credentials')
  })
})

describe('signOut', () => {
  beforeEach(() => vi.clearAllMocks())

  it('выходит без ошибки', async () => {
    mockSignOut.mockResolvedValue({ error: null })
    await expect(signOut()).resolves.toBeUndefined()
  })

  it('сообщает об ошибке выхода', async () => {
    mockSignOut.mockResolvedValue({ error: { message: 'network down' } })
    await expect(signOut()).rejects.toThrow('network down')
  })
})
