import { useState, type FormEvent } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useI18n, type TranslationKey } from '@/lib/i18n'
import { useAuth } from '@/features/auth/AuthProvider'
import { hoursAndMinutesToMinutes } from '@/lib/time'
import { formatDateShort, isoWeekday } from '@/lib/dates'
import { createRecurringRule } from './rulesApi'
import { fetchCategories, fetchSubcategoriesWithRates } from '@/features/categories/api'
import { fetchAllProfiles } from '@/features/profile/api'
import { createPlannedActivity } from '@/features/activities/api'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { TravelInput, type TravelLegs } from './TravelInput'

const MAX_MINUTES = 24 * 60

/**
 * Окно добавления запланированной задачи на конкретный день.
 *
 * Здесь же живёт галочка «повторять каждую неделю». Раньше повтор
 * настраивался только в отдельной карточке вверху страницы, и связи
 * между ней и этой формой не было никакой: человек добавлял дело
 * на понедельник и справедливо ждал, что оно появится и в следующий
 * понедельник. Не появлялось — потому что это была разовая задача.
 * Решение спрятано не там, где возникает вопрос, — значит его нет.
 */
export function AddPlannedTaskDialog({
  date,
  onClose,
}: {
  date: string
  onClose: () => void
}) {
  const { t, locale } = useI18n()
  const { user } = useAuth()
  const queryClient = useQueryClient()

  const [categoryId, setCategoryId] = useState('')
  const [subcategoryId, setSubcategoryId] = useState('')
  const [title, setTitle] = useState('')
  const [address, setAddress] = useState('')
  const [hours, setHours] = useState('')
  const [minutes, setMinutes] = useState('')
  const [travel, setTravel] = useState('')
  const [travelLegs, setTravelLegs] = useState<TravelLegs>(2)
  // Пустая строка означает «ничья задача»: договоримся потом,
  // а отметит тот, кто в итоге сделает.
  const [assigneeId, setAssigneeId] = useState<string>(user?.id ?? '')
  const [repeatWeekly, setRepeatWeekly] = useState(false)
  const [errorKey, setErrorKey] = useState<TranslationKey | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)

  // 1 — понедельник, 7 — воскресенье. Спрашивать день недели незачем:
  // он однозначно следует из даты, на которую добавляют задачу.
  const weekday = isoWeekday(date)

  const { data: categories } = useQuery({ queryKey: ['categories'], queryFn: fetchCategories })
  const { data: profiles } = useQuery({ queryKey: ['profiles'], queryFn: fetchAllProfiles })
  const { data: subcategories } = useQuery({
    queryKey: ['subcategories-with-rates'],
    queryFn: fetchSubcategoriesWithRates,
  })

  const visibleSubcategories = (subcategories ?? []).filter((s) => s.category_id === categoryId)
  const plannedMinutes = hoursAndMinutesToMinutes(Number(hours) || 0, Number(minutes) || 0)
  const travelOneWay = Number(travel) || 0
  const travelMinutes = travelOneWay * travelLegs

  function handleSaved() {
    queryClient.invalidateQueries({ queryKey: ['planner'] })
    onClose()
  }

  const mutation = useMutation({
    mutationFn: createPlannedActivity,
    onSuccess: handleSaved,
    onError: (error: Error) => setSaveError(error.message),
  })

  /**
   * Повторяющаяся задача создаётся ПРАВИЛОМ, а не задачей.
   *
   * Саму задачу на этот день мы здесь не делаем намеренно: её подставит
   * Планер из правила, как только обновится список правил. Создай мы
   * ещё и задачу вручную — на день пришлись бы сразу две одинаковые,
   * наша и подставленная.
   */
  const createRule = useMutation({
    mutationFn: createRecurringRule,
    onSuccess: () => {
      // Правила обновились — Планер сам подставит задачу в нужный день.
      queryClient.invalidateQueries({ queryKey: ['recurring-rules'] })
      handleSaved()
    },
    onError: (error: Error) => setSaveError(error.message),
  })

  const isSaving = mutation.isPending || createRule.isPending

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setErrorKey(null)
    setSaveError(null)

    if (title.trim() === '') return setErrorKey('activity.error.titleRequired')
    if (!subcategoryId) return setErrorKey('activity.error.subcategoryRequired')
    if (plannedMinutes <= 0) return setErrorKey('activity.error.timeRequired')
    if (plannedMinutes + travelMinutes > MAX_MINUTES) return setErrorKey('activity.error.timeTooLong')

    if (repeatWeekly) {
      if (!user) return
      return createRule.mutate({
        createdBy: user.id,
        subcategoryId,
        title,
        address,
        weekday,
        plannedMinutes,
        travelOneWayMinutes: travelOneWay,
        travelLegs,
        // Пусто — задача будет появляться ничьей каждую неделю.
        defaultUserId: assigneeId || null,
      })
    }

    mutation.mutate({
      userId: assigneeId || null,
      subcategoryId,
      title,
      date,
      plannedMinutes,
      address,
      travelOneWayMinutes: travelOneWay,
      travelLegs,
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-overlay p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-label={t('planner.addTask')}
        className="max-h-full w-full max-w-md overflow-y-auto rounded-xl bg-surface p-6 shadow-xl"
      >
        <h2 className="text-lg font-semibold text-ink">
          {t('planner.addTask')} — {formatDateShort(date, locale)}
        </h2>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
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

          <Input
            label={t('activity.address')}
            placeholder={t('activity.addressPlaceholder')}
            value={address}
            onChange={(e) => setAddress(e.target.value)}
          />

          {/* Кто делает. Пустое значение — ничья задача. */}
          <Select
            label={t('planner.forWhom')}
            value={assigneeId}
            onChange={(e) => setAssigneeId(e.target.value)}
          >
            <option value="">{t('planner.nobody')}</option>
            {profiles?.map((profile) => (
              <option key={profile.id} value={profile.id}>
                {profile.display_name}
              </option>
            ))}
          </Select>

          <div>
            <span className="block text-sm font-medium text-ink-2">
              {t('planner.plannedTime')}
            </span>
            <div className="mt-1 flex gap-2">
              <Input
                label={t('activity.hours')}
                type="number"
                min={0}
                value={hours}
                onChange={(e) => setHours(e.target.value)}
                className="flex-1"
              />
              <Input
                label={t('activity.minutes')}
                type="number"
                min={0}
                value={minutes}
                onChange={(e) => setMinutes(e.target.value)}
                className="flex-1"
              />
            </div>
          </div>

          <TravelInput
            oneWayMinutes={travel}
            legs={travelLegs}
            onOneWayChange={setTravel}
            onLegsChange={setTravelLegs}
          />

          {/* Повтор спрашиваем прямо здесь: вопрос «а на следующей
              неделе тоже?» возникает именно в этот момент. */}
          <div className="rounded-lg bg-surface-2 p-3">
            <label className="flex items-start gap-2.5">
              <input
                type="checkbox"
                checked={repeatWeekly}
                onChange={(e) => setRepeatWeekly(e.target.checked)}
                className="mt-0.5 size-4 shrink-0 rounded border-line-strong text-accent focus:ring-accent-lite"
              />
              <span className="text-sm">
                <span className="font-medium text-ink-2">
                  {t('recurring.repeatWeekly')}
                </span>
                {/* Показываем, КАКОЙ это день недели: человек выбрал
                    дату, а повторяться будет день недели. */}
                <span className="text-ink-4">
                  {' — '}
                  {t(`weekday.every.${weekday}` as TranslationKey)}
                </span>
              </span>
            </label>

            {/* Отступ pl-[1.625rem] ставит подсказку ровно под текстом
                галочки: ширина квадратика (1rem) плюс зазор (0.625rem). */}
            {repeatWeekly && (
              <p className="mt-2 pl-[1.625rem] text-xs text-ink-4">
                {t('recurring.repeatWeeklyHint')}
              </p>
            )}
          </div>

          {errorKey && (
            <p role="alert" className="rounded-md bg-danger-soft p-3 text-sm text-danger">
              {t(errorKey)}
            </p>
          )}

          {saveError && (
            <p role="alert" className="rounded-md bg-danger-soft p-3 text-sm text-danger">
              {t('activity.error.saveFailed')} {saveError}
            </p>
          )}

          <div className="flex gap-2">
            <Button type="submit" disabled={isSaving}>
              {isSaving ? t('common.saving') : t('common.save')}
            </Button>
            <Button type="button" variant="secondary" onClick={onClose}>
              {t('common.cancel')}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
