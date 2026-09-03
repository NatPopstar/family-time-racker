import { useI18n, type TranslationKey } from '@/lib/i18n'

/**
 * Заготовка страницы: заголовок, пояснение и honest-плашка «будет позже».
 *
 * Зачем нужны пустые страницы вместо того, чтобы делать разделы по мере
 * готовности: сразу видно, как приложение устроено целиком, работают все
 * переходы, и каждая следующая фаза просто наполняет готовое место.
 */
export function PagePlaceholder({
  titleKey,
  subtitleKey,
}: {
  titleKey: TranslationKey
  subtitleKey: TranslationKey
}) {
  const { t } = useI18n()

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight">{t(titleKey)}</h1>
      <p className="mt-1 text-sm text-slate-500">{t(subtitleKey)}</p>

      <div className="mt-6 rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center">
        <p className="text-sm text-slate-500">{t('common.comingSoon')}</p>
      </div>
    </div>
  )
}
