import type { ReactElement, ReactNode } from 'react'
import { render } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

/**
 * Помощник для тестов.
 *
 * Компоненты, которые запрашивают данные, не умеют работать без обёртки
 * QueryClientProvider — в тесте они падали бы с ошибкой. Эта функция
 * оборачивает их автоматически, чтобы в каждом тесте не повторять одно и то же.
 *
 * Для каждого теста создаётся СВОЙ QueryClient: иначе данные, закэшированные
 * в одном тесте, протекали бы в следующий, и тесты влияли бы друг на друга.
 */
export function renderWithProviders(ui: ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        // В тестах повторные попытки не нужны: если запрос не удался,
        // мы хотим увидеть ошибку сразу, а не ждать нескольких попыток.
        retry: false,
      },
    },
  })

  function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  }

  return render(ui, { wrapper: Wrapper })
}
