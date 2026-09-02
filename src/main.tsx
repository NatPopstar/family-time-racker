import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClient } from '@/lib/queryClient'
import App from './App'
import './index.css'

// Точка входа. Здесь React находит пустой <div id="root"> из index.html
// и рисует внутри него всё приложение.
//
// StrictMode — режим разработки: React намеренно вызывает компоненты дважды,
// чтобы заранее выявить ошибки. В собранной версии этого не происходит.
//
// QueryClientProvider «раздаёт» посредника React Query всем компонентам внутри.
// Без этой обёртки хук useQuery в любом компоненте выдал бы ошибку.
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </StrictMode>,
)
