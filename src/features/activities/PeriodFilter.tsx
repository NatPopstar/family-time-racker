import { useI18n, type TranslationKey } from '@/lib/i18n'
import {
  getPeriodRange,
  BEGINNING_OF_TIME,
  type PeriodId,
  type DateRange,
} from '@/lib/periods'
import { Select } from '@/components/ui/Select'
import { Input } from '@/components/ui/Input'

/**
 * Выбор периода: готовые варианты плюс «свой период».
 *
 * Состояние держит родительская страница, а не этот компонент —
 * ведь период нужен ей для запроса. Такой компонент называют
 * «управляемым»: он только показывает и сообщает о выборе.
 */

const presets: { id: Exclude<PeriodId, 'custom'>; labelKey: TranslationKey }[] = [
  { id: 'today', labelKey: 'period.today' },
  { id: 'thisWeek', labelKey: 'period.thisWeek' },
  { id: 'lastWeek', labelKey: 'period.lastWeek' },
  { id: 'thisMonth', labelKey: 'period.thisMonth' },
  { id: 'lastMonth', labelKey: 'period.lastMonth' },
  { id: 'lastYear', labelKey: 'period.lastYear' },
  { id: 'allTime', labelKey: 'period.allTime' },
]

export function PeriodFilter({
  period,
  range,
  onChange,
}: {
  period: PeriodId
  range: DateRange
  onChange: (period: PeriodId, range: DateRange) => void
}) {
  const { t } = useI18n()

  function handlePresetChange(nextPeriod: PeriodId) {
    if (nextPeriod === 'custom') {
      // Переходя на свой период, оставляем текущие даты как отправную точку —
      // так человеку обычно нужно поправить только одну из них.
      //
      // Исключение — переход со «Всего времени». Его нижняя граница
      // техническая: она нужна запросу к базе, но в поле «С» выглядит
      // как взявшийся ниоткуда 2000 год. Подставляем начало текущего
      // месяца — понятную точку, от которой удобно двигаться.
      const from =
        range.from === BEGINNING_OF_TIME ? getPeriodRange('thisMonth').from : range.from

      onChange('custom', { from, to: range.to })
      return
    }
    onChange(nextPeriod, getPeriodRange(nextPeriod))
  }

  return (
    <div className="grid gap-3 sm:grid-cols-3">
      <Select
        label={t('period.label')}
        value={period}
        onChange={(e) => handlePresetChange(e.target.value as PeriodId)}
      >
        {presets.map((preset) => (
          <option key={preset.id} value={preset.id}>
            {t(preset.labelKey)}
          </option>
        ))}
        <option value="custom">{t('period.custom')}</option>
      </Select>

      {/* Поля дат показываем только для своего периода: для готовых
          вариантов они всё равно только сбивали бы с толку. */}
      {period === 'custom' && (
        <>
          <Input
            label={t('period.from')}
            type="date"
            value={range.from}
            onChange={(e) => onChange('custom', { ...range, from: e.target.value })}
          />
          <Input
            label={t('period.to')}
            type="date"
            value={range.to}
            onChange={(e) => onChange('custom', { ...range, to: e.target.value })}
          />
        </>
      )}
    </div>
  )
}
