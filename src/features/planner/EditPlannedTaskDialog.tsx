import { useState, type FormEvent } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useI18n, type TranslationKey } from '@/lib/i18n'
import { minutesToHoursAndMinutes, hoursAndMinutesToMinutes } from '@/lib/time'
import { fetchCategories, fetchSubcategoriesWithRates } from '@/features/categories/api'
import { fetchAllProfiles } from '@/features/profile/api'
import type { ActivityWithValue } from '@/types/models'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { updatePlannedActivity } from './rulesApi'

const MAX_MINUTES = 24 * 60

/**
 * Правка запланированной задачи.
 *
 * Менять её может любой взрослый, пока она не выполнена: запланированная
 * задача — договорённость семьи, а не чья-то личная запись. Право
 * проверяет сама база, здесь мы только показываем форму.
 *
 * Ставку не трогаем: работа ещё не сделана. Она встанет в момент отметки
 * о выполнении, по тому виду работы, который будет выбран тогда.
 */
export function EditPlannedTaskDialog({
  task,
  onClose,
}: {
  task: ActivityWithValue
  onClose: () => void
}) {
  const { t } = useI18n()
  const queryClient = useQueryClient()

  const initial = minutesToHoursAndMinutes(task.planned_minutes ?? 0)

  const [categoryId, setCategoryId] = useState(task.category_id ?? '')
  const [subcategoryId, setSubcategoryId] = useState(task.subcategory_id ?? '')
  const [title, setTitle] = useState(task.title ?? '')
  const [address, setAddress] = useState(task.address ?? '')
  const [date, setDate] = useState(task.date ?? '')
  const [hours, setHours] = useState(String(initial.hours))
  const [minutes, setMinutes] = useState(String(initial.minutes))
  const [travel, setTravel] = useState(String(task.travel_minutes ?? 0))
  const [assigneeId, setAssigneeId] = useState(task.user_id ?? '')
  const [errorKey, setErrorKey] = useState<TranslationKey | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)

  const { data: categories } = useQuery({ queryKey: ['categories'], queryFn: fetchCategories })
  const { data: profiles } = useQuery({ queryKey: ['profiles'], queryFn: fetchAllProfiles })
  const { data: subcategories } = useQuery({
    queryKey: ['subcategories-with-rates'],
    queryFn: fetchSubcategoriesWithRates,
  })

  const visibleSubcategories = (subcategories ?? []).filter((s) => s.category_id === categoryId)
  const plannedMinutes = hoursAndMinutesToMinutes(Number(hours) || 0, Number(minutes) || 0)
  const travelMinutes = Number(travel) || 0

  const mutation = useMutation({
    mutationFn: () =>
      updatePlannedActivity(task.id!, {
        title,
        date,
        plannedMinutes,
        travelMinutes,
        address,
        subcategoryId,
        // Пустая строка означает «сделать задачу общей».
        userId: assigneeId || null,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['planner'] })
      onClose()
    },
    onError: (error: Error) => setSaveError(error.message),
  })

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setErrorKey(null)
    setSaveError(null)

    if (title.trim() === '') return setErrorKey('activity.error.titleRequired')
    if (!subcategoryId) return setErrorKey('activity.error.subcategoryRequired')
    if (plannedMinutes <= 0) return setErrorKey('activity.error.timeRequired')
    if (plannedMinutes + travelMinutes > MAX_MINUTES) {
      return setErrorKey('activity.error.timeTooLong')
    }

    mutation.mutate()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-label={t('planner.editTitle')}
        className="max-h-full w-full max-w-md overflow-y-auto rounded-xl bg-white p-6 shadow-xl"
      >
        <h2 className="text-lg font-semibold text-slate-900">{t('planner.editTitle')}</h2>

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
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />

          <Input
            label={t('activity.address')}
            placeholder={t('activity.addressPlaceholder')}
            value={address}
            onChange={(e) => setAddress(e.target.value)}
          />

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

          <Input
            label={t('activity.date')}
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />

          <div>
            <span className="block text-sm font-medium text-slate-700">
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

          <div>
            <Input
              label={t('activity.travel')}
              type="number"
              min={0}
              value={travel}
              onChange={(e) => setTravel(e.target.value)}
            />
            <p className="mt-1 text-xs text-slate-500">{t('activity.travelHint')}</p>
          </div>

          {errorKey && (
            <p role="alert" className="rounded-md bg-red-50 p-3 text-sm text-red-700">
              {t(errorKey)}
            </p>
          )}

          {saveError && (
            <p role="alert" className="rounded-md bg-red-50 p-3 text-sm text-red-700">
              {t('activity.error.saveFailed')} {saveError}
            </p>
          )}

          <div className="flex gap-2">
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? t('common.saving') : t('common.save')}
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
