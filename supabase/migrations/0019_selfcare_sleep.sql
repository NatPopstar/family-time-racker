-- «Самолюбование»: добавлен сон. Без ставки, как остальные виды категории.
insert into public.subcategories (category_id, rate_id, name, sort_order)
select c.id, null, 'Сон', 6
from public.categories c
where c.slug = 'selfcare'
  and not exists (
    select 1 from public.subcategories s
    where s.category_id = c.id and s.name = 'Сон'
  );
