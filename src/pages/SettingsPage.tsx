import { useI18n } from '@/lib/i18n'
import { MarketRatesCard } from '@/features/settings/MarketRatesCard'
import { SubcategoriesCard } from '@/features/settings/SubcategoriesCard'
import { PageHeader } from '@/components/PageHeader'

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
      <PageHeader title={t('page.settings.title')} subtitle={t('page.settings.subtitle')} />

      <MarketRatesCard />
      <SubcategoriesCard />
    </div>
  )
}
