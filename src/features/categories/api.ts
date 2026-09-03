import { supabase } from '@/lib/supabase'
import type { Category, Subcategory } from '@/types/models'

/**
 * Запросы к справочникам категорий.
 *
 * Все обращения к базе живут в файлах api.ts внутри своей папки-функции.
 * Компоненты не обращаются к базе напрямую — так при смене базы
 * придётся править несколько файлов, а не всё приложение.
 */

/** Подкатегория вместе со своей ставкой (или без неё — тогда market_rates = null). */
export type SubcategoryWithRate = Subcategory & {
  market_rates: { name: string; hourly_rate: number; currency: string } | null
}

/** Четыре главные категории, по порядку сортировки. */
export async function fetchCategories(): Promise<Category[]> {
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .order('sort_order', { ascending: true })

  // Supabase не выбрасывает исключение сам — ошибку он возвращает в поле error.
  // Бросаем её вручную, чтобы React Query показал состояние «ошибка».
  if (error) throw new Error(error.message)
  return data ?? []
}

/** Подкатегории (виды труда) — только активные. */
export async function fetchSubcategories(): Promise<Subcategory[]> {
  const { data, error } = await supabase
    .from('subcategories')
    .select('*')
    .eq('is_active', true)
    .order('sort_order', { ascending: true })

  if (error) throw new Error(error.message)
  return data ?? []
}

/**
 * Подкатегории вместе со ставками — одним запросом.
 *
 * Запись `market_rates (...)` в select — это связанная таблица.
 * Supabase видит внешний ключ subcategories.rate_id и подставляет
 * данные ставки прямо внутрь строки. Без этого пришлось бы делать
 * два запроса и сшивать результаты руками.
 *
 * Ставка нужна нам в момент сохранения задачи: её копию мы «замораживаем»
 * в самой записи, чтобы будущее изменение ставок не переписало прошлые отчёты.
 */
export async function fetchSubcategoriesWithRates(): Promise<SubcategoryWithRate[]> {
  const { data, error } = await supabase
    .from('subcategories')
    .select('*, market_rates ( name, hourly_rate, currency )')
    .eq('is_active', true)
    .order('sort_order', { ascending: true })

  if (error) throw new Error(error.message)
  return (data ?? []) as SubcategoryWithRate[]
}
