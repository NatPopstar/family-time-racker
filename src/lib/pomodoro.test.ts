import { describe, it, expect } from 'vitest'
import {
  POMODORO,
  phaseDuration,
  nextPhase,
  pomodoroState,
  formatCountdown,
  totalWorkMinutes,
} from './pomodoro'

const start = '2026-09-04T10:00:00.000Z'
/** Момент через N минут (и секунд) после старта фазы. */
function at(minutes: number, seconds = 0) {
  return new Date(new Date(start).getTime() + minutes * 60_000 + seconds * 1000)
}

describe('phaseDuration', () => {
  it('классические длительности 25 / 5 / 15', () => {
    expect(phaseDuration('work')).toBe(25)
    expect(phaseDuration('short_break')).toBe(5)
    expect(phaseDuration('long_break')).toBe(15)
  })
})

describe('nextPhase', () => {
  it('после первого помидора — короткий перерыв', () => {
    expect(nextPhase('work', 1)).toBe('short_break')
  })

  it('после второго и третьего — тоже короткий', () => {
    expect(nextPhase('work', 2)).toBe('short_break')
    expect(nextPhase('work', 3)).toBe('short_break')
  })

  it('после ЧЕТВЁРТОГО помидора — длинный перерыв', () => {
    expect(nextPhase('work', 4)).toBe('long_break')
  })

  it('после восьмого — снова длинный', () => {
    expect(nextPhase('work', 8)).toBe('long_break')
  })

  it('после пятого — снова короткий', () => {
    expect(nextPhase('work', 5)).toBe('short_break')
  })

  it('после любого перерыва возвращаемся к работе', () => {
    expect(nextPhase('short_break', 1)).toBe('work')
    expect(nextPhase('long_break', 4)).toBe('work')
  })
})

describe('pomodoroState: обратный отсчёт', () => {
  it('в начале рабочей фазы остаётся 25 минут', () => {
    const s = pomodoroState({ phase: 'work', startedAt: start, now: at(0) })
    expect(s.remainingSeconds).toBe(25 * 60)
    expect(s.isFinished).toBe(false)
  })

  it('через 10 минут остаётся 15', () => {
    const s = pomodoroState({ phase: 'work', startedAt: start, now: at(10) })
    expect(s.remainingSeconds).toBe(15 * 60)
  })

  it('ровно в конце фаза считается завершённой', () => {
    const s = pomodoroState({ phase: 'work', startedAt: start, now: at(25) })
    expect(s.remainingSeconds).toBe(0)
    expect(s.isFinished).toBe(true)
  })

  it('перерыв длится свои 5 минут', () => {
    const s = pomodoroState({ phase: 'short_break', startedAt: start, now: at(3) })
    expect(s.remainingSeconds).toBe(2 * 60)
  })

  it('не уходит в минус, если вкладку не открывали часами', () => {
    const s = pomodoroState({ phase: 'work', startedAt: start, now: at(300) })
    expect(s.remainingSeconds).toBe(0)
  })
})

describe('pomodoroState: сколько времени засчитывается', () => {
  it('считает только полные минуты', () => {
    // 9 минут 59 секунд — это ещё девять минут, а не десять.
    const s = pomodoroState({ phase: 'work', startedAt: start, now: at(9, 59) })
    expect(s.countedWorkMinutes).toBe(9)
  })

  it('ПЕРЕРЫВ НЕ ЗАСЧИТЫВАЕТСЯ КАК РАБОТА', () => {
    // Главное правило: отдых не труд и в статистику попадать не должен.
    const short = pomodoroState({ phase: 'short_break', startedAt: start, now: at(5) })
    const long = pomodoroState({ phase: 'long_break', startedAt: start, now: at(15) })

    expect(short.countedWorkMinutes).toBe(0)
    expect(long.countedWorkMinutes).toBe(0)
  })

  it('рабочая фаза не даёт больше 25 минут', () => {
    // Забыли выключить и ушли на два часа — помидор всё равно 25 минут.
    // Всё сверх — это пропущенный перерыв, а не работа.
    const s = pomodoroState({ phase: 'work', startedAt: start, now: at(120) })
    expect(s.countedWorkMinutes).toBe(POMODORO.workMinutes)
  })

  it('в самом начале засчитано ноль', () => {
    const s = pomodoroState({ phase: 'work', startedAt: start, now: at(0, 30) })
    expect(s.countedWorkMinutes).toBe(0)
  })
})

describe('totalWorkMinutes', () => {
  it('складывает завершённые помидоры и текущую работу', () => {
    // Два помидора позади (50 минут) плюс 10 минут текущего.
    const total = totalWorkMinutes({
      accumulatedMinutes: 50,
      phase: 'work',
      startedAt: start,
      now: at(10),
    })
    expect(total).toBe(60)
  })

  it('во время перерыва добавляет ноль', () => {
    const total = totalWorkMinutes({
      accumulatedMinutes: 50,
      phase: 'short_break',
      startedAt: start,
      now: at(4),
    })
    expect(total).toBe(50)
  })

  it('не превышает потолок текущего помидора', () => {
    const total = totalWorkMinutes({
      accumulatedMinutes: 25,
      phase: 'work',
      startedAt: start,
      now: at(90),
    })
    expect(total).toBe(50)
  })
})

describe('formatCountdown', () => {
  it('показывает минуты и секунды', () => {
    expect(formatCountdown(25 * 60)).toBe('25:00')
    expect(formatCountdown(1499)).toBe('24:59')
  })

  it('дописывает ведущий ноль к секундам', () => {
    expect(formatCountdown(65)).toBe('1:05')
  })

  it('ноль показывает как 0:00', () => {
    expect(formatCountdown(0)).toBe('0:00')
    expect(formatCountdown(-10)).toBe('0:00')
  })
})
