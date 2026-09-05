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
import { createActivity, fetchActivities, completePlannedActivity } from './api'
import { findDuplicates, type DuplicateMatch } from './duplicates'
import { DuplicateWarning } from './DuplicateWarning'

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
  // Похожие записи, найденные при попытке сохранить. Пока список
  // не пуст, форма ждёт решения человека и ничего не пишет в базу.
  const [duplicates, setDuplicates] = useState<DuplicateMatch[]>([])

  const { data: categories } = useQuery({ queryKey: ['categories'], queryFn: fetchCategories })
  const { data: subcategories } = useQuery({
    queryKey: ['subcategories-with-rates'],
    queryFn: fetchSubcategoriesWithRates,
  })

  // Всё, что уже есть за выбранный день — и записанное, и запланированное.
  // Нужно, чтобы поймать дубль ДО сохранения.
  //
  // Загружаем заранее, а не в момент нажатия кнопки: иначе между
  // нажатием и предупреждением был бы заметный провал, и человек
  // успел бы нажать второй раз.
  const { data: dayActivities } = useQuery({
    queryKey: ['activities', 'day', date, user?.id],
    queryFn: () =>
      fetchActivities({
        from: date,
        to: date,
        userId: user!.id,
        status: 'all',
        // Ничьи задачи тоже наши: их может закрыть любой взрослый.
        includeUnassigned: true,
      }),
    enabled: Boolean(user?.id) && date !== '',
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

  // Закрытие уже запланированной задачи вместо создания второй записи.
  const completePlanned = useMutation({
    mutationFn: completePlannedActivity,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['activities'] })
      // Планер показывает те же задачи — его список тоже устарел.
      queryClient.invalidateQueries({ queryKey: ['planner'] })
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
    setDuplicates([])
  }

  /** Сохраняет запись без дальнейших проверок. */
  function save() {
    if (!user || !selectedSubcategory) return

    mutation.mutate({
      userId: user.id,
      subcategory: selectedSubcategory,
      title,
      date,
      actualMinutes: totalMinutes,
      comment,
    })
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

    const similar = findDuplicates({
      title,
      date,
      subcategoryId: selectedSubcategory.id,
      userId: user.id,
      existing: dayActivities ?? [],
    })

    // Нашли похожее — показываем и ждём. Решает человек, не приложение.
    if (similar.length > 0) return setDuplicates(similar)

    save()
  }

  /**
   * «Это она» — закрываем найденную задачу вместо новой записи.
   *
   * Время и комментарий берём из формы: человек только что их ввёл,
   * и это и есть факт по этой задаче.
   *
   * Записываем задачу на себя без оговорок — и это безопасно:
   * findDuplicates показывает только СВОИ и НИЧЬИ задачи, поэтому
   * чужая (в том числе детская) сюда просто не попадёт.
   */
  function handleCompleteExisting(match: DuplicateMatch) {
    if (!user || !selectedSubcategory) return

    completePlanned.mutate({
      activityId: match.activity.id!,
      actualMinutes: totalMinutes,
      subcategory: selectedSubcategory,
      claimForUserId: user.id,
      comment,
    })
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-xl bg-surface p-5 shadow-sm ring-1 ring-line"
    >
      <h2 className="text-base font-semibold text-ink">{t('activity.formTitle')}</h2>

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
          <span className="block text-sm font-medium text-ink-2">{t('activity.time')}</span>
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
        <p className="mt-4 rounded-md bg-positive-soft px-3 py-2 text-sm font-medium text-positive-deep">
          ≈{' '}
          {formatMoney(
            previewValue,
            selectedSubcategory?.market_rates?.currency ?? 'GBP',
            locale,
          )}
        </p>
      )}

      {errorKey && (
        <p role="alert" className="mt-4 rounded-md bg-danger-soft p-3 text-sm text-danger">
          {t(errorKey)}
        </p>
      )}

      {saveError && (
        <p role="alert" className="mt-4 rounded-md bg-danger-soft p-3 text-sm text-danger">
          {t('activity.error.saveFailed')} {saveError}
        </p>
      )}

      {duplicates.length > 0 && (
        <DuplicateWarning
          matches={duplicates}
          isBusy={mutation.isPending || completePlanned.isPending}
          onComplete={handleCompleteExisting}
          onSaveAnyway={save}
          onCancel={() => setDuplicates([])}
        />
      )}

      {/* Пока показано предупреждение, кнопку прячем: два способа
          сохранить на экране одновременно только путали бы. */}
      {duplicates.length === 0 && (
        <Button type="submit" disabled={mutation.isPending} className="mt-4">
          {mutation.isPending ? t('common.saving') : t('activity.add')}
        </Button>
      )}
    </form>
  )
}
