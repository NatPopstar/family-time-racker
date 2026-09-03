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
import { PeriodFilter } from '@/features/activities/PeriodFilter'
import { EditActivityDialog } from '@/features/activities/EditActivityDialog'
import { Select } from '@/components/ui/Select'
import type { ActivityWithValue } from '@/types/models'

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

  const totalMinutes = visible.reduce((sum, a) => sum + (a.actual_minutes ?? 0), 0)
  const totalValue = visible.reduce((sum, a) => sum + (a.value ?? 0), 0)

  /** Имя автора записи. Профили загружены отдельно, сопоставляем по id. */
  function nameOf(userId: string | null) {
    return profiles?.find((p) => p.id === userId)?.display_name ?? '—'
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t('page.history.title')}</h1>
        <p className="mt-1 text-sm text-slate-500">{t('page.history.subtitle')}</p>
      </div>

      <div className="space-y-3 rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
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

      {isPending && <p className="text-slate-400">{t('common.loading')}</p>}

      {error && (
        <p role="alert" className="rounded-md bg-red-50 p-3 text-sm text-red-700">
          {t('activity.loadFailed')} {error.message}
        </p>
      )}

      {activities && visible.length === 0 && (
        <p className="rounded-lg border border-dashed border-slate-300 bg-white p-6 text-center text-sm text-slate-500">
          {t('history.empty')}
        </p>
      )}

      {visible.length > 0 && (
        <>
          {/* overflow-x-auto: на телефоне таблица прокручивается вбок,
              а не растягивает страницу. */}
          <div className="overflow-x-auto rounded-xl bg-white shadow-sm ring-1 ring-slate-200">
            <table className="w-full text-sm">
              <thead className="border-b border-slate-200 text-left text-slate-500">
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
                      <td className="px-4 py-3 whitespace-nowrap text-slate-600">
                        {formatDateShort(activity.date!, locale)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">{nameOf(activity.user_id)}</td>
                      <td className="px-4 py-3">
                        <span className="font-medium text-slate-900">{activity.title}</span>
                        {activity.comment && (
                          <span className="block text-slate-400">{activity.comment}</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {activity.category_name} · {activity.subcategory_name}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums whitespace-nowrap">
                        {formatMinutes(activity.actual_minutes ?? 0, locale)}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums whitespace-nowrap">
                        {activity.value && activity.value > 0 ? (
                          <span className="text-emerald-700">
                            {formatMoney(activity.value, activity.currency_snapshot ?? 'GBP', locale)}
                          </span>
                        ) : (
                          <span className="text-slate-300">—</span>
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
                              className="text-indigo-600 hover:text-indigo-500"
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
                              className="text-slate-400 hover:text-red-600"
                            >
                              {t('common.delete')}
                            </button>
                          </span>
                        ) : (
                          <span className="text-slate-300">—</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
              <tfoot className="border-t border-slate-200 bg-slate-50 font-semibold">
                <tr>
                  <td colSpan={4} className="px-4 py-3">{t('common.total')}</td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {formatHours(totalMinutes, locale)}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-emerald-700">
                    {totalValue > 0 ? formatMoney(totalValue, 'GBP', locale) : '—'}
                  </td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>

          <p className="text-xs text-slate-400">{t('history.foreignHint')}</p>
        </>
      )}

      {editing && (
        <EditActivityDialog activity={editing} onClose={() => setEditing(null)} />
      )}
    </div>
  )
}
