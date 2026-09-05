import { useState, type FormEvent } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useI18n, type TranslationKey } from '@/lib/i18n'
import { fetchCategories, fetchSubcategoriesWithRates } from '@/features/categories/api'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { fetchMarketRates, createSubcategory, setSubcategoryRate } from './api'

/**
 * Виды работы и привязка ставок.
 *
 * Здесь видно главное правило проекта в действии: вид работы без ставки
 * («Работа», «Учёба») деньгами не оценивается. Это не спрятано в коде —
 * это одно значение в выпадающем списке, которое можно поменять.
 */
export function SubcategoriesCard() {
  const { t } = useI18n()
  const queryClient = useQueryClient()

  const [categoryId, setCategoryId] = useState('')
  const [name, setName] = useState('')
  const [rateId, setRateId] = useState('')
  const [errorKey, setErrorKey] = useState<TranslationKey | null>(null)

  const { data: categories } = useQuery({ queryKey: ['categories'], queryFn: fetchCategories })
  const { data: rates } = useQuery({ queryKey: ['market-rates'], queryFn: fetchMarketRates })
  const { data: subcategories } = useQuery({
    queryKey: ['subcategories-with-rates'],
    queryFn: fetchSubcategoriesWithRates,
  })

  function refresh() {
    queryClient.invalidateQueries({ queryKey: ['subcategories-with-rates'] })
  }

  const assign = useMutation({ mutationFn: setSubcategoryRate, onSuccess: refresh })
  const create = useMutation({
    mutationFn: createSubcategory,
    onSuccess: () => {
      refresh()
      setName('')
      setRateId('')
    },
  })

  function handleAdd(event: FormEvent) {
    event.preventDefault()
    setErrorKey(null)

    if (!categoryId) return setErrorKey('settings.error.categoryRequired')
    if (name.trim() === '') return setErrorKey('settings.error.nameRequired')

    create.mutate({
      categoryId,
      name,
      // Пустая строка в выпадающем списке означает «без ставки»,
      // в базе это NULL.
      rateId: rateId || null,
    })
  }

  return (
    <section className="rounded-xl bg-surface p-5 shadow-sm ring-1 ring-line">
      <h2 className="text-base font-semibold text-ink">
        {t('settings.subcategoriesTitle')}
      </h2>
      <p className="mt-1 text-sm text-ink-4">{t('settings.subcategoriesHint')}</p>

      <div className="mt-4 space-y-4">
        {categories?.map((category) => {
          const items = (subcategories ?? []).filter((s) => s.category_id === category.id)
          if (items.length === 0) return null

          return (
            <div key={category.id}>
              <h3 className="text-sm font-semibold text-ink-2">
                {category.icon} {category.name}
              </h3>
              <ul className="mt-2 space-y-2">
                {items.map((subcategory) => (
                  <li key={subcategory.id} className="flex flex-wrap items-center gap-3">
                    <span className="min-w-48 flex-1 text-sm text-ink">
                      {subcategory.name}
                    </span>
                    <select
                      aria-label={`${t('settings.rateName')}: ${subcategory.name}`}
                      value={subcategory.rate_id ?? ''}
                      onChange={(e) =>
                        assign.mutate({
                          subcategoryId: subcategory.id,
                          rateId: e.target.value || null,
                        })
                      }
                      className="rounded-md border-0 bg-surface px-3 py-1.5 text-sm text-ink ring-1 ring-line-strong focus:ring-2 focus:ring-accent focus:outline-none"
                    >
                      <option value="">{t('settings.noRate')}</option>
                      {rates?.map((rate) => (
                        <option key={rate.id} value={rate.id}>
                          {rate.name} — {rate.hourly_rate} {rate.currency}
                        </option>
                      ))}
                    </select>
                  </li>
                ))}
              </ul>
            </div>
          )
        })}
      </div>

      <form onSubmit={handleAdd} className="mt-6 border-t border-line-soft pt-4">
        <h3 className="text-sm font-semibold text-ink">{t('settings.addSubcategory')}</h3>

        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Select
            label={t('activity.category')}
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
          >
            <option value="">{t('activity.selectPlaceholder')}</option>
            {categories?.map((category) => (
              <option key={category.id} value={category.id}>
                {category.icon} {category.name}
              </option>
            ))}
          </Select>

          <Input
            label={t('settings.addSubcategoryName')}
            placeholder={t('settings.addSubcategoryNamePlaceholder')}
            value={name}
            onChange={(e) => setName(e.target.value)}
          />

          <Select
            label={t('settings.rateName')}
            value={rateId}
            onChange={(e) => setRateId(e.target.value)}
          >
            <option value="">{t('settings.noRate')}</option>
            {rates?.map((rate) => (
              <option key={rate.id} value={rate.id}>
                {rate.name}
              </option>
            ))}
          </Select>

          <div className="flex items-end">
            <Button type="submit" disabled={create.isPending}>
              {t('common.save')}
            </Button>
          </div>
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
