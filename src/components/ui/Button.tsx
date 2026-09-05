import type { ButtonHTMLAttributes, ReactNode } from 'react'

/**
 * Кнопка приложения.
 *
 * Смысл этого файла: описать вид кнопки ОДИН раз. Иначе длинный набор
 * классов Tailwind копировался бы в каждую форму, и через месяц кнопки
 * начали бы незаметно отличаться друг от друга.
 */

type Variant = 'primary' | 'secondary' | 'ghost'

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant
  children: ReactNode
}

const variantClasses: Record<Variant, string> = {
  primary: 'bg-accent text-accent-ink hover:bg-accent-hover focus-visible:outline-accent',
  secondary:
    'bg-surface text-ink-2 shadow-sm ring-1 ring-line hover:bg-surface-2 focus-visible:outline-ink-5',
  ghost: 'text-ink-3 hover:bg-surface-3 focus-visible:outline-ink-5',
}

export function Button({ variant = 'primary', className = '', ...props }: ButtonProps) {
  return (
    <button
      // disabled:* — вид кнопки, пока идёт отправка формы:
      // приглушённая и не реагирующая на клики.
      className={`rounded-md px-4 py-2 text-sm font-medium transition
        focus-visible:outline-2 focus-visible:outline-offset-2
        disabled:cursor-not-allowed disabled:opacity-60
        ${variantClasses[variant]} ${className}`}
      {...props}
    />
  )
}
