-- ============================================================================
--  «Самолюбование»: ещё два вида — игры и друзья
--
--  Как и остальные виды этой категории, без ставки: время на себя
--  считается, но рыночной оценки не имеет.
-- ============================================================================

insert into public.subcategories (category_id, rate_id, name, sort_order)
select c.id, null, v.name, v.sort_order
from public.categories c
cross join (values
  ('Игры',   4),
  ('Друзья', 5)
) as v(name, sort_order)
where c.slug = 'selfcare'
  -- Повторный прогон миграции не должен плодить копии.
  and not exists (
    select 1 from public.subcategories s
    where s.category_id = c.id and s.name = v.name
  );
