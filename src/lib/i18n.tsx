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

  'nav.dashboard': 'Мой день',
  'nav.family': 'Семья',
  'nav.planner': 'Планер',
  'nav.history': 'История',
  'nav.reports': 'Отчёты',
  'nav.settings': 'Настройки',
  'nav.menu': 'Разделы',
  'nav.openMenu': 'Открыть меню',

  'page.dashboard.title': 'Мой день',
  'page.dashboard.subtitle': 'Сколько времени вы потратили сегодня, за неделю и за месяц',
  'page.family.title': 'Семейный дашборд',
  'page.family.subtitle': 'Сравнение всех членов семьи и распределение времени',
  'page.planner.title': 'Планер недели',
  'page.planner.subtitle': 'Задачи на каждый день недели: план и фактически потраченное время',
  'page.history.title': 'История',
  'page.history.subtitle': 'Все записи с возможностью изменить или удалить',
  'page.reports.title': 'Отчёты',
  'page.reports.subtitle': 'Итоги за неделю и за месяц, включая оценку стоимости труда',
  'page.settings.title': 'Настройки',
  'page.settings.subtitle': 'Ставки London Market Rates, категории и профиль',

  'page.notFound.title': 'Страница не найдена',
  'page.notFound.back': 'Вернуться на главную',

  'common.comingSoon': 'Этот раздел появится на следующем этапе.',
  'common.save': 'Сохранить',
  'common.saving': 'Сохраняем…',
  'common.cancel': 'Отмена',
  'common.delete': 'Удалить',
  'common.total': 'Всего',

  'activity.formTitle': 'Записать выполненную работу',
  'activity.title': 'Что делали',
  'activity.titlePlaceholder': 'Например: уборка кухни',
  'activity.category': 'Категория',
  'activity.subcategory': 'Вид работы',
  'activity.selectPlaceholder': 'Выберите…',
  'activity.date': 'Дата',
  'activity.time': 'Потраченное время',
  'activity.hours': 'часов',
  'activity.minutes': 'минут',
  'activity.comment': 'Комментарий',
  'activity.commentPlaceholder': 'Необязательно',
  'activity.add': 'Записать',

  'activity.error.titleRequired': 'Напишите, что вы делали.',
  'activity.error.subcategoryRequired': 'Выберите вид работы.',
  'activity.error.timeRequired': 'Укажите потраченное время — хотя бы одну минуту.',
  'activity.error.timeTooLong': 'В сутках 24 часа. Проверьте введённое время.',
  'activity.error.saveFailed': 'Не удалось сохранить запись:',

  'activity.todayTitle': 'Записи за сегодня',
  'activity.empty': 'За сегодня записей пока нет. Первую можно добавить формой выше.',
  'activity.loadFailed': 'Не удалось загрузить записи:',
  'activity.notPriced': 'без денежной оценки',

  'period.today': 'Сегодня',
  'period.thisWeek': 'Эта неделя',
  'period.lastWeek': 'Прошлая неделя',
  'period.thisMonth': 'Этот месяц',
  'period.lastMonth': 'Прошлый месяц',
  'period.custom': 'Свой период',
  'period.from': 'С',
  'period.to': 'По',
  'period.label': 'Период',

  'filter.person': 'Кто',
  'filter.everyone': 'Все',
  'filter.category': 'Категория',
  'filter.allCategories': 'Все категории',

  'history.date': 'Дата',
  'history.person': 'Пользователь',
  'history.task': 'Задача',
  'history.category': 'Категория',
  'history.time': 'Время',
  'history.value': 'Стоимость',
  'history.actions': 'Действия',
  'history.edit': 'Изменить',
  'history.empty': 'За выбранный период записей нет.',
  'history.editTitle': 'Изменить запись',
  'history.deleteConfirm': 'Удалить эту запись? Отменить будет нельзя.',
  'history.foreignHint': 'Чужие записи видны, но менять их нельзя.',

  'timer.title': 'Таймер',
  'timer.start': '▶ Запустить',
  'timer.stop': '■ Остановить',
  'timer.cancel': 'Отменить',
  'timer.running': 'Идёт с',
  'timer.hint': 'Запустите таймер — время посчитается само и сохранится при остановке.',
  'timer.alreadyRunning': 'Таймер уже идёт. Остановите его, прежде чем запускать новый.',
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

  'nav.dashboard': 'My day',
  'nav.family': 'Family',
  'nav.planner': 'Planner',
  'nav.history': 'History',
  'nav.reports': 'Reports',
  'nav.settings': 'Settings',
  'nav.menu': 'Sections',
  'nav.openMenu': 'Open menu',

  'page.dashboard.title': 'My day',
  'page.dashboard.subtitle': 'Your time today, this week and this month',
  'page.family.title': 'Family dashboard',
  'page.family.subtitle': 'Everyone side by side, and how the time splits up',
  'page.planner.title': 'Weekly planner',
  'page.planner.subtitle': 'Tasks for each day: planned versus actual time',
  'page.history.title': 'History',
  'page.history.subtitle': 'Every entry, editable and deletable',
  'page.reports.title': 'Reports',
  'page.reports.subtitle': 'Weekly and monthly totals, including estimated market value',
  'page.settings.title': 'Settings',
  'page.settings.subtitle': 'London market rates, categories and your profile',

  'page.notFound.title': 'Page not found',
  'page.notFound.back': 'Back to the start',

  'common.comingSoon': 'This section arrives in a later phase.',
  'common.save': 'Save',
  'common.saving': 'Saving…',
  'common.cancel': 'Cancel',
  'common.delete': 'Delete',
  'common.total': 'Total',

  'activity.formTitle': 'Log completed work',
  'activity.title': 'What you did',
  'activity.titlePlaceholder': 'For example: cleaning the kitchen',
  'activity.category': 'Category',
  'activity.subcategory': 'Type of work',
  'activity.selectPlaceholder': 'Choose…',
  'activity.date': 'Date',
  'activity.time': 'Time spent',
  'activity.hours': 'hours',
  'activity.minutes': 'minutes',
  'activity.comment': 'Comment',
  'activity.commentPlaceholder': 'Optional',
  'activity.add': 'Log it',

  'activity.error.titleRequired': 'Write down what you did.',
  'activity.error.subcategoryRequired': 'Choose a type of work.',
  'activity.error.timeRequired': 'Enter the time spent — at least one minute.',
  'activity.error.timeTooLong': 'A day has 24 hours. Please check the time you entered.',
  'activity.error.saveFailed': 'Could not save the entry:',

  'activity.todayTitle': "Today's entries",
  'activity.empty': 'Nothing logged today yet. Add your first entry with the form above.',
  'activity.loadFailed': 'Could not load the entries:',
  'activity.notPriced': 'no market value',

  'period.today': 'Today',
  'period.thisWeek': 'This week',
  'period.lastWeek': 'Last week',
  'period.thisMonth': 'This month',
  'period.lastMonth': 'Last month',
  'period.custom': 'Custom range',
  'period.from': 'From',
  'period.to': 'To',
  'period.label': 'Period',

  'filter.person': 'Who',
  'filter.everyone': 'Everyone',
  'filter.category': 'Category',
  'filter.allCategories': 'All categories',

  'history.date': 'Date',
  'history.person': 'Person',
  'history.task': 'Task',
  'history.category': 'Category',
  'history.time': 'Time',
  'history.value': 'Value',
  'history.actions': 'Actions',
  'history.edit': 'Edit',
  'history.empty': 'No entries for the selected period.',
  'history.editTitle': 'Edit entry',
  'history.deleteConfirm': 'Delete this entry? This cannot be undone.',
  'history.foreignHint': "Other people's entries are visible but not editable.",

  'timer.title': 'Timer',
  'timer.start': '▶ Start',
  'timer.stop': '■ Stop',
  'timer.cancel': 'Cancel',
  'timer.running': 'Running since',
  'timer.hint': 'Start the timer — the time counts itself and is saved when you stop.',
  'timer.alreadyRunning': 'A timer is already running. Stop it before starting another.',
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
