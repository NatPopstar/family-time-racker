import { supabase } from '@/lib/supabase'
import type { TranslationKey } from '@/lib/i18n'

/**
 * Работа с входом и регистрацией.
 *
 * Пароли здесь нигде не хранятся и не логируются: мы передаём их
 * напрямую в Supabase, который хранит только необратимый хэш.
 */

/**
 * Ошибки Supabase приходят по-английски и техническим языком
 * («Invalid login credentials»). Переводим их в ключи наших переводов,
 * чтобы человек увидел понятное сообщение на своём языке.
 */
export function mapAuthError(message: string): TranslationKey {
  const text = message.toLowerCase()

  if (text.includes('invalid login credentials')) return 'auth.error.invalidCredentials'
  if (text.includes('already registered') || text.includes('already been registered')) {
    return 'auth.error.emailTaken'
  }
  if (text.includes('password') && text.includes('least')) return 'auth.error.weakPassword'

  return 'auth.error.generic'
}

/**
 * Регистрация.
 *
 * display_name кладём в options.data — оттуда его заберёт триггер в базе
 * (handle_new_user) и создаст строку в таблице profiles. Поэтому имя
 * попадает в профиль автоматически, отдельный запрос не нужен.
 */
export async function signUp(email: string, password: string, displayName: string) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { display_name: displayName },
    },
  })

  if (error) throw new Error(error.message)
  return data
}

/** Вход по почте и паролю. */
export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) throw new Error(error.message)
  return data
}

/** Выход. Supabase сам стирает сохранённую сессию из браузера. */
export async function signOut() {
  const { error } = await supabase.auth.signOut()
  if (error) throw new Error(error.message)
}
