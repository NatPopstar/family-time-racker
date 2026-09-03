-- ============================================================================
--  Добавляем время старта таймера в представление v_activity_value
--
--  Зачем: интерфейсу нужно знать, идёт ли сейчас таймер, а всё, что он
--  читает, он читает из этого представления. Без поля timer_started_at
--  приложение не может отличить идущий таймер от обычной записи.
--
--  Почему отдельным файлом, а не правкой 0001_init.sql: та миграция уже
--  выполнена на базе. Изменять применённые миграции нельзя — иначе
--  на другом компьютере база соберётся иначе, чем здесь. Каждое
--  изменение схемы — новый файл с новым номером.
--
--  ⚠️ ВАЖНОЕ ОГРАНИЧЕНИЕ POSTGRESQL.
--  CREATE OR REPLACE VIEW умеет только ДОБАВЛЯТЬ колонки В КОНЕЦ списка.
--  Если вставить новую колонку в середину, база решит, что мы переименовываем
--  существующую, и откажется:
--      cannot change name of view column "subcategory_id" to "timer_started_at"
--  Поэтому timer_started_at стоит последним, хотя по смыслу его место
--  рядом с completed_at. Порядок колонок в представлении на код не влияет.
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
  round(coalesce(a.actual_minutes, 0)::numeric / 60 * coalesce(a.rate_snapshot, 0), 2) as value,
  a.timer_started_at   -- ← новая колонка, обязательно последней
from public.activities a
join public.subcategories s on s.id = a.subcategory_id
join public.categories    c on c.id = s.category_id;
