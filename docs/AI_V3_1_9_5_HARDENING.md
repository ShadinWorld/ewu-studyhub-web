# EWU StudyHub AI 9.5 Hardening

## Scope
Seller AI metadata editing and Admin AI moderation/anomaly detection were hardened for the 9.5+ target.

## Seller AI
- 1-file, related-bundle, and mixed-bundle analysis remain supported.
- AI always generates a usable title, description and TOC.
- AI topics, tags, difficulty and estimated study time are now explicitly editable before submit.
- Original AI analysis is preserved separately from seller-approved final AI metadata.
- Course/department no longer block submission when AI has been run; the seller is not forced to restart just because the AI could not confidently map a course.

## Admin AI
- Deterministic moderation factors are calculated before Gemini review.
- Exact file-hash duplicate signals, semantic similarity candidates, reports, recent seller activity and seller approval rate are available to the review model.
- Evidence and factor snapshots are persisted for auditability.
- AI remains advisory; admin retains final moderation authority.

## Migration
`0046_ai_9_5_hardening.sql`

## Validation
- Run `npx tsc --noEmit`
- Run `npm run build`
- Run `npm run verify`
- Run `npm run production-audit`
- Manually test 1/2/3-file related and mixed uploads plus admin review.
