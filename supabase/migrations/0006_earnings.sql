-- ============================================================================
--  Настоящий заработок отдельно от оценки неоплачиваемого труда
--
--  До сих пор все ставки означали одно: «сколько стоило бы купить такую
--  работу на стороне». Теперь появляются ставки другого рода — реальная
--  почасовая зарплата.
--
--  СКЛАДЫВАТЬ ИХ В ОДНО ЧИСЛО НЕЛЬЗЯ. «Заработал 2000» и «его труд стоил бы
--  2000, если бы он его покупал» — разные утверждения. Сумма из них
--  не значит ничего. Поэтому вводим признак и считаем две цифры.
-- ============================================================================

alter table public.market_rates
  add column is_earnings boolean not null default false;

comment on column public.market_rates.is_earnings is
  'true — это реальная зарплата за час. false — условная оценка стоимости услуги.';

-- Признак «замораживаем» в записи так же, как ставку: изменение
-- настроек не должно задним числом превращать заработок в оценку.
alter table public.activities
  add column is_earnings_snapshot boolean not null default false;

comment on column public.activities.is_earnings_snapshot is
  'Копия признака на момент выполнения. Заработок это или оценка.';


-- ----------------------------------------------------------------------------
--  Ставки по двум работам.
--
--  Валюта взята та же, что стоит сейчас в настройках. Если она указана
--  неверно — это меняется в разделе «Настройки», без правки кода.
-- ----------------------------------------------------------------------------
insert into public.market_rates (name, hourly_rate, currency, is_earnings)
select 'Работа 1 (net)', 47.45, coalesce((select currency from public.market_rates limit 1), 'GBP'), true
where not exists (select 1 from public.market_rates where name = 'Работа 1 (net)');

insert into public.market_rates (name, hourly_rate, currency, is_earnings)
select 'Работа 2 (net)', 43.75, coalesce((select currency from public.market_rates limit 1), 'GBP'), true
where not exists (select 1 from public.market_rates where name = 'Работа 2 (net)');


-- ----------------------------------------------------------------------------
--  Виды работы под них, внутри категории «Работа».
-- ----------------------------------------------------------------------------
insert into public.subcategories (category_id, rate_id, name, sort_order)
select
  (select id from public.categories where slug = 'work'),
  (select id from public.market_rates where name = 'Работа 1 (net)'),
  'Работа 1',
  10
where not exists (
  select 1 from public.subcategories s
  join public.categories c on c.id = s.category_id
  where c.slug = 'work' and s.name = 'Работа 1'
);

insert into public.subcategories (category_id, rate_id, name, sort_order)
select
  (select id from public.categories where slug = 'work'),
  (select id from public.market_rates where name = 'Работа 2 (net)'),
  'Работа 2',
  11
where not exists (
  select 1 from public.subcategories s
  join public.categories c on c.id = s.category_id
  where c.slug = 'work' and s.name = 'Работа 2'
);


-- ----------------------------------------------------------------------------
--  Представление: отдаём признак наружу.
--  Напоминание: CREATE OR REPLACE VIEW добавляет колонки только В КОНЕЦ.
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
  a.address,
  a.travel_minutes,
  a.recurring_rule_id,
  a.is_earnings_snapshot   -- ← новая колонка последней
from public.activities a
join public.subcategories s on s.id = a.subcategory_id
join public.categories    c on c.id = s.category_id;
