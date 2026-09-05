import { useState, useEffect, type FormEvent } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useI18n, type TranslationKey } from '@/lib/i18n'
import { useAuth } from '@/features/auth/AuthProvider'
import { todayISO } from '@/lib/dates'
import { formatMinutes } from '@/lib/time'
import { fetchCategories, fetchSubcategoriesWithRates } from '@/features/categories/api'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { PomodoroPanel } from './PomodoroPanel'
import {
  startTimer,
  startPomodoro,
  stopTimer,
  fetchRunningTimer,
  deleteActivity,
  elapsedMinutes,
} from './api'

type TimerMode = 'simple' | 'pomodoro'
const MODE_STORAGE_KEY = 'ftt-timer-mode'

/** Запоминаем выбранный режим: каждый раз переключать заново — раздражает. */
function readStoredMode(): TimerMode {
  try {
    const saved = localStorage.getItem(MODE_STORAGE_KEY)
    if (saved === 'simple' || saved === 'pomodoro') return saved
  } catch {
    // Хранилище недоступно — берём режим по умолчанию.
  }
  return 'simple'
}

/**
 * Таймер с двумя режимами.
 *
 * ОБЫЧНЫЙ — просто считает время вперёд. Годится для дел, которые
 * нельзя резать на отрезки: прогулка с ребёнком, готовка.
 *
 * ПОМИДОР — 25 минут работы, 5 минут перерыва, после четвёртого
 * помидора длинный перерыв. Годится для сосредоточенной работы и учёбы.
 *
 * В обоих случаях время старта хранится в базе, поэтому таймер
 * переживает перезагрузку страницы.
 */
