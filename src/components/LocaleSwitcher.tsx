import { useI18n } from '@/lib/i18n'
import type { Locale } from '@/lib/time'

/** Переключатель языка RU / EN. Виден на всех экранах. */
export function LocaleSwitcher() {
  const { locale, setLocale } = useI18n()

  const options: Locale[] = ['ru', 'en']

  return (
    // role="group" + aria-label объясняют, что эти две кнопки — один переключатель.
    <div role="group" aria-label="Language" className="flex gap-1">
      {options.map((option) => (
        <button
          key={option}
          type="button"
          onClick={() => setLocale(option)}
          // aria-pressed сообщает, какой язык выбран сейчас —
          // по цвету это понятно только зрячим.
          aria-pressed={locale === option}
          className={`rounded-md px-2.5 py-1 text-xs font-semibold transition ${
            locale === option
              ? 'bg-indigo-600 text-white'
              : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50'
          }`}
        >
          {option.toUpperCase()}
        </button>
      ))}
    </div>
  )
}
