-- ============================================================================
--  Дорога: вводим одну сторону, форму поездки выбираем
--
--  Было: одно поле «дорога туда и обратно», и человек считал сумму в уме.
--  Стало: вводится время в ОДНУ сторону и выбирается форма поездки.
--
--    только туда        ×1  — завезла по пути, дальше поехала своей дорогой
--    туда и обратно     ×2  — отвезла и сразу вернулась домой
--    отвезти и забрать  ×4  — отвезла, вернулась, поехала забирать, привезла
--
--  Разница между первым и третьим — вчетверо, поэтому одним множителем
--  тут не обойтись.
--
--  ПОЧЕМУ ПУСТЫЕ ОТРЕЗКИ ТОЖЕ ТРУД. Оценка отвечает на вопрос «сколько
--  стоило бы купить эту работу на стороне». Нанятая няня выставит счёт
--  за всё время, что занята, включая дорогу порожняком. Значит и здесь
--  эти минуты считаются. Исключение — отрезок, который случился бы
--  в любом случае: для него и есть вариант «только туда».
-- ============================================================================

alter table public.activities
  add column travel_one_way_minutes int not null default 0
    check (travel_one_way_minutes >= 0),
  add column travel_legs int not null default 2
    check (travel_legs in (1, 2, 4));

comment on column public.activities.travel_one_way_minutes is
  'Время в дороге в ОДНУ сторону.';
comment on column public.activities.travel_legs is
  'Сколько отрезков пути: 1 — только туда, 2 — туда и обратно, 4 — отвезти и забрать.';

-- Переносим уже введённые значения. Считаем их как «одна сторона × 1»:
-- мы не знаем, как именно человек их вводил, а менять сумму задним
-- числом нельзя — это исказило бы прошлые записи.
update public.activities
set travel_one_way_minutes = travel_minutes,
    travel_legs = 1
where travel_minutes > 0;


-- ----------------------------------------------------------------------------
--  travel_minutes становится ВЫЧИСЛЯЕМОЙ колонкой.
--
--  Так общее время физически не может разойтись с введённым:
--  база считает его сама при каждой записи. Хранить сумму отдельно
--  и надеяться, что код её обновит, — источник тихих расхождений.
--
--  Представление приходится пересоздать: оно ссылается на эту колонку,
--  а удалить колонку, пока на неё кто-то ссылается, PostgreSQL не даст.
-- ----------------------------------------------------------------------------
drop view public.v_activity_value;

alter table public.activities drop column travel_minutes;

alter table public.activities
  add column travel_minutes int
    generated always as (travel_one_way_minutes * travel_legs) stored;

comment on column public.activities.travel_minutes is
  'Общее время в дороге. Вычисляется базой: одна сторона × число отрезков.';


-- То же самое для правил повтора.
alter table public.recurring_rules
  add column travel_one_way_minutes int not null default 0
    check (travel_one_way_minutes >= 0),
  add column travel_legs int not null default 2
    check (travel_legs in (1, 2, 4));

update public.recurring_rules
set travel_one_way_minutes = travel_minutes,
    travel_legs = 1
where travel_minutes > 0;

alter table public.recurring_rules drop column travel_minutes;

alter table public.recurring_rules
  add column travel_minutes int
    generated always as (travel_one_way_minutes * travel_legs) stored;


-- ----------------------------------------------------------------------------
--  Представление собираем заново — в точности как было, плюс новые поля.
-- ----------------------------------------------------------------------------
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
  a.is_earnings_snapshot,
  a.travel_one_way_minutes,
  a.travel_legs
from public.activities a
join public.subcategories s on s.id = a.subcategory_id
join public.categories    c on c.id = s.category_id;
