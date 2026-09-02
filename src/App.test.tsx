import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from './App'

/**
 * Тест компонента. Отличие от теста функции: мы «рисуем» компонент
 * в фальшивом браузере (jsdom), а потом ищем на странице то,
 * что увидел бы живой человек — заголовки, кнопки, текст.
 */
describe('App', () => {
  it('по умолчанию показывает русский заголовок', () => {
    render(<App />)
    expect(screen.getByRole('heading', { name: 'Семейный учёт времени' })).toBeInTheDocument()
  })

  it('по умолчанию форматирует время по-русски', () => {
    render(<App />)
    expect(screen.getByText('1 ч 30 мин')).toBeInTheDocument()
  })

  it('переключает язык на английский по клику на EN', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: 'EN' }))

    expect(screen.getByRole('heading', { name: 'Family Time Tracker' })).toBeInTheDocument()
    expect(screen.getByText('1h 30m')).toBeInTheDocument()
  })

  it('переключает язык обратно на русский', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: 'EN' }))
    await user.click(screen.getByRole('button', { name: 'RU' }))

    expect(screen.getByRole('heading', { name: 'Семейный учёт времени' })).toBeInTheDocument()
  })
})
