import { Routes, Route } from 'react-router-dom'
import { useI18n } from '@/lib/i18n'
import { useAuth } from '@/features/auth/AuthProvider'
import { AuthPage } from '@/features/auth/AuthPage'
import { AppLayout } from '@/components/AppLayout'
import {
  DashboardPage,
  FamilyPage,
  PlannerPage,
  HistoryPage,
  ReportsPage,
  SettingsPage,
  NotFoundPage,
} from '@/pages'

/**
 * Главный «регулировщик» приложения. Решает, что показать:
 *   1. пока выясняем, есть ли сохранённая сессия — надпись «Загружаем»;
 *   2. если пользователь не вошёл — экран входа;
 *   3. если вошёл — приложение с меню и разделами.
 *
 * Шаг 1 нельзя пропускать: без него при каждой перезагрузке страницы
 * на долю секунды мелькала бы форма входа, хотя человек уже вошёл.
 *
 * Обрати внимание: защита страниц сделана ЗДЕСЬ, одной проверкой на всё
 * приложение. Не нужно оборачивать каждый маршрут отдельно — забыть
 * обернуть один из них невозможно.
 */
export default function App() {
  const { user, isLoading } = useAuth()
  const { t } = useI18n()

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <p className="text-slate-500">{t('common.loading')}</p>
      </div>
    )
  }

  if (!user) {
    return <AuthPage />
  }

  return (
    <Routes>
      {/* Вложенные маршруты: AppLayout рисует шапку и меню,
          а страница из списка ниже подставляется в его <Outlet />. */}
      <Route element={<AppLayout />}>
        <Route index element={<DashboardPage />} />
        <Route path="family" element={<FamilyPage />} />
        <Route path="planner" element={<PlannerPage />} />
        <Route path="history" element={<HistoryPage />} />
        <Route path="reports" element={<ReportsPage />} />
        <Route path="settings" element={<SettingsPage />} />
        {/* "*" ловит все остальные адреса — иначе при опечатке
            в адресе экран остался бы просто пустым. */}
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  )
}