export function TimerCard() {
  const { t, locale } = useI18n()
  const { user } = useAuth()
  const queryClient = useQueryClient()

  const [mode, setMode] = useState<TimerMode>(readStoredMode)
  const [categoryId, setCategoryId] = useState('')
  const [subcategoryId, setSubcategoryId] = useState('')
  const [title, setTitle] = useState('')
  const [errorKey, setErrorKey] = useState<TranslationKey | null>(null)

  const { data: categories } = useQuery({ queryKey: ['categories'], queryFn: fetchCategories })
  const { data: subcategories } = useQuery({
    queryKey: ['subcategories-with-rates'],
    queryFn: fetchSubcategoriesWithRates,
  })

  const { data: running } = useQuery({
    queryKey: ['running-timer', user?.id],
    queryFn: () => fetchRunningTimer(user!.id),
    enabled: Boolean(user?.id),
  })

  // Тик раз в секунду для обычного режима. Значение каждый раз считаем
  // заново от времени старта, а не прибавляем по секунде: так счётчик
  // не уплывёт, если вкладка была свёрнута.
  const [, setTick] = useState(0)
  useEffect(() => {
    if (!running) return
    const id = setInterval(() => setTick((n) => n + 1), 1000)
    return () => clearInterval(id)
  }, [running])

  const visibleSubcategories = (subcategories ?? []).filter((s) => s.category_id === categoryId)
  const runningSubcategory = subcategories?.find((s) => s.id === running?.subcategory_id)

  function refresh() {
    queryClient.invalidateQueries({ queryKey: ['running-timer'] })
    queryClient.invalidateQueries({ queryKey: ['activities'] })
  }

  const startSimple = useMutation({
    mutationFn: startTimer,
    onSuccess: () => {
      refresh()
      setTitle('')
    },
  })

  const startTomato = useMutation({
    mutationFn: startPomodoro,
    onSuccess: () => {
      refresh()
      setTitle('')
    },
  })

  const stop = useMutation({ mutationFn: stopTimer, onSuccess: refresh })
  const cancel = useMutation({ mutationFn: deleteActivity, onSuccess: refresh })

  function changeMode(next: TimerMode) {
    setMode(next)
    try {
      localStorage.setItem(MODE_STORAGE_KEY, next)
    } catch {
      // Не смогли запомнить — не страшно.
    }
  }

  function handleStart(event: FormEvent) {
    event.preventDefault()
    setErrorKey(null)

    if (title.trim() === '') return setErrorKey('activity.error.titleRequired')
    if (!subcategoryId) return setErrorKey('activity.error.subcategoryRequired')
    if (running) return setErrorKey('timer.alreadyRunning')
    if (!user) return

    const input = { userId: user.id, subcategoryId, title, date: todayISO() }
    if (mode === 'pomodoro') startTomato.mutate(input)
    else startSimple.mutate(input)
  }

  // ── Идёт помидор ──
  if (running && running.timer_phase) {
    return <PomodoroPanel activity={running} subcategory={runningSubcategory} />
  }

  // ── Идёт обычный таймер ──
  if (running) {
    const minutes = elapsedMinutes(running.timer_started_at ?? new Date().toISOString())

    return (
      <div className="rounded-xl bg-accent-soft p-5 ring-1 ring-accent-line">
        <h2 className="text-base font-semibold text-accent-deep">{t('timer.title')}</h2>

        <p className="mt-3 text-lg font-semibold text-ink">{running.title}</p>
        <p className="text-sm text-ink-4">
          {running.category_name} · {running.subcategory_name}
        </p>

        <p aria-live="polite" className="mt-3 text-3xl font-bold tabular-nums text-accent-deep">
          {formatMinutes(minutes, locale)}
        </p>

        <div className="mt-4 flex gap-2">
          <Button
            type="button"
            disabled={stop.isPending || !runningSubcategory}
            onClick={() =>
              stop.mutate({
                activityId: running.id!,
                startedAt: running.timer_started_at!,
                subcategory: runningSubcategory!,
              })
            }
          >
            {t('timer.stop')}
          </Button>
          <Button
            type="button"
            variant="secondary"
            disabled={cancel.isPending}
            onClick={() => cancel.mutate(running.id!)}
          >
            {t('timer.cancel')}
          </Button>
        </div>
      </div>
    )
  }

  // ── Таймер не запущен: форма с выбором режима ──
  return (
    <form onSubmit={handleStart} className="rounded-xl bg-surface p-5 shadow-sm ring-1 ring-line">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-base font-semibold text-ink">{t('timer.title')}</h2>

        <div role="group" aria-label={t('timer.modeLabel')} className="flex gap-1">
          {(['simple', 'pomodoro'] as const).map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => changeMode(option)}
              // aria-pressed сообщает выбранный режим тем, кто не видит подсветку.
              aria-pressed={mode === option}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
                mode === option
                  ? 'bg-accent text-accent-ink'
                  : 'bg-surface text-ink-3 ring-1 ring-line hover:bg-surface-2'
              }`}
            >
              {option === 'simple' ? t('timer.modeSimple') : t('timer.modePomodoro')}
            </button>
          ))}
        </div>
      </div>

      <p className="mt-1 text-sm text-ink-4">
        {mode === 'pomodoro' ? t('timer.pomodoroHint') : t('timer.hint')}
      </p>

      <div className="mt-4 grid gap-4 sm:grid-cols-3">
        <Select
          label={t('activity.category')}
          value={categoryId}
          onChange={(e) => {
            setCategoryId(e.target.value)
            setSubcategoryId('')
          }}
        >
          <option value="">{t('activity.selectPlaceholder')}</option>
          {categories?.map((category) => (
            <option key={category.id} value={category.id}>
              {category.icon} {category.name}
            </option>
          ))}
        </Select>

        <Select
          label={t('activity.subcategory')}
          value={subcategoryId}
          onChange={(e) => setSubcategoryId(e.target.value)}
          disabled={categoryId === ''}
        >
          <option value="">{t('activity.selectPlaceholder')}</option>
          {visibleSubcategories.map((subcategory) => (
            <option key={subcategory.id} value={subcategory.id}>
              {subcategory.name}
            </option>
          ))}
        </Select>

        <Input
          label={t('activity.title')}
          placeholder={t('activity.titlePlaceholder')}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
      </div>

      {errorKey && (
        <p role="alert" className="mt-4 rounded-md bg-danger-soft p-3 text-sm text-danger">
          {t(errorKey)}
        </p>
      )}

      <Button
        type="submit"
        disabled={startSimple.isPending || startTomato.isPending}
        className="mt-4"
      >
        {t('timer.start')}
      </Button>
    </form>
  )
}
