import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

/**
 * Единая точка подключения к базе данных.
 *
 * Клиент создаётся ОДИН раз на всё приложение и импортируется везде,
 * где нужны данные. Если создавать его в каждом компоненте, приложение
 * потеряет сессию пользователя при каждой перерисовке.
 *
 * Адрес и ключ берутся из файла .env.local — в коде их не пишем,
 * чтобы при переезде с локальной базы в облако менялся один файл,
 * а не десятки строк кода.
 *
 * Префикс VITE_ обязателен: Vite отдаёт браузеру только такие переменные.
 * Это защита от случайной утечки серверных секретов в код страницы.
 */
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// Понятная ошибка вместо загадочного «undefined» где-то в глубине приложения.
if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Не заданы VITE_SUPABASE_URL и VITE_SUPABASE_ANON_KEY. ' +
      'Проверь файл .env.local в корне проекта и перезапусти контейнер.',
  )
}

// <Database> — типы, сгенерированные из настоящей структуры базы командой
// `npx supabase gen types typescript --local`. Благодаря им редактор
// подсказывает имена таблиц и колонок, а опечатка вроде 'activites'
// или обращение к несуществующему полю станут ошибкой ещё до запуска.
// ВАЖНО: после каждой новой миграции типы нужно генерировать заново.
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    // Сохранять сессию в браузере, чтобы вход не слетал при перезагрузке страницы.
    persistSession: true,
    // Молча обновлять токен до истечения срока — пользователь не заметит.
    autoRefreshToken: true,
  },
})
