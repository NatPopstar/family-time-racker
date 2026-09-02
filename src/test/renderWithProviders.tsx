import type { ReactElement, ReactNode } from 'react'
import { render } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { I18nProvider } from '@/lib/i18n'

/**
 * Помощник для тестов.
 *
 * Компоненты приложения не умеют работать без обёрток-провайдеров:
 * без QueryClientProvider падает useQuery, без I18nProvider — useI18n.
 * Эта функция ставит их автоматически, чтобы в каждом тесте
 * не повторять одно и то же.
 *
 * Для каждого теста создаётся СВОЙ QueryClient: иначе данные,
 * закэшированные в одном тесте, протекали бы в следующий,
 * и тесты влияли бы друг на друга.
 */
export function renderWithProviders(ui: ReactElement) {
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
      <QueryClientProvider client={queryClient}>
        <I18nProvider>{children}</I18nProvider>
      </QueryClientProvider>
    )
  }

  return render(ui, { wrapper: Wrapper })
}
