import { useState, type FormEvent } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useI18n, type TranslationKey } from '@/lib/i18n'
import { minutesToHoursAndMinutes, hoursAndMinutesToMinutes } from '@/lib/time'
import { fetchCategories, fetchSubcategoriesWithRates } from '@/features/categories/api'
import type { ActivityWithValue } from '@/types/models'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { updateActivity } from './api'

const MAX_MINUTES = 24 * 60

/**
 * Окно правки записи.
 *
 * Открывается поверх страницы. Поля заполнены текущими значениями,
 * чтобы поправить можно было только одно, не вводя всё заново.
 */
export function EditActivityDialog({
  activity,
  onClose,
}: {
  activity: ActivityWithValue
  onClose: () => void
}) {
  const { t } = useI18n()
  const queryClient = useQueryClient()

  const initialTime = minutesToHoursAndMinutes(activity.actual_minutes ?? 0)

  const [categoryId, setCategoryId] = useState(activity.category_id ?? '')
  const [subcategoryId, setSubcategoryId] = useState(activity.subcategory_id ?? '')
  const [title, setTitle] = useState(activity.title ?? '')
  const [date, setDate] = useState(activity.date ?? '')
  const [hours, setHours] = useState(String(initialTime.hours))
  const [minutes, setMinutes] = useState(String(initialTime.minutes))
  const [comment, setComment] = useState(activity.comment ?? '')
  const [errorKey, setErrorKey] = useState<TranslationKey | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)

  const { data: categories } = useQuery({ queryKey: ['categories'], queryFn: fetchCategories })
  const { data: subcategories } = useQuery({
    queryKey: ['subcategories-with-rates'],
    queryFn: fetchSubcategoriesWithRates,
  })

  const visibleSubcategories = (subcategories ?? []).filter((s) => s.category_id === categoryId)
  const selectedSubcategory = subcategories?.find((s) => s.id === subcategoryId)
  const totalMinutes = hoursAndMinutesToMinutes(Number(hours) || 0, Number(minutes) || 0)

  const mutation = useMutation({
    mutationFn: () =>
      updateActivity(activity.id!, {
        title,
        date,
        actualMinutes: totalMinutes,
        comment,
        previousSubcategoryId: activity.subcategory_id!,
        subcategory: selectedSubcategory!,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['activities'] })
      onClose()
    },
    onError: (error: Error) => setSaveError(error.message),
  })

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setErrorKey(null)
    setSaveError(null)

    if (title.trim() === '') return setErrorKey('activity.error.titleRequired')
    if (!selectedSubcategory) return setErrorKey('activity.error.subcategoryRequired')
    if (totalMinutes <= 0) return setErrorKey('activity.error.timeRequired')
    if (totalMinutes > MAX_MINUTES) return setErrorKey('activity.error.timeTooLong')

    mutation.mutate()
  }

  return (
    // role="dialog" + aria-modal объясняют программам чтения с экрана,
    // что это окно поверх страницы, а не часть её содержимого.
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-label={t('history.editTitle')}
        className="max-h-full w-full max-w-lg overflow-y-auto rounded-xl bg-white p-6 shadow-xl"
      >
        <h2 className="text-lg font-semibold text-slate-900">{t('history.editTitle')}</h2>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
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
          </div>

          <Input
            label={t('activity.title')}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />

          <div className="grid gap-4 sm:grid-cols-3">
            <Input
              label={t('activity.date')}
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
            <Input
              label={t('activity.hours')}
              type="number"
              min={0}
              value={hours}
              onChange={(e) => setHours(e.target.value)}
            />
            <Input
              label={t('activity.minutes')}
              type="number"
              min={0}
              value={minutes}
              onChange={(e) => setMinutes(e.target.value)}
            />
          </div>

          <Input
            label={t('activity.comment')}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
          />

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
