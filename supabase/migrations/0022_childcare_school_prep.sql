-- ============================================================================
--  «Ребёнок»: подготовка ребёнка к школе
--
--  Ставка — няня (£24/час), как просила Наталья. Это не репетиторство
--  по предмету: собрать, проводить до готовности к учебному дню,
--  проследить за формой и портфелем — работа того же рода,
--  что и «Няня / присмотр».
-- ============================================================================

insert into public.subcategories (category_id, rate_id, name, sort_order)
select c.id, r.id, 'Подготовка ребёнка к школе', 6
from public.categories c
cross join public.market_rates r
where c.slug = 'childcare'
  and r.name = 'Babysitter / Nanny'
  and not exists (
    select 1 from public.subcategories s
    where s.category_id = c.id and s.name = 'Подготовка ребёнка к школе'
  );
