-- ============================================================================
--  Помидорный таймер: фаза и счётчик помидоров
--
--  Зачем в базе, а не в памяти браузера: таймер должен переживать
--  перезагрузку страницы. Если хранить фазу в браузере, то обновление
--  вкладки посреди рабочего отрезка теряло бы и фазу, и счётчик.
-- ============================================================================

alter table public.activities
  -- Какая фаза идёт сейчас: работа, короткий перерыв, длинный перерыв.
  -- NULL означает «помидорный режим не используется» — это обычный
  -- таймер или запись, введённая руками.
  add column timer_phase text
    check (timer_phase in ('work', 'short_break', 'long_break')),

  -- Сколько помидоров уже завершено в рамках этой задачи.
  -- Нужен, чтобы понять, когда пора длинный перерыв (после каждого четвёртого).
  add column pomodoros_done int not null default 0
    check (pomodoros_done >= 0);

comment on column public.activities.timer_phase is
  'Фаза помидорного таймера. NULL — режим не используется.';
comment on column public.activities.pomodoros_done is
  'Завершённых помидоров в этой задаче. После каждого четвёртого — длинный перерыв.';

-- ----------------------------------------------------------------------------
--  Представление пересобираем, чтобы интерфейс видел новые поля.
--
--  ⚠️ Напоминание из миграции 0002: CREATE OR REPLACE VIEW умеет только
--  ДОБАВЛЯТЬ колонки В КОНЕЦ. Поэтому новые поля идут последними, после
--  timer_started_at, — иначе база решит, что мы переименовываем колонки,
--  и откажется выполнять миграцию.
-- ----------------------------------------------------------------------------
create or replace view public.v_activity_value
with (security_invoker = on) as
select
  a.id,
  a.user_id,
  a.title,
  a.date,
  a.comment,
  a.planned_minutes,
  a.actual_minutes,
  a.status,
  a.completed_at,
  s.id            as subcategory_id,
  s.name          as subcategory_name,
  c.id            as category_id,
  c.slug          as category_slug,
  c.name          as category_name,
  a.rate_snapshot,
  a.currency_snapshot,
  round(coalesce(a.actual_minutes, 0)::numeric / 60 * coalesce(a.rate_snapshot, 0), 2) as value,
  a.timer_started_at,
  a.timer_phase,      -- ← новые колонки строго последними
  a.pomodoros_done
from public.activities a
join public.subcategories s on s.id = a.subcategory_id
join public.categories    c on c.id = s.category_id;
