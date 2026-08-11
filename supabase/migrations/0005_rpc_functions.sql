-- Atomic counters — avoid race conditions from read-then-write in application code.

create or replace function increment_download_count(p_file_id uuid) returns void as $$
begin
  update files set downloads_count = downloads_count + 1 where id = p_file_id;
  insert into file_daily_stats (file_id, date, downloads)
    values (p_file_id, current_date, 1)
  on conflict (file_id, date) do update set downloads = file_daily_stats.downloads + 1;
end;
$$ language plpgsql security definer;

create or replace function increment_view_count(p_file_id uuid) returns void as $$
begin
  update files set views_count = views_count + 1 where id = p_file_id;
  insert into file_daily_stats (file_id, date, views)
    values (p_file_id, current_date, 1)
  on conflict (file_id, date) do update set views = file_daily_stats.views + 1;
end;
$$ language plpgsql security definer;

-- Recompute a file's average_rating/reviews_count after a review is inserted/updated.
create or replace function recompute_file_rating(p_file_id uuid) returns void as $$
begin
  update files f set
    average_rating = coalesce((select round(avg(rating)::numeric, 1) from reviews where file_id = p_file_id), 0),
    reviews_count = (select count(*) from reviews where file_id = p_file_id)
  where f.id = p_file_id;
end;
$$ language plpgsql security definer;

create or replace function trg_recompute_rating() returns trigger as $$
begin
  perform recompute_file_rating(coalesce(new.file_id, old.file_id));
  return coalesce(new, old);
end;
$$ language plpgsql;

create trigger on_review_change
  after insert or update or delete on reviews
  for each row execute function trg_recompute_rating();
