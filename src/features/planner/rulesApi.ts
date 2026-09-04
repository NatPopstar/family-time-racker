import { supabase } from '@/lib/supabase'
import type { RecurringRule } from '@/types/models'

/**
 * Повторяющиеся события.
 *
 * Правило хранится ОДНОЙ строкой-шаблоном: «каждую субботу — занятие
 * у Саши, ехать 30 минут». Задачи на конкретные дни создаются из него
 * по мере надобности, когда человек открывает Планер.
 *
 * Почему не копии на месяц вперёд: тогда правку («занятие перенесли
 * на воскресенье») пришлось бы разносить по всем копиям вручную.
 */

/** Все правила семьи. Их немного, поэтому берём разом. */
export async function fetchRecurringRules(): Promise<RecurringRule[]> {
  const { data, error } = await supabase
    .from('recurring_rules')
    .select('*')
    .eq('is_active', true)
    .order('weekday', { ascending: true })

  if (error) throw new Error(error.message)
  return data ?? []
}

export async function createRecurringRule(input: {
  createdBy: string
  subcategoryId: string
  title: string
  address: string | null
  weekday: number
  plannedMinutes: number
  travelMinutes: number
  /** NULL — задача появится ничьей, её заберёт тот, кто реально сделал. */
  defaultUserId: string | null
}): Promise<void> {
  const { error } = await supabase.from('recurring_rules').insert({
    created_by: input.createdBy,
    subcategory_id: input.subcategoryId,
    title: input.title.trim(),
    address: input.address?.trim() || null,
    weekday: input.weekday,
    planned_minutes: input.plannedMinutes,
    travel_minutes: input.travelMinutes,
    default_user_id: input.defaultUserId,
  })

  if (error) throw new Error(error.message)
}

/**
 * Выключает правило, не удаляя его.
 *
 * Удаление оборвало бы связь с уже созданными задачами. Выключенное
 * правило просто перестаёт подставлять новые.
 */
export async function deactivateRecurringRule(id: string): Promise<void> {
  const { error } = await supabase
    .from('recurring_rules')
    .update({ is_active: false })
    .eq('id', id)

  if (error) throw new Error(error.message)
}

/**
 * Создаёт задачи из правил на указанные дни.
 *
 * Вызывается при открытии Планера. Дубли не страшны: в базе стоит
 * уникальный индекс «одно правило — одна задача в день», поэтому
 * даже одновременное открытие Планера двумя людьми не создаст
 * две одинаковые задачи.
 *
 * upsert с ignoreDuplicates говорит базе «вставь, а если такая уже
 * есть — молча пропусти». Без него пришлось бы сначала спрашивать,
 * что там есть, а между вопросом и вставкой всё равно оставалась бы щель.
 */
export async function materialiseRules(params: {
  rules: RecurringRule[]
  /** Даты недели, 'YYYY-MM-DD', понедельник первым. */
  days: string[]
}): Promise<void> {
  const rows = params.rules.flatMap((rule) => {
    // weekday: 1 — понедельник, значит индекс в массиве дней это weekday - 1.
    const date = params.days[rule.weekday - 1]
    if (!date) return []

    return [
      {
        // NULL — «договоритесь сами»: задача ничья, пока кто-то не отметит.
        user_id: rule.default_user_id,
        subcategory_id: rule.subcategory_id,
        title: rule.title,
        address: rule.address,
        date,
        planned_minutes: rule.planned_minutes,
        travel_minutes: rule.travel_minutes,
        status: 'planned' as const,
        recurring_rule_id: rule.id,
      },
    ]
  })

  if (rows.length === 0) return

  const { error } = await supabase
    .from('activities')
    .upsert(rows, { onConflict: 'recurring_rule_id,date', ignoreDuplicates: true })

  if (error) throw new Error(error.message)
}

/** Что можно поменять в запланированной задаче. */
export type EditPlannedInput = {
  title: string
  date: string
  plannedMinutes: number
  travelMinutes: number
  address: string | null
  subcategoryId: string
  /** NULL — сделать задачу общей. */
  userId: string | null
}

/**
 * Правит запланированную задачу.
 *
 * Менять её может любой взрослый, пока она не выполнена: это
 * договорённость семьи, а не чья-то личная запись. Право проверяет
 * сама база.
 *
 * Ставку здесь НЕ трогаем: работа ещё не сделана, замораживать нечего.
 * Она встанет в момент отметки о выполнении.
 */
export async function updatePlannedActivity(
  id: string,
  input: EditPlannedInput,
): Promise<void> {
  const { error } = await supabase
    .from('activities')
    .update({
      title: input.title.trim(),
      date: input.date,
      planned_minutes: input.plannedMinutes,
      travel_minutes: input.travelMinutes,
      address: input.address?.trim() || null,
      subcategory_id: input.subcategoryId,
      user_id: input.userId,
    })
    .eq('id', id)

  if (error) throw new Error(error.message)
}

/**
 * Забирает ничью задачу себе.
 *
 * Это и есть «кто отвёз, тот и отметил»: задача появилась без хозяина,
 * а человек, который её выполнил, назначает её на себя.
 * Право на это база проверяет сама — забрать общую задачу
 * может только взрослый.
 */
export async function claimActivity(params: {
  activityId: string
  userId: string
}): Promise<void> {
  const { error } = await supabase
    .from('activities')
    .update({ user_id: params.userId })
    .eq('id', params.activityId)

  if (error) throw new Error(error.message)
}
