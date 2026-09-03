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
      <label htmlFor={id} className="block text-sm font-medium text-slate-700">
        {label}
      </label>
      <select
        id={id}
        className="mt-1 block w-full rounded-md border-0 bg-white px-3 py-2 text-slate-900
          shadow-sm ring-1 ring-slate-300
          focus:ring-2 focus:ring-indigo-600 focus:outline-none
          disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400"
        {...props}
      >
        {children}
      </select>
    </div>
  )
}
