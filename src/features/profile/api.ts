import { supabase } from '@/lib/supabase'
import type { Profile } from '@/types/models'

/**
 * Профили членов семьи.
 *
 * Почему берём имя отсюда, а не из данных сессии: в сессии лежит копия
 * имени на момент входа. Если человек переименует себя, сессия останется
 * со старым именем до следующего входа. Таблица profiles — источник правды.
 */

/** Профиль текущего пользователя. */
export async function fetchMyProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    // maybeSingle возвращает одну строку или null.
    // Обычный single() считал бы отсутствие строки ошибкой, а для нас
    // это нормальный случай — профиль мог ещё не успеть создаться.
    .maybeSingle()

  if (error) throw new Error(error.message)
  return data
}

/** Все профили семьи — нужны для общих таблиц и графиков. */
export async function fetchAllProfiles(): Promise<Profile[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: true })

  if (error) throw new Error(error.message)
  return data ?? []
}
