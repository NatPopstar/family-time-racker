import { supabase } from '@/lib/supabase'
import type { ActivityInsert, ActivityUpdate, ActivityWithValue } from '@/types/models'
import type { SubcategoryWithRate } from '@/features/categories/api'

/**
 * Записи о потраченном времени — сердце приложения.
 */

/** Данные, которые вводит человек в форме. */
export type NewActivityInput = {
  userId: string
  subcategory: SubcategoryWithRate
  title: string
  /** Дата в виде 'YYYY-MM-DD'. */
  date: string
  /** Фактически потраченное время в минутах. */
  actualMinutes: number
  comment?: string
  /** Адрес, куда ездили. Нужен для повторяющихся занятий ребёнка. */
  address?: string | null
  /** Время в дороге в ОДНУ сторону. */
  travelOneWayMinutes?: number
  /** Сколько отрезков пути: 1, 2 или 4. Общее время база считает сама. */
  travelLegs?: number
}

/**
 * СОБИРАЕТ ЗАПИСЬ ДЛЯ БАЗЫ — самое важное место всей Фазы 4.
 *
 * Вынесено в отдельную функцию без обращений к сети специально:
 * такую функцию легко покрыть тестами, а «заморозка» ставки —
 * это правило, ошибка в котором тихо испортит всю денежную статистику.
 *
 * ПОЧЕМУ КОПИРУЕМ СТАВКУ В ЗАПИСЬ.
 * Если считать стоимость по текущей ставке из настроек, то, подняв
 * цену уборки с £20 до £25, ты задним числом перепишешь отчёты
 * за все прошлые месяцы — август внезапно «подорожает». Копия ставки
 * внутри записи делает историю неизменной, как чек из магазина.
 *
 * Если у подкатегории ставки нет (работа, учёба), кладём null —
 * и такая запись просто не участвует в денежном подсчёте.
 */
export function buildActivityInsert(input: NewActivityInput): ActivityInsert {
  const rate = input.subcategory.market_rates

  return {
    user_id: input.userId,
    subcategory_id: input.subcategory.id,
    title: input.title.trim(),
    date: input.date,
    actual_minutes: input.actualMinutes,
    // Задача записывается уже выполненной: человек отмечает то,
    // что сделал. Планирование заранее появится в разделе «Планер».
    status: 'done',
    completed_at: new Date().toISOString(),
    // Пустой комментарий храним как null, а не как пустую строку:
    // так в базе одно значение «ничего нет» вместо двух разных.
    comment: input.comment?.trim() || null,
    address: input.address?.trim() || null,
    // travel_minutes база вычисляет сама как одна сторона × отрезки,
    // поэтому пишем только исходные значения.
    travel_one_way_minutes: input.travelOneWayMinutes ?? 0,
    travel_legs: input.travelLegs ?? 2,
    rate_snapshot: rate ? rate.hourly_rate : null,
    currency_snapshot: rate ? rate.currency : null,
  }
}

/** Сохраняет новую запись и возвращает её вместе с посчитанной стоимостью. */
export async function createActivity(input: NewActivityInput): Promise<void> {
  const { error } = await supabase.from('activities').insert(buildActivityInsert(input))

  if (error) throw new Error(error.message)
}

/**
 * Записи за период, из представления v_activity_value —
 * оно уже содержит посчитанную стоимость и названия категорий.
 *
 * Даты передаём строками 'YYYY-MM-DD' включительно с обеих сторон.
 */
