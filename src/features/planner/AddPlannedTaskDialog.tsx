import { useState, type FormEvent } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useI18n, type TranslationKey } from '@/lib/i18n'
import { useAuth } from '@/features/auth/AuthProvider'
import { hoursAndMinutesToMinutes } from '@/lib/time'
import { formatDateShort } from '@/lib/dates'
import { fetchCategories, fetchSubcategoriesWithRates } from '@/features/categories/api'
import { createPlannedActivity } from '@/features/activities/api'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'

const MAX_MINUTES = 24 * 60

/** Окно добавления запланированной задачи на конкретный день. */
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
  const [hours, setHours] = useState('')
  const [minutes, setMinutes] = useState('')
  const [errorKey, setErrorKey] = useState<TranslationKey | null>(null)

  const { data: categories } = useQuery({ queryKey: ['categories'], queryFn: fetchCategories })
  const { data: subcategories } = useQuery({
    queryKey: ['subcategories-with-rates'],
    queryFn: fetchSubcategoriesWithRates,
  })

  const visibleSubcategories = (subcategories ?? []).filter((s) => s.category_id === categoryId)
  const plannedMinutes = hoursAndMinutesToMinutes(Number(hours) || 0, Number(minutes) || 0)

  const mutation = useMutation({
    mutationFn: createPlannedActivity,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['planner'] })
      onClose()
    },
  })

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setErrorKey(null)

    if (title.trim() === '') return setErrorKey('activity.error.titleRequired')
    if (!subcategoryId) return setErrorKey('activity.error.subcategoryRequired')
    if (plannedMinutes <= 0) return setErrorKey('activity.error.timeRequired')
    if (plannedMinutes > MAX_MINUTES) return setErrorKey('activity.error.timeTooLong')
    if (!user) return

    mutation.mutate({ userId: user.id, subcategoryId, title, date, plannedMinutes })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-label={t('planner.addTask')}
        className="max-h-full w-full max-w-md overflow-y-auto rounded-xl bg-white p-6 shadow-xl"
      >
        <h2 className="text-lg font-semibold text-slate-900">
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

          {errorKey && (
            <p role="alert" className="rounded-md bg-red-50 p-3 text-sm text-red-700">
              {t(errorKey)}
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
