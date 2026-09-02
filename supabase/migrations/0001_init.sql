-- ============================================================================
--  Family Time Tracker — начальная схема базы данных
--  Выполнять в Supabase → SQL Editor → New query → вставить всё → Run
-- ============================================================================


-- ----------------------------------------------------------------------------
-- 1. PROFILES — люди (расширение служебной таблицы auth.users)
-- ----------------------------------------------------------------------------
-- Supabase хранит логины и пароли в своей таблице auth.users, которую нам
-- трогать нельзя. Поэтому создаём свою таблицу profiles со ссылкой 1:1 на неё,
-- где держим то, что нужно приложению: имя и цвет для графиков.
create table public.profiles (
  id           uuid primary key references auth.users (id) on delete cascade,
  display_name text        not null,
  color        text        not null default '#6366f1',  -- цвет линии/столбика на графиках
  created_at   timestamptz not null default now()
);


-- ----------------------------------------------------------------------------
-- 2. MARKET_RATES — почасовые ставки (London Market Rates)
-- ----------------------------------------------------------------------------
-- Живут ОТДЕЛЬНО от задач, чтобы их можно было менять в Settings без правки кода.
create table public.market_rates (
  id          uuid primary key default gen_random_uuid(),
  name        text          not null unique,        -- 'Cleaning', 'Private Chef', ...
  hourly_rate numeric(10,2) not null check (hourly_rate >= 0),
  currency    text          not null default 'GBP',
  is_active   boolean       not null default true,
  created_at  timestamptz   not null default now()
);


-- ----------------------------------------------------------------------------
-- 3. CATEGORIES — 4 главные категории деятельности
-- ----------------------------------------------------------------------------
create table public.categories (
  id         uuid primary key default gen_random_uuid(),
  slug       text not null unique,   -- work | study | household | childcare
  name       text not null,          -- человеческое название для интерфейса
  icon       text not null default '',
  sort_order int  not null default 0
);


-- ----------------------------------------------------------------------------
-- 4. SUBCATEGORIES — конкретные виды труда
-- ----------------------------------------------------------------------------
-- Здесь происходит главное: подкатегория знает свою ставку.
--   rate_id IS NULL  -> труд НЕ оценивается деньгами (работа, учёба)
--   rate_id IS NOT NULL -> попадёт в Estimated Market Value
create table public.subcategories (
  id          uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.categories (id)   on delete cascade,
  rate_id     uuid          references public.market_rates (id) on delete set null,
  name        text not null,
  sort_order  int  not null default 0,
  is_active   boolean not null default true,
  unique (category_id, name)
);


-- ----------------------------------------------------------------------------
-- 5. ACTIVITIES — сердце приложения: и план, и факт в одной строке
-- ----------------------------------------------------------------------------
create table public.activities (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references public.profiles (id)      on delete cascade,
  subcategory_id  uuid not null references public.subcategories (id) on delete restrict,

  title           text not null,
  date            date not null,          -- к какому дню относится задача
  comment         text,

  -- ВРЕМЯ ХРАНИМ В МИНУТАХ (целым числом).
  -- Дробные часы (1.5) при суммировании дают ошибки округления, минуты — нет.
  planned_minutes int check (planned_minutes >= 0),  -- сколько планировал
  actual_minutes  int check (actual_minutes  >= 0),  -- сколько реально потратил

  status          text not null default 'planned' check (status in ('planned', 'done')),

  -- Таймер: если здесь не NULL — значит секундомер прямо сейчас идёт.
  timer_started_at timestamptz,

  -- «ЗАМОРОЗКА» СТАВКИ. Копию ставки кладём сюда в момент нажатия «Выполнено».
  -- Благодаря этому изменение ставки в Settings не переписывает прошлые отчёты.
  rate_snapshot     numeric(10,2),
  currency_snapshot text,

  completed_at    timestamptz,
  created_at      timestamptz not null default now()
);

-- Индексы под самые частые запросы: «мои записи за период» и «все записи за период».
create index activities_user_date_idx on public.activities (user_id, date desc);
create index activities_date_idx      on public.activities (date desc);


-- ----------------------------------------------------------------------------
-- 6. V_ACTIVITY_VALUE — представление (view) с посчитанной стоимостью
-- ----------------------------------------------------------------------------
-- View — это сохранённый SQL-запрос, который выглядит как обычная таблица.
-- Формула «минуты / 60 * ставка» описана ЗДЕСЬ ОДИН РАЗ, а не в каждом отчёте.
-- security_invoker = on — обязательно: без него view игнорировал бы правила
-- доступа (RLS) нижележащих таблиц.
create view public.v_activity_value
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
  -- если ставки нет (работа, учёба) — стоимость 0
  round(coalesce(a.actual_minutes, 0)::numeric / 60 * coalesce(a.rate_snapshot, 0), 2) as value
from public.activities a
join public.subcategories s on s.id = a.subcategory_id
join public.categories    c on c.id = s.category_id;


