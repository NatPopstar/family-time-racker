import { supabase } from '@/lib/supabase'
import type { MarketRate } from '@/types/models'

/**
 * Настройки: ставки London Market Rates и виды работы.
 *
 * Ставки лежат в отдельной таблице и НЕ зашиты в код — именно поэтому
 * их можно менять отсюда. Важно помнить: изменение ставки влияет только
 * на БУДУЩИЕ записи. Уже сохранённые хранят свою копию ставки
 * (rate_snapshot) и не пересчитываются.
 */

/** Все ставки, включая скрытые — в настройках нужно видеть всё. */
export async function fetchMarketRates(): Promise<MarketRate[]> {
  const { data, error } = await supabase
    .from('market_rates')
    .select('*')
    .order('name', { ascending: true })

  if (error) throw new Error(error.message)
  return data ?? []
}

/** Меняет размер ставки. */
export async function updateMarketRate(params: {
  id: string
  hourlyRate: number
}): Promise<void> {
  const { error } = await supabase
    .from('market_rates')
    .update({ hourly_rate: params.hourlyRate })
    .eq('id', params.id)

  if (error) throw new Error(error.message)
}

/** Добавляет новый вид оплачиваемой услуги — новую «профессию». */
export async function createMarketRate(params: {
  name: string
  hourlyRate: number
  currency: string
}): Promise<void> {
  const { error } = await supabase.from('market_rates').insert({
    name: params.name.trim(),
    hourly_rate: params.hourlyRate,
    currency: params.currency,
  })

  if (error) throw new Error(error.message)
}

/**
 * Меняет валюту СРАЗУ У ВСЕХ ставок.
 *
 * ⚠️ Суммы при этом НЕ пересчитываются: £20 превращается в 20 евро,
 * а не в эквивалент по курсу. Это осознанное решение — курс валют
 * нам взять неоткуда, а тихий пересчёт по выдуманному курсу был бы
 * хуже честной замены значка. Интерфейс предупреждает об этом прямо.
 */
export async function changeCurrency(currency: string): Promise<void> {
  const { error } = await supabase
    .from('market_rates')
    .update({ currency })
    // Условие «id не пустой» истинно для всех строк: Supabase требует
    // хотя бы один фильтр, чтобы случайно не обновить всю таблицу.
    .not('id', 'is', null)

  if (error) throw new Error(error.message)
}

/** Прячет или показывает ставку, не удаляя её. */
export async function setRateActive(params: { id: string; isActive: boolean }): Promise<void> {
  const { error } = await supabase
    .from('market_rates')
    .update({ is_active: params.isActive })
    .eq('id', params.id)

  if (error) throw new Error(error.message)
}

/** Добавляет новый вид работы внутрь категории. */
export async function createSubcategory(params: {
  categoryId: string
  name: string
  rateId: string | null
}): Promise<void> {
  const { error } = await supabase.from('subcategories').insert({
    category_id: params.categoryId,
    name: params.name.trim(),
    // NULL означает «деньгами не оценивается» — как у работы и учёбы.
    rate_id: params.rateId,
  })

  if (error) throw new Error(error.message)
}

/** Привязывает существующий вид работы к другой ставке (или снимает ставку). */
export async function setSubcategoryRate(params: {
  subcategoryId: string
  rateId: string | null
}): Promise<void> {
  const { error } = await supabase
    .from('subcategories')
    .update({ rate_id: params.rateId })
    .eq('id', params.subcategoryId)

  if (error) throw new Error(error.message)
}
