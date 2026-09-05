import { useId, type SelectHTMLAttributes, type ReactNode } from 'react'

/**
 * Выпадающий список с подписью.
 *
 * Устроен так же, как Input: useId связывает <label> с <select>,
 * поэтому поле находится по видимой подписи — и человеком,
 * и программой чтения с экрана, и нашими тестами.
 */

type SelectProps = SelectHTMLAttributes<HTMLSelectElement> & {
  label: string
  children: ReactNode
}

export function Select({ label, className = '', children, ...props }: SelectProps) {
  const id = useId()

  return (
    <div className={className}>
      <label htmlFor={id} className="block text-sm font-medium text-ink-2">
        {label}
      </label>
      <select
        id={id}
        className="mt-1 block w-full rounded-md border-0 bg-surface px-3 py-2 text-ink
          shadow-sm ring-1 ring-line-strong
          focus:ring-2 focus:ring-accent focus:outline-none
          disabled:cursor-not-allowed disabled:bg-surface-2 disabled:text-ink-5"
        {...props}
      >
        {children}
      </select>
    </div>
  )
}
