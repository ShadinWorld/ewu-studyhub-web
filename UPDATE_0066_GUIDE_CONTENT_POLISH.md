# EWU StudyHub — Update 0066 Guide Content Polish

## Scope
- A–Z overview and role-aware access map refreshed.
- Guest access summary added.
- Student guide access renamed to `authenticated_student` semantics; legacy `verified_student` remains accepted for old content.
- Help and Guide wording refreshed to natural Bangla with English UI terms.
- Repetition reduced between overview, contextual help and detailed sections.

## Database
- Migration: `supabase/migrations/0045_guide_content_polish_and_access.sql`
- It updates access constraints and published copy only; it does not delete historical data.

## Security
- Guide action availability is UX-level only. Existing protected routes/server actions remain authoritative.
- Guest remains unable to use authenticated Student/Seller/Admin actions.

## Manual QA
1. Guest opens User Guide: public overview visible; Purchase/Save/Request show Login requirement.
2. Google-authenticated non-seller Student opens Guide: Student capabilities are not locked; Seller capabilities remain locked.
3. Seller opens Guide: Student + Seller capabilities available.
4. Admin opens Guide: admin sections visible.
5. Info Help copy matches the current page and does not duplicate the full guide.
