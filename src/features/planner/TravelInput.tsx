import { useI18n, type TranslationKey } from '@/lib/i18n'
import { formatMinutes } from '@/lib/time'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'

/** Сколько отрезков пути в поездке. */
export const TRAVEL_LEGS = [1, 2, 4] as const
export type TravelLegs = (typeof TRAVEL_LEGS)[number]

/**
 * Ввод времени в дороге: одна сторона плюс форма поездки.
 *
 * ПОЧЕМУ НЕ ОДНО ЧИСЛО. Разница между «завезла по пути» и полным
 * школьным рейсом — вчетверо:
 *
 *   ×1  завезла по дороге на работу, обратно не возвращалась
 *   ×2  отвезла и сразу вернулась домой
 *   ×4  отвезла, вернулась, поехала забирать, привезла
 *
 * Просить человека считать это в уме каждый раз — прямой путь
 * к ошибкам в статистике.
 *
 * ПОЧЕМУ ПУСТЫЕ ОТРЕЗКИ СЧИТАЮТСЯ ТРУДОМ. Оценка отвечает на вопрос
 * «сколько стоило бы купить эту работу». Нанятая няня выставит счёт
 * за всё время, что занята, включая дорогу порожняком. Отрезок,
 * который случился бы в любом случае, — это вариант ×1.
 */
export function TravelInput({
  oneWayMinutes,
  legs,
  onOneWayChange,
  onLegsChange,
}: {
  oneWayMinutes: string
  legs: TravelLegs
  onOneWayChange: (value: string) => void
  onLegsChange: (value: TravelLegs) => void
}) {
  const { t, locale } = useI18n()

  const total = (Number(oneWayMinutes) || 0) * legs

  return (
    <div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Input
          label={t('travel.oneWay')}
          type="number"
          min={0}
          inputMode="numeric"
          value={oneWayMinutes}
          onChange={(e) => onOneWayChange(e.target.value)}
        />

        <Select
          label={t('travel.shape')}
          value={String(legs)}
          onChange={(e) => onLegsChange(Number(e.target.value) as TravelLegs)}
        >
          {TRAVEL_LEGS.map((count) => (
            <option key={count} value={count}>
              {t(`travel.legs.${count}` as TranslationKey)}
            </option>
          ))}
        </Select>
      </div>

      {/* Итог показываем сразу: человек видит, что получилось,
          и не считает в уме. */}
      {total > 0 && (
        <p className="mt-2 text-sm font-medium text-ink-2">
          {t('travel.total')}: {formatMinutes(total, locale)}
        </p>
      )}

      <p className="mt-1 text-xs text-ink-4">{t('activity.travelHint')}</p>
    </div>
  )
}
