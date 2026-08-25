EWU StudyHub AI V2 Type/Schema Alignment Patch

THIS IS A PATCH ZIP, NOT A FULL-PROJECT REPLACEMENT.
Copy/merge the files into your current EWU StudyHub project. Do NOT delete existing local files that are not present here (especially Help/Guide files).

Required Supabase migration:
supabase/migrations/0044_type_and_help_schema_alignment.sql

Then run:
npx tsc --noEmit
npm run build
npm run verify
npm run production-audit

Fixes the TypeScript error groups reported after AI V2:
- Help/Guide database type drift
- AI structured result typing
- Gemini file-upload body typing
- AI semantic-search RPC typing
- preview RPC typing
- shared upload constants
- PDF preview prop compatibility
- admin moderation score expression
