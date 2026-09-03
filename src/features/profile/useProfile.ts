import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/features/auth/AuthProvider'
import { fetchMyProfile } from './api'

/**
 * Профиль вошедшего пользователя.
 *
 * Хук объединяет два шага: узнать, кто вошёл (useAuth), и загрузить
 * его профиль. Компонентам остаётся написать одну строку вместо трёх.
 */
export function useMyProfile() {
  const { user } = useAuth()

  return useQuery({
    queryKey: ['profile', user?.id],
    queryFn: () => fetchMyProfile(user!.id),
    // Пока пользователь не вошёл, запрос не запускаем: запрашивать
    // профиль без идентификатора бессмысленно.
    enabled: Boolean(user?.id),
  })
}

/**
 * Имя для показа в интерфейсе.
 * Порядок запасных вариантов: имя из базы -> имя из сессии -> почта.
 * Пустое место в шапке выглядело бы как поломка, поэтому что-то
 * показываем всегда.
 */
export function useDisplayName(): string {
  const { user } = useAuth()
  const { data: profile } = useMyProfile()

  return (
    profile?.display_name ??
    (user?.user_metadata?.display_name as string | undefined) ??
    user?.email ??
    ''
  )
}
