import { useI18n } from '@/lib/i18n'
import { formatHours } from '@/lib/time'
import { formatMoney } from '@/lib/money'

/**
 * Карточка с одним показателем: подпись, крупное число, деньги.
 *
 * Это НЕ график. Для одного числа диаграмма из одного столбика была бы
 * лишней — число само по себе и есть визуализация. Графики начинаются
 * там, где чисел несколько и их надо сравнивать.
 *
 * ДЕНЬГИ ПОКАЗЫВАЕМ ДВУМЯ СТРОКАМИ, а не одной суммой. «Заработано»
 * это реальная зарплата, «Оценка труда» — сколько стоило бы купить
 * ту же работу на стороне. Сложить их в одно число значит получить
 * величину, которая ничего не означает.
 */
export function StatTile({
  label,
  minutes,
  earnings,
  estimated,
  earningsCurrency,
  estimatedCurrency,
  isLoading,
}: {
  label: string
  minutes: number
  /** Реально заработано — зарплата за оплачиваемую работу. */
  earnings: number
  /** Оценка неоплачиваемого труда по рыночным ставкам. */
  estimated: number
  /** У двух сумм валюта может отличаться, поэтому их две. */
  earningsCurrency: string
  estimatedCurrency: string
  isLoading?: boolean
}) {
  const { t, locale } = useI18n()

  return (
    <div className="rounded-xl bg-surface p-5 shadow-sm ring-1 ring-line">
      <p className="text-sm font-medium text-ink-4">{label}</p>

      {isLoading ? (
        <p className="mt-2 text-2xl font-bold text-ink-6">{t('common.loading')}</p>
      ) : (
        <>
          {/* Крупное число — обычные пропорциональные цифры.
              Табличные (tabular-nums) нужны там, где числа выстроены
              в столбец и должны совпадать по ширине; здесь это не так. */}
          <p className="mt-2 text-3xl font-bold text-ink">
            {formatHours(minutes, locale)}
          </p>

          {earnings > 0 && (
            <p className="mt-1 text-sm font-medium text-positive">
              {t('report.earned')}: {formatMoney(earnings, earningsCurrency, locale)}
            </p>
          )}

          {estimated > 0 && (
            <p className="mt-0.5 text-sm font-medium text-accent-deep">
              {t('family.marketValue')}: {formatMoney(estimated, estimatedCurrency, locale)}
            </p>
          )}

          {/* Пустая строка держит высоту карточек одинаковой,
              иначе соседние карточки прыгали бы по высоте. */}
          {earnings === 0 && estimated === 0 && <p className="mt-1 text-sm">&nbsp;</p>}
        </>
      )}
    </div>
  )
}
