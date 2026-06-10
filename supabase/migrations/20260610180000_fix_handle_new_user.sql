-- handle_new_user trigger'ına SECURITY DEFINER ekle.
-- profiles tablosunda RLS açık ama INSERT policy yoktu,
-- yeni kullanıcı kaydolduğunda "database error saving new user" hatası veriyordu.
-- SECURITY DEFINER trigger'ın RLS'i bypass etmesini sağlar (Supabase standart pattern).

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $func$
begin
  insert into public.profiles (id, role)
  values (new.id, 'buyer')
  on conflict (id) do nothing;
  return new;
end;
$func$;
