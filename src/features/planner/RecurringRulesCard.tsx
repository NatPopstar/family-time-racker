import { useState, type FormEvent } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useI18n, type TranslationKey } from '@/lib/i18n'
import { useAuth } from '@/features/auth/AuthProvider'
import { formatMinutes, hoursAndMinutesToMinutes } from '@/lib/time'
import { fetchCategories, fetchSubcategoriesWithRates } from '@/features/categories/api'
import { fetchAllProfiles } from '@/features/profile/api'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { fetchRecurringRules, createRecurringRule, deactivateRecurringRule } from './rulesApi'

const WEEKDAYS = [1, 2, 3, 4, 5, 6, 7] as const

/**
 * Повторяющиеся события: «каждую субботу у Саши занятие».
 *
 * Правило хранится одной строкой, а не копиями задач на месяцы вперёд.
 * Планер сам подставляет задачу в нужный день, когда неделя открывается.
 */
export function RecurringRulesCard() {
  const { t, locale } = useI18n()
  const { user } = useAuth()
  const queryClient = useQueryClient()

  const [isOpen, setIsOpen] = useState(false)
  const [categoryId, setCategoryId] = useState('')
  const [subcategoryId, setSubcategoryId] = useState('')
  const [title, setTitle] = useState('')
  const [address, setAddress] = useState('')
  const [weekday, setWeekday] = useState('6')
  const [hours, setHours] = useState('')
  const [minutes, setMinutes] = useState('')
  const [travel, setTravel] = useState('')
  const [assigneeId, setAssigneeId] = useState('')
  const [errorKey, setErrorKey] = useState<TranslationKey | null>(null)

  const { data: rules } = useQuery({ queryKey: ['recurring-rules'], queryFn: fetchRecurringRules })
  const { data: categories } = useQuery({ queryKey: ['categories'], queryFn: fetchCategories })
  const { data: profiles } = useQuery({ queryKey: ['profiles'], queryFn: fetchAllProfiles })
  const { data: subcategories } = useQuery({
    queryKey: ['subcategories-with-rates'],
    queryFn: fetchSubcategoriesWithRates,
  })

  function refresh() {
    queryClient.invalidateQueries({ queryKey: ['recurring-rules'] })
    queryClient.invalidateQueries({ queryKey: ['planner'] })
  }

  const create = useMutation({
    mutationFn: createRecurringRule,
    onSuccess: () => {
      refresh()
      setTitle('')
      setAddress('')
      setHours('')
      setMinutes('')
      setTravel('')
      setIsOpen(false)
    },
  })

  const remove = useMutation({ mutationFn: deactivateRecurringRule, onSuccess: refresh })

  const visibleSubcategories = (subcategories ?? []).filter((s) => s.category_id === categoryId)
  const plannedMinutes = hoursAndMinutesToMinutes(Number(hours) || 0, Number(minutes) || 0)

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setErrorKey(null)

    if (title.trim() === '') return setErrorKey('activity.error.titleRequired')
    if (!subcategoryId) return setErrorKey('activity.error.subcategoryRequired')
    if (plannedMinutes <= 0) return setErrorKey('activity.error.timeRequired')
    if (!user) return

    create.mutate({
      createdBy: user.id,
      subcategoryId,
      title,
      address,
      weekday: Number(weekday),
      plannedMinutes,
      travelMinutes: Number(travel) || 0,
      // Пусто — задача будет появляться ничьей.
      defaultUserId: assigneeId || null,
    })
  }

  return (
    <section className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-base font-semibold text-slate-900">{t('recurring.title')}</h2>
        <Button variant="secondary" onClick={() => setIsOpen((open) => !open)}>
          {isOpen ? t('common.cancel') : `+ ${t('recurring.add')}`}
        </Button>
      </div>
      <p className="mt-1 text-sm text-slate-500">{t('recurring.hint')}</p>

      {rules && rules.length === 0 && (
        <p className="mt-3 text-sm text-slate-400">{t('recurring.none')}</p>
      )}

      {rules && rules.length > 0 && (
        <ul className="mt-3 space-y-2">
          {rules.map((rule) => {
            const owner = profiles?.find((p) => p.id === rule.default_user_id)
            return (
              <li
                key={rule.id}
                className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg bg-slate-50 p-3 text-sm"
              >
                <span className="font-medium text-slate-900">{rule.title}</span>
                <span className="text-slate-500">
                  {t(`weekday.every.${rule.weekday}` as TranslationKey)}
                </span>
                <span className="tabular-nums text-slate-500">
                  {formatMinutes(rule.planned_minutes, locale)}
                  {rule.travel_minutes > 0 && (
                    <> {' + '}🚗 {formatMinutes(rule.travel_minutes, locale)}</>
                  )}
                </span>
                {rule.address && <span className="text-slate-400">📍 {rule.address}</span>}
                <span className="text-slate-400">
                  {owner ? owner.display_name : t('planner.nobody')}
                </span>
                <button
                  type="button"
                  onClick={() => remove.mutate(rule.id)}
                  className="ml-auto text-xs text-slate-400 hover:text-red-600"
                >
                  {t('recurring.remove')}
                </button>
              </li>
            )
          })}
        </ul>
      )}

      {isOpen && (
        <form onSubmit={handleSubmit} className="mt-4 border-t border-slate-100 pt-4">
          <div className="grid gap-3 sm:grid-cols-2">
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

            <Select
              label={t('recurring.weekday')}
              value={weekday}
              onChange={(e) => setWeekday(e.target.value)}
            >
              {WEEKDAYS.map((day) => (
                <option key={day} value={day}>
                  {t(`weekday.${day}` as TranslationKey)}
                </option>
              ))}
            </Select>

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

            <Input
              label={t('activity.travel')}
              type="number"
              min={0}
              value={travel}
              onChange={(e) => setTravel(e.target.value)}
            />
          </div>

          {errorKey && (
            <p role="alert" className="mt-3 rounded-md bg-red-50 p-3 text-sm text-red-700">
              {t(errorKey)}
            </p>
          )}

          <Button type="submit" disabled={create.isPending} className="mt-4">
            {create.isPending ? t('common.saving') : t('common.save')}
          </Button>
        </form>
      )}
    </section>
  )
}
