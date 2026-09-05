import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useI18n } from '@/lib/i18n'
import { useAuth } from '@/features/auth/AuthProvider'
import { getPeriodRange, type PeriodId } from '@/lib/periods'
import { formatMinutes, formatHours } from '@/lib/time'
import { formatMoney } from '@/lib/money'
import { formatDateShort } from '@/lib/dates'
import { fetchActivities, deleteActivity } from '@/features/activities/api'
import { fetchCategories } from '@/features/categories/api'
import { fetchAllProfiles } from '@/features/profile/api'
import { detectCurrencies } from '@/features/dashboard/stats'
import { PeriodFilter } from '@/features/activities/PeriodFilter'
import { EditActivityDialog } from '@/features/activities/EditActivityDialog'
import { Select } from '@/components/ui/Select'
import type { ActivityWithValue } from '@/types/models'
import { PageHeader } from '@/components/PageHeader'

/**
 * «История» — все записи семьи с фильтрами, правкой и удалением.
 *
 * Фильтры по человеку и категории применяются ЗДЕСЬ, в браузере,
 * а не запросом в базу. Почему: записей за месяц у семьи из трёх
 * человек — сотни, они уже загружены, и фильтровать их на месте
 * мгновенно. Ходить в базу на каждое переключение было бы медленнее.
 * Период — другое дело: он меняет объём данных, поэтому идёт в запрос.
 */
