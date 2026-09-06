-- ============================================================================
--  ЗАБОТА О РЕБЁНКЕ В ВЫХОДНЫЕ НЕ ОЦЕНИВАЕТСЯ В ДЕНЬГАХ
--
--  Решение владельца данных: суббота и воскресенье с ребёнком — это
--  семейное время, а не работа, которую нанимают. Время по-прежнему
--  считается и видно в отчётах, но денежной оценки у него нет.
--
--  Правило касается ТОЛЬКО категории «Ребёнок». Уборка и готовка
--  в выходные оцениваются как обычно: посуду в воскресенье моют
--  ровно так же, как в среду.
--
--  ПОЧЕМУ ПРАВИЛО В ПРЕДСТАВЛЕНИИ, А НЕ В МОМЕНТ ЗАПИСИ.
--  Ставка замораживается в записи намеренно — чтобы смена цен не
--  переписывала прошлые отчёты. Но это НЕ ставка, а правило учёта:
--  «что вообще считать оплачиваемым трудом». Правила должны
--  применяться ко всем данным одинаково, иначе в одной таблице
--  окажутся записи, живущие по разным законам, и объяснить итог
--  станет нельзя. Передумаем — оценка вернётся сама, без правки данных.
--
--  Сегодня правило затрагивает одну запись: суббота 5 сентября,
--  «Отвести в Show lab», −11,20 €.
--
--  Колонка is_unpaid_weekend добавлена, чтобы приложение могло
--  объяснить, ПОЧЕМУ денег нет. Иначе «без денежной оценки» у детской
--  логистики выглядит так же, как у работы, где ставки нет вовсе, —
--  и человек решит, что что-то сломалось.
-- ============================================================================

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
  case
    -- isodow: 6 — суббота, 7 — воскресенье.
    when c.slug = 'childcare' and extract(isodow from a.date) in (6, 7) then 0
    else round(
      (coalesce(a.actual_minutes, 0) + coalesce(a.travel_minutes, 0))::numeric / 60
        * coalesce(a.rate_snapshot, 0),
      2
    )
  end as value,
  a.timer_started_at,
  a.timer_phase,
  a.pomodoros_done,
  a.address,
  a.travel_minutes,
  a.recurring_rule_id,
  a.is_earnings_snapshot,
  a.travel_one_way_minutes,
  a.travel_legs,
  -- Новые колонки только в конец: CREATE OR REPLACE VIEW не умеет
  -- вставлять их в середину списка.
  (c.slug = 'childcare' and extract(isodow from a.date) in (6, 7)) as is_unpaid_weekend
from public.activities a
join public.subcategories s on s.id = a.subcategory_id
join public.categories    c on c.id = s.category_id;
