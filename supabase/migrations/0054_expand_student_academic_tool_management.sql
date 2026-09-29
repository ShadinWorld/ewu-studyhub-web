-- EWU StudyHub: expose all current /tools built-ins through the admin-managed catalog.
-- No new tables are required; existing tool-specific data is managed in its own tables/pages.

insert into public.student_tool_catalog
  (slug, title, description, href, icon, is_active, is_builtin, display_order)
values
  ('grade-calculator', 'Grade Calculator', 'Estimate course grade from marks and component weights.', '/tools/grade-calculator', 'Calculator', true, true, 50),
  ('prerequisite-checker', 'Prerequisite Checker', 'See which courses should be completed before another course.', '/tools/prerequisite-checker', 'SearchCheck', true, true, 60)
on conflict (slug) do update
set title = excluded.title,
    description = excluded.description,
    href = excluded.href,
    icon = excluded.icon,
    is_builtin = true,
    display_order = excluded.display_order;
