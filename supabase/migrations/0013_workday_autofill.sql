-- ============================================================================
--  АВТОЗАПОЛНЕНИЕ РАБОЧИХ ДНЕЙ
--
--  Андрей работает по будням: 6 часов в «инвесте», 4 часа в epam. Вносить
--  это руками каждый день бессмысленно — оно и так известно заранее.
--
--  ПОЧЕМУ НЕ ПОВТОРЯЮЩЕЕСЯ ПРАВИЛО. Правила создают ЗАПЛАНИРОВАННЫЕ
--  задачи, которые потом надо отметить выполненными. Это ровно та ручная
--  работа, от которой мы избавляемся.
--
--  ПОЧЕМУ ПОЛИТИКА ЛЕЖИТ В ТАБЛИЦЕ, А НЕ В КОДЕ. «Шесть часов» — это не
--  правило программы, а договорённость семьи. Поменяется график — здесь
--  будет одна строчка UPDATE, а не правка кода и новый выпуск приложения.
-- ============================================================================

create table public.workday_defaults (
  subcategory_id uuid primary key references public.subcategories(id) on delete cascade,
  -- Чьи это часы. Автозаполнение пишет именно на этого человека,
  -- кто бы ни открыл приложение.
  user_id uuid not null references public.profiles(id) on delete cascade,
  minutes int not null check (minutes > 0),
  -- С какого дня заполнять. Прошлое до этой даты не трогается никогда:
  -- там могут быть настоящие записи, и переписывать их нельзя.
  starts_on date not null,
  is_active boolean not null default true
);

comment on table public.workday_defaults is
  'Что считается само собой разумеющимся в будний день: кто, какую работу и сколько.';

alter table public.workday_defaults enable row level security;

-- Читать может вся семья, менять — только взрослые.
create policy "workday defaults readable" on public.workday_defaults
  for select to authenticated using (true);

create policy "workday defaults writable" on public.workday_defaults
  for all to authenticated using (public.is_adult()) with check (public.is_adult());


-- ----------------------------------------------------------------------------
--  Заполнение пропущенных будних дней.
--
--  SECURITY DEFINER — функция работает с правами владельца и потому может
--  создать запись на имя другого человека. Это НАМЕРЕННО и очень узко:
--  обычные правила («каждый пишет только за себя») остаются в силе, а
--  исключение сделано ровно для одного действия, которое целиком описано
--  здесь и ничего другого делать не умеет.
--
--  Альтернатива — разрешить взрослым писать друг за друга вообще — была бы
--  куда опаснее: тогда в чужую историю можно было бы внести что угодно.
--
--  Возвращает число созданных записей, чтобы приложению было что показать.
-- ----------------------------------------------------------------------------
create or replace function public.fill_workdays()
returns int
language plpgsql
security definer
-- Пустой search_path: иначе злоумышленник мог бы подсунуть свою функцию
-- с тем же именем. Все имена ниже написаны полностью.
set search_path = ''
as $$
declare
  created int := 0;
begin
  -- Запускать может только взрослый член семьи.
  if not public.is_adult() then
    raise exception 'Заполнять рабочие дни может только взрослый';
  end if;

  insert into public.activities
    (user_id, subcategory_id, title, date, actual_minutes,
     status, completed_at, rate_snapshot, currency_snapshot, is_earnings_snapshot)
  select
    d.user_id,
    d.subcategory_id,
    s.name,
    day::date,
    d.minutes,
    'done',
    day::date + time '18:00',
    mr.hourly_rate,
    mr.currency,
    coalesce(mr.is_earnings, false)
  from public.workday_defaults d
  join public.subcategories s on s.id = d.subcategory_id
  left join public.market_rates mr on mr.id = s.rate_id
  -- Дни от начала действия правила до сегодняшнего включительно.
  -- Вперёд не заглядываем: работа, которой ещё не было, не заработок.
  cross join lateral generate_series(d.starts_on, current_date, interval '1 day') as day
  where d.is_active
    -- Только будни: 1..5 по ISO — понедельник по пятницу.
    and extract(isodow from day) between 1 and 5
    -- И только если такой записи ещё нет. Это и делает повторный запуск
    -- безопасным: приложение зовёт функцию при каждом открытии.
    and not exists (
      select 1 from public.activities a
      where a.user_id = d.user_id
        and a.subcategory_id = d.subcategory_id
        and a.date = day::date
    );

  get diagnostics created = row_count;
  return created;
end;
$$;

comment on function public.fill_workdays is
  'Досоздаёт пропущенные будние рабочие дни по таблице workday_defaults. Повторный вызов безопасен.';

grant execute on function public.fill_workdays() to authenticated;


-- ----------------------------------------------------------------------------
--  Настройка для Андрея: 6 часов «инвест», 4 часа epam, начиная с сегодня.
--
--  Задним числом не заполняем по прямому решению: прошлые дни могут быть
--  отпуском или больничным, а один будний день — это 459,70 евро реальных
--  денег, а не оценки. Ошибиться тут дороже, чем недозаполнить.
-- ----------------------------------------------------------------------------
insert into public.workday_defaults (subcategory_id, user_id, minutes, starts_on)
select s.id, p.id, v.minutes, current_date
from (values
  ('Работа Andrei (инвест)', 360),
  ('Работа Andrei (epam)',   240)
) as v(subcategory, minutes)
join public.subcategories s on s.name = v.subcategory
join public.profiles p on p.display_name = 'Andrei'
on conflict (subcategory_id) do nothing;
