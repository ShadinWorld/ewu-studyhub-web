-- EWU StudyHub: allow a signed-in user to remove their own helpful vote.
alter table public.review_votes enable row level security;
drop policy if exists "users can delete own review vote" on public.review_votes;
create policy "users can delete own review vote"
on public.review_votes for delete
using (voter_id = auth.uid());
