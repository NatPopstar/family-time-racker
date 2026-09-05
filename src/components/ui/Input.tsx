import { useId, type InputHTMLAttributes } from 'react'

/**
 * Поле ввода с подписью.
 *
 * useId выдаёт уникальный идентификатор и связывает <label> с <input>.
 * Это не формальность: благодаря связке клик по подписи ставит курсор
 * в поле, а программы для незрячих читают, что именно за поле перед ними.
 * По той же связке поля находят и наши автотесты — по видимой подписи,
 * а не по служебным атрибутам.
 */

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string
}

export function Input({ label, className = '', ...props }: InputProps) {
  const id = useId()

  return (
    <div className={className}>
      <label htmlFor={id} className="block text-sm font-medium text-ink-2">
        {label}
      </label>
      <input
        id={id}
        className="mt-1 block w-full rounded-md border-0 px-3 py-2 text-ink
          shadow-sm ring-1 ring-line-strong placeholder:text-ink-5
          focus:ring-2 focus:ring-accent focus:outline-none"
        {...props}
      />
    </div>
  )
}
