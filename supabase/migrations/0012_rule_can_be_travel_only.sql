-- ============================================================================
--  Повторяющееся событие может состоять из одной дороги
--
--  «Отвезти Сашу в Show lab каждую субботу»: своего времени ноль, труд
--  весь в пути. Форма такую задачу уже принимала, а база — нет:
--
--      activities.planned_minutes      >= 0   ← можно ноль
--      recurring_rules.planned_minutes >  0   ← нельзя
--
--  Две таблицы про одно и то же разошлись, и это вылезло ошибкой
--  «violates check constraint» прямо в лицо человеку.
--
--  Теперь у правил то же условие, что у задач, плюс защита от пустого
--  правила: хоть что-то одно — своё время или дорога — должно быть.
--  Именно эту проверку делает и форма, так что они наконец совпадают.
--
--  Проверка написана по ИСХОДНЫМ колонкам, а не по travel_minutes:
--  та вычисляемая, и ссылаться на неё в CHECK нельзя.
-- ============================================================================

alter table public.recurring_rules
  drop constraint recurring_rules_planned_minutes_check;

alter table public.recurring_rules
  add constraint recurring_rules_planned_minutes_check
    check (planned_minutes >= 0);

alter table public.recurring_rules
  add constraint recurring_rules_not_empty
    check (planned_minutes > 0 or travel_one_way_minutes > 0);

comment on constraint recurring_rules_not_empty on public.recurring_rules is
  'Правило не может быть пустым: либо своё время, либо дорога.';
