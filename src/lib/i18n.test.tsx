import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { I18nProvider, useI18n } from './i18n'
import { LocaleSwitcher } from '@/components/LocaleSwitcher'

/** Крошечный компонент, который просто показывает перевод — удобно для проверки. */
function ShowTitle() {
  const { t } = useI18n()
  return <p>{t('app.title')}</p>
}

describe('переводы', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('по умолчанию показывает русский', () => {
    render(
      <I18nProvider>
        <ShowTitle />
      </I18nProvider>,
    )
    expect(screen.getByText('Семейный учёт времени')).toBeInTheDocument()
  })

  it('переключается на английский', async () => {
    const user = userEvent.setup()
    render(
      <I18nProvider>
        <LocaleSwitcher />
        <ShowTitle />
      </I18nProvider>,
    )

    await user.click(screen.getByRole('button', { name: 'EN' }))

    expect(screen.getByText('Family Time Tracker')).toBeInTheDocument()
  })

  it('запоминает выбранный язык между запусками', async () => {
    const user = userEvent.setup()
    const { unmount } = render(
      <I18nProvider>
        <LocaleSwitcher />
        <ShowTitle />
      </I18nProvider>,
    )

    await user.click(screen.getByRole('button', { name: 'EN' }))
    unmount()

    // Открываем приложение заново — язык должен остаться английским,
    // иначе пользователю пришлось бы переключать его каждый раз.
    render(
      <I18nProvider>
        <ShowTitle />
      </I18nProvider>,
    )
    expect(screen.getByText('Family Time Tracker')).toBeInTheDocument()
  })

  it('помечает выбранный язык для программ чтения с экрана', async () => {
    const user = userEvent.setup()
    render(
      <I18nProvider>
        <LocaleSwitcher />
      </I18nProvider>,
    )

    expect(screen.getByRole('button', { name: 'RU' })).toHaveAttribute('aria-pressed', 'true')

    await user.click(screen.getByRole('button', { name: 'EN' }))

    expect(screen.getByRole('button', { name: 'EN' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: 'RU' })).toHaveAttribute('aria-pressed', 'false')
  })
})
