import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useI18n } from '@/lib/i18n'
import { useAuth } from '@/features/auth/AuthProvider'
import { getWeekDays, getWeekRange } from '@/lib/periods'
import { todayISO, formatDateShort } from '@/lib/dates'
import { formatHours } from '@/lib/time'
import { fetchActivities } from '@/features/activities/api'
import { fetchSubcategoriesWithRates } from '@/features/categories/api'
import { fetchAllProfiles } from '@/features/profile/api'
import { PlannerDay } from '@/features/planner/PlannerDay'
import { AddPlannedTaskDialog } from '@/features/planner/AddPlannedTaskDialog'
import { RecurringRulesCard } from '@/features/planner/RecurringRulesCard'
import { fetchRecurringRules, materialiseRules } from '@/features/planner/rulesApi'
import { Button } from '@/components/ui/Button'

/**
 * Планер недели — сетка из семи дней с задачами.
 *
 * Показываем только СВОИ задачи: планер личный, каждый ведёт свой.
 * Общая картина по семье — на семейном дашборде.
 */
export function PlannerPage() {
  const { t, locale } = useI18n()
  const { user } = useAuth()

  // Сдвиг недели: 0 — текущая, -1 — прошлая, 1 — следующая.
  const [weekOffset, setWeekOffset] = useState(0)
  const [addingForDate, setAddingForDate] = useState<string | null>(null)
  const [materialiseError, setMaterialiseError] = useState<string | null>(null)

  const days = getWeekDays(weekOffset)
  const range = getWeekRange(weekOffset)
  const today = todayISO()

  const queryClient = useQueryClient()

  const { data: subcategories } = useQuery({
    queryKey: ['subcategories-with-rates'],
    queryFn: fetchSubcategoriesWithRates,
  })

  const { data: profiles } = useQuery({ queryKey: ['profiles'], queryFn: fetchAllProfiles })
  const { data: rules } = useQuery({ queryKey: ['recurring-rules'], queryFn: fetchRecurringRules })

  const { data: tasks, isPending } = useQuery({
    queryKey: ['planner', range.from, range.to],
    // status 'all': Планеру нужны и запланированные, и уже выполненные —
    // иначе отмеченная задача исчезала бы с глаз, и сравнить план
    // с фактом было бы негде.
    queryFn: () =>
      // БЕЗ фильтра по человеку: запланированные задачи — это
      // договорённость семьи, и видеть их должны оба родителя.
      // Иначе задача, назначенная на одного, была бы невидима
      // второму, и отметить её он бы не смог.
      fetchActivities({ from: range.from, to: range.to, status: 'all' }),
    enabled: Boolean(user?.id),
  })

  // Подставляем задачи из правил повтора при открытии недели.
  // Дублей не будет: в базе стоит уникальный индекс «одно правило —
  // одна задача в день», поэтому даже одновременное открытие Планера
  // двумя людьми создаст задачу только один раз.
  const materialise = useMutation({
    mutationFn: materialiseRules,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['planner'] }),
    // Ошибку обязательно показываем. В первой версии её здесь не было,
    // и подстановка падала молча: правило создано, задача не появилась,
    // а приложение делало вид, что всё хорошо.
    onError: (e: Error) => setMaterialiseError(e.message),
  })

  useEffect(() => {
    if (!rules || rules.length === 0) return
    materialise.mutate({ rules, days })
    // Зависимость от строки, а не от массива: массив пересоздаётся
    // при каждой перерисовке, и эффект зациклился бы.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rules, days.join(',')])

  // Задачи Планера — только те, у которых есть план. Записи, сделанные
  // сразу «по факту» через форму или таймер, планом не являются.
  const plannedTasks = (tasks ?? []).filter((task) => task.planned_minutes !== null)

  const plannedTotal = plannedTasks.reduce((sum, t) => sum + (t.planned_minutes ?? 0), 0)
  const actualTotal = plannedTasks.reduce((sum, t) => sum + (t.actual_minutes ?? 0), 0)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t('page.planner.title')}</h1>
        <p className="mt-1 text-sm text-slate-500">{t('page.planner.subtitle')}</p>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => setWeekOffset((n) => n - 1)}>
            {t('planner.prevWeek')}
          </Button>
          {weekOffset !== 0 && (
            <Button variant="ghost" onClick={() => setWeekOffset(0)}>
              {t('planner.thisWeek')}
            </Button>
          )}
          <Button variant="secondary" onClick={() => setWeekOffset((n) => n + 1)}>
            {t('planner.nextWeek')}
          </Button>
        </div>

        <p className="text-sm text-slate-500 tabular-nums">
          {formatDateShort(range.from, locale)} — {formatDateShort(range.to, locale)}
        </p>
      </div>

      <RecurringRulesCard />

      {materialiseError && (
        <p role="alert" className="rounded-md bg-red-50 p-3 text-sm text-red-700">
          {t('activity.error.saveFailed')} {materialiseError}
        </p>
      )}

      {isPending && <p className="text-slate-400">{t('common.loading')}</p>}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {days.map((date) => (
          <PlannerDay
            key={date}
            date={date}
            isToday={date === today}
            tasks={plannedTasks.filter((task) => task.date === date)}
            subcategories={subcategories ?? []}
            people={profiles ?? []}
            currentUserId={user?.id}
            onAdd={setAddingForDate}
          />
        ))}
      </div>

      {plannedTotal > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-slate-100 px-4 py-3">
          <span className="text-sm font-medium text-slate-600">{t('planner.weekTotal')}</span>
          <span className="flex gap-4 text-sm font-semibold tabular-nums">
            <span>
              {t('planner.plan')}: {formatHours(plannedTotal, locale)}
            </span>
            <span>
              {t('planner.fact')}: {formatHours(actualTotal, locale)}
            </span>
          </span>
        </div>
      )}

      {addingForDate && (
        <AddPlannedTaskDialog date={addingForDate} onClose={() => setAddingForDate(null)} />
      )}
    </div>
  )
}
