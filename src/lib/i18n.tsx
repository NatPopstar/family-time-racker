import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'
import type { Locale } from './time'

/**
 * Переводы интерфейса.
 *
 * Почему словарь, а не текст прямо в компонентах: с переключателем RU/EN
 * каждая надпись существует в двух вариантах. Если разбросать их по коду,
 * половина рано или поздно останется непереведённой. Здесь же видно сразу,
 * если для ключа забыли английский вариант — TypeScript не даст собрать проект.
 *
 * Ключи именуем через точку по смыслу: 'auth.email', 'nav.dashboard'.
 */
const ru = {
  'app.title': 'Семейный учёт времени',

  'auth.signIn': 'Вход',
  'auth.signUp': 'Регистрация',
  'auth.email': 'Электронная почта',
  'auth.password': 'Пароль',
  'auth.displayName': 'Имя',
  'auth.displayNamePlaceholder': 'Как показывать вас в таблицах',
  'auth.signInButton': 'Войти',
  'auth.signUpButton': 'Создать аккаунт',
  'auth.toggleToSignUp': 'Нет аккаунта? Зарегистрироваться',
  'auth.toggleToSignIn': 'Уже есть аккаунт? Войти',
  'auth.signOut': 'Выйти',
  'auth.working': 'Секунду…',

  'auth.error.invalidCredentials': 'Неверная почта или пароль.',
  'auth.error.emailTaken': 'Аккаунт с такой почтой уже существует.',
  'auth.error.weakPassword': 'Пароль слишком короткий — нужно минимум 6 символов.',
  'auth.error.nameRequired': 'Введите имя — оно будет видно в семейной статистике.',
  'auth.error.generic': 'Не получилось. Попробуйте ещё раз.',

  'common.loading': 'Загружаем…',

  'home.signedInAs': 'Вы вошли как',
  'home.categoriesFromDb': 'Категории из базы данных — теперь они видны, потому что вы вошли:',
} as const

/**
 * Английский словарь. Тип Record<...> заставляет TypeScript проверить,
 * что здесь есть КАЖДЫЙ ключ из русского словаря — забыть перевод нельзя.
 */
const en: Record<keyof typeof ru, string> = {
  'app.title': 'Family Time Tracker',

  'auth.signIn': 'Sign in',
  'auth.signUp': 'Sign up',
  'auth.email': 'Email',
  'auth.password': 'Password',
  'auth.displayName': 'Name',
  'auth.displayNamePlaceholder': 'How you appear in the tables',
  'auth.signInButton': 'Sign in',
  'auth.signUpButton': 'Create account',
  'auth.toggleToSignUp': 'No account? Sign up',
  'auth.toggleToSignIn': 'Already have an account? Sign in',
  'auth.signOut': 'Sign out',
  'auth.working': 'One moment…',

  'auth.error.invalidCredentials': 'Wrong email or password.',
  'auth.error.emailTaken': 'An account with this email already exists.',
  'auth.error.weakPassword': 'Password is too short — at least 6 characters.',
  'auth.error.nameRequired': 'Enter a name — it appears in the family statistics.',
  'auth.error.generic': 'That did not work. Please try again.',

  'common.loading': 'Loading…',

  'home.signedInAs': 'Signed in as',
  'home.categoriesFromDb': 'Categories from the database — visible now that you are signed in:',
}

export type TranslationKey = keyof typeof ru

const dictionaries = { ru, en }

const STORAGE_KEY = 'ftt-locale'

/** Читает сохранённый язык. Обёрнуто в try: в приватном окне доступ может быть запрещён. */
function readStoredLocale(): Locale {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved === 'ru' || saved === 'en') return saved
  } catch {
    // Хранилище недоступно — не страшно, просто берём язык по умолчанию.
  }
  return 'ru'
}

type I18nValue = {
  locale: Locale
  setLocale: (locale: Locale) => void
  /** Переводит ключ на текущий язык. */
  t: (key: TranslationKey) => string
}

const I18nContext = createContext<I18nValue | null>(null)

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(readStoredLocale)

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next)
    try {
      localStorage.setItem(STORAGE_KEY, next)
    } catch {
      // Не смогли запомнить выбор — приложение всё равно работает.
    }
  }, [])

  const t = useCallback((key: TranslationKey) => dictionaries[locale][key], [locale])

  return <I18nContext.Provider value={{ locale, setLocale, t }}>{children}</I18nContext.Provider>
}

/**
 * Хук для доступа к переводам из любого компонента:
 *   const { t, locale } = useI18n()
 *   <h1>{t('app.title')}</h1>
 */
export function useI18n(): I18nValue {
  const value = useContext(I18nContext)
  if (!value) {
    throw new Error('useI18n можно вызывать только внутри <I18nProvider>')
  }
  return value
}
