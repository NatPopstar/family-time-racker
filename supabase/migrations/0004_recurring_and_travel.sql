-- ============================================================================
--  Повторяющиеся события, адрес, время в дороге и задачи без хозяина
--
--  Три отдельных изменения, связанные одним сценарием:
--  «у Саши каждую субботу занятие; кто отвезёт — заранее неизвестно;
--   ехать туда 30 минут».
-- ============================================================================


-- ----------------------------------------------------------------------------
-- 1. РОЛЬ В СЕМЬЕ: взрослый или ребёнок
--
--    Нужна, чтобы решить, кто может забрать себе неназначенную задачу.
--    По умолчанию все взрослые — существующие профили не ломаются.
-- ----------------------------------------------------------------------------
alter table public.profiles
  add column role text not null default 'adult'
    check (role in ('adult', 'child'));

comment on column public.profiles.role is
  'adult может брать себе общие задачи семьи; child — только свои.';


-- ----------------------------------------------------------------------------
-- 2. ЗАДАЧА БЕЗ ХОЗЯИНА
--
--    Раньше у каждой записи обязательно был владелец. Но «в субботу
--    занятие, кто ведёт — не договорились» именно такая запись:
--    она есть, а хозяина у неё нет.
--
--    NULL в user_id теперь означает «общая задача семьи, ничья».
-- ----------------------------------------------------------------------------
alter table public.activities
  alter column user_id drop not null;

comment on column public.activities.user_id is
  'NULL — общая задача семьи: ещё не решено, кто её делает.';


-- ----------------------------------------------------------------------------
-- 3. АДРЕС И ВРЕМЯ В ДОРОГЕ
--
--    Дорога хранится ОТДЕЛЬНО от самого занятия. Так видно
--    «занятие 1 ч + дорога 30 мин», а не безликие полтора часа.
--    Но в итоги и в стоимость дорога ВХОДИТ: отвезти ребёнка —
--    это работа, а не пауза между делами.
-- ----------------------------------------------------------------------------
alter table public.activities
  add column address text,
  add column travel_minutes int not null default 0 check (travel_minutes >= 0);

comment on column public.activities.travel_minutes is
  'Время на дорогу туда и обратно. Считается как труд и входит в стоимость.';


-- ----------------------------------------------------------------------------
-- 4. ПРАВИЛО ПОВТОРА
--
--    Хранится ОДНОЙ строкой-шаблоном, а не копиями на много недель вперёд.
--    Поменяла шаблон — поменялось везде, где задача ещё не выполнена.
--    Планер подставляет задачу в нужные дни сам.
-- ----------------------------------------------------------------------------
create table public.recurring_rules (
  id             uuid primary key default gen_random_uuid(),
  created_by     uuid not null references public.profiles (id) on delete cascade,
  subcategory_id uuid not null references public.subcategories (id) on delete restrict,

  title    text not null,
  address  text,

  -- День недели: 1 — понедельник, 7 — воскресенье.
  -- Нумерация как в ISO, чтобы совпадала с нашим Планером,
  -- где неделя начинается с понедельника.
  weekday int not null check (weekday between 1 and 7),

  planned_minutes int not null check (planned_minutes > 0),
  travel_minutes  int not null default 0 check (travel_minutes >= 0),

  -- Кому назначено по умолчанию. NULL — «договоритесь сами»:
  -- задача появится ничьей, и её заберёт тот, кто реально сделал.
  default_user_id uuid references public.profiles (id) on delete set null,

  is_active  boolean not null default true,
  created_at timestamptz not null default now()
);

-- Связь созданной задачи с правилом. Нужна, чтобы Планер не создал
-- вторую такую же задачу на тот же день.
alter table public.activities
  add column recurring_rule_id uuid references public.recurring_rules (id) on delete set null;

-- Одно правило — не больше одной задачи в конкретный день.
-- Это и есть защита от дублей, причём на уровне базы, а не кода:
-- даже если два человека откроют Планер одновременно, вторая
-- вставка не пройдёт.
create unique index activities_rule_per_day_idx
  on public.activities (recurring_rule_id, date)
  where recurring_rule_id is not null;


-- ----------------------------------------------------------------------------
-- 5. ПРАВИЛА ДОСТУПА
-- ----------------------------------------------------------------------------

-- Взрослый ли текущий пользователь.
-- security definer нужен, чтобы функция могла заглянуть в profiles
-- независимо от политик доступа к ней.
create function public.is_adult()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select role = 'adult' from public.profiles where id = auth.uid()), false);
$$;

alter table public.recurring_rules enable row level security;

create policy "rules readable by family"
  on public.recurring_rules for select to authenticated using (true);
-- Правила повтора заводят взрослые: это договорённость о том,
-- кто и что делает в семье.
create policy "rules writable by adults"
  on public.recurring_rules for all to authenticated
  using (public.is_adult()) with check (public.is_adult());

-- Переписываем политики записей: теперь user_id может быть пустым.
drop policy "activities insertable by owner" on public.activities;
drop policy "activities updatable by owner" on public.activities;
drop policy "activities deletable by owner" on public.activities;

-- Создавать можно свою запись или общую (ничью).
create policy "activities insertable"
  on public.activities for insert to authenticated
  with check (auth.uid() = user_id or user_id is null);

-- Менять можно свою запись, а общую — только взрослому.
-- Именно здесь работает правило «кто отвёз, тот и отметил»:
-- взрослый забирает ничью задачу себе.
create policy "activities updatable"
  on public.activities for update to authenticated
  using (auth.uid() = user_id or (user_id is null and public.is_adult()));

create policy "activities deletable"
  on public.activities for delete to authenticated
  using (auth.uid() = user_id or (user_id is null and public.is_adult()));


-- ----------------------------------------------------------------------------
-- 6. ПРЕДСТАВЛЕНИЕ: дорога входит в время и в стоимость
--
--    ⚠️ ИЗМЕНЕНА ФОРМУЛА ДЕНЕГ. Раньше считались только actual_minutes,
--    теперь к ним прибавляется travel_minutes. У всех прошлых записей
--    travel_minutes равен нулю, поэтому их суммы не меняются —
--    история остаётся нетронутой.
--
--    Напоминание из миграции 0002: CREATE OR REPLACE VIEW добавляет
--    колонки только В КОНЕЦ.
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
  round(
    (coalesce(a.actual_minutes, 0) + coalesce(a.travel_minutes, 0))::numeric / 60
      * coalesce(a.rate_snapshot, 0),
    2
  ) as value,
  a.timer_started_at,
  a.timer_phase,
  a.pomodoros_done,
  a.address,           -- ← новые колонки строго последними
  a.travel_minutes,
  a.recurring_rule_id
from public.activities a
join public.subcategories s on s.id = a.subcategory_id
join public.categories    c on c.id = s.category_id;
