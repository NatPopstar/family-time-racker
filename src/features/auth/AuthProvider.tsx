import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'

/**
 * Хранит ответ на вопрос «кто сейчас в системе» и раздаёт его всему приложению.
 *
 * Почему это отдельный провайдер, а не проверка в каждом компоненте:
 * состояние входа нужно очень многим местам (меню, защита страниц,
 * подстановка user_id в новые записи). Спрашивать Supabase из каждого
 * компонента — это лишние запросы и рассинхронизация.
 */

type AuthValue = {
  session: Session | null
  user: User | null
  /** true, пока мы ещё не выяснили, есть ли сохранённая сессия. */
  isLoading: boolean
}

const AuthContext = createContext<AuthValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Флаг защищает от обновления состояния уже убранного с экрана компонента.
    let active = true

    // 1. При запуске спрашиваем, нет ли сохранённой сессии с прошлого раза.
    //    Без этого пользователю пришлось бы входить заново при каждой
    //    перезагрузке страницы.
    supabase.auth.getSession().then(({ data }) => {
      if (!active) return
      setSession(data.session)
      setIsLoading(false)
    })

    // 2. Дальше слушаем изменения: вход, выход, автообновление токена.
    //    Supabase сам присылает событие, нам не нужно ничего опрашивать.
    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!active) return
      setSession(nextSession)
      setIsLoading(false)
    })

    // 3. Уборка: отписываемся, когда компонент убирают с экрана.
    //    Без этого при каждом входе-выходе накапливались бы подписки.
    return () => {
      active = false
      listener.subscription.unsubscribe()
    }
  }, [])

  return (
    <AuthContext.Provider value={{ session, user: session?.user ?? null, isLoading }}>
      {children}
    </AuthContext.Provider>
  )
}

/** Хук доступа: const { user, isLoading } = useAuth() */
export function useAuth(): AuthValue {
  const value = useContext(AuthContext)
  if (!value) {
    throw new Error('useAuth можно вызывать только внутри <AuthProvider>')
  }
  return value
}
