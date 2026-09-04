import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Routes, Route } from 'react-router-dom'
import { renderWithProviders } from '@/test/renderWithProviders'
import { AppLayout } from './AppLayout'

vi.mock('@/features/auth/AuthProvider', () => ({
  useAuth: vi.fn(),
  AuthProvider: ({ children }: { children: React.ReactNode }) => children,
}))

vi.mock('@/features/profile/api', () => ({
  fetchMyProfile: vi.fn(),
  fetchAllProfiles: vi.fn(),
}))

vi.mock('@/features/auth/api', () => ({
  signOut: vi.fn(),
  signIn: vi.fn(),
  signUp: vi.fn(),
  mapAuthError: vi.fn(),
}))

import { useAuth } from '@/features/auth/AuthProvider'
import { fetchMyProfile } from '@/features/profile/api'
import { signOut } from '@/features/auth/api'

/** Рисуем макет с одной подставной страницей внутри. */
function renderLayout(route = '/') {
  return renderWithProviders(
    <Routes>
      <Route element={<AppLayout />}>
        <Route index element={<p>Содержимое страницы</p>} />
        <Route path="reports" element={<p>Страница отчётов</p>} />
      </Route>
    </Routes>,
    { route },
  )
}

describe('AppLayout', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
    vi.mocked(useAuth).mockReturnValue({
      session: {} as never,
      user: { id: 'user-1', email: 'mama@example.com', user_metadata: {} } as never,
      isLoading: false,
    })
    vi.mocked(fetchMyProfile).mockResolvedValue({
      id: 'user-1',
      display_name: 'Мама',
      color: '#6366f1',
      role: 'adult',
      created_at: '2026-09-01T00:00:00Z',
    })
  })

  it('показывает содержимое страницы внутри общей рамки', () => {
    renderLayout()

    expect(screen.getByText('Содержимое страницы')).toBeInTheDocument()
    expect(screen.getByText('Семейный учёт времени')).toBeInTheDocument()
  })

  it('содержит ссылки на все шесть разделов', () => {
    renderLayout()

    const sections = ['Мой день', 'Семья', 'Планер', 'История', 'Отчёты', 'Настройки']
    for (const section of sections) {
      expect(screen.getAllByRole('link', { name: section }).length).toBeGreaterThan(0)
    }
  })

  it('помечает текущий раздел для программ чтения с экрана', () => {
    renderLayout('/reports')

    // aria-current="page" — то, по чему незрячий пользователь понимает,
    // в каком разделе находится. По цвету это ясно только зрячим.
    const active = screen.getAllByRole('link', { name: 'Отчёты' })[0]
    expect(active).toHaveAttribute('aria-current', 'page')
  })

  it('не считает «Мой день» активным на другой странице', () => {
    // Ловушка роутера: без параметра end ссылка "/" была бы активной
    // всегда, ведь любой адрес начинается со слэша.
    renderLayout('/reports')

    const home = screen.getAllByRole('link', { name: 'Мой день' })[0]
    expect(home).not.toHaveAttribute('aria-current')
  })

  it('показывает имя пользователя в шапке', async () => {
    renderLayout()

    await waitFor(() => {
      expect(screen.getByText('Мама')).toBeInTheDocument()
    })
  })

  it('выходит из системы по кнопке', async () => {
    const user = userEvent.setup()
    renderLayout()

    await user.click(screen.getByRole('button', { name: 'Выйти' }))

    expect(signOut).toHaveBeenCalled()
  })

  it('открывает и закрывает меню на телефоне', async () => {
    const user = userEvent.setup()
    renderLayout()

    const burger = screen.getByRole('button', { name: 'Открыть меню' })
    expect(burger).toHaveAttribute('aria-expanded', 'false')

    await user.click(burger)
    expect(burger).toHaveAttribute('aria-expanded', 'true')

    // После перехода меню должно закрыться само, иначе оно осталось бы
    // раскрытым поверх новой страницы.
    const linksInMobileMenu = screen.getAllByRole('link', { name: 'Отчёты' })
    await user.click(linksInMobileMenu[linksInMobileMenu.length - 1])

    expect(burger).toHaveAttribute('aria-expanded', 'false')
  })

  it('прячет имя, язык и выход внутрь меню телефона', async () => {
    // Проверка после найденной ошибки: на экране 375 пикселей заголовок,
    // имя, переключатель языка и «Выйти» в одну строку не помещались,
    // и кнопка меню уезжала за край экрана. Теперь на узком экране
    // всё это живёт внутри выпадающего меню — здесь фиксируем,
    // что оно там действительно есть.
    const user = userEvent.setup()
    renderLayout()

    const beforeOpen = screen.getAllByRole('button', { name: 'Выйти' }).length

    await user.click(screen.getByRole('button', { name: 'Открыть меню' }))

    expect(screen.getAllByRole('button', { name: 'Выйти' }).length).toBe(beforeOpen + 1)
  })

  it('переводит меню на английский', async () => {
    const user = userEvent.setup()
    renderLayout()

    await user.click(screen.getByRole('button', { name: 'EN' }))

    expect(screen.getAllByRole('link', { name: 'My day' }).length).toBeGreaterThan(0)
    expect(screen.getByRole('button', { name: 'Sign out' })).toBeInTheDocument()
  })
})
