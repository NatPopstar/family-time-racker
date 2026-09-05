import { useI18n } from '@/lib/i18n'
import { MarketRatesCard } from '@/features/settings/MarketRatesCard'
import { SubcategoriesCard } from '@/features/settings/SubcategoriesCard'
import { LeafRule } from '@/components/ornaments'

/**
 * Настройки: ставки и виды работы.
 *
 * Раздел существует ради одного обещания из технического задания —
 * ставки не зашиты в код, их можно менять и добавлять новые.
 */
export function SettingsPage() {
  const { t } = useI18n()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t('page.settings.title')}</h1>
        <p className="mt-1 text-sm text-ink-4">{t('page.settings.subtitle')}</p>
        <LeafRule className="mt-3" />
      </div>

      <MarketRatesCard />
      <SubcategoriesCard />
    </div>
  )
}
