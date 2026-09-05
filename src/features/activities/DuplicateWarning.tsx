import { useI18n } from '@/lib/i18n'
import { formatMinutes } from '@/lib/time'
import { Button } from '@/components/ui/Button'
import type { DuplicateMatch } from './duplicates'

/**
 * Предупреждение о похожей записи за тот же день.
 *
 * ПОЧЕМУ ПРЕДУПРЕЖДЕНИЕ, А НЕ ЗАПРЕТ. Одно и то же дело за день
 * действительно случается дважды: убралась утром, убралась вечером.
 * Запрет заставил бы придумывать записи вроде «уборка 2», и данные
 * стали бы хуже, а не лучше. Поэтому решает человек, а приложение
 * только показывает то, что он мог не заметить.
 *
 * ГЛАВНАЯ КНОПКА — не «записать всё равно», а «отметить выполненной».
 * Почти всегда дубль появляется так: задача была запланирована,
 * человек её сделал, но вместо кнопки «Выполнено» в Планере записал
 * дело заново через форму. Тогда в базе оказываются обе: одна висит
 * незакрытой, вторая считается в статистике. Кнопка закрывает
 * запланированную вместо создания второй записи — то есть убирает
 * причину, а не последствие.
 */
export function DuplicateWarning({
  matches,
  isBusy,
  onComplete,
  onSaveAnyway,
  onCancel,
}: {
  matches: DuplicateMatch[]
  isBusy: boolean
  onComplete: (match: DuplicateMatch) => void
  onSaveAnyway: () => void
  onCancel: () => void
}) {
  const { t, locale } = useI18n()

  return (
    <div
      role="alert"
      className="mt-4 rounded-lg bg-amber-50 p-4 ring-1 ring-amber-200"
    >
      <p className="text-sm font-semibold text-amber-900">{t('duplicate.title')}</p>

      <ul className="mt-3 space-y-3">
        {matches.map((match) => {
          const isPlanned = match.kind === 'planned'
          const minutes = isPlanned
            ? (match.activity.planned_minutes ?? 0)
            : (match.activity.actual_minutes ?? 0)

          return (
            <li key={match.activity.id} className="rounded-md bg-white p-3">
              <p className="text-xs text-amber-800">
                {isPlanned ? t('duplicate.plannedLead') : t('duplicate.doneLead')}
              </p>
              <p className="mt-0.5 text-sm font-medium text-slate-900">
                {match.activity.title}
              </p>
              <p className="text-xs text-slate-500 tabular-nums">
                {match.activity.subcategory_name} ·{' '}
                {isPlanned ? t('planner.plan') : t('planner.fact')}:{' '}
                {formatMinutes(minutes, locale)}
              </p>

              {/* Кнопка только у незакрытых: выполненную запись
                  отметить выполненной уже нельзя. */}
              {isPlanned && (
                <Button
                  type="button"
                  disabled={isBusy}
                  onClick={() => onComplete(match)}
                  className="mt-2 text-xs"
                >
                  {t('duplicate.completeThis')}
                </Button>
              )}
            </li>
          )
        })}
      </ul>

      <div className="mt-3 flex flex-wrap gap-2">
        <Button type="button" variant="secondary" disabled={isBusy} onClick={onSaveAnyway}>
          {t('duplicate.saveAnyway')}
        </Button>
        <Button type="button" variant="ghost" disabled={isBusy} onClick={onCancel}>
          {t('duplicate.keepEditing')}
        </Button>
      </div>
    </div>
  )
}
