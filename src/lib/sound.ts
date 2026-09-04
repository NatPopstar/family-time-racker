/**
 * Короткий сигнал об окончании фазы помидора.
 *
 * Звук СИНТЕЗИРУЕМ, а не берём из файла: не нужно ничего скачивать,
 * класть в проект и следить за лицензией на звук. Браузер умеет
 * издавать тон сам.
 *
 * Браузеры запрещают звук до первого действия человека на странице.
 * Нам это не мешает: таймер запускают кнопкой, то есть действие
 * уже было. Но на всякий случай всё обёрнуто в try — беззвучный
 * таймер лучше, чем упавшее приложение.
 */
export function playChime(): void {
  try {
    const AudioCtx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!AudioCtx) return

    const ctx = new AudioCtx()
    const now = ctx.currentTime

    // Две ноты подряд — так сигнал слышен как «дзинь-дзинь»,
    // а не как случайный писк системы.
    for (const [index, frequency] of [880, 1174].entries()) {
      const oscillator = ctx.createOscillator()
      const gain = ctx.createGain()

      oscillator.type = 'sine'
      oscillator.frequency.value = frequency

      const startAt = now + index * 0.18
      // Плавное затухание вместо резкого обрыва: обрыв даёт щелчок.
      gain.gain.setValueAtTime(0.0001, startAt)
      gain.gain.exponentialRampToValueAtTime(0.25, startAt + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.0001, startAt + 0.16)

      oscillator.connect(gain)
      gain.connect(ctx.destination)
      oscillator.start(startAt)
      oscillator.stop(startAt + 0.18)
    }

    // Закрываем звуковой контекст: иначе они копились бы
    // с каждым сигналом, а их число в браузере ограничено.
    window.setTimeout(() => void ctx.close(), 600)
  } catch {
    // Звук — приятное дополнение, а не обязательная часть.
  }
}
