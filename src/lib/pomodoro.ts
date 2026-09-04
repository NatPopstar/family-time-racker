/**
 * Логика помидорного таймера.
 *
 * Метод Франческо Чирилло: работаем сосредоточенно 25 минут, потом
 * короткий перерыв 5 минут; после каждого четвёртого помидора —
 * длинный перерыв 15 минут.
 *
 * Здесь только чистые функции без обращений к сети и к экрану:
 * их легко покрыть тестами, а ошибка в подсчёте времени тихо
 * испортила бы всю статистику.
 */

export type PomodoroPhase = 'work' | 'short_break' | 'long_break'

/** Классические длительности. Меняются здесь, а не по коду. */
export const POMODORO = {
  workMinutes: 25,
  shortBreakMinutes: 5,
  longBreakMinutes: 15,
  /** После скольких помидоров положен длинный перерыв. */
  pomodorosBeforeLongBreak: 4,
} as const

/** Длительность фазы в минутах. */
export function phaseDuration(phase: PomodoroPhase): number {
  switch (phase) {
    case 'work':
      return POMODORO.workMinutes
    case 'short_break':
      return POMODORO.shortBreakMinutes
    case 'long_break':
      return POMODORO.longBreakMinutes
  }
}

/**
 * Какая фаза идёт следующей.
 *
 * pomodorosDone — сколько помидоров завершено ВКЛЮЧАЯ только что
 * законченный. После 4-го, 8-го и так далее — длинный перерыв.
 */
export function nextPhase(current: PomodoroPhase, pomodorosDone: number): PomodoroPhase {
  // После перерыва всегда возвращаемся к работе.
  if (current !== 'work') return 'work'

  const isLongBreakTime = pomodorosDone > 0 && pomodorosDone % POMODORO.pomodorosBeforeLongBreak === 0
  return isLongBreakTime ? 'long_break' : 'short_break'
}

export type PomodoroState = {
  /** Сколько секунд осталось до конца фазы. Ноль, если фаза истекла. */
  remainingSeconds: number
  /** Фаза уже закончилась и ждёт действия человека. */
  isFinished: boolean
  /**
   * Сколько минут РАБОТЫ засчитать за текущую фазу прямо сейчас.
   *
   * Перерывы всегда дают ноль: отдых — не труд, и в статистику он
   * попадать не должен. Рабочая фаза даёт прошедшие минуты,
   * но не больше 25: помидор по определению длится 25 минут,
   * а всё сверх — это пропущенный перерыв, а не работа.
   */
  countedWorkMinutes: number
}

/** Состояние таймера на текущий момент. */
export function pomodoroState(params: {
  phase: PomodoroPhase
  /** Момент начала текущей фазы, строка ISO. */
  startedAt: string
  now?: Date
}): PomodoroState {
  const now = params.now ?? new Date()
  const startedMs = new Date(params.startedAt).getTime()
  const elapsedSeconds = Math.max(0, Math.floor((now.getTime() - startedMs) / 1000))

  const durationSeconds = phaseDuration(params.phase) * 60
  const remainingSeconds = Math.max(0, durationSeconds - elapsedSeconds)

  const isWork = params.phase === 'work'
  // Округляем ВНИЗ: засчитываем только полностью прошедшие минуты,
  // иначе секунда работы превращалась бы в минуту.
  const elapsedMinutes = Math.floor(elapsedSeconds / 60)

  return {
    remainingSeconds,
    isFinished: remainingSeconds === 0,
    countedWorkMinutes: isWork ? Math.min(elapsedMinutes, POMODORO.workMinutes) : 0,
  }
}

/**
 * Показывает оставшееся время как 24:59.
 * Секунды нужны: без них последняя минута выглядит замершей.
 */
export function formatCountdown(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(totalSeconds))
  const minutes = Math.floor(safe / 60)
  const seconds = safe % 60
  return `${minutes}:${String(seconds).padStart(2, '0')}`
}

/**
 * Сколько всего минут работы записать при завершении задачи.
 *
 * Складываем уже накопленное (завершённые помидоры) и текущую фазу.
 * Перерыв текущей фазы добавит ноль — за это отвечает pomodoroState.
 */
export function totalWorkMinutes(params: {
  accumulatedMinutes: number
  phase: PomodoroPhase
  startedAt: string
  now?: Date
}): number {
  const state = pomodoroState({
    phase: params.phase,
    startedAt: params.startedAt,
    now: params.now,
  })
  return params.accumulatedMinutes + state.countedWorkMinutes
}