export async function fetchActivities(params: {
  from: string
  to: string
  userId?: string
  /**
   * По умолчанию берём только ВЫПОЛНЕННЫЕ записи.
   *
   * Иначе в список попадал бы идущий прямо сейчас таймер: он лежит
   * в той же таблице со статусом 'planned' и нулевым временем,
   * и выглядел бы как испорченная запись. Запланированные задачи
   * показывает Планер, у него свой запрос.
   */
  status?: 'done' | 'planned' | 'all'
  /** Добавить к своим записям ещё и ничьи задачи семьи. Нужно Планеру. */
  includeUnassigned?: boolean
}): Promise<ActivityWithValue[]> {
  let query = supabase
    .from('v_activity_value')
    .select('*')
    .gte('date', params.from)
    .lte('date', params.to)
    .order('date', { ascending: false })

  const status = params.status ?? 'done'
  if (status !== 'all') {
    query = query.eq('status', status)
  }

  // Фильтр по пользователю необязательный: на семейном дашборде
  // нам нужны записи всех, на личном — только свои.
  if (params.userId) {
    if (params.includeUnassigned) {
      // Планеру нужны И свои задачи, И ничьи: иначе задача
      // «кто отвезёт — не решили» была бы не видна никому,
      // и забрать её стало бы некому.
      query = query.or(`user_id.eq.${params.userId},user_id.is.null`)
    } else {
      query = query.eq('user_id', params.userId)
    }
  }

  const { data, error } = await query

  if (error) throw new Error(error.message)
  return data ?? []
}

/** Что можно поменять в существующей записи. */
export type EditActivityInput = {
  title: string
  date: string
  actualMinutes: number
  comment?: string
  address?: string | null
  travelOneWayMinutes?: number
  travelLegs?: number
  /** Прежний вид работы — чтобы понять, менялся ли он. */
  previousSubcategoryId: string
  /** Выбранный сейчас вид работы. */
  subcategory: SubcategoryWithRate
}

/**
 * СОБИРАЕТ ПРАВКУ ЗАПИСИ — второе по важности место после «заморозки».
 *
 * Правило про ставку здесь тонкое, объясняю подробно.
 *
 * 1. Если человек поменял только время или название — ставку НЕ ТРОГАЕМ.
 *    Иначе исправление опечатки в минутах молча пересчитало бы старую
 *    запись по сегодняшней ставке, и прошлый отчёт изменился бы сам собой.
 *
 * 2. Если человек поменял ВИД РАБОТЫ (была уборка, оказалась готовка) —
 *    берём ставку нового вида работы. Прежняя ставка относилась
 *    к другой профессии и больше не имеет смысла.
 *
 * Возвращаем только те поля, которые меняем: Supabase обновит их,
 * а остальные оставит как есть.
 */
export function buildActivityUpdate(input: EditActivityInput): ActivityUpdate {
  const subcategoryChanged = input.previousSubcategoryId !== input.subcategory.id

  const base: ActivityUpdate = {
    title: input.title.trim(),
    date: input.date,
    actual_minutes: input.actualMinutes,
    comment: input.comment?.trim() || null,
    address: input.address?.trim() || null,
    travel_one_way_minutes: input.travelOneWayMinutes ?? 0,
    travel_legs: input.travelLegs ?? 2,
    subcategory_id: input.subcategory.id,
  }

  if (!subcategoryChanged) return base

  const rate = input.subcategory.market_rates
  return {
    ...base,
    rate_snapshot: rate ? rate.hourly_rate : null,
    currency_snapshot: rate ? rate.currency : null,
  }
}

/** Сохраняет правку записи. Чужую запись изменить не даст RLS в базе. */
export async function updateActivity(id: string, input: EditActivityInput): Promise<void> {
  const { error } = await supabase
    .from('activities')
    .update(buildActivityUpdate(input))
    .eq('id', id)

  if (error) throw new Error(error.message)
}

// ─────────────────────────────────────────────────────────────────────────
//  ПЛАНЕР: задачи, назначенные заранее
// ─────────────────────────────────────────────────────────────────────────

/**
 * Создаёт ЗАПЛАНИРОВАННУЮ задачу.
 *
 * Отличие от обычной записи: заполняем planned_minutes, а actual_minutes
 * оставляем пустым. Ставку тоже не ставим — работа ещё не сделана,
 * замораживать нечего.
 */
