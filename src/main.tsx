import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClient } from '@/lib/queryClient'
import { I18nProvider } from '@/lib/i18n'
import { ThemeProvider } from '@/lib/theme'
import { AuthProvider } from '@/features/auth/AuthProvider'
import App from './App'
import './index.css'

// Точка входа. React находит пустой <div id="root"> из index.html
// и рисует внутри него всё приложение.
//
// Обёртки-провайдеры вложены друг в друга и раздают возможности вглубь:
//   BrowserRouter       — адреса страниц и переходы между ними
//   QueryClientProvider — работу с данными (useQuery)
//   ThemeProvider       — светлая/тёмная тема (useTheme)
//   I18nProvider        — переводы (useI18n)
//   AuthProvider        — сведения о вошедшем пользователе (useAuth)
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <I18nProvider>
            <AuthProvider>
              <App />
            </AuthProvider>
          </I18nProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </BrowserRouter>
  </StrictMode>,
)
