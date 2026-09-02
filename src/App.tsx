import { useState } from 'react'
import { formatMinutes, type Locale } from '@/lib/time'

/**
 * ВРЕМЕННАЯ страница-заглушка Фазы 0.
 * Её задача — доказать, что работает всё сразу: React, TypeScript,
 * Tailwind (стили), наши функции из lib/time и переключатель языка.
 * В Фазе 3 она будет заменена настоящим макетом приложения.
 */
export default function App() {
  const [locale, setLocale] = useState<Locale>('ru')

  const t = {
    ru: { title: 'Семейный учёт времени', demo: 'Пример форматирования времени:' },
    en: { title: 'Family Time Tracker', demo: 'Time formatting example:' },
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
      </div>
    </div>
  )
}
