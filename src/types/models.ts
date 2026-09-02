import type { Database } from './database'

/**
 * Короткие имена для типов из базы.
 *
 * Без этого файла в коде пришлось бы писать длинное
 *   Database['public']['Tables']['activities']['Row']
 * а с ним — просто Activity.
 *
 * Три варианта каждого типа, они разные не случайно:
 *   Row    — то, что база ОТДАЁТ (все поля заполнены)
 *   Insert — то, что мы ПОСЫЛАЕМ при создании (id и created_at
 *            база проставит сама, поэтому они необязательные)
 *   Update — то, что посылаем при изменении (все поля необязательные)
 */

type Tables = Database['public']['Tables']
type Views = Database['public']['Views']

export type Profile = Tables['profiles']['Row']
export type ProfileUpdate = Tables['profiles']['Update']

export type Category = Tables['categories']['Row']
export type Subcategory = Tables['subcategories']['Row']

export type MarketRate = Tables['market_rates']['Row']
export type MarketRateInsert = Tables['market_rates']['Insert']
export type MarketRateUpdate = Tables['market_rates']['Update']

export type Activity = Tables['activities']['Row']
export type ActivityInsert = Tables['activities']['Insert']
export type ActivityUpdate = Tables['activities']['Update']

/** Строка из представления v_activity_value — уже с посчитанной стоимостью. */
export type ActivityWithValue = Views['v_activity_value']['Row']

/**
 * Четыре главные категории. Эти значения зашиты в базе как slug
 * и не меняются, поэтому их удобно иметь как тип: если где-то
 * написать 'childcare ' с лишним пробелом, TypeScript это поймает.
 */
export type CategorySlug = 'work' | 'study' | 'household' | 'childcare'

/** Состояние задачи: запланирована или выполнена. */
export type ActivityStatus = 'planned' | 'done'
