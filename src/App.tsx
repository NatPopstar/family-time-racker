import { useQuery } from '@tanstack/react-query'
import { useI18n } from '@/lib/i18n'
import { useAuth } from '@/features/auth/AuthProvider'
import { AuthPage } from '@/features/auth/AuthPage'
import { signOut } from '@/features/auth/api'
import { fetchCategories } from '@/features/categories/api'
import { Button } from '@/components/ui/Button'
import { LocaleSwitcher } from '@/components/LocaleSwitcher'

/**
 * Главный «регулировщик» приложения. Решает, что показать:
 *   1. пока выясняем, есть ли сохранённая сессия — надпись «Загружаем»;
 *   2. если пользователь не вошёл — экран входа;
 *   3. если вошёл — личный кабинет.
 *
 * Шаг 1 нельзя пропускать: без него при каждой перезагрузке страницы
 * на долю секунды мелькала бы форма входа, хотя человек уже вошёл.
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

  return <HomePage />
}

/**
 * ВРЕМЕННАЯ страница личного кабинета Фазы 2.
 * Показывает, что вход работает, и заодно доказывает работу защиты:
 * категории, невидимые до входа, теперь загружаются.
 * В Фазе 3 её заменит настоящий макет с меню и разделами.
 */
function HomePage() {
  const { user } = useAuth()
  const { t } = useI18n()

  const { data: categories, isPending } = useQuery({
    queryKey: ['categories'],
    queryFn: fetchCategories,
  })

  // Имя мы клали в metadata при регистрации, оттуда его и берём.
  // Если имени нет (аккаунт создан в обход формы) — показываем почту.
  const displayName = (user?.user_metadata?.display_name as string | undefined) ?? user?.email

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-4">
          <h1 className="text-lg font-bold">{t('app.title')}</h1>
          <div className="flex items-center gap-3">
            <LocaleSwitcher />
            <Button variant="secondary" onClick={() => signOut()}>
              {t('auth.signOut')}
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-10">
        <p className="text-sm text-slate-500">
          {t('home.signedInAs')} <span className="font-semibold text-slate-900">{displayName}</span>
        </p>

        <p className="mt-8 text-sm text-slate-500">{t('home.categoriesFromDb')}</p>

        {isPending && <p className="mt-2 text-slate-400">{t('common.loading')}</p>}

        {categories && (
          <ul className="mt-2 space-y-1">
            {categories.map((category) => (
              <li
                key={category.id}
                className="flex items-center gap-2 rounded-md bg-white px-3 py-2 shadow-sm"
              >
                <span aria-hidden="true">{category.icon}</span>
                <span className="font-medium">{category.name}</span>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  )
}
