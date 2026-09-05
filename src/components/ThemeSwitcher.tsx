import { useI18n, type TranslationKey } from '@/lib/i18n'
import { useTheme, THEMES, type Theme } from '@/lib/theme'

/** Значок темы: лист для лесной, луна для ночной. */
const ICONS: Record<Theme, string> = {
  forest: '🍃',
  moon: '🌙',
}

const LABELS: Record<Theme, TranslationKey> = {
  forest: 'theme.forest',
  moon: 'theme.moon',
}

/**
 * Переключатель темы. Стоит рядом с переключателем языка —
 * обе настройки про то, «как показывать», и искать их логично в одном месте.
 *
 * Две кнопки, а не одна переключающая: по одной кнопке невозможно понять,
 * что она показывает — текущую тему или ту, в которую переключит.
 * Здесь же обе видны сразу, и выбранная отмечена явно.
 */
export function ThemeSwitcher() {
  const { t } = useI18n()
  const { theme, setTheme } = useTheme()

  return (
    <div role="group" aria-label={t('theme.label')} className="flex gap-1">
      {THEMES.map((option) => (
        <button
          key={option}
          type="button"
          onClick={() => setTheme(option)}
          // Значок сам по себе ничего не сообщает программе чтения
          // с экрана — название темы даём словами.
          aria-label={t(LABELS[option])}
          aria-pressed={theme === option}
          title={t(LABELS[option])}
          className={`rounded-md px-2.5 py-1 text-xs leading-5 transition ${
            theme === option
              ? 'bg-accent text-accent-ink'
              : 'bg-surface text-ink-3 ring-1 ring-line hover:bg-surface-2'
          }`}
        >
          <span aria-hidden="true">{ICONS[option]}</span>
        </button>
      ))}
    </div>
  )
}
