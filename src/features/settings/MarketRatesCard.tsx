import { useState, type FormEvent } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useI18n, type TranslationKey } from '@/lib/i18n'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import {
  fetchMarketRates,
  updateMarketRate,
  createMarketRate,
  changeCurrency,
  setRateActive,
} from './api'

/** Валюты, которые предлагаем на выбор. Список короткий и понятный. */
const CURRENCIES = ['GBP', 'EUR', 'USD', 'RUB'] as const

/**
 * Таблица ставок с правкой прямо в строке.
 *
 * Правка «на месте» без отдельного окна выбрана намеренно: ставки
 * меняют редко и по одной цифре, открывать ради этого окно — лишний шаг.
 */
export function MarketRatesCard() {
  const { t } = useI18n()
  const queryClient = useQueryClient()

  const [newName, setNewName] = useState('')
  const [newRate, setNewRate] = useState('')
  const [errorKey, setErrorKey] = useState<TranslationKey | null>(null)

  const { data: rates, isPending } = useQuery({
    queryKey: ['market-rates'],
    queryFn: fetchMarketRates,
  })

  function refresh() {
    queryClient.invalidateQueries({ queryKey: ['market-rates'] })
    // Виды работы носят ставку внутри себя — их тоже надо перезапросить,
    // иначе форма записи покажет старую цифру.
    queryClient.invalidateQueries({ queryKey: ['subcategories-with-rates'] })
  }

  const update = useMutation({ mutationFn: updateMarketRate, onSuccess: refresh })
  const create = useMutation({
    mutationFn: createMarketRate,
    onSuccess: () => {
      refresh()
      setNewName('')
      setNewRate('')
    },
  })
  const currency = useMutation({ mutationFn: changeCurrency, onSuccess: refresh })
  const toggle = useMutation({ mutationFn: setRateActive, onSuccess: refresh })

  const currentCurrency = rates?.[0]?.currency ?? 'GBP'

  function handleAdd(event: FormEvent) {
    event.preventDefault()
    setErrorKey(null)

    if (newName.trim() === '') return setErrorKey('settings.error.nameRequired')
    const value = Number(newRate)
    if (!Number.isFinite(value) || value <= 0) return setErrorKey('settings.error.rateRequired')

    create.mutate({ name: newName, hourlyRate: value, currency: currentCurrency })
  }

  return (
    <section className="rounded-xl bg-surface p-5 shadow-sm ring-1 ring-line">
      <h2 className="text-base font-semibold text-ink">{t('settings.ratesTitle')}</h2>
      <p className="mt-1 text-sm text-ink-4">{t('settings.ratesHint')}</p>

      {isPending && <p className="mt-4 text-ink-5">{t('common.loading')}</p>}

      {rates && (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-line text-left text-ink-4">
              <tr>
                <th scope="col" className="py-2 pr-4 font-medium">{t('settings.rateName')}</th>
                <th scope="col" className="py-2 pr-4 font-medium">{t('settings.rateValue')}</th>
                <th scope="col" className="py-2 font-medium">{t('settings.rateActive')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rates.map((rate) => (
                <tr key={rate.id}>
                  <td className="py-2 pr-4 font-medium text-ink">{rate.name}</td>
                  <td className="py-2 pr-4">
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min={0}
                        step="0.5"
                        aria-label={`${t('settings.rateValue')}: ${rate.name}`}
                        defaultValue={rate.hourly_rate}
                        // Сохраняем при уходе из поля, а не на каждое нажатие:
                        // иначе запрос уходил бы после каждой цифры.
                        onBlur={(e) => {
                          const value = Number(e.target.value)
                          if (Number.isFinite(value) && value >= 0 && value !== rate.hourly_rate) {
                            update.mutate({ id: rate.id, hourlyRate: value })
                          }
                        }}
                        className="w-24 rounded-md border-0 px-2 py-1 text-ink ring-1 ring-line-strong focus:ring-2 focus:ring-accent focus:outline-none"
                      />
                      <span className="text-ink-5">{rate.currency}</span>
                    </div>
                  </td>
                  <td className="py-2">
                    <input
                      type="checkbox"
                      aria-label={`${t('settings.rateActive')}: ${rate.name}`}
                      checked={rate.is_active}
                      onChange={(e) => toggle.mutate({ id: rate.id, isActive: e.target.checked })}
                      className="h-4 w-4 rounded"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Смена валюты */}
      <div className="mt-6 border-t border-line-soft pt-4">
        <Select
          label={t('settings.currency')}
          value={currentCurrency}
          onChange={(e) => currency.mutate(e.target.value)}
          className="max-w-40"
        >
          {CURRENCIES.map((code) => (
            <option key={code} value={code}>
              {code}
            </option>
          ))}
        </Select>
        {/* Честное предупреждение: тихий пересчёт по выдуманному курсу
            был бы хуже, чем прямое «мы просто меняем значок». */}
        <p className="mt-2 text-xs text-warn">{t('settings.currencyWarning')}</p>
      </div>

      {/* Добавление новой профессии */}
      <form onSubmit={handleAdd} className="mt-6 border-t border-line-soft pt-4">
        <h3 className="text-sm font-semibold text-ink">{t('settings.addRate')}</h3>

        <div className="mt-3 flex flex-wrap items-end gap-3">
          <Input
            label={t('settings.addRateName')}
            placeholder={t('settings.addRateNamePlaceholder')}
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            className="min-w-48 flex-1"
          />
          <Input
            label={t('settings.rateValue')}
            type="number"
            min={0}
            step="0.5"
            value={newRate}
            onChange={(e) => setNewRate(e.target.value)}
            className="w-32"
          />
          <Button type="submit" disabled={create.isPending}>
            {t('common.save')}
          </Button>
        </div>

        {errorKey && (
          <p role="alert" className="mt-3 rounded-md bg-danger-soft p-3 text-sm text-danger">
            {t(errorKey)}
          </p>
        )}
      </form>
    </section>
  )
}
