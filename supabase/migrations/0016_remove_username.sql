-- EWU StudyHub — retire username completely.
create or replace function public.handle_new_user() returns trigger as $$
begin
  insert into public.profiles (id, full_name, phone_number)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', 'New User'), nullif(new.raw_user_meta_data ->> 'phone_number', ''))
  on conflict (id) do update set
    full_name = excluded.full_name,
    phone_number = coalesce(excluded.phone_number, public.profiles.phone_number);
  return new;
end;
$$ language plpgsql security definer;
alter table public.profiles drop column if exists username;