-- ----------------------------------------------------------------------------
-- 7. Автосоздание профиля при регистрации
-- ----------------------------------------------------------------------------
-- Триггер — это функция, которую база вызывает сама при событии.
-- Здесь: как только Supabase создал пользователя, мы создаём ему профиль.
create function public.handle_new_user()
returns trigger
language plpgsql
security definer          -- выполняется с правами владельца: нужен доступ к auth.users
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1))
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();


-- ----------------------------------------------------------------------------
-- 8. ROW LEVEL SECURITY — кто что может делать
-- ----------------------------------------------------------------------------
-- RLS = правила доступа, встроенные в саму базу. Даже если во фронтенде будет
-- ошибка, база не отдаст и не даст испортить чужие данные.
--
-- Модель семьи: ВИДЯТ ВСЕ, МЕНЯЕТ КАЖДЫЙ ТОЛЬКО СВОЁ.
alter table public.profiles      enable row level security;
alter table public.categories    enable row level security;
alter table public.subcategories enable row level security;
alter table public.market_rates  enable row level security;
alter table public.activities    enable row level security;

-- Профили: видны всем вошедшим, редактировать можно только свой.
create policy "profiles readable by family"
  on public.profiles for select to authenticated using (true);
create policy "profiles updatable by owner"
  on public.profiles for update to authenticated using (auth.uid() = id);

-- Справочники: читают все, изменяют тоже все (семья вместе ведёт настройки).
create policy "categories readable"    on public.categories    for select to authenticated using (true);
create policy "categories writable"    on public.categories    for all    to authenticated using (true) with check (true);
create policy "subcategories readable" on public.subcategories for select to authenticated using (true);
create policy "subcategories writable" on public.subcategories for all    to authenticated using (true) with check (true);
create policy "rates readable"         on public.market_rates  for select to authenticated using (true);
create policy "rates writable"         on public.market_rates  for all    to authenticated using (true) with check (true);

-- Записи: семья видит все, но менять и удалять можно только свои.
create policy "activities readable by family"
  on public.activities for select to authenticated using (true);
create policy "activities insertable by owner"
  on public.activities for insert to authenticated with check (auth.uid() = user_id);
create policy "activities updatable by owner"
  on public.activities for update to authenticated using (auth.uid() = user_id);
create policy "activities deletable by owner"
  on public.activities for delete to authenticated using (auth.uid() = user_id);


-- ============================================================================
--  СТАРТОВЫЕ ДАННЫЕ
-- ============================================================================

-- Ставки (ориентир по Лондону; меняются позже в Settings → Market Rates)
insert into public.market_rates (name, hourly_rate, currency) values
  ('Cleaning',             20.00, 'GBP'),
  ('Private Chef',         35.00, 'GBP'),
  ('Laundry & Ironing',    17.00, 'GBP'),
  ('Household Assistant',  16.00, 'GBP'),
  ('Babysitter / Nanny',   16.00, 'GBP'),
  ('Math Tutor',           45.00, 'GBP'),
  ('Russian Tutor',        32.00, 'GBP');

-- Категории
insert into public.categories (slug, name, icon, sort_order) values
  ('work',      'Работа',              '💼', 1),
  ('study',     'Учёба',               '📚', 2),
  ('household', 'Домашние обязанности','🏠', 3),
  ('childcare', 'Ребёнок',             '🧒', 4);

-- Подкатегории. Ставку подставляем по имени, чтобы не хардкодить UUID.
insert into public.subcategories (category_id, rate_id, name, sort_order)
select
  (select id from public.categories   where slug = v.cat),
  (select id from public.market_rates where name = v.rate),   -- NULL если rate = NULL
  v.name,
  v.ord
from (values
  -- Работа — рыночная ставка НЕ применяется (это уже оплачиваемый труд)
  ('work',      null::text,            'Основная работа',              1),
  ('work',      null,                  'Работа над проектом',          2),
  ('work',      null,                  'Фриланс',                      3),

  -- Учёба — тоже без денежной оценки
  ('study',     null,                  'Университет',                  1),
  ('study',     null,                  'Программирование',             2),
  ('study',     null,                  'Английский язык',              3),
  ('study',     null,                  'Домашние задания',             4),
  ('study',     null,                  'Подготовка к экзамену',        5),

  -- Дом — оценивается
  ('household', 'Cleaning',            'Уборка',                       1),
  ('household', 'Private Chef',        'Приготовление еды',            2),
  ('household', 'Laundry & Ironing',   'Стирка и уход за одеждой',     3),
  ('household', 'Household Assistant', 'Покупки и организация дома',   4),

  -- Ребёнок — оценивается
  ('childcare', 'Babysitter / Nanny',  'Няня / присмотр',              1),
  ('childcare', 'Babysitter / Nanny',  'Логистика (отвезти/забрать)',  2),
  ('childcare', 'Math Tutor',          'Занятия математикой',          3),
  ('childcare', 'Russian Tutor',       'Занятия русским языком',       4)
) as v(cat, rate, name, ord);
