import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useI18n } from '@/lib/i18n'
import { useAuth } from '@/features/auth/AuthProvider'
import { formatMinutes, formatHours } from '@/lib/time'
import { formatMoney } from '@/lib/money'
import { fetchActivities, deleteActivity } from './api'

/**
 * Список записей за период с итогами.
 *
 * Удалять можно только свои записи — за этим следит RLS в базе.
 * Кнопку удаления показываем всем, но у чужой записи она просто
 * не сработает; в разделе «История» мы её спрячем аккуратнее.
 */
export function ActivityList({ from, to }: { from: string; to: string }) {
  const { t, locale } = useI18n()
  const { user } = useAuth()
  const queryClient = useQueryClient()

  const {
    data: activities,
    isPending,
    error,
  } = useQuery({
    // Ключ включает даты и пользователя: смена периода = другой запрос,
    // и React Query не покажет по ошибке данные прошлого периода.
    queryKey: ['activities', from, to, user?.id],
    queryFn: () => fetchActivities({ from, to, userId: user?.id }),
    enabled: Boolean(user?.id),
  })

  const removal = useMutation({
    mutationFn: deleteActivity,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['activities'] }),
  })

  if (isPending) {
    return <p className="text-slate-400">{t('common.loading')}</p>
  }

  if (error) {
    return (
      <p role="alert" className="rounded-md bg-red-50 p-3 text-sm text-red-700">
        {t('activity.loadFailed')} {error.message}
      </p>
    )
  }

  if (activities.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-slate-300 bg-white p-6 text-center text-sm text-slate-500">
        {t('activity.empty')}
      </p>
    )
  }

  // Итоги считаем здесь, а не запросом в базу: записей за день десятки,
  // складывать их в браузере быстрее, чем идти за суммой на сервер.
  const totalMinutes = activities.reduce((sum, a) => sum + (a.actual_minutes ?? 0), 0)
  const totalValue = activities.reduce((sum, a) => sum + (a.value ?? 0), 0)
  const currency = activities.find((a) => a.currency_snapshot)?.currency_snapshot ?? 'GBP'

  return (
    <div className="space-y-2">
      <ul className="space-y-2">
        {activities.map((activity) => (
          <li
            key={activity.id}
            className="flex items-start justify-between gap-4 rounded-lg bg-white p-4 shadow-sm ring-1 ring-slate-200"
          >
            <div className="min-w-0">
              <p className="truncate font-medium text-slate-900">{activity.title}</p>
              <p className="mt-0.5 text-sm text-slate-500">
                {activity.category_name} · {activity.subcategory_name}
              </p>
              {activity.comment && (
                <p className="mt-1 text-sm text-slate-400">{activity.comment}</p>
              )}
            </div>

            <div className="shrink-0 text-right">
              <p className="font-semibold tabular-nums text-slate-900">
                {formatMinutes(activity.actual_minutes ?? 0, locale)}
              </p>
              <p className="mt-0.5 text-sm tabular-nums text-emerald-700">
                {activity.value && activity.value > 0
                  ? formatMoney(activity.value, activity.currency_snapshot ?? 'GBP', locale)
                  : // Работа и учёба деньгами не оцениваются — говорим об этом прямо,
                    // иначе пустое место выглядит как потерянные данные.
                    <span className="text-slate-400">{t('activity.notPriced')}</span>}
              </p>
              {activity.user_id === user?.id && (
                <button
                  type="button"
                  onClick={() => removal.mutate(activity.id!)}
                  disabled={removal.isPending}
                  className="mt-1 text-xs text-slate-400 hover:text-red-600 disabled:opacity-50"
                >
                  {t('common.delete')}
                </button>
              )}
            </div>
          </li>
        ))}
      </ul>

      <div className="flex items-center justify-between rounded-lg bg-slate-100 px-4 py-3">
        <span className="text-sm font-medium text-slate-600">{t('common.total')}</span>
        <span className="flex gap-4 font-semibold tabular-nums">
          <span>{formatHours(totalMinutes, locale)}</span>
          {totalValue > 0 && (
            <span className="text-emerald-700">{formatMoney(totalValue, currency, locale)}</span>
          )}
        </span>
      </div>
    </div>
  )
}