export function HistoryPage() {
  const { t, locale } = useI18n()
  const { user } = useAuth()
  const queryClient = useQueryClient()

  const [period, setPeriod] = useState<PeriodId>('thisWeek')
  const [range, setRange] = useState(() => getPeriodRange('thisWeek'))
  const [personId, setPersonId] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [editing, setEditing] = useState<ActivityWithValue | null>(null)

  const { data: profiles } = useQuery({ queryKey: ['profiles'], queryFn: fetchAllProfiles })
  const { data: categories } = useQuery({ queryKey: ['categories'], queryFn: fetchCategories })

  const {
    data: activities,
    isPending,
    error,
  } = useQuery({
    queryKey: ['activities', range.from, range.to],
    queryFn: () => fetchActivities({ from: range.from, to: range.to }),
  })

  const visible = useMemo(() => {
    return (activities ?? []).filter((activity) => {
      if (personId && activity.user_id !== personId) return false
      if (categoryId && activity.category_id !== categoryId) return false
      return true
    })
  }, [activities, personId, categoryId])

  const removal = useMutation({
    mutationFn: deleteActivity,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['activities'] }),
  })

  // Валюта итога берётся из самих записей, а не зашита в код.
  // В истории у каждой записи своя валюта; для ИТОГА берём валюту оценки.
  const { estimated: currency } = detectCurrencies(visible)
  const totalMinutes = visible.reduce((sum, a) => sum + (a.actual_minutes ?? 0), 0)
  const totalValue = visible.reduce((sum, a) => sum + (a.value ?? 0), 0)

  /** Имя автора записи. Профили загружены отдельно, сопоставляем по id. */
  function nameOf(userId: string | null) {
    return profiles?.find((p) => p.id === userId)?.display_name ?? '—'
  }

  return (
    <div className="space-y-6">
      <PageHeader title={t('page.history.title')} subtitle={t('page.history.subtitle')} />

      <div className="space-y-3 rounded-xl bg-surface p-5 shadow-sm ring-1 ring-line">
        <PeriodFilter
          period={period}
          range={range}
          onChange={(nextPeriod, nextRange) => {
            setPeriod(nextPeriod)
            setRange(nextRange)
          }}
        />

        <div className="grid gap-3 sm:grid-cols-2">
          <Select
            label={t('filter.person')}
            value={personId}
            onChange={(e) => setPersonId(e.target.value)}
          >
            <option value="">{t('filter.everyone')}</option>
            {profiles?.map((profile) => (
              <option key={profile.id} value={profile.id}>
                {profile.display_name}
              </option>
            ))}
          </Select>

          <Select
            label={t('filter.category')}
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
          >
            <option value="">{t('filter.allCategories')}</option>
            {categories?.map((category) => (
              <option key={category.id} value={category.id}>
                {category.icon} {category.name}
              </option>
            ))}
          </Select>
        </div>
      </div>

      {isPending && <p className="text-ink-5">{t('common.loading')}</p>}

      {error && (
        <p role="alert" className="rounded-md bg-danger-soft p-3 text-sm text-danger">
          {t('activity.loadFailed')} {error.message}
        </p>
      )}

      {activities && visible.length === 0 && (
        <p className="rounded-lg border border-dashed border-line-strong bg-surface p-6 text-center text-sm text-ink-4">
          {t('history.empty')}
        </p>
      )}

      {visible.length > 0 && (
        <>
          {/* overflow-x-auto: на телефоне таблица прокручивается вбок,
              а не растягивает страницу. */}
          <div className="overflow-x-auto rounded-xl bg-surface shadow-sm ring-1 ring-line">
            <table className="w-full text-sm">
              <thead className="border-b border-line text-left text-ink-4">
                <tr>
                  <th scope="col" className="px-4 py-3 font-medium">{t('history.date')}</th>
                  <th scope="col" className="px-4 py-3 font-medium">{t('history.person')}</th>
                  <th scope="col" className="px-4 py-3 font-medium">{t('history.task')}</th>
                  <th scope="col" className="px-4 py-3 font-medium">{t('history.category')}</th>
                  <th scope="col" className="px-4 py-3 text-right font-medium">{t('history.time')}</th>
                  <th scope="col" className="px-4 py-3 text-right font-medium">{t('history.value')}</th>
                  <th scope="col" className="px-4 py-3 font-medium">{t('history.actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {visible.map((activity) => {
                  const isMine = activity.user_id === user?.id
                  return (
                    <tr key={activity.id}>
                      <td className="px-4 py-3 whitespace-nowrap text-ink-3">
                        {formatDateShort(activity.date!, locale)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">{nameOf(activity.user_id)}</td>
                      <td className="px-4 py-3">
                        <span className="font-medium text-ink">{activity.title}</span>
                        {activity.comment && (
                          <span className="block text-ink-5">{activity.comment}</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-ink-3">
                        {activity.category_name} · {activity.subcategory_name}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums whitespace-nowrap">
                        {formatMinutes(activity.actual_minutes ?? 0, locale)}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums whitespace-nowrap">
                        {activity.value && activity.value > 0 ? (
                          <span className="text-positive">
                            {formatMoney(activity.value, activity.currency_snapshot ?? 'GBP', locale)}
                          </span>
                        ) : (
                          <span className="text-ink-6">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {/* Кнопки только у своих записей. Чужие защищены
                            ещё и в базе, но показывать заведомо нерабочие
                            кнопки — плохо. */}
                        {isMine ? (
                          <span className="flex gap-3">
                            <button
                              type="button"
                              onClick={() => setEditing(activity)}
                              className="text-accent hover:text-accent-lite"
                            >
                              {t('history.edit')}
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                if (window.confirm(t('history.deleteConfirm'))) {
                                  removal.mutate(activity.id!)
                                }
                              }}
                              className="text-ink-5 hover:text-danger-hover"
                            >
                              {t('common.delete')}
                            </button>
                          </span>
                        ) : (
                          <span className="text-ink-6">—</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
              <tfoot className="border-t border-line bg-surface-2 font-semibold">
                <tr>
                  <td colSpan={4} className="px-4 py-3">{t('common.total')}</td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {formatHours(totalMinutes, locale)}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-positive">
                    {totalValue > 0 ? formatMoney(totalValue, currency, locale) : '—'}
                  </td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>

          <p className="text-xs text-ink-5">{t('history.foreignHint')}</p>
        </>
      )}

      {editing && (
        <EditActivityDialog activity={editing} onClose={() => setEditing(null)} />
      )}
    </div>
  )
}
