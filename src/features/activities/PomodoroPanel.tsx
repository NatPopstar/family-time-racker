import { useEffect, useRef, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useI18n, type TranslationKey } from '@/lib/i18n'
import { formatMinutes } from '@/lib/time'
import { playChime } from '@/lib/sound'
import {
  POMODORO,
  pomodoroState,
  nextPhase,
  formatCountdown,
  totalWorkMinutes,
  type PomodoroPhase,
} from '@/lib/pomodoro'
import type { ActivityWithValue } from '@/types/models'
import type { SubcategoryWithRate } from '@/features/categories/api'
import { Button } from '@/components/ui/Button'
import { advancePomodoro, stopPomodoro, deleteActivity } from './api'

/**
 * Идущий помидор: обратный отсчёт, фаза, счётчик помидоров.
 *
 * Фаза и счётчик лежат в базе, поэтому таймер переживает перезагрузку.
 * Здесь мы только показываем состояние и предлагаем действия.
 *
 * ВАЖНО: фазы НЕ переключаются сами по истечении времени. Когда отсчёт
 * дошёл до нуля, панель ждёт человека. Иначе закрытый на три часа ноутбук
 * «намотал» бы шесть помидоров работы, которой не было.
 */
export function PomodoroPanel({
  activity,
  subcategory,
}: {
  activity: ActivityWithValue
  subcategory: SubcategoryWithRate | undefined
}) {
  const { t, locale } = useI18n()
  const queryClient = useQueryClient()

  const phase = (activity.timer_phase ?? 'work') as PomodoroPhase
  const startedAt = activity.timer_started_at ?? new Date().toISOString()
  const accumulated = activity.actual_minutes ?? 0
  const pomodorosDone = activity.pomodoros_done ?? 0

  // Пересчитываем состояние каждую секунду от времени старта,
  // а не вычитаем по секунде: свёрнутая вкладка не собьёт отсчёт.
  const [, setTick] = useState(0)
  useEffect(() => {
    const id = setInterval(() => setTick((n) => n + 1), 1000)
    return () => clearInterval(id)
  }, [])

  const state = pomodoroState({ phase, startedAt })

  // Сигнал подаём ОДИН раз на фазу. Без этой отметки он повторялся бы
  // каждую секунду, пока человек не нажмёт кнопку.
  const chimedForRef = useRef<string | null>(null)
  useEffect(() => {
    if (!state.isFinished) return
    const key = `${activity.id}:${phase}:${startedAt}`
    if (chimedForRef.current === key) return
    chimedForRef.current = key
    playChime()
  }, [state.isFinished, activity.id, phase, startedAt])

  // Заголовок вкладки показывает отсчёт, чтобы таймер был виден
  // из другой вкладки. При уходе со страницы возвращаем исходный.
  useEffect(() => {
    const original = document.title
    document.title = state.isFinished
      ? `⏰ ${t(`pomodoro.phase.${phase}` as TranslationKey)} — Family Time Tracker`
      : `${formatCountdown(state.remainingSeconds)} ${phase === 'work' ? '🍅' : '☕'} ${activity.title}`
    return () => {
      document.title = original
    }
  }, [state.remainingSeconds, state.isFinished, phase, activity.title, t])

  function refresh() {
    queryClient.invalidateQueries({ queryKey: ['running-timer'] })
    queryClient.invalidateQueries({ queryKey: ['activities'] })
  }

  const advance = useMutation({ mutationFn: advancePomodoro, onSuccess: refresh })
  const stop = useMutation({ mutationFn: stopPomodoro, onSuccess: refresh })
  const cancel = useMutation({ mutationFn: deleteActivity, onSuccess: refresh })

  /** Переход к следующей фазе. */
  function goToNextPhase() {
    const finishedWork = phase === 'work'
    const nextCount = finishedWork ? pomodorosDone + 1 : pomodorosDone

    advance.mutate({
      activityId: activity.id!,
      toPhase: nextPhase(phase, nextCount),
      pomodorosDone: nextCount,
      // Минуты работы добавляем только за рабочую фазу.
      accumulatedMinutes: accumulated + state.countedWorkMinutes,
    })
  }

  function finishTask() {
    if (!subcategory) return
    stop.mutate({
      activityId: activity.id!,
      totalMinutes: totalWorkMinutes({ accumulatedMinutes: accumulated, phase, startedAt }),
      subcategory,
    })
  }

  const isWork = phase === 'work'
  const countedNow = accumulated + state.countedWorkMinutes

  return (
    <div
      className={`rounded-xl p-5 ring-1 ${
        // Цвет отделяет работу от отдыха: взгляд понимает состояние
        // раньше, чем прочитает надпись.
        isWork ? 'bg-rose-50 ring-rose-200' : 'bg-sky-50 ring-sky-200'
      }`}
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className={`text-base font-semibold ${isWork ? 'text-rose-900' : 'text-sky-900'}`}>
          {t(`pomodoro.phase.${phase}` as TranslationKey)}
        </h2>
        <span className="text-sm text-ink-4">
          {t('pomodoro.done')}: {'🍅'.repeat(Math.min(pomodorosDone, POMODORO.pomodorosBeforeLongBreak))}
          {pomodorosDone > POMODORO.pomodorosBeforeLongBreak ? ` ×${pomodorosDone}` : ''}
          {pomodorosDone === 0 ? '—' : ''}
        </span>
      </div>

      <p className="mt-2 text-lg font-semibold text-ink">{activity.title}</p>
      <p className="text-sm text-ink-4">
        {activity.category_name} · {activity.subcategory_name}
      </p>

      {/* aria-live="polite" объявит изменение, но не будет перебивать
          человека каждую секунду. */}
      <p
        aria-live="polite"
        className={`mt-4 text-5xl font-bold tabular-nums ${isWork ? 'text-rose-700' : 'text-sky-700'}`}
      >
        {formatCountdown(state.remainingSeconds)}
      </p>

      <p className="mt-2 text-sm text-ink-3">
        {t('pomodoro.counted')}: <strong>{formatMinutes(countedNow, locale)}</strong>
      </p>

      {state.isFinished && (
        <p role="status" className="mt-3 rounded-md bg-veil p-3 text-sm font-medium text-ink-2">
          {isWork ? t('pomodoro.workFinished') : t('pomodoro.breakFinished')}
        </p>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        <Button type="button" disabled={advance.isPending} onClick={goToNextPhase}>
          {isWork
            ? // Пока помидор идёт, переход означает «прервать и уйти на перерыв».
              state.isFinished
              ? t('pomodoro.startBreak')
              : t('pomodoro.startBreak')
            : t('pomodoro.startWork')}
        </Button>

        <Button
          type="button"
          variant="secondary"
          disabled={stop.isPending || !subcategory}
          onClick={finishTask}
        >
          {t('pomodoro.finish')}
        </Button>

        <Button
          type="button"
          variant="ghost"
          disabled={cancel.isPending}
          onClick={() => cancel.mutate(activity.id!)}
        >
          {t('timer.cancel')}
        </Button>
      </div>
    </div>
  )
}
