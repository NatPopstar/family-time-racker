import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useI18n } from '@/lib/i18n'
import { useAuth } from '@/features/auth/AuthProvider'
import { formatMinutes } from '@/lib/time'
import { activityMinutes } from '@/features/dashboard/stats'
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
  // Список свёрнут: за день записей набирается много, и они отодвигают
  // всё остальное. Итог при этом остаётся на виду — за ним и заходят.
  const [isOpen, setIsOpen] = useState(false)

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
    return (
      <section className="rounded-xl bg-surface p-5 shadow-sm ring-1 ring-line">
        <h2 className="text-base font-semibold text-ink">{t('activity.todayTitle')}</h2>
        <p className="mt-3 text-ink-5">{t('common.loading')}</p>
      </section>
    )
  }

  if (error) {
    return (
      <p role="alert" className="rounded-md bg-danger-soft p-3 text-sm text-danger">
        {t('activity.loadFailed')} {error.message}
      </p>
    )
  }

  if (activities.length === 0) {
    return (
      <section className="rounded-xl bg-surface p-5 shadow-sm ring-1 ring-line">
        <h2 className="text-base font-semibold text-ink">{t('activity.todayTitle')}</h2>
        <p className="mt-3 rounded-lg border border-dashed border-line-strong p-6 text-center text-sm text-ink-4">
          {t('activity.empty')}
        </p>
      </section>
    )
  }

  // Итоги считаем здесь, а не запросом в базу: записей за день десятки,
  // складывать их в браузере быстрее, чем идти за суммой на сервер.
  // Через activityMinutes, а не сложением actual_minutes: дорога — тоже
  // потраченное время, и карточки «Сегодня» на дашборде считают именно так.
  // Пока здесь было своё сложение, итог списка расходился с итогом сверху.

  return (
    // Заголовок внутри карточки, а не над ней: блок «записи за сегодня»
    // должен читаться как одно целое, а не как подпись и отдельная плашка.
    <section className="rounded-xl bg-surface p-5 shadow-sm ring-1 ring-line">
      <h2 className="text-base font-semibold text-ink">{t('activity.todayTitle')}</h2>

      <div className="mt-3 space-y-2">
      <button
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        aria-expanded={isOpen}
        className="flex w-full items-center gap-2 rounded-lg bg-surface px-4 py-2.5 text-left text-sm shadow-sm ring-1 ring-line transition hover:bg-surface-2"
      >
        <span aria-hidden="true" className="text-xs text-ink-4">
          {isOpen ? '▾' : '▸'}
        </span>
        <span className="font-medium text-ink-2">
          {t('history.recordCount')}: {activities.length}
        </span>
        <span className="ml-auto text-ink-4">
          {isOpen ? t('history.hideList') : t('history.showList')}
        </span>
      </button>

      {/* Сами записи прячутся, ИТОГ остаётся ниже: с вопросом «сколько
          вышло за день» заходят чаще, чем с «покажи каждую строку». */}
      {isOpen && (
      <ul className="space-y-2">
        {activities.map((activity) => (
          <li
            key={activity.id}
            className="flex items-start justify-between gap-4 rounded-lg bg-surface p-4 shadow-sm ring-1 ring-line"
          >
            <div className="min-w-0">
              <p className="truncate font-medium text-ink">{activity.title}</p>
              <p className="mt-0.5 text-sm text-ink-4">
                {activity.category_name} · {activity.subcategory_name}
              </p>
              {activity.comment && (
                <p className="mt-1 text-sm text-ink-5">{activity.comment}</p>
              )}
            </div>

            <div className="shrink-0 text-right">
              {/* Время СО ВРЕМЕНЕМ В ДОРОГЕ: именно столько занял день.
                  Раньше здесь стояло только actual_minutes, и запись
                  «отвела в школу» — которая целиком состоит из дороги —
                  показывалась как «0 мин», хотя в итоге строкой ниже
                  честно считалось полтора часа. Строка спорила с итогом. */}
              <p className="font-semibold tabular-nums text-ink">
                {formatMinutes(activityMinutes(activity), locale)}
              </p>
              {(activity.travel_minutes ?? 0) > 0 && (
                <p className="text-xs tabular-nums text-ink-5">
                  🚗 {formatMinutes(activity.travel_minutes ?? 0, locale)}
                </p>
              )}
              <p className="mt-0.5 text-sm tabular-nums text-positive">
                {activity.value && activity.value > 0
                  ? formatMoney(activity.value, activity.currency_snapshot ?? 'GBP', locale)
                  : // Денег нет по двум разным причинам, и их надо различать:
                    // у работы и учёбы ставки нет вовсе, а у выходного
                    // с ребёнком она есть, просто не считается по правилу.
                    // Одна общая надпись выглядела бы как потерянные данные.
                    <span className="text-ink-5">
                      {t(
                        activity.is_unpaid_weekend
                          ? 'activity.weekendNotPriced'
                          : 'activity.notPriced',
                      )}
                    </span>}
              </p>
              {activity.user_id === user?.id && (
                <button
                  type="button"
                  onClick={() => removal.mutate(activity.id!)}
                  disabled={removal.isPending}
                  className="mt-1 text-xs text-ink-5 hover:text-danger-hover disabled:opacity-50"
                >
                  {t('common.delete')}
                </button>
              )}
            </div>
          </li>
        ))}
      </ul>
      )}
      </div>
    </section>
  )
}
