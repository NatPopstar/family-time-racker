import { useState, type FormEvent } from 'react'
import { useI18n, type TranslationKey } from '@/lib/i18n'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { LocaleSwitcher } from '@/components/LocaleSwitcher'
import { signIn, signUp, mapAuthError } from './api'

/**
 * Единый экран входа и регистрации.
 *
 * Почему одна страница на два действия: формы отличаются одним полем (имя),
 * а вся остальная логика — общая. Две отдельные страницы означали бы
 * двойную работу при каждой правке.
 */
export function AuthPage() {
  const { t } = useI18n()

  const [mode, setMode] = useState<'signIn' | 'signUp'>('signIn')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [errorKey, setErrorKey] = useState<TranslationKey | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const isSignUp = mode === 'signUp'

  async function handleSubmit(event: FormEvent) {
    // Без этого браузер перезагрузит страницу и введённые данные пропадут.
    event.preventDefault()
    setErrorKey(null)

    // Проверяем имя до обращения к серверу: незачем гонять запрос,
    // если и так понятно, что данных не хватает.
    if (isSignUp && displayName.trim() === '') {
      setErrorKey('auth.error.nameRequired')
      return
    }

    setIsSubmitting(true)
    try {
      if (isSignUp) {
        await signUp(email, password, displayName.trim())
      } else {
        await signIn(email, password)
      }
      // Дальше ничего делать не нужно: AuthProvider поймает событие входа
      // и приложение само покажет личный кабинет.
    } catch (error) {
      const message = error instanceof Error ? error.message : ''
      setErrorKey(mapAuthError(message))
    } finally {
      // finally выполняется и при успехе, и при ошибке — кнопка
      // не останется навсегда заблокированной.
      setIsSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-6">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-xl font-bold text-slate-900">{t('app.title')}</h1>
          <LocaleSwitcher />
        </div>

        <form
          onSubmit={handleSubmit}
          className="space-y-4 rounded-xl bg-white p-6 shadow-sm ring-1 ring-slate-200"
        >
          <h2 className="text-lg font-semibold text-slate-900">
            {isSignUp ? t('auth.signUp') : t('auth.signIn')}
          </h2>

          {isSignUp && (
            <Input
              label={t('auth.displayName')}
              placeholder={t('auth.displayNamePlaceholder')}
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              autoComplete="name"
            />
          )}

          <Input
            label={t('auth.email')}
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
          />

          <Input
            label={t('auth.password')}
            type="password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            // Подсказка браузеру и менеджеру паролей: новый пароль или уже существующий.
            autoComplete={isSignUp ? 'new-password' : 'current-password'}
          />

          {errorKey && (
            // role="alert" — программы для незрячих прочитают сообщение сразу,
            // не дожидаясь, пока пользователь до него доберётся.
            <p role="alert" className="rounded-md bg-red-50 p-3 text-sm text-red-700">
              {t(errorKey)}
            </p>
          )}

          <Button type="submit" disabled={isSubmitting} className="w-full">
            {isSubmitting
              ? t('auth.working')
              : isSignUp
                ? t('auth.signUpButton')
                : t('auth.signInButton')}
          </Button>
        </form>

        <button
          type="button"
          onClick={() => {
            setMode(isSignUp ? 'signIn' : 'signUp')
            // Стираем старую ошибку: она относилась к другому действию.
            setErrorKey(null)
          }}
          className="mt-4 w-full text-center text-sm text-indigo-600 hover:text-indigo-500"
        >
          {isSignUp ? t('auth.toggleToSignIn') : t('auth.toggleToSignUp')}
        </button>
      </div>
    </div>
  )
}
