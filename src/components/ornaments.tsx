/**
 * Украшения интерфейса: папоротник, рябина, кольцо, руны, гора, фонарь.
 *
 * ПОЧЕМУ НАРИСОВАНО КОДОМ, А НЕ КАРТИНКАМИ.
 *   — перекрашивается вместе с темой само: всё рисуется currentColor,
 *     то есть цветом текста рядом;
 *   — не размывается на любом экране, потому что это не пиксели;
 *   — ничего не весит и не грузится по сети;
 *   — и это наши собственные рисунки, а не чья-то иллюстрация.
 *
 * ПОЧЕМУ ИХ МАЛО И ОНИ БЛЕДНЫЕ. Это приложение про числа. Украшение,
 * которое спорит с цифрой за внимание, — уже не украшение, а помеха.
 * Поэтому мотивы стоят там, где данных НЕТ: в заголовках, на пустых
 * местах, рядом с итоговой чертой.
 *
 * Все значки помечены aria-hidden: они ничего не сообщают, и программе
 * чтения с экрана незачем их объявлять.
 */

type OrnamentProps = {
  className?: string
}

/** Веточка папоротника. Заголовки, пустые состояния. */
export function FernSprig({ className = '' }: OrnamentProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.2"
      strokeLinecap="round"
    >
      {/* Стебель */}
      <path d="M12 22V4" />
      {/* Перья, кверху мельче — так ветка выглядит живой, а не расчёской */}
      <path d="M12 18c-2.6 0-4.6-1.2-5.6-3.2 2.4-.6 4.4.2 5.6 3.2Z" fill="currentColor" stroke="none" />
      <path d="M12 18c2.6 0 4.6-1.2 5.6-3.2-2.4-.6-4.4.2-5.6 3.2Z" fill="currentColor" stroke="none" />
      <path d="M12 13.5c-2.1 0-3.8-1-4.6-2.6 2-.5 3.6.2 4.6 2.6Z" fill="currentColor" stroke="none" />
      <path d="M12 13.5c2.1 0 3.8-1 4.6-2.6-2-.5-3.6.2-4.6 2.6Z" fill="currentColor" stroke="none" />
      <path d="M12 9.5c-1.6 0-2.9-.8-3.5-2 1.5-.4 2.7.1 3.5 2Z" fill="currentColor" stroke="none" />
      <path d="M12 9.5c1.6 0 2.9-.8 3.5-2-1.5-.4-2.7.1-3.5 2Z" fill="currentColor" stroke="none" />
    </svg>
  )
}

/** Гроздь рябины. Ставится к предупреждениям — красное и заметное. */
export function RowanBerries({ className = '' }: OrnamentProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.1"
      strokeLinecap="round"
    >
      <path d="M12 3v6M12 9l-4 3M12 9l4 3" />
      <circle cx="7" cy="14.5" r="2.6" fill="currentColor" stroke="none" />
      <circle cx="17" cy="14.5" r="2.6" fill="currentColor" stroke="none" />
      <circle cx="12" cy="18.5" r="2.6" fill="currentColor" stroke="none" />
    </svg>
  )
}

/** Кольцо. Стоит у денежных итогов — сокровище семьи. */
export function MallornRing({ className = '' }: OrnamentProps) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className}>
      <circle cx="12" cy="12" r="7.5" fill="none" stroke="currentColor" strokeWidth="2.2" />
      {/* Блик: без него кольцо читается как обычная пустая окружность */}
      <path
        d="M7.2 8.2A7.5 7.5 0 0 1 12 6"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
        opacity="0.45"
      />
    </svg>
  )
}

/** Одинокая гора с воротами. Заглушка там, где нет данных. */
export function LoneMountain({ className = '' }: OrnamentProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.2"
      strokeLinejoin="round"
    >
      <path d="M2 20 12 4l10 16H2Z" />
      {/* Ворота: маленькая арка у подножия */}
      <path d="M10.2 20v-2.6a1.8 1.8 0 0 1 3.6 0V20" />
      {/* Снег на вершине */}
      <path d="M9 10.5 12 8l3 2.5-1.6.8-1.4-.7-1.4.7Z" fill="currentColor" stroke="none" opacity="0.5" />
    </svg>
  )
}

/** Рунный камень. Метка разделов и пустых списков. */
export function RuneStone({ className = '' }: OrnamentProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.2"
      strokeLinejoin="round"
      strokeLinecap="round"
    >
      <path d="M12 2.5 20 7v10l-8 4.5L4 17V7l8-4.5Z" />
      {/* Руна: вымышленный знак, а не буква настоящего алфавита */}
      <path d="M12 7.5v9M12 11l3-2.5M12 13.5l-3 2.5" />
    </svg>
  )
}

/** Фонарь. Показывает, что что-то идёт прямо сейчас, — например таймер. */
export function Lantern({ className = '' }: OrnamentProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.2"
      strokeLinejoin="round"
      strokeLinecap="round"
    >
      <path d="M9 3.5h6M12 3.5v2" />
      <path d="M7.5 6.5h9l-1 3v7.5a1 1 0 0 1-1 1h-5a1 1 0 0 1-1-1V9.5l-1-3Z" />
      <path d="M8.5 20.5h7" />
      {/* Огонёк */}
      <path d="M12 10.5c1.4 1.2 2 2.3 2 3.4a2 2 0 1 1-4 0c0-1.1.6-2.2 2-3.4Z" fill="currentColor" stroke="none" opacity="0.55" />
    </svg>
  )
}

/**
 * Тонкая черта с листом посередине — под заголовками разделов.
 *
 * Линии по бокам растягиваются, лист остаётся в центре: так черта
 * одинаково выглядит и на телефоне, и на широком экране.
 */
export function LeafRule({ className = '' }: OrnamentProps) {
  return (
    <div className={`flex items-center gap-3 text-ink-6 ${className}`} aria-hidden="true">
      <span className="h-px flex-1 bg-current opacity-50" />
      <svg viewBox="0 0 24 12" className="h-3 w-6 shrink-0" fill="currentColor">
        {/* Лист мэллорна: два дуговых края, сходящихся в кончики */}
        <path d="M12 0c3.6 0 8 2.4 12 6-4 3.6-8.4 6-12 6S4 9.6 0 6C4 2.4 8.4 0 12 0Z" opacity="0.35" />
        <path d="M0 6h24" stroke="currentColor" strokeWidth="0.8" opacity="0.6" />
      </svg>
      <span className="h-px flex-1 bg-current opacity-50" />
    </div>
  )
}