export async function createPlannedActivity(input: {
  /** NULL — общая задача семьи: кто сделает, тот и заберёт. */
  userId: string | null
  subcategoryId: string
  title: string
  date: string
  plannedMinutes: number
  address?: string | null
  travelOneWayMinutes?: number
  travelLegs?: number
}): Promise<void> {
  const { error } = await supabase.from('activities').insert({
    user_id: input.userId,
    subcategory_id: input.subcategoryId,
    title: input.title.trim(),
    date: input.date,
    planned_minutes: input.plannedMinutes,
    address: input.address?.trim() || null,
    travel_one_way_minutes: input.travelOneWayMinutes ?? 0,
    travel_legs: input.travelLegs ?? 2,
    status: 'planned',
  })

  if (error) throw new Error(error.message)
}

/**
 * Отмечает запланированную задачу выполненной.
 *
 * ГЛАВНОЕ: planned_minutes НЕ ТРОГАЕМ. План остаётся как был, факт
 * пишется отдельно. Именно ради этого сравнения («планировали час,
 * вышло час сорок») план и факт живут в разных полях.
 *
 * Ставку замораживаем здесь же — работа только что закончена.
 */
export async function completePlannedActivity(params: {
  activityId: string
  actualMinutes: number
  subcategory: SubcategoryWithRate
  /**
   * Кто отмечает. Если задача была ничьей, она становится его.
   * Это и есть правило «не договорились заранее — кто отвёз,
   * тот и отметил».
   */
  claimForUserId?: string | null
}): Promise<void> {
  const rate = params.subcategory.market_rates

  const patch: ActivityUpdate = {
    actual_minutes: params.actualMinutes,
    status: 'done',
    completed_at: new Date().toISOString(),
    rate_snapshot: rate ? rate.hourly_rate : null,
    currency_snapshot: rate ? rate.currency : null,
  }

  // user_id трогаем ТОЛЬКО когда его передали. Иначе отметка чужой
  // выполненной задачи молча переписала бы её владельца.
  if (params.claimForUserId) {
    patch.user_id = params.claimForUserId
  }

  const { error } = await supabase.from('activities').update(patch).eq('id', params.activityId)

  if (error) throw new Error(error.message)
}

// ─────────────────────────────────────────────────────────────────────────
//  ТАЙМЕР
// ─────────────────────────────────────────────────────────────────────────

/**
 * Сколько минут прошло с момента запуска таймера.
 *
 * Округляем ВВЕРХ и никогда не даём меньше одной минуты: если человек
 * запустил и через 20 секунд остановил, запись с нулём времени выглядела
 * бы как поломка. Отрицательное время (часы компьютера перевели назад)
 * тоже превращаем в минуту, а не в минус.
 */
export function elapsedMinutes(startedAt: string, now: Date = new Date()): number {
  const startedMs = new Date(startedAt).getTime()
  const diffMinutes = (now.getTime() - startedMs) / 60_000
  return Math.max(1, Math.ceil(diffMinutes))
}

/**
 * Запускает таймер: сразу создаёт запись со временем старта.
 *
 * Почему в базе, а не в памяти браузера: тогда таймер переживает
 * перезагрузку страницы и виден с другого устройства. Запись пока
 * со статусом 'planned' и без фактического времени — это «идёт сейчас».
 */
export async function startTimer(input: {
  userId: string
  subcategoryId: string
  title: string
  date: string
}): Promise<void> {
  const { error } = await supabase.from('activities').insert({
    user_id: input.userId,
    subcategory_id: input.subcategoryId,
    title: input.title.trim(),
    date: input.date,
    status: 'planned',
    timer_started_at: new Date().toISOString(),
  })

  if (error) throw new Error(error.message)
}

/**
 * Запускает ПОМИДОРНЫЙ таймер: первая фаза — работа.
 *
 * Отличие от обычного таймера только в двух полях: timer_phase
 * и pomodoros_done. Всё остальное — та же запись со статусом
 * «запланировано», которую мы завершим при остановке.
 */
