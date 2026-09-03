import type { Locale } from './time'

/**
 * Показ денежных сумм.
 *
 * Валюту не зашиваем в код: она приходит из записи (currency_snapshot),
 * потому что ставки в настройках можно перевести в другую валюту.
 */
export function formatMoney(
  amount: number,
  currency: string = 'GBP',
  locale: Locale = 'ru',
): string {
  return new Intl.NumberFormat(locale === 'ru' ? 'ru-RU' : 'en-GB', {
    style: 'currency',
    currency,
    // Копейки в отчётах о домашнем труде только мешают читать:
    // «£100» понятнее, чем «£100.00».
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

/**
 * Стоимость работы: минуты переводим в часы и умножаем на ставку.
 *
 * Возвращает 0, если ставки нет (работа и учёба деньгами не оцениваются).
 * Та же формула описана в представлении v_activity_value в базе —
 * здесь она нужна для мгновенного показа в интерфейсе, до сохранения.
 */
export function calculateValue(minutes: number, hourlyRate: number | null): number {
  if (hourlyRate === null || minutes <= 0) return 0
  return (minutes / 60) * hourlyRate
}
