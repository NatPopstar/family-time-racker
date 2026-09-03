import { useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { useI18n, type TranslationKey } from '@/lib/i18n'
import { useDisplayName } from '@/features/profile/useProfile'
import { signOut } from '@/features/auth/api'
import { Button } from '@/components/ui/Button'
import { LocaleSwitcher } from '@/components/LocaleSwitcher'

/**
 * Общая рамка всех страниц: шапка, меню разделов и место под содержимое.
 *
 * <Outlet /> — «дырка», в которую react-router подставляет страницу
 * текущего раздела. Благодаря ей шапка описана один раз, а не в каждой
 * из шести страниц.
 *
 * ВАЖНО ПРО УЗКИЙ ЭКРАН. На телефоне (375 пикселей) заголовок, имя,
 * переключатель языка и кнопка выхода в одну строку не помещаются —
 * кнопки уезжают за край. Поэтому на узком экране в шапке остаются
 * только название и кнопка меню, а всё остальное переезжает внутрь
 * выпадающего меню. Классы Tailwind:
 *   hidden md:flex — видно только на широком экране
 *   md:hidden      — видно только на узком
 */

/** Разделы меню. Один список — и для широкого экрана, и для телефона. */
const navItems: { to: string; labelKey: TranslationKey }[] = [
  { to: '/', labelKey: 'nav.dashboard' },
  { to: '/family', labelKey: 'nav.family' },
  { to: '/planner', labelKey: 'nav.planner' },
  { to: '/history', labelKey: 'nav.history' },
  { to: '/reports', labelKey: 'nav.reports' },
  { to: '/settings', labelKey: 'nav.settings' },
]

export function AppLayout() {
  const { t } = useI18n()
  const displayName = useDisplayName()
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="flex h-16 items-center justify-between gap-4">
            {/* truncate обрезает длинное название многоточием вместо того,
                чтобы растягивать шапку и выдавливать кнопки за экран. */}
            <span className="truncate text-base font-bold">{t('app.title')}</span>

            {/* --- Широкий экран: меню и всё остальное в одну строку --- */}
            <nav aria-label={t('nav.menu')} className="hidden md:flex md:gap-1">
              {navItems.map((item) => (
                <NavItem key={item.to} to={item.to} label={t(item.labelKey)} />
              ))}
            </nav>

            <div className="hidden shrink-0 items-center gap-3 md:flex">
              <span className="text-sm font-medium text-slate-600">{displayName}</span>
              <LocaleSwitcher />
              <Button variant="secondary" onClick={() => signOut()}>
                {t('auth.signOut')}
              </Button>
            </div>

            {/* --- Узкий экран: только кнопка меню --- */}
            <button
              type="button"
              onClick={() => setIsMenuOpen((open) => !open)}
              aria-label={t('nav.openMenu')}
              aria-expanded={isMenuOpen}
              className="shrink-0 rounded-md p-2 text-slate-600 hover:bg-slate-100 md:hidden"
            >
              <span aria-hidden="true" className="block text-lg leading-none">
                ☰
              </span>
            </button>
          </div>

          {/* Выпадающее меню телефона: разделы + имя, язык и выход. */}
          {isMenuOpen && (
            <div className="border-t border-slate-100 py-3 md:hidden">
              <nav aria-label={t('nav.menu')} className="flex flex-col gap-1">
                {navItems.map((item) => (
                  <NavItem
                    key={item.to}
                    to={item.to}
                    label={t(item.labelKey)}
                    // Закрываем меню после перехода, иначе оно осталось бы
                    // раскрытым поверх новой страницы.
                    onNavigate={() => setIsMenuOpen(false)}
                  />
                ))}
              </nav>

              <div className="mt-3 flex items-center justify-between gap-3 border-t border-slate-100 pt-3">
                <span className="truncate text-sm font-medium text-slate-600">{displayName}</span>
                <div className="flex shrink-0 items-center gap-2">
                  <LocaleSwitcher />
                  <Button variant="secondary" onClick={() => signOut()}>
                    {t('auth.signOut')}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <Outlet />
      </main>
    </div>
  )
}

/**
 * Одна ссылка меню.
 *
 * NavLink сам понимает, находимся ли мы сейчас на этой странице,
 * и передаёт признак isActive. Плюс он проставляет aria-current="page",
 * благодаря чему программы чтения с экрана объявляют текущий раздел.
 */
function NavItem({
  to,
  label,
  onNavigate,
}: {
  to: string
  label: string
  onNavigate?: () => void
}) {
  return (
    <NavLink
      to={to}
      // end нужен только для главной: без него ссылка "/" считалась бы
      // активной на всех страницах сразу, ведь любой адрес начинается с "/".
      end={to === '/'}
      onClick={onNavigate}
      className={({ isActive }) =>
        `rounded-md px-3 py-2 text-sm font-medium transition ${
          isActive ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-100'
        }`
      }
    >
      {label}
    </NavLink>
  )
}
