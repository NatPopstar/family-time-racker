import { supabase } from '@/lib/supabase'
import type { Category, Subcategory } from '@/types/models'

/**
 * Запросы к справочникам категорий.
 *
 * Все обращения к базе живут в файлах api.ts внутри своей папки-функции.
 * Компоненты не обращаются к базе напрямую — так при смене базы
 * придётся править несколько файлов, а не всё приложение.
 */

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
