# V5 A–F TypeScript Fixes

## Date
2026-09-23

## Root causes
1. `src/app/manifest.ts` used `purpose: "any maskable"`, while the installed Next.js 14.2.5 manifest type only accepts one literal (`any`, `maskable`, `monochrome`, or `badge`).
2. `src/components/support/studyhub-assistant.tsx` parsed saved Ask AI coordinates as optional values and passed the partial object directly into state that requires both `left` and `top`.

## Fixes
- Manifest now declares separate 192px and 512px icon entries for `any` and `maskable` purposes.
- Ask AI persisted coordinates are narrowed and converted to a complete `{ left, top }` object before state assignment.

## Database
No migration required.

## Required local validation
Run:

```bash
npx tsc --noEmit
npm run build
```

Then continue with the normal project verification/audit scripts.
