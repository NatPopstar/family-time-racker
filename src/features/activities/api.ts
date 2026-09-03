import { supabase } from '@/lib/supabase'
import type { ActivityInsert, ActivityWithValue } from '@/types/models'
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
}): Promise<ActivityWithValue[]> {
  let query = supabase
    .from('v_activity_value')
    .select('*')
    .gte('date', params.from)
    .lte('date', params.to)
    .order('date', { ascending: false })

  // Фильтр по пользователю необязательный: на семейном дашборде
  // нам нужны записи всех, на личном — только свои.
  if (params.userId) {
    query = query.eq('user_id', params.userId)
  }

  const { data, error } = await query

  if (error) throw new Error(error.message)
  return data ?? []
}

/** Удаляет запись. База сама не даст удалить чужую — этим занимается RLS. */
export async function deleteActivity(id: string): Promise<void> {
  const { error } = await supabase.from('activities').delete().eq('id', id)

  if (error) throw new Error(error.message)
}
