import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
} from 'react'

/**
 * Светлая и тёмная темы.
 *
 * Сами цвета живут в src/index.css. Здесь только выбор: какая тема
 * сейчас, как её запомнить и как сообщить о ней странице.
 *
 * Тема ставится атрибутом data-theme на <html> — не классом на <body>
 * и не переменной в React. Причина простая: фон страницы должен быть
 * покрашен ДО того, как React успеет что-либо нарисовать. Иначе при
 * каждом открытии тёмная тема на мгновение вспыхивала бы белым.
 */

export const THEMES = ['forest', 'moon'] as const

/**
 * 'forest' — лесные эльфы, светлая.
 * 'moon'   — лунные эльфы, тёмная.
 *
 * Названы по смыслу, а не 'light'/'dark': если однажды появится третья
 * тема, 'light2' было бы уже не назвать.
 */
export type Theme = (typeof THEMES)[number]

const STORAGE_KEY = 'ftt.theme'

/** Тёмная тема помечается атрибутом; светлая — отсутствием атрибута. */
export function applyTheme(theme: Theme, root: HTMLElement): void {
  if (theme === 'moon') {
    root.dataset.theme = 'dark'
  } else {
    delete root.dataset.theme
  }
}

/**
 * Что выбрали в прошлый раз.
 *
 * Ничего не выбирали — спрашиваем систему: в телефоне и в ноутбуке
 * есть общая настройка «тёмное оформление», и уважать её вежливее,
 * чем светить белым в человека, который её включил.
 */
export function readStoredTheme(): Theme {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved === 'forest' || saved === 'moon') return saved

    const prefersDark =
      typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-color-scheme: dark)').matches

    return prefersDark ? 'moon' : 'forest'
  } catch {
    // Хранилище может быть закрыто настройками браузера.
    // Это не повод не работать — просто начинаем со светлой.
    return 'forest'
  }
}

type ThemeValue = {
  theme: Theme
  setTheme: (theme: Theme) => void
  /** Тёмная ли сейчас. Нужно графикам: у них своя палитра на каждую тему. */
  isDark: boolean
}

const ThemeContext = createContext<ThemeValue | null>(null)

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(readStoredTheme)

  // Ставим атрибут при первом показе и при каждой смене.
  useEffect(() => {
    applyTheme(theme, document.documentElement)
  }, [theme])

  const setTheme = useCallback((next: Theme) => {
    setThemeState(next)
    try {
      localStorage.setItem(STORAGE_KEY, next)
    } catch {
      // Не смогли запомнить — тема всё равно сменится, просто до перезагрузки.
    }
  }, [])

  return (
    <ThemeContext.Provider value={{ theme, setTheme, isDark: theme === 'moon' }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme(): ThemeValue {
  const value = useContext(ThemeContext)
  if (!value) throw new Error('useTheme нужно вызывать внутри <ThemeProvider>')
  return value
}
