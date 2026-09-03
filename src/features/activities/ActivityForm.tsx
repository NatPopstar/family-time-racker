import { useState, useMemo, type FormEvent } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useI18n, type TranslationKey } from '@/lib/i18n'
import { useAuth } from '@/features/auth/AuthProvider'
import { hoursAndMinutesToMinutes } from '@/lib/time'
import { todayISO } from '@/lib/dates'
import { formatMoney, calculateValue } from '@/lib/money'
import { fetchCategories, fetchSubcategoriesWithRates } from '@/features/categories/api'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { createActivity } from './api'

/** Максимум 24 часа: больше в сутки не помещается, значит это опечатка. */
const MAX_MINUTES = 24 * 60

/**
 * Форма записи выполненной работы.
 *
 * Два выпадающих списка связаны: сначала выбираем категорию,
 * потом виды работы отфильтровываются по ней. Без этого в одном
 * списке лежали бы все 16 подкатегорий вперемешку.
 */
export function ActivityForm() {
  const { t, locale } = useI18n()
  const { user } = useAuth()
  const queryClient = useQueryClient()

  const [categoryId, setCategoryId] = useState('')
  const [subcategoryId, setSubcategoryId] = useState('')
  const [title, setTitle] = useState('')
  const [date, setDate] = useState(todayISO)
  const [hours, setHours] = useState('')
  const [minutes, setMinutes] = useState('')
  const [comment, setComment] = useState('')
  const [errorKey, setErrorKey] = useState<TranslationKey | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)

  const { data: categories } = useQuery({ queryKey: ['categories'], queryFn: fetchCategories })
  const { data: subcategories } = useQuery({
    queryKey: ['subcategories-with-rates'],
    queryFn: fetchSubcategoriesWithRates,
  })

  // Виды работы только выбранной категории.
  // useMemo — чтобы список не пересобирался на каждое нажатие клавиши в других полях.
  const visibleSubcategories = useMemo(
    () => (subcategories ?? []).filter((s) => s.category_id === categoryId),
    [subcategories, categoryId],
  )

  const selectedSubcategory = subcategories?.find((s) => s.id === subcategoryId)

  const totalMinutes = hoursAndMinutesToMinutes(Number(hours) || 0, Number(minutes) || 0)

  // Показываем стоимость сразу, ещё до сохранения — так видно,
  // во что оценивается работа, и это главный смысл приложения.
  const previewValue = calculateValue(
    totalMinutes,
    selectedSubcategory?.market_rates?.hourly_rate ?? null,
  )

  const mutation = useMutation({
    mutationFn: createActivity,
    onSuccess: () => {
      // Список записей устарел — просим React Query перезагрузить его.
      // Без этой строки новая запись не появилась бы на экране до перезагрузки.
      queryClient.invalidateQueries({ queryKey: ['activities'] })
      resetForm()
    },
    onError: (error: Error) => setSaveError(error.message),
  })

  function resetForm() {
    // Категорию и дату НЕ сбрасываем: обычно подряд записывают
    // несколько дел одного дня, и повторный выбор только раздражал бы.
    setTitle('')
    setHours('')
    setMinutes('')
    setComment('')
    setErrorKey(null)
    setSaveError(null)
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setErrorKey(null)
    setSaveError(null)

    if (title.trim() === '') return setErrorKey('activity.error.titleRequired')
    if (!selectedSubcategory) return setErrorKey('activity.error.subcategoryRequired')
    if (totalMinutes <= 0) return setErrorKey('activity.error.timeRequired')
    if (totalMinutes > MAX_MINUTES) return setErrorKey('activity.error.timeTooLong')
    if (!user) return

    mutation.mutate({
      userId: user.id,
      subcategory: selectedSubcategory,
      title,
      date,
      actualMinutes: totalMinutes,
      comment,
    })
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200"
    >
      <h2 className="text-base font-semibold text-slate-900">{t('activity.formTitle')}</h2>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <Select
          label={t('activity.category')}
          value={categoryId}
          onChange={(e) => {
            setCategoryId(e.target.value)
            // Сбрасываем вид работы: прежний относился к другой категории.
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
          // Пока категория не выбрана, выбирать не из чего.
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
          className="sm:col-span-2"
        />

        <Input
          label={t('activity.date')}
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />

        <div>
          <span className="block text-sm font-medium text-slate-700">{t('activity.time')}</span>
          <div className="mt-1 flex gap-2">
            {/* Намеренно БЕЗ атрибута max.
                С ним браузер блокирует отправку формы сам и показывает
                собственное сообщение — непереведённое и неоформленное.
                Проверку делаем ниже в handleSubmit: тогда человек видит
                понятный текст на своём языке. */}
            <Input
              label={t('activity.hours')}
              type="number"
              min={0}
              inputMode="numeric"
              value={hours}
              onChange={(e) => setHours(e.target.value)}
              className="flex-1"
            />
            <Input
              label={t('activity.minutes')}
              type="number"
              min={0}
              inputMode="numeric"
              value={minutes}
              onChange={(e) => setMinutes(e.target.value)}
              className="flex-1"
            />
          </div>
        </div>

        <Input
          label={t('activity.comment')}
          placeholder={t('activity.commentPlaceholder')}
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          className="sm:col-span-2"
        />
      </div>

      {/* Мгновенная оценка стоимости — появляется, как только выбран
          оплачиваемый вид работы и введено время. */}
      {previewValue > 0 && (
        <p className="mt-4 rounded-md bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-800">
          ≈{' '}
          {formatMoney(
            previewValue,
            selectedSubcategory?.market_rates?.currency ?? 'GBP',
            locale,
          )}
        </p>
      )}

      {errorKey && (
        <p role="alert" className="mt-4 rounded-md bg-red-50 p-3 text-sm text-red-700">
          {t(errorKey)}
        </p>
      )}

      {saveError && (
        <p role="alert" className="mt-4 rounded-md bg-red-50 p-3 text-sm text-red-700">
          {t('activity.error.saveFailed')} {saveError}
        </p>
      )}

      <Button type="submit" disabled={mutation.isPending} className="mt-4">
        {mutation.isPending ? t('common.saving') : t('activity.add')}
      </Button>
    </form>
  )
}
