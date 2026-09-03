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
import {
  startTimer,
  stopTimer,
  fetchRunningTimer,
  deleteActivity,
  elapsedMinutes,
} from './api'

/**
 * Таймер: второй способ учёта времени, кроме ручного ввода.
 *
 * Время старта хранится В БАЗЕ, а не в памяти браузера. Благодаря этому
 * таймер переживает перезагрузку страницы и закрытие вкладки: вернувшись,
 * человек увидит, что он всё ещё идёт. Если бы мы держали старт в памяти,
 * случайное закрытие вкладки стирало бы час работы.
 */
export function TimerCard() {
  const { t, locale } = useI18n()
  const { user } = useAuth()
  const queryClient = useQueryClient()

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

  // «Тик» раз в секунду, чтобы счётчик на экране рос.
  // Само значение мы каждый раз считаем заново от времени старта,
  // а не прибавляем по секунде: так счётчик не «уплывёт», если вкладка
  // была свёрнута и браузер приостанавливал таймеры.
  const [, setTick] = useState(0)
  useEffect(() => {
    if (!running) return
    const id = setInterval(() => setTick((n) => n + 1), 1000)
    // Уборка: без неё таймеры накапливались бы при каждой перерисовке.
    return () => clearInterval(id)
  }, [running])

  const visibleSubcategories = (subcategories ?? []).filter((s) => s.category_id === categoryId)
  const runningSubcategory = subcategories?.find((s) => s.id === running?.subcategory_id)

  function refresh() {
    queryClient.invalidateQueries({ queryKey: ['running-timer'] })
    queryClient.invalidateQueries({ queryKey: ['activities'] })
  }

  const start = useMutation({
    mutationFn: startTimer,
    onSuccess: () => {
      refresh()
      setTitle('')
    },
  })

  const stop = useMutation({
    mutationFn: stopTimer,
    onSuccess: refresh,
  })

  const cancel = useMutation({
    mutationFn: deleteActivity,
    onSuccess: refresh,
  })

  function handleStart(event: FormEvent) {
    event.preventDefault()
    setErrorKey(null)

    if (title.trim() === '') return setErrorKey('activity.error.titleRequired')
    if (!subcategoryId) return setErrorKey('activity.error.subcategoryRequired')
    if (running) return setErrorKey('timer.alreadyRunning')
    if (!user) return

    start.mutate({ userId: user.id, subcategoryId, title, date: todayISO() })
  }

  // ── Таймер идёт: показываем счётчик и кнопку остановки ──
  if (running) {
    const minutes = elapsedMinutes(running.timer_started_at ?? new Date().toISOString())

    return (
      <div className="rounded-xl bg-indigo-50 p-5 ring-1 ring-indigo-200">
        <h2 className="text-base font-semibold text-indigo-900">{t('timer.title')}</h2>

        <p className="mt-3 text-lg font-semibold text-slate-900">{running.title}</p>
        <p className="text-sm text-slate-500">
          {running.category_name} · {running.subcategory_name}
        </p>

        {/* aria-live: программа чтения с экрана объявит изменение,
            но не будет перебивать человека каждую секунду. */}
        <p aria-live="polite" className="mt-3 text-3xl font-bold tabular-nums text-indigo-700">
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

  // ── Таймер не запущен: показываем форму запуска ──
  return (
    <form onSubmit={handleStart} className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
      <h2 className="text-base font-semibold text-slate-900">{t('timer.title')}</h2>
      <p className="mt-1 text-sm text-slate-500">{t('timer.hint')}</p>

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
        <p role="alert" className="mt-4 rounded-md bg-red-50 p-3 text-sm text-red-700">
          {t(errorKey)}
        </p>
      )}

      <Button type="submit" disabled={start.isPending} className="mt-4">
        {t('timer.start')}
      </Button>
    </form>
  )
}
