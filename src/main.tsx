import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClient } from '@/lib/queryClient'
import { I18nProvider } from '@/lib/i18n'
import { AuthProvider } from '@/features/auth/AuthProvider'
import App from './App'
import './index.css'

// Точка входа. React находит пустой <div id="root"> из index.html
// и рисует внутри него всё приложение.
//
// Обёртки-провайдеры вложены друг в друга и раздают возможности вглубь:
//   QueryClientProvider — работу с данными (useQuery)
//   I18nProvider        — переводы (useI18n)
//   AuthProvider        — сведения о вошедшем пользователе (useAuth)
//
// Порядок важен: AuthProvider внутри QueryClientProvider, потому что
// в будущем ему может понадобиться запрашивать данные профиля.
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <I18nProvider>
        <AuthProvider>
          <App />
        </AuthProvider>
      </I18nProvider>
    </QueryClientProvider>
  </StrictMode>,
)
