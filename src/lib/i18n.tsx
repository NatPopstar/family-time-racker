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
export const ru = {
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

  'theme.label': 'Оформление',
  'theme.forest': 'Светлая — лесные эльфы',
  'theme.moon': 'Тёмная — лунные эльфы',

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

  'money.mixedWarning':
    'Внимание: записи за этот период сделаны в разных валютах. Складывать их вместе нельзя — итог показан условно. Так бывает после смены валюты в настройках: старые записи хранят прежнюю.',

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
  'activity.error.timeOrTravelRequired':
    'Укажите либо своё время на задачу, либо время в дороге — хотя бы одно из двух.',
  'activity.error.timeTooLong': 'В сутках 24 часа. Проверьте введённое время.',
  'activity.error.saveFailed': 'Не удалось сохранить запись:',

  'activity.todayTitle': 'Записи за сегодня',
  'activity.empty': 'За сегодня записей пока нет. Первую можно добавить формой выше.',
  'activity.loadFailed': 'Не удалось загрузить записи:',
  'activity.notPriced': 'без денежной оценки',
  // Отдельная формулировка, а не общая «без оценки»: у работы и учёбы
  // ставки нет вовсе, а здесь она есть — просто в выходной не считается.
  // Без объяснения это выглядит как поломка.
  'activity.weekendNotPriced': 'выходной с ребёнком — не оценивается',

  'period.today': 'Сегодня',
  'period.thisWeek': 'Эта неделя',
  'period.lastWeek': 'Прошлая неделя',
  'period.thisMonth': 'Этот месяц',
  'period.lastMonth': 'Прошлый месяц',
  'period.lastYear': 'Последние 12 месяцев',
  'period.allTime': 'Всё время',
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

  'timer.modeSimple': 'Обычный',
  'timer.modePomodoro': '🍅 Помидор',
  'timer.modeLabel': 'Режим таймера',
  'timer.pomodoroHint':
    '25 минут работы, потом 5 минут перерыва. После четвёртого помидора — длинный перерыв 15 минут. Перерывы в учтённое время не идут.',

  'pomodoro.phase.work': 'Работа',
  'pomodoro.phase.short_break': 'Короткий перерыв',
  'pomodoro.phase.long_break': 'Длинный перерыв',
  'pomodoro.done': 'Помидоров завершено',
  'pomodoro.counted': 'Засчитано работы',
  'pomodoro.workFinished': 'Помидор завершён. Пора отдохнуть.',
  'pomodoro.breakFinished': 'Перерыв окончен. Готовы продолжить?',
  'pomodoro.startBreak': 'Перерыв',
  'pomodoro.startWork': 'Следующий помидор',
  'pomodoro.skipBreak': 'Пропустить перерыв',
  'pomodoro.finish': 'Завершить задачу',
  'pomodoro.soundOn': 'Звук включён',
  'pomodoro.soundOff': 'Звук выключен',

  'planner.prevWeek': '← Прошлая неделя',
  'planner.nextWeek': 'Следующая неделя →',
  'planner.thisWeek': 'Текущая неделя',
  'planner.addTask': 'Добавить задачу',
  'planner.plannedTime': 'Ваше время на задачу',
  // Правило одно: считается время ВЗРОСЛОГО, а не длительность события.
  // Но понимается оно только на своём примере, поэтому фраза у каждой
  // категории своя.
  'planner.plannedTimeHint.default':
    'Сколько времени задача займёт у вас. Если только отвезти и уехать — оставьте пусто, посчитается одна дорога.',
  'planner.plannedTimeHint.work':
    'Сколько времени вы будете работать. Дорогу до места укажите отдельно, в поле ниже.',
  'planner.plannedTimeHint.study':
    'Сколько времени вы просидите за учёбой. Занятие с преподавателем считайте по своему присутствию, а не по расписанию.',
  'planner.plannedTimeHint.household':
    'Сколько времени займёт само дело. Дорогу до магазина или мастерской укажите отдельно, в поле ниже.',
  'planner.plannedTimeHint.childcare':
    'Сколько времени задача займёт У ВАС, а не сколько ребёнок пробудет на занятии. Отвезли и уехали домой — оставьте пусто, посчитается одна дорога.',
  'planner.plannedTimeHint.admin':
    'Сколько времени займут звонки, формы и переписка. Ожидание в очереди тоже считается: вы в это время заняты.',
  'planner.noTasks': 'Задач нет',
  'planner.done': 'Выполнено',
  'planner.markDone': 'Отметить выполненной',
  'planner.actualTime': 'Фактически потрачено',
  'planner.plan': 'план',
  'planner.fact': 'факт',
  'planner.longer': 'дольше плана на',
  'planner.shorter': 'быстрее плана на',
  'planner.onPlan': 'ровно по плану',
  'planner.weekTotal': 'Итого за неделю',
  'planner.addFor': 'Добавить на этот день',

  'activity.address': 'Адрес',
  'activity.addressPlaceholder': 'Например: ул. Ленина 5, музыкальная школа',
  'activity.travel': 'Дорога туда и обратно',
  'activity.travelHint':
    'Время в дороге считается трудом и входит в стоимость — в том числе отрезки без ребёнка: нанятая няня выставила бы счёт и за них.',

  'travel.oneWay': 'Дорога в одну сторону, минут',
  'travel.shape': 'Как ездили',
  'travel.legs.1': 'Только туда (по пути)',
  'travel.legs.2': 'Туда и обратно',
  'travel.legs.4': 'Отвезти и забрать (4 конца)',
  'travel.total': 'Всего в дороге',

  'planner.unassigned': 'Ничья задача',
  'planner.unassignedHint': 'Кто сделает — тот и отметит, задача станет его.',
  'planner.assignedTo': 'Назначено',
  'planner.claim': 'Это сделаю я',
  'planner.forWhom': 'Кто делает',
  'planner.nobody': '— договоримся потом —',
  'planner.onlyAdultsCanClaim': 'Забрать общую задачу может только взрослый.',
  'planner.edit': 'Изменить',
  'planner.editTitle': 'Изменить задачу',
  'planner.childTask': 'Задача ребёнка',
  'planner.childTaskHint': 'Останется записанной на ребёнка, кто бы ни отметил выполнение.',

  'recurring.title': 'Повторяющиеся события',
  'recurring.hint':
    'Например: каждую субботу у Саши занятие. Задача сама появится в Планере в нужный день.',
  'recurring.weekday': 'День недели',
  'recurring.add': 'Добавить повтор',
  'recurring.none': 'Повторяющихся событий пока нет.',
  'recurring.remove': 'Убрать повтор',
  'recurring.every': 'каждый',
  'recurring.everyFeminine': 'каждую',
  'recurring.repeatWeekly': 'Повторять каждую неделю',
  'recurring.repeatWeeklyHint':
    'Задача будет сама появляться в этот день недели. Убрать повтор можно в карточке «Повторяющиеся события» вверху страницы.',
  'recurring.createdAsRule': 'Задача добавлена как повторяющаяся',

  // ── Похожие записи ──────────────────────────────────────────────
  'duplicate.title': 'Похоже, такая запись за этот день уже есть',
  'duplicate.plannedLead': 'Незакрытая задача на этот день:',
  'duplicate.doneLead': 'Уже записано за этот день:',
  'duplicate.completeThis': 'Это она — отметить выполненной',
  'duplicate.saveAnyway': 'Нет, это отдельное дело — записать',
  'duplicate.keepEditing': 'Вернуться к форме',
  'duplicate.completed': 'Задача отмечена выполненной.',

  // Отдельные фразы «каждый/каждую/каждое X»: в русском нужен
  // винительный падеж, и род у дней недели разный. Склеивать
  // «каждую» + «суббота» нельзя — получается «каждую суббота».
  'weekday.every.1': 'каждый понедельник',
  'weekday.every.2': 'каждый вторник',
  'weekday.every.3': 'каждую среду',
  'weekday.every.4': 'каждый четверг',
  'weekday.every.5': 'каждую пятницу',
  'weekday.every.6': 'каждую субботу',
  'weekday.every.7': 'каждое воскресенье',

  'weekday.1': 'понедельник',
  'weekday.2': 'вторник',
  'weekday.3': 'среда',
  'weekday.4': 'четверг',
  'weekday.5': 'пятница',
  'weekday.6': 'суббота',
  'weekday.7': 'воскресенье',

  'settings.roleTitle': 'Моя роль в семье',
  'settings.roleHint':
    'Взрослый может забирать себе общие задачи семьи. У ребёнка остаются только свои.',
  'settings.roleAdult': 'Взрослый',
  'settings.roleChild': 'Ребёнок',

  'dashboard.today': 'Сегодня',
  'dashboard.week': 'Эта неделя',
  'dashboard.month': 'Этот месяц',
  'dashboard.byCategory': 'Распределение времени по категориям',
  'dashboard.byCategoryPeriod': 'за эту неделю',
  'dashboard.noData': 'За этот период записей пока нет.',

  'family.tableTitle': 'Кто сколько времени потратил',
  'family.person': 'Пользователь',
  'family.work': 'Работа',
  'family.study': 'Учёба',
  'family.household': 'Быт',
  'family.childcare': 'Ребёнок',
  'family.admin': 'Дела',
  'family.totalHours': 'Всего часов',
  'family.marketValue': 'Оценка труда',
  'family.earnings': 'Заработано',
  'family.compareTitle': 'Сравнение по людям',
  'family.compareHint': 'Длина полосы — общее время, цвет внутри — распределение по категориям.',
  'family.timelineTitle': 'Как прошла неделя',
  'family.timelineHint': 'Сколько часов в день потратил каждый.',
  'family.noPeople': 'В семье пока нет ни одного зарегистрированного пользователя.',

  'settings.ratesTitle': 'Ставки London Market Rates',
  'settings.ratesHint':
    'Изменение ставки влияет только на будущие записи. Уже сохранённые хранят свою копию ставки и не пересчитываются.',
  'settings.rateName': 'Тип работы',
  'settings.rateValue': 'Ставка в час',
  'settings.rateActive': 'Показывать',
  'settings.addRate': 'Добавить тип работы',
  'settings.addRateName': 'Название услуги',
  'settings.addRateNamePlaceholder': 'Например: Dog Walker',
  'settings.currency': 'Валюта',
  'settings.currencyWarning':
    'Смена валюты меняет только значок. Суммы не пересчитываются по курсу — курс приложению взять неоткуда.',
  'settings.currencyChange': 'Сменить валюту',

  'settings.subcategoriesTitle': 'Виды работы и их ставки',
  'settings.subcategoriesHint':
    'Вид работы без ставки деньгами не оценивается — так устроены «Работа» и «Учёба».',
  'settings.noRate': '— без денежной оценки —',
  'settings.addSubcategory': 'Добавить вид работы',
  'settings.addSubcategoryName': 'Название',
  'settings.addSubcategoryNamePlaceholder': 'Например: полив цветов',

  'settings.error.nameRequired': 'Введите название.',
  'settings.error.rateRequired': 'Ставка должна быть больше нуля.',
  'settings.error.categoryRequired': 'Выберите категорию.',
  'settings.saved': 'Сохранено',

  'report.week': 'За неделю',
  'report.month': 'За месяц',
  'report.prev': '← Раньше',
  'report.next': 'Позже →',
  'report.current': 'Текущий период',
  'report.totalTime': 'Всего времени',
  'report.estimatedValue': 'Estimated Market Value',
  'report.earned': 'Заработано (зарплата)',
  'money.bothHint':
    'Заработок и оценка неоплачиваемого труда показаны отдельно. Складывать их нельзя: первое — реальные деньги, второе — сколько стоило бы купить эту работу.',
  'report.familyTotal': 'Итого по семье',
  'report.noData': 'За этот период записей нет.',
  'report.unpaidShare': 'из них неоплачиваемый труд',
  'report.print': 'Распечатать',
} as const