export async function startPomodoro(input: {
  userId: string
  subcategoryId: string
  title: string
  date: string
}): Promise<void> {
  const { error } = await supabase.from('activities').insert({
    user_id: input.userId,
    subcategory_id: input.subcategoryId,
    title: input.title.trim(),
    date: input.date,
    status: 'planned',
    timer_started_at: new Date().toISOString(),
    timer_phase: 'work',
    pomodoros_done: 0,
    // Накопленное время работы держим прямо в actual_minutes:
    // отдельное поле не нужно, а при остановке ничего не придётся сшивать.
    actual_minutes: 0,
  })

  if (error) throw new Error(error.message)
}

/**
 * Переводит помидор в следующую фазу.
 *
 * workMinutesToAdd — сколько минут РАБОТЫ добавить к накопленным.
 * При переходе «работа → перерыв» это 25, при «перерыв → работа» — ноль.
 * Само число считает вызывающий код через чистые функции из lib/pomodoro.
 */
export async function advancePomodoro(params: {
  activityId: string
  toPhase: 'work' | 'short_break' | 'long_break'
  pomodorosDone: number
  accumulatedMinutes: number
}): Promise<void> {
  const { error } = await supabase
    .from('activities')
    .update({
      timer_phase: params.toPhase,
      pomodoros_done: params.pomodorosDone,
      actual_minutes: params.accumulatedMinutes,
      // Новая фаза начинается сейчас.
      timer_started_at: new Date().toISOString(),
    })
    .eq('id', params.activityId)

  if (error) throw new Error(error.message)
}

/**
 * Завершает помидорную задачу.
 *
 * Минуты сюда приходят уже посчитанными: перерывы исключены,
 * рабочие фазы ограничены 25 минутами. Ставку замораживаем здесь же —
 * работа только что закончилась.
 */
export async function stopPomodoro(params: {
  activityId: string
  totalMinutes: number
  subcategory: SubcategoryWithRate
}): Promise<void> {
  const rate = params.subcategory.market_rates

  const { error } = await supabase
    .from('activities')
    .update({
      // Минимум одна минута: запись с нулём выглядела бы поломкой.
      actual_minutes: Math.max(1, params.totalMinutes),
      status: 'done',
      completed_at: new Date().toISOString(),
      timer_started_at: null,
      timer_phase: null,
      rate_snapshot: rate ? rate.hourly_rate : null,
      currency_snapshot: rate ? rate.currency : null,
    })
    .eq('id', params.activityId)

  if (error) throw new Error(error.message)
}

/** Идущий сейчас таймер пользователя, если он есть. */
export async function fetchRunningTimer(userId: string): Promise<ActivityWithValue | null> {
  const { data, error } = await supabase
    .from('v_activity_value')
    .select('*')
    .eq('user_id', userId)
    // Признак «таймер идёт» — заполненное время старта.
    .not('timer_started_at', 'is', null)
    .order('timer_started_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) throw new Error(error.message)
  return data
}

/**
 * Останавливает таймер и превращает запись в выполненную.
 *
 * Ставку «замораживаем» именно СЕЙЧАС, в момент завершения работы —
 * так же, как при обычной записи. При запуске таймера мы её не знаем:
 * работа ещё не сделана.
 */
export async function stopTimer(params: {
  activityId: string
  startedAt: string
  subcategory: SubcategoryWithRate
}): Promise<void> {
  const rate = params.subcategory.market_rates

  const { error } = await supabase
    .from('activities')
    .update({
      actual_minutes: elapsedMinutes(params.startedAt),
      status: 'done',
      completed_at: new Date().toISOString(),
      // Обнуляем признак «идёт»: таймер больше не работает.
      timer_started_at: null,
      rate_snapshot: rate ? rate.hourly_rate : null,
      currency_snapshot: rate ? rate.currency : null,
    })
    .eq('id', params.activityId)

  if (error) throw new Error(error.message)
}

/** Удаляет запись. База сама не даст удалить чужую — этим занимается RLS. */
export async function deleteActivity(id: string): Promise<void> {
  const { error } = await supabase.from('activities').delete().eq('id', id)

  if (error) throw new Error(error.message)
}
