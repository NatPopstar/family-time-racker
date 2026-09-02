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
  primary: 'bg-indigo-600 text-white hover:bg-indigo-700 focus-visible:outline-indigo-600',
  secondary:
    'bg-white text-slate-700 shadow-sm ring-1 ring-slate-200 hover:bg-slate-50 focus-visible:outline-slate-400',
  ghost: 'text-slate-600 hover:bg-slate-100 focus-visible:outline-slate-400',
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
