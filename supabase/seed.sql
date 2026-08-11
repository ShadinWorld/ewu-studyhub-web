-- Run AFTER 0001-0005 migrations. Gives you enough data to test upload/search.

insert into universities (name, short_name, domain) values
  ('East West University', 'EWU', array['ewubd.edu', 'std.ewubd.edu'])
on conflict (short_name) do nothing;

insert into departments (university_id, name, short_name)
select id, dept.name, dept.short_name
from universities, (values
  ('Computer Science & Engineering', 'CSE'),
  ('Electrical & Electronic Engineering', 'EEE'),
  ('Business Administration', 'BBA'),
  ('English', 'ENG')
) as dept(name, short_name)
where universities.short_name = 'EWU'
on conflict (university_id, short_name) do nothing;

insert into courses (department_id, course_code, course_name)
select d.id, c.code, c.name
from departments d, (values
  ('CSE303', 'Database Systems'),
  ('CSE327', 'Software Engineering'),
  ('CSE423', 'Artificial Intelligence'),
  ('EEE101', 'Basic Electrical Circuits')
) as c(code, name)
where d.short_name = 'CSE' and c.code like 'CSE%'
   or d.short_name = 'EEE' and c.code like 'EEE%'
on conflict (department_id, course_code) do nothing;

insert into teachers (university_id, full_name, short_code)
select id, t.name, t.code
from universities, (values
  ('Dr. Rahman Ahmed', 'RAD'),
  ('Ms. Fatima Islam', 'FIM')
) as t(name, code)
where universities.short_name = 'EWU';

insert into badges (name, description) values
  ('verified_student', 'University email and student ID verified'),
  ('verified_seller', 'Completed seller onboarding'),
  ('top_seller', 'Among the highest-earning sellers this month'),
  ('top_contributor', 'Uploaded a high volume of well-rated resources'),
  ('trusted_contributor', 'Long-standing positive track record')
on conflict (name) do nothing;
