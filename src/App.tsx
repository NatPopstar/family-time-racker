import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { formatMinutes, type Locale } from '@/lib/time'
import { fetchCategories } from '@/features/categories/api'

/**
 * ВРЕМЕННАЯ страница Фазы 1.
 * Её задача — доказать, что цепочка работает целиком:
 * браузер → React Query → Supabase → PostgreSQL в Docker → и обратно.
 * В Фазе 3 она будет заменена настоящим макетом приложения.
 */
export default function App() {
  const [locale, setLocale] = useState<Locale>('ru')

  // useQuery делает три вещи разом: запрашивает данные, кэширует их
  // и сообщает нам состояние загрузки. queryKey — имя, под которым
  // React Query хранит результат в кэше.
  const {
    data: categories,
    isPending,
    error,
  } = useQuery({
    queryKey: ['categories'],
    queryFn: fetchCategories,
  })

  const t = {
    ru: {
      title: 'Семейный учёт времени',
      demo: 'Пример форматирования времени:',
      fromDb: 'Категории, загруженные из базы данных:',
      loading: 'Загружаем…',
      error: 'Не удалось загрузить категории:',
      empty:
        'Список пуст — и это правильно. Правила доступа в базе (RLS) отдают данные ' +
        'только тем, кто вошёл в систему. Вход появится в Фазе 2.',
    },
    en: {
      title: 'Family Time Tracker',
      demo: 'Time formatting example:',
      fromDb: 'Categories loaded from the database:',
      loading: 'Loading…',
      error: 'Could not load categories:',
      empty:
        'The list is empty on purpose. Row Level Security only serves data to signed-in ' +
        'users. Sign-in arrives in Phase 2.',
    },
  }[locale]

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div className="mx-auto max-w-2xl px-6 py-16">
        <h1 className="text-3xl font-bold tracking-tight">{t.title}</h1>

        <div className="mt-6 flex gap-2">
          <button
            type="button"
            onClick={() => setLocale('ru')}
            className={`rounded-md px-3 py-1.5 text-sm font-medium ${
              locale === 'ru' ? 'bg-indigo-600 text-white' : 'bg-white text-slate-700 shadow-sm'
            }`}
          >
            RU
          </button>
          <button
            type="button"
            onClick={() => setLocale('en')}
            className={`rounded-md px-3 py-1.5 text-sm font-medium ${
              locale === 'en' ? 'bg-indigo-600 text-white' : 'bg-white text-slate-700 shadow-sm'
            }`}
          >
            EN
          </button>
        </div>

        <p className="mt-8 text-sm text-slate-500">{t.demo}</p>
        <p className="mt-1 text-2xl font-semibold tabular-nums">{formatMinutes(90, locale)}</p>

        <p className="mt-10 text-sm text-slate-500">{t.fromDb}</p>

        {isPending && <p className="mt-2 text-slate-400">{t.loading}</p>}

        {error && (
          <p className="mt-2 rounded-md bg-red-50 p-3 text-sm text-red-700">
            {t.error} {error.message}
          </p>
        )}

        {categories?.length === 0 && (
          <p className="mt-2 rounded-md bg-amber-50 p-3 text-sm text-amber-800">{t.empty}</p>
        )}

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
      </div>
    </div>
  )
}
