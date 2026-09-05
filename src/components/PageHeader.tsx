import { LeafRule } from '@/components/ornaments'

/**
 * Заголовок страницы: название, пояснение и черта с листом.
 *
 * ПОЧЕМУ НА ПЛАШКЕ, А НЕ ПРОСТО ТЕКСТОМ.
 * Под приложением лежит фоновая картина, и на ней хватает своих
 * надписей и рисунков. Голый заголовок поверх пергамента с картой
 * Средиземья теряется: глаз не отделяет наш текст от нарисованного.
 * Полупрозрачная плашка отделяет — и при этом картина сквозь неё
 * по-прежнему видна.
 *
 * Вынесено в общий компонент, потому что заголовок одинаков на всех
 * шести страницах. Пока он был скопирован в каждую, любая правка
 * означала шесть одинаковых правок — и одна из них рано или поздно
 * отстала бы от остальных.
 */
export function PageHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="rounded-xl bg-surface px-5 py-4 shadow-sm ring-1 ring-line">
      <h1 className="text-2xl font-bold tracking-tight text-ink">{title}</h1>
      <p className="mt-1 text-sm text-ink-4">{subtitle}</p>
      <LeafRule className="mt-3" />
    </div>
  )
}
