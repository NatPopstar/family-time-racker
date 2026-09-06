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
import { TravelInput, type TravelLegs } from './TravelInput'
import { RuneStone } from '@/components/ornaments'

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
  const [travelLegs, setTravelLegs] = useState<TravelLegs>(2)
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
  const travelMinutes = (Number(travel) || 0) * travelLegs

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setErrorKey(null)

    if (title.trim() === '') return setErrorKey('activity.error.titleRequired')
    if (!subcategoryId) return setErrorKey('activity.error.subcategoryRequired')
    // Задача может состоять ИЗ ОДНОЙ ДОРОГИ: отвёз и уехал домой —
    // своего времени ноль, труд весь в пути. Раньше здесь стояло
    // «время больше нуля», и такую задачу нельзя было записать честно:
    // приходилось выдумывать минуты.
    if (plannedMinutes <= 0 && travelMinutes <= 0) {
      return setErrorKey('activity.error.timeOrTravelRequired')
    }
    if (!user) return

    create.mutate({
      createdBy: user.id,
      subcategoryId,
      title,
      address,
      weekday: Number(weekday),
      plannedMinutes,
      travelOneWayMinutes: Number(travel) || 0,
      travelLegs,
      // Пусто — задача будет появляться ничьей.
      defaultUserId: assigneeId || null,
    })
  }

  return (
    <section className="rounded-xl bg-surface p-5 shadow-sm ring-1 ring-line">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-base font-semibold text-ink">{t('recurring.title')}</h2>
        <Button variant="secondary" onClick={() => setIsOpen((open) => !open)}>
          {isOpen ? t('common.cancel') : `+ ${t('recurring.add')}`}
        </Button>
      </div>
      <p className="mt-1 text-sm text-ink-4">{t('recurring.hint')}</p>

      {rules && rules.length === 0 && (
        <p className="mt-3 flex items-center gap-2 text-sm text-ink-5">
          <RuneStone className="size-4 shrink-0" />
          {t('recurring.none')}
        </p>
      )}

      {rules && rules.length > 0 && (
        <ul className="mt-3 space-y-2">
          {rules.map((rule) => {
            const owner = profiles?.find((p) => p.id === rule.default_user_id)
            return (
              <li
                key={rule.id}
                className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg bg-surface-2 p-3 text-sm"
              >
                <span className="font-medium text-ink">{rule.title}</span>
                <span className="text-ink-4">
                  {t(`weekday.every.${rule.weekday}` as TranslationKey)}
                </span>
                <span className="tabular-nums text-ink-4">
                  {formatMinutes(rule.planned_minutes, locale)}
                  {(rule.travel_minutes ?? 0) > 0 && (
                    <> {' + '}🚗 {formatMinutes(rule.travel_minutes ?? 0, locale)}</>
                  )}
                </span>
                {rule.address && <span className="text-ink-5">📍 {rule.address}</span>}
                <span className="text-ink-5">
                  {owner ? owner.display_name : t('planner.nobody')}
                </span>
                <button
                  type="button"
                  onClick={() => remove.mutate(rule.id)}
                  className="ml-auto text-xs text-ink-5 hover:text-danger-hover"
                >
                  {t('recurring.remove')}
                </button>
              </li>
            )
          })}
        </ul>
      )}

      {isOpen && (
        <form onSubmit={handleSubmit} className="mt-4 border-t border-line-soft pt-4">
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

            <div className="sm:col-span-2">
              <TravelInput
                oneWayMinutes={travel}
                legs={travelLegs}
                onOneWayChange={setTravel}
                onLegsChange={setTravelLegs}
              />
            </div>
          </div>

          {errorKey && (
            <p role="alert" className="mt-3 rounded-md bg-danger-soft p-3 text-sm text-danger">
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
