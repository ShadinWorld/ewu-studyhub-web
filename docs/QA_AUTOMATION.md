# EWU StudyHub Automated QA

## Main command

```powershell
npm run qa
```

This runs:

1. TypeScript check
2. Project verification
3. Production audit
4. Production build
5. Dependency vulnerability audit (informational)
6. AI documentation presence check
7. Migration numbering consistency check
8. Server-role key leak scan
9. Optional live public-route smoke tests
10. Optional Playwright browser tests

## Live smoke tests

Set the deployed URL before running:

```powershell
$env:QA_BASE_URL="https://your-production-domain.com"
npm run qa
```

## Browser automation

Install once:

```powershell
npm run qa:install-browser-tests
```

Then run:

```powershell
$env:QA_BASE_URL="https://your-production-domain.com"
npm run qa:e2e
```

The browser layer is intentionally conservative because EWU StudyHub uses Google authentication. Authenticated Student/Seller/Admin tests should use Playwright storage states rather than storing passwords in the repository.

Recommended storage-state files (never commit them):

- `qa-auth/student.json`
- `qa-auth/seller.json`
- `qa-auth/admin.json`

Extend `e2e/` with role-specific tests after creating those authenticated states.

## CI recommendation

Run `npm run qa` on every push. Treat TypeScript, build, verification, production-audit and failed browser smoke tests as blocking. Treat `npm audit` findings as a security warning that must be reviewed before public launch.

## GitHub automatic QA

A GitHub Actions workflow is included at `.github/workflows/qa.yml`.
It runs automatically on every push to `master` and every pull request targeting `master`.
The workflow installs dependencies and runs `npm run qa`.

This makes TypeScript, build, verification and production-audit regressions visible before a release.
