import type { ReactElement, ReactNode } from 'react'
import { render } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { I18nProvider } from '@/lib/i18n'
import { ThemeProvider } from '@/lib/theme'

/**
 * Помощник для тестов.
 *
 * Компоненты приложения не умеют работать без обёрток-провайдеров:
 * без QueryClientProvider падает useQuery, без I18nProvider — useI18n,
 * без ThemeProvider — цвета графиков, без роутера — ссылки меню.
 * Эта функция ставит их автоматически.
 *
 * MemoryRouter — роутер, который держит адрес в памяти, а не в адресной
 * строке браузера. В тестах настоящей адресной строки нет, а так мы ещё и
 * можем начать тест с любой страницы через параметр route.
 *
 * Для каждого теста создаётся СВОЙ QueryClient: иначе данные,
 * закэшированные в одном тесте, протекали бы в следующий.
 */
export function renderWithProviders(ui: ReactElement, { route = '/' }: { route?: string } = {}) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        // В тестах повторные попытки не нужны: если запрос не удался,
        // хотим увидеть ошибку сразу, а не ждать нескольких попыток.
        retry: false,
      },
    },
  })

  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <MemoryRouter initialEntries={[route]}>
        <QueryClientProvider client={queryClient}>
          <ThemeProvider>
            <I18nProvider>{children}</I18nProvider>
          </ThemeProvider>
        </QueryClientProvider>
      </MemoryRouter>
    )
  }

  return render(ui, { wrapper: Wrapper })
}
