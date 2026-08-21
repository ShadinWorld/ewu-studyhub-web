# Upload form — Department/Course linking + search

## File changed
- src/components/upload/upload-form.tsx (full replacement — copy over your existing file)

## What changed
1. **Department is now the source of truth.** The Course dropdown only
   shows courses belonging to the currently selected Department, and is
   disabled with a "Select department first" placeholder until you pick one.
   If you change Department after already picking a Course that no longer
   belongs to it, the Course selection is cleared automatically — no more
   mismatched Department/Course pairs.
2. **Layout:** Department is now on the left, Course on the right (was
   reversed before). Category moved to its own full-width row above the
   new search box.
3. **New "Find your course" search box** above the Department/Course row.
   Type a course code (spaces ignored, e.g. "cse303" matches "CSE 303")
   or part of the course name — a dropdown of up to 8 matches appears.
   Clicking one **auto-selects both the Course and its Department**
   below, and fills the search box with the picked course for
   confirmation. An "×" button clears the search/selection.

No backend/API changes needed — the same `departmentId` and `courseId`
form fields are still submitted, just kept in sync client-side now.

## How to apply
Copy `src/components/upload/upload-form.tsx` over your existing file at
the same path, then restart `npm run dev`.
