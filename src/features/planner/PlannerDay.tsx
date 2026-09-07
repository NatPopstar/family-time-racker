import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useI18n } from '@/lib/i18n'
import { formatMinutes, comparePlanToFact, hoursAndMinutesToMinutes } from '@/lib/time'
import { formatDateShort } from '@/lib/dates'
import type { ActivityWithValue, Profile } from '@/types/models'
import type { SubcategoryWithRate } from '@/features/categories/api'
import { completePlannedActivity, deleteActivity } from '@/features/activities/api'
import { claimActivity } from './rulesApi'
import { EditPlannedTaskDialog } from './EditPlannedTaskDialog'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { FernSprig } from '@/components/ornaments'

/**
 * Один день недели в Планере: список задач и кнопка добавления.
 * Соответствует строке из рисунка: день, задачи, отметка о выполнении.
 */
export function PlannerDay({
  date,
  tasks,
  subcategories,
  people,
  currentUserId,
  isToday,
  onAdd,
}: {
  date: string
  tasks: ActivityWithValue[]
  subcategories: SubcategoryWithRate[]
  people: Profile[]
  currentUserId: string | undefined
  isToday: boolean
  onAdd: (date: string) => void
}) {
  const { t, locale } = useI18n()

  const weekdayName = new Intl.DateTimeFormat(locale === 'ru' ? 'ru-RU' : 'en-GB', {
    weekday: 'long',
  }).format(new Date(`${date}T00:00:00`))

  return (
    <section
      className={`rounded-xl p-4 ring-1 ${
        // Сегодняшний день подсвечиваем: в сетке из семи одинаковых
        // карточек глаз иначе теряется.
        isToday ? 'bg-accent-soft ring-accent-line' : 'bg-surface ring-line'
      }`}
    >
      <header className="flex items-baseline justify-between gap-2">
        <h3 className="font-semibold text-ink capitalize">{weekdayName}</h3>
        <span className="text-xs text-ink-5">{formatDateShort(date, locale)}</span>
      </header>

      {tasks.length === 0 ? (
        <p className="mt-3 flex items-center gap-2 text-sm text-ink-5">
          <FernSprig className="size-4 shrink-0" />
          {t('planner.noTasks')}
        </p>
      ) : (
        <ul className="mt-3 space-y-2">
          {tasks.map((task) => (
            <PlannerTask
              key={task.id}
              task={task}
              subcategories={subcategories}
              people={people}
              currentUserId={currentUserId}
            />
          ))}
        </ul>
      )}

      <Button variant="ghost" onClick={() => onAdd(date)} className="mt-3 w-full text-sm">
        + {t('planner.addFor')}
      </Button>
    </section>
  )
}

