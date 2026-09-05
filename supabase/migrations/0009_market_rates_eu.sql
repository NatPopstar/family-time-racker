-- ============================================================================
--  Ставки по европейскому рынку (евро)
--
--  Прежние цифры были прикидкой по лондонскому рынку в фунтах, потом
--  умноженной на курс. Теперь берём их из таблицы средних ставок,
--  колонка «EU Европа» — валюта настроек тоже евро, и множитель больше
--  никуда не вписывается.
--
--    Уборщица / клинер      21
--    Домработница           23
--    Частный повар          32
--    Няня                   24
--    Учитель математики     35
--    Учитель русского       32
--    Учитель английского    35   ← новая
--
--  Стирки и глажки в источнике нет: отдельной услугой их обычно
--  не продают, они входят в работу домработницы. Поэтому 23 — столько же.
-- ============================================================================

update public.market_rates set hourly_rate = 21, currency = 'EUR' where name = 'Cleaning';
update public.market_rates set hourly_rate = 23, currency = 'EUR' where name = 'Household Assistant';
update public.market_rates set hourly_rate = 23, currency = 'EUR' where name = 'Laundry & Ironing';
update public.market_rates set hourly_rate = 32, currency = 'EUR' where name = 'Private Chef';
update public.market_rates set hourly_rate = 24, currency = 'EUR' where name = 'Babysitter / Nanny';
update public.market_rates set hourly_rate = 35, currency = 'EUR' where name = 'Math Tutor';
update public.market_rates set hourly_rate = 32, currency = 'EUR' where name = 'Russian Tutor';

-- Зарплаты мужа (is_earnings) не трогаем: это не рыночная оценка труда,
-- а реальные деньги по договору.


-- ----------------------------------------------------------------------------
--  Английский с ребёнком — новый вид занятий.
--
--  «Английский язык» в категории «Учёба» — это СВОЯ учёба, она ничего
--  не стоит на рынке. Занятия С РЕБЁНКОМ — работа репетитора, и место
--  ей рядом с математикой и русским.
-- ----------------------------------------------------------------------------
insert into public.market_rates (name, hourly_rate, currency)
values ('English Tutor', 35, 'EUR')
on conflict (name) do update
  set hourly_rate = excluded.hourly_rate,
      currency    = excluded.currency;

insert into public.subcategories (category_id, rate_id, name, sort_order)
select c.id, r.id, 'Занятия английским', 5
from public.categories c
cross join public.market_rates r
where c.slug = 'childcare'
  and r.name = 'English Tutor'
  -- Миграцию могут прогнать повторно на чистой базе — вторая такая
  -- строка тогда не появится.
  and not exists (
    select 1 from public.subcategories s
    where s.category_id = c.id and s.name = 'Занятия английским'
  );


-- ----------------------------------------------------------------------------
--  Пересчёт уже записанного.
--
--  Обычно история НЕ переписывается: каждая запись хранит ставку на момент
--  выполнения, как чек из магазина, и смена настроек не должна задним
--  числом менять прошлые отчёты. Здесь исключение, и сделано оно по прямому
--  решению владельца данных: прежние ставки были черновыми, записей всего
--  за неделю, и лучше выпрямить их сразу, чем годами объяснять себе,
--  почему первая неделя считается по другим числам.
--
--  Такое место должно оставаться редким и всегда — отдельной миграцией
--  с объяснением, а не строчкой, спрятанной в коде приложения.
-- ----------------------------------------------------------------------------
update public.activities a
set rate_snapshot     = mr.hourly_rate,
    currency_snapshot = mr.currency
from public.subcategories s
join public.market_rates mr on mr.id = s.rate_id
where s.id = a.subcategory_id
  and a.rate_snapshot is not null;
