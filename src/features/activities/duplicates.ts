import type { ActivityWithValue } from '@/types/models'

/**
 * ПОИСК ПОХОЖИХ ЗАПИСЕЙ ЗА ОДИН ДЕНЬ.
 *
 * Задача из жизни: школьный рейс записан дважды — один раз как
 * запланированная задача «Отвести/Привести из школы», второй раз
 * руками, уже по факту: «Отвела в школу, забрать из школы».
 * Планер показывает первую как невыполненную, статистика считает
 * вторую, и день выглядит и недоделанным, и раздутым одновременно.
 *
 * ПОЧЕМУ НЕ СРАВНИВАТЬ СТРОКИ ЦЕЛИКОМ. Один и тот же поход человек
 * называет каждый раз по-новому: «отвести и забрать», «Отвела/забрала»,
 * «Отвела, забрала из школы». Совпадения символ в символ не будет
 * никогда. Поэтому сравниваем не строки, а НАБОРЫ СЛОВ.
 *
 * ПОЧЕМУ ОБРЕЗАЕМ СЛОВА. «Школу», «школы», «школе» — одно слово в разных
 * падежах, и по-русски они не совпадут. Берём первые четыре буквы:
 * «школ» у всех трёх, «отве» у «отвела», «отвести» и «отвезла».
 * Это не настоящий морфологический разбор, а грубое правило, но для
 * домашних дел его хватает, и оно не тянет за собой словарь на мегабайт.
 */

/**
 * Слова, которые есть в любой фразе и потому ничего не различают.
 * Оставь их — и «сходить в магазин» совпадёт с «поиграть в мяч».
 */
const STOP_WORDS = new Set([
  'и', 'или', 'но', 'да', 'же', 'бы', 'ли',
  'в', 'во', 'на', 'по', 'с', 'со', 'из', 'к', 'ко', 'у', 'за',
  'до', 'от', 'для', 'об', 'про', 'при', 'над', 'под',
  'что', 'это', 'как', 'все', 'ещё', 'еще', 'тут', 'там',
  'the', 'and', 'but', 'for', 'with', 'from', 'into', 'out',
  'a', 'an', 'to', 'of', 'in', 'on', 'at', 'my', 'our',
])

/** Сколько первых букв слова считаем его основой. */
const STEM_LENGTH = 4

/**
 * Доля общих слов, начиная с которой записи считаются похожими.
 *
 * Половина — намеренно мягкий порог: мы не запрещаем запись,
 * а только спрашиваем. Пропустить настоящий дубль дороже,
 * чем лишний раз переспросить.
 */
export const SIMILARITY_THRESHOLD = 0.5

/** Значимые слова названия: без знаков препинания, коротких и служебных. */
export function significantWords(title: string): string[] {
  return title
    .toLowerCase()
    // «ё» и «е» пишут вперемешку, для сравнения это одна буква.
    .replace(/ё/g, 'е')
    // \p{L} — любая буква любого алфавита, \p{N} — цифра.
    // Флаг u обязателен, иначе эти обозначения не работают.
    .split(/[^\p{L}\p{N}]+/u)
    .filter((word) => word.length >= 3 && !STOP_WORDS.has(word))
}

/** Грубая основа слова: «школу» и «школы» дают одно и то же «школ». */
export function stem(word: string): string {
  return word.length > STEM_LENGTH ? word.slice(0, STEM_LENGTH) : word
}

/** Набор основ названия. Повторы схлопываются: Set хранит каждую основу раз. */
export function titleStems(title: string): Set<string> {
  return new Set(significantWords(title).map(stem))
}

/**
 * Насколько похожи два названия: от 0 (ничего общего) до 1.
 *
 * Делим на ДЛИНУ КОРОТКОГО названия, а не на общее число слов.
 * Иначе короткое «Отвела/забрала» никогда не догнало бы длинное
 * «Отвела в школу, забрать из школы, посидеть на собрании»,
 * хотя это одно и то же дело, описанное подробнее.
 */
export function titleSimilarity(first: string, second: string): number {
  const a = titleStems(first)
  const b = titleStems(second)

  if (a.size === 0 || b.size === 0) return 0

  let common = 0
  for (const word of a) {
    if (b.has(word)) common += 1
  }

  return common / Math.min(a.size, b.size)
}

/** Найденная похожая запись. */
export type DuplicateMatch = {
  activity: ActivityWithValue
  /**
   * 'planned' — незакрытая задача, её можно отметить выполненной
   * вместо создания новой записи. Это главный случай.
   * 'done'    — уже записанная работа, похоже на повторный ввод.
   */
  kind: 'planned' | 'done'
  similarity: number
}

/**
 * Ищет, с чем может задвоиться новая запись.
 *
 * Два разных правила, намеренно не смешанные:
 *
 *   ВЫПОЛНЕННЫЕ  — только по словам. Одинаковый вид работы дважды
 *                  за день бывает честно: убралась утром и вечером.
 *
 *   ЗАПЛАНИРОВАННЫЕ — по словам ИЛИ по совпадению вида работы.
 *                  Здесь мы придирчивее: висящая незакрытая задача
 *                  того же вида почти всегда и есть то самое дело,
 *                  просто человек забыл нажать «Выполнено».
 *
 * Чужие записи не трогаем совсем: дубль — это когда ОДИН человек
 * записал своё дело дважды. Ничьи задачи считаем своими: их может
 * закрыть любой взрослый.
 */
export function findDuplicates(params: {
  title: string
  /** 'YYYY-MM-DD' */
  date: string
  subcategoryId: string
  userId: string
  existing: ActivityWithValue[]
  /** Правка записи: сама с собой она совпадать не должна. */
  excludeId?: string
}): DuplicateMatch[] {
  const matches: DuplicateMatch[] = []

  for (const activity of params.existing) {
    if (activity.date !== params.date) continue
    if (activity.id === params.excludeId) continue

    const isMine = activity.user_id === params.userId || activity.user_id === null
    if (!isMine) continue

    const similarity = titleSimilarity(params.title, activity.title ?? '')

    if (activity.status === 'planned') {
      const sameKind = activity.subcategory_id === params.subcategoryId
      if (similarity >= SIMILARITY_THRESHOLD || sameKind) {
        matches.push({ activity, kind: 'planned', similarity })
      }
    } else if (similarity >= SIMILARITY_THRESHOLD) {
      matches.push({ activity, kind: 'done', similarity })
    }
  }

  // Незакрытые задачи показываем первыми: с ними есть что сделать —
  // отметить выполненной. Про выполненные можно только предупредить.
  return matches.sort((left, right) => {
    if (left.kind !== right.kind) return left.kind === 'planned' ? -1 : 1
    return right.similarity - left.similarity
  })
}