/** Одна задача: пока не выполнена — с полем факта, после — с отклонением. */
function PlannerTask({
  task,
  subcategories,
  people,
  currentUserId,
}: {
  task: ActivityWithValue
  subcategories: SubcategoryWithRate[]
  people: Profile[]
  currentUserId: string | undefined
}) {
  const { t, locale } = useI18n()
  const queryClient = useQueryClient()

  const [isCompleting, setIsCompleting] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [hours, setHours] = useState('')
  const [minutes, setMinutes] = useState('')

  const subcategory = subcategories.find((s) => s.id === task.subcategory_id)
  const isDone = task.status === 'done'
  const comparison = comparePlanToFact(task.planned_minutes, task.actual_minutes)

  // Ничья задача: договорённости не было, отметит тот, кто сделает.
  const isUnassigned = task.user_id === null
  const owner = people.find((p) => p.id === task.user_id)

  // Задача ребёнка остаётся записанной на него, кто бы ни нажал
  // «Выполнено». Иначе родитель, отметив «уроки сделаны», забрал бы
  // себе его труд, и статистика ребёнка обнулилась бы.
  const ownerIsChild = owner?.role === 'child'

  function refresh() {
    queryClient.invalidateQueries({ queryKey: ['planner'] })
    queryClient.invalidateQueries({ queryKey: ['activities'] })
  }

  const complete = useMutation({
    mutationFn: completePlannedActivity,
    onSuccess: () => {
      refresh()
      setIsCompleting(false)
    },
  })

  const claim = useMutation({ mutationFn: claimActivity, onSuccess: refresh })
  const remove = useMutation({ mutationFn: deleteActivity, onSuccess: refresh })

  return (
    <li className={`rounded-lg p-3 ${isUnassigned && !isDone ? 'bg-warn-soft' : 'bg-surface-2'}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className={`text-sm font-medium ${isDone ? 'text-ink-5 line-through' : 'text-ink'}`}>
            {task.title}
          </p>
          <p className="text-xs text-ink-4">{task.subcategory_name}</p>
          {task.address && <p className="mt-0.5 text-xs text-ink-5">📍 {task.address}</p>}
        </div>
        <button
          type="button"
          onClick={() => remove.mutate(task.id!)}
          className="shrink-0 text-xs text-ink-6 hover:text-danger-hover"
          aria-label={`${t('common.delete')}: ${task.title}`}
        >
          ✕
        </button>
      </div>

      {/* Кто делает. Ничья задача помечена явно, иначе её легко
          принять за чужую и пройти мимо. */}
      <p className="mt-1 text-xs">
        {isUnassigned ? (
          <span className="font-medium text-warn">{t('planner.unassigned')}</span>
        ) : (
          <span className="text-ink-4">
            {t('planner.assignedTo')}: {owner?.display_name ?? '—'}
            {ownerIsChild && <> · {t('planner.childTask')}</>}
          </span>
        )}
      </p>

      <p className="mt-1 text-xs text-ink-4 tabular-nums">
        {t('planner.plan')}: {formatMinutes(task.planned_minutes ?? 0, locale)}
        {/* Дорогу показываем отдельным слагаемым: так видно,
            из чего складывается время. */}
        {(task.travel_minutes ?? 0) > 0 && (
          <> {' + '}🚗 {formatMinutes(task.travel_minutes ?? 0, locale)}</>
        )}
        {isDone && (
          <>
            {' · '}
            {t('planner.fact')}: {formatMinutes(task.actual_minutes ?? 0, locale)}
          </>
        )}
      </p>

      {isDone && comparison && (
        <p
          className={`mt-1 text-xs font-medium ${
            comparison.direction === 'longer'
              ? 'text-warn'
              : comparison.direction === 'shorter'
                ? 'text-positive'
                : 'text-ink-4'
          }`}
        >
          {comparison.direction === 'exact'
            ? t('planner.onPlan')
            : `${comparison.direction === 'longer' ? t('planner.longer') : t('planner.shorter')} ${formatMinutes(comparison.diffMinutes, locale)}`}
        </p>
      )}

      {!isDone && !isCompleting && (
        <div className="mt-2 flex flex-wrap gap-2">
          <Button variant="secondary" onClick={() => setIsCompleting(true)} className="text-xs">
            {t('planner.done')}
          </Button>

          {/* Править запланированную задачу может любой взрослый:
              это договорённость семьи, а не личная запись. */}
          <Button variant="ghost" onClick={() => setIsEditing(true)} className="text-xs">
            {t('planner.edit')}
          </Button>

          {/* Забрать задачу можно и не выполняя её — например, когда
              родители договорились утром, а занятие только вечером. */}
          {isUnassigned && currentUserId && (
            <Button
              variant="ghost"
              disabled={claim.isPending}
              onClick={() => claim.mutate({ activityId: task.id!, userId: currentUserId })}
              className="text-xs"
            >
              {t('planner.claim')}
            </Button>
          )}
        </div>
      )}

      {isUnassigned && !isDone && (
        <p className="mt-1 text-xs text-warn">{t('planner.unassignedHint')}</p>
      )}

      {ownerIsChild && !isDone && (
        <p className="mt-1 text-xs text-ink-5">{t('planner.childTaskHint')}</p>
      )}

      {isEditing && (
        <EditPlannedTaskDialog task={task} onClose={() => setIsEditing(false)} />
      )}

      {!isDone && isCompleting && (
        <div className="mt-2 space-y-2">
          <span className="block text-xs font-medium text-ink-3">
            {t('planner.actualTime')}
          </span>

          {/* САМОЕ ВАЖНОЕ МЕСТО ЭТОЙ ФОРМЫ.
              У задачи из правила дорога уже задана и уже считается.
              Пока это не было написано, человек вписывал сюда ВСЁ время
              ходки — и оно складывалось с дорогой: «отвёл за 30 минут»
              превращалось в 70. */}
          {(task.travel_minutes ?? 0) > 0 && (
            <p className="rounded-md bg-surface-3 px-2.5 py-2 text-xs text-ink-3">
              🚗 {t('planner.travelAlreadyCounted')}:{' '}
              <span className="font-medium tabular-nums text-ink-2">
                {formatMinutes(task.travel_minutes ?? 0, locale)}
              </span>
              <span className="block text-ink-4">{t('planner.travelOnlyHint')}</span>
            </p>
          )}
          <div className="flex gap-2">
            <Input
              label={t('activity.hours')}
              type="number"
              min={0}
              value={hours}
              onChange={(e) => setHours(e.target.value)}
              className="flex-1"
            />
            <Input
              label={t('activity.minutes')}
              type="number"
              min={0}
              value={minutes}
              onChange={(e) => setMinutes(e.target.value)}
              className="flex-1"
            />
          </div>
          <div className="flex gap-2">
            <Button
              disabled={complete.isPending || !subcategory}
              onClick={() =>
                complete.mutate({
                  activityId: task.id!,
                  actualMinutes: hoursAndMinutesToMinutes(
                    Number(hours) || 0,
                    Number(minutes) || 0,
                  ),
                  subcategory: subcategory!,
                  // Кто нажал «Выполнено» — на того и записывается,
                  // даже если заранее назначен был другой: по факту
                  // отвезти мог кто угодно, и труд принадлежит ему.
                  // Исключение — задача ребёнка: она остаётся его.
                  claimForUserId: ownerIsChild ? null : currentUserId,
                })
              }
              className="text-xs"
            >
              {t('planner.markDone')}
            </Button>
            <Button variant="ghost" onClick={() => setIsCompleting(false)} className="text-xs">
              {t('common.cancel')}
            </Button>
          </div>
        </div>
      )}
    </li>
  )
}
