import { useEffect, useRef } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/features/auth/AuthProvider'
import { fillWorkdays } from './workdayApi'

/**
 * Заполняет пропущенные рабочие дни при открытии приложения.
 *
 * ПОЧЕМУ ОДИН РАЗ ЗА СЕАНС. Приложение перерисовывается часто, а поход
 * в базу должен случиться однажды. Флаг в useRef переживает перерисовки,
 * но обнуляется при перезагрузке страницы — как раз то, что нужно.
 *
 * ПОЧЕМУ ОШИБКА ГЛОТАЕТСЯ. Это фоновое удобство, а не действие человека.
 * Если заполнение не удалось, приложение обязано работать дальше:
 * человек пришёл записать уборку, а не чинить чужие рабочие дни.
 * Незаполненный день видно сразу — он просто пустой, и его можно
 * внести руками.
 */
export function useWorkdayFill(): void {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const alreadyRan = useRef(false)

  useEffect(() => {
    if (!user?.id || alreadyRan.current) return
    alreadyRan.current = true

    fillWorkdays()
      .then((created) => {
        // Обновляем списки, только если что-то появилось: лишний
        // перезапрос на каждом открытии никому не нужен.
        if (created > 0) {
          queryClient.invalidateQueries({ queryKey: ['activities'] })
          queryClient.invalidateQueries({ queryKey: ['planner'] })
        }
      })
      .catch(() => {
        // Намеренно тихо — см. пояснение выше.
      })
  }, [user?.id, queryClient])
}
