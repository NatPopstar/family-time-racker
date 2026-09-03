import { useI18n } from '@/lib/i18n'
import { formatHours } from '@/lib/time'
import { formatMoney } from '@/lib/money'

/**
 * Карточка с одним показателем: подпись, крупное число, стоимость.
 *
 * Это НЕ график. Для одного числа диаграмма из одного столбика была бы
 * лишней — число само по себе и есть визуализация. Графики начинаются
 * там, где чисел несколько и их надо сравнивать.
 */
export function StatTile({
  label,
  minutes,
  value,
  isLoading,
}: {
  label: string
  minutes: number
  value: number
  isLoading?: boolean
}) {
  const { t, locale } = useI18n()

  return (
    <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
      <p className="text-sm font-medium text-slate-500">{label}</p>

      {isLoading ? (
        <p className="mt-2 text-2xl font-bold text-slate-300">{t('common.loading')}</p>
      ) : (
        <>
          {/* Крупное число — обычные пропорциональные цифры.
              Табличные (tabular-nums) нужны там, где числа выстроены
              в столбец и должны совпадать по ширине; здесь это не так. */}
          <p className="mt-2 text-3xl font-bold text-slate-900">
            {formatHours(minutes, locale)}
          </p>
          <p className="mt-1 text-sm font-medium text-emerald-700">
            {value > 0 ? formatMoney(value, 'GBP', locale) : ' '}
          </p>
        </>
      )}
    </div>
  )
}
