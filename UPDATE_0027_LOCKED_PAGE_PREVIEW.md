# EWU StudyHub — Update 0027: Locked-Page Preview

This update refines the paid-resource preview behavior.

## Paid multi-page PDFs
- The preview PDF keeps the full page count.
- First 30% of pages are real/readable.
- Remaining pages are replaced with clean locked placeholder pages.
- Locked pages show a vector lock icon, a locked-page message, page number, and a visual "Purchase to unlock" CTA.
- No watermark is added.
- The real clickable Purchase button remains in the StudyHub viewer UI and goes to the resource checkout page.

## Single-page paid PDFs
- The page remains visible as a partial preview.
- The lower portion is covered by a clean locked area with a lock icon and purchase CTA.

## Single-image paid resources
- The top portion remains visible.
- The lower portion is covered by a clean locked area with lock icon, message, and purchase CTA.

## Access protection
The original paid resource remains in the private storage bucket. The public preview contains only the allowed preview content and generated lock placeholders.