/**
 * Английский словарь. Тип Record<...> заставляет TypeScript проверить,
 * что здесь есть КАЖДЫЙ ключ из русского словаря — забыть перевод нельзя.
 */
export const en: Record<keyof typeof ru, string> = {
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

  'theme.label': 'Appearance',
  'theme.forest': 'Light — wood elves',
  'theme.moon': 'Dark — moon elves',

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

  'money.mixedWarning':
    'Careful: entries in this period use different currencies. Adding them together is not meaningful, so the total is only indicative. This happens after changing the currency in settings: older entries keep the previous one.',

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
  'activity.error.timeOrTravelRequired':
    'Enter either your time on the task or the travel time — at least one of the two.',
  'activity.error.timeTooLong': 'A day has 24 hours. Please check the time you entered.',
  'activity.error.saveFailed': 'Could not save the entry:',

  'activity.todayTitle': "Today's entries",
  'activity.empty': 'Nothing logged today yet. Add your first entry with the form above.',
  'activity.loadFailed': 'Could not load the entries:',
  'activity.notPriced': 'no market value',
  'activity.weekendNotPriced': 'weekend with the child — not priced',

  'period.today': 'Today',
  'period.thisWeek': 'This week',
  'period.lastWeek': 'Last week',
  'period.thisMonth': 'This month',
  'period.lastMonth': 'Last month',
  'period.lastYear': 'Last 12 months',
  'period.allTime': 'All time',
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

  'timer.modeSimple': 'Plain',
  'timer.modePomodoro': '🍅 Pomodoro',
  'timer.modeLabel': 'Timer mode',
  'timer.pomodoroHint':
    '25 minutes of work, then a 5 minute break. After the fourth pomodoro, a 15 minute long break. Breaks are not counted as time worked.',

  'pomodoro.phase.work': 'Work',
  'pomodoro.phase.short_break': 'Short break',
  'pomodoro.phase.long_break': 'Long break',
  'pomodoro.done': 'Pomodoros completed',
  'pomodoro.counted': 'Work counted',
  'pomodoro.workFinished': 'Pomodoro finished. Time for a break.',
  'pomodoro.breakFinished': 'Break is over. Ready to continue?',
  'pomodoro.startBreak': 'Take a break',
  'pomodoro.startWork': 'Next pomodoro',
  'pomodoro.skipBreak': 'Skip the break',
  'pomodoro.finish': 'Finish task',
  'pomodoro.soundOn': 'Sound on',
  'pomodoro.soundOff': 'Sound off',

  'planner.prevWeek': '← Last week',
  'planner.nextWeek': 'Next week →',
  'planner.thisWeek': 'This week',
  'planner.addTask': 'Add task',
  'planner.plannedTime': 'Your time on the task',
  'planner.plannedTimeHint.default':
    'How long the task takes you. Just dropping off and leaving — leave it empty and only travel counts.',
  'planner.plannedTimeHint.work':
    'How long you will be working. Put the journey there in the field below.',
  'planner.plannedTimeHint.study':
    'How long you will actually be studying. For a class with a tutor, count your own attendance, not the timetable.',
  'planner.plannedTimeHint.household':
    'How long the task itself takes. Put the journey to the shop or workshop in the field below.',
  'planner.plannedTimeHint.childcare':
    'How long the task takes YOU, not how long the child stays at the class. Dropped off and went home — leave it empty and only travel counts.',
  'planner.plannedTimeHint.admin':
    'How long the calls, forms and correspondence take. Waiting in a queue counts too: your time is taken either way.',
  'planner.noTasks': 'No tasks',
  'planner.done': 'Done',
  'planner.markDone': 'Mark as done',
  'planner.actualTime': 'Time actually spent',
  'planner.plan': 'plan',
  'planner.fact': 'actual',
  'planner.longer': 'longer than planned by',
  'planner.shorter': 'faster than planned by',
  'planner.onPlan': 'exactly as planned',
  'planner.weekTotal': 'Week total',
  'planner.addFor': 'Add for this day',

  'activity.address': 'Address',
  'activity.addressPlaceholder': 'For example: 5 Lenin St, music school',
  'activity.travel': 'Travel there and back',
  'activity.travelHint':
    'Travel counts as work and is included in the value — including the legs without the child: a hired nanny would bill for those too.',

  'travel.oneWay': 'One-way travel, minutes',
  'travel.shape': 'Trip shape',
  'travel.legs.1': 'One way only (en route)',
  'travel.legs.2': 'There and back',
  'travel.legs.4': 'Drop off and pick up (4 legs)',
  'travel.total': 'Travel total',

  'planner.unassigned': 'Unassigned',
  'planner.unassignedHint': 'Whoever does it marks it done, and it becomes theirs.',
  'planner.assignedTo': 'Assigned to',
  'planner.claim': "I'll do this one",
  'planner.forWhom': 'Who does it',
  'planner.nobody': '— decide later —',
  'planner.onlyAdultsCanClaim': 'Only an adult can take a shared task.',
  'planner.edit': 'Edit',
  'planner.editTitle': 'Edit task',
  'planner.childTask': "Child's task",
  'planner.childTaskHint': 'Stays recorded to the child, whoever marks it done.',

  'recurring.title': 'Repeating events',
  'recurring.hint':
    'For example: Sasha has a class every Saturday. The task appears in the planner on that day by itself.',
  'recurring.weekday': 'Day of the week',
  'recurring.add': 'Add a repeat',
  'recurring.none': 'No repeating events yet.',
  'recurring.remove': 'Remove repeat',
  'recurring.every': 'every',
  'recurring.everyFeminine': 'every',
  'recurring.repeatWeekly': 'Repeat every week',
  'recurring.repeatWeeklyHint':
    'The task will appear on this weekday by itself. You can stop it in the “Repeating events” card at the top of the page.',
  'recurring.createdAsRule': 'Task added as a repeating one',

  'duplicate.title': 'It looks like you already have this for that day',
  'duplicate.plannedLead': 'Open task for that day:',
  'duplicate.doneLead': 'Already recorded for that day:',
  'duplicate.completeThis': 'That’s the one — mark it done',
  'duplicate.saveAnyway': 'No, this is separate — record it',
  'duplicate.keepEditing': 'Back to the form',
  'duplicate.completed': 'Task marked as done.',

  'weekday.every.1': 'every Monday',
  'weekday.every.2': 'every Tuesday',
  'weekday.every.3': 'every Wednesday',
  'weekday.every.4': 'every Thursday',
  'weekday.every.5': 'every Friday',
  'weekday.every.6': 'every Saturday',
  'weekday.every.7': 'every Sunday',

  'weekday.1': 'Monday',
  'weekday.2': 'Tuesday',
  'weekday.3': 'Wednesday',
  'weekday.4': 'Thursday',
  'weekday.5': 'Friday',
  'weekday.6': 'Saturday',
  'weekday.7': 'Sunday',

  'settings.roleTitle': 'My role in the family',
  'settings.roleHint':
    'An adult can take shared family tasks. A child keeps only their own.',
  'settings.roleAdult': 'Adult',
  'settings.roleChild': 'Child',

  'dashboard.today': 'Today',
  'dashboard.week': 'This week',
  'dashboard.month': 'This month',
  'dashboard.byCategory': 'Time by category',
  'dashboard.byCategoryPeriod': 'this week',
  'dashboard.noData': 'Nothing logged in this period yet.',

  'family.tableTitle': 'Who spent how much time',
  'family.person': 'Person',
  'family.work': 'Work',
  'family.study': 'Study',
  'family.household': 'Home',
  'family.childcare': 'Child',
  'family.admin': 'Admin',
  'family.totalHours': 'Total hours',
  'family.marketValue': 'Market value',
  'family.earnings': 'Earned',
  'family.compareTitle': 'Side by side',
  'family.compareHint': 'Bar length is total time; the colours inside split it by category.',
  'family.timelineTitle': 'How the week went',
  'family.timelineHint': 'Hours per day for each person.',
  'family.noPeople': 'No one has registered in this family yet.',

  'settings.ratesTitle': 'London market rates',
  'settings.ratesHint':
    'Changing a rate affects future entries only. Saved entries keep their own copy of the rate and are never recalculated.',
  'settings.rateName': 'Type of work',
  'settings.rateValue': 'Hourly rate',
  'settings.rateActive': 'Show',
  'settings.addRate': 'Add a type of work',
  'settings.addRateName': 'Service name',
  'settings.addRateNamePlaceholder': 'For example: Dog Walker',
  'settings.currency': 'Currency',
  'settings.currencyWarning':
    'Changing the currency swaps the symbol only. Amounts are not converted — the app has no exchange rate.',
  'settings.currencyChange': 'Change currency',

  'settings.subcategoriesTitle': 'Types of work and their rates',
  'settings.subcategoriesHint':
    'A type of work with no rate is not valued in money — that is how Work and Study are set up.',
  'settings.noRate': '— no market value —',
  'settings.addSubcategory': 'Add a type of work',
  'settings.addSubcategoryName': 'Name',
  'settings.addSubcategoryNamePlaceholder': 'For example: watering the plants',

  'settings.error.nameRequired': 'Enter a name.',
  'settings.error.rateRequired': 'The rate must be greater than zero.',
  'settings.error.categoryRequired': 'Choose a category.',
  'settings.saved': 'Saved',

  'report.week': 'Weekly',
  'report.month': 'Monthly',
  'report.prev': '← Earlier',
  'report.next': 'Later →',
  'report.current': 'Current period',
  'report.totalTime': 'Total time',
  'report.estimatedValue': 'Estimated Market Value',
  'report.earned': 'Earned (salary)',
  'money.bothHint':
    'Earnings and the estimated value of unpaid labour are shown separately. They must not be added up: the first is real money, the second is what buying that work would cost.',
  'report.familyTotal': 'Family total',
  'report.noData': 'No entries for this period.',
  'report.unpaidShare': 'of which unpaid labour',
  'report.print': 'Print',
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
