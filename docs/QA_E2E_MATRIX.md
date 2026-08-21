# EWU StudyHub QA / E2E Matrix

| Area | Guest | Student | Seller | Admin |
|---|---|---|---|---|
| Browse/search | ✓ | ✓ | ✓ | ✓ |
| Login/signup | ✓ | ✓ | ✓ | ✓ |
| Course auto-fill | ✓ | ✓ | ✓ | ✓ |
| Free resource view | ✓ | ✓ | ✓ | ✓ |
| Paid preview | ✓ | ✓ | ✓ | ✓ |
| Paid original | ✗ | after purchase | owner access | owner/admin access |
| Upload | ✗ | account/seller flow | ✓ | ✓ |
| Seller verification | ✗ | ✓ | status | admin review |
| Purchase | ✗ | ✓ | own resource blocked | admin review |
| Payout | ✗ | ✗ | ✓ | admin review |
| Requests | ✗ | ✓ | ✓ | queue |
| Notifications | limited | ✓ | ✓ | ✓ |
| Giant Hero targeting | ✓ | role-targeted | role-targeted | preview/control |

## Device checks
- 360×800
- 390×844
- 412×915
- tablet width
- desktop

## Regression focus
1. Back navigation does not loop.
2. Own resource never shows Buy.
3. Guest login returns to intended protected route.
4. Paid original never leaks before authorization.
5. Admin-only homepage control tables are not publicly readable.
6. Request ETA defaults to 6h and respects admin overrides.
