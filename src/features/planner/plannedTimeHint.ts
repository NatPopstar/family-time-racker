import type { TranslationKey } from '@/lib/i18n'

/**
 * Подсказка под полем «Ваше время на задачу» — своя для каждой категории.
 *
 * ПОЧЕМУ НЕ ОДНА ОБЩАЯ ФРАЗА. Правило везде одинаковое: считается время
 * ВЗРОСЛОГО, а не длительность события. Но объяснить его абстрактно
 * нельзя — понимается оно только на своём примере. «Не сколько ребёнок
 * пробудет на занятии» ничего не проясняет человеку, который записывает
 * уборку, и выглядит там просто нелепо.
 *
 * ПОЧЕМУ ОТДЕЛЬНЫМ ФАЙЛОМ, А НЕ ВНУТРИ ОКНА. Окон с этим полем два —
 * добавление задачи и её правка. Скопируй выбор подсказки в оба, и они
 * разойдутся при первой же правке одного из них. Сегодня это уже
 * случалось дважды: с потерянной дорогой в двух таблицах и с проверкой
 * времени в трёх формах.
 */
export function plannedTimeHintKey(categorySlug: string | undefined): TranslationKey {
  switch (categorySlug) {
    case 'work':
      return 'planner.plannedTimeHint.work'
    case 'study':
      return 'planner.plannedTimeHint.study'
    case 'household':
      return 'planner.plannedTimeHint.household'
    case 'childcare':
      return 'planner.plannedTimeHint.childcare'
    case 'admin':
      return 'planner.plannedTimeHint.admin'
    default:
      // Категорию ещё не выбрали — или появилась новая, о которой этот
      // файл не знает. Общая формулировка верна для любой из них.
      return 'planner.plannedTimeHint.default'
  }
}
