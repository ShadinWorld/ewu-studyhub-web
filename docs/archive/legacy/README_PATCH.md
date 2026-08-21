# EWU StudyHub — Navigation & Seller-Access Patch

Copy these files into your project at the SAME paths (overwrite existing ones):

## New files
- src/components/ui/dropdown-menu.tsx     (shadcn-style dropdown primitive, uses @radix-ui/react-dropdown-menu — already in package.json)
- src/components/ui/avatar.tsx            (shadcn-style avatar primitive, uses @radix-ui/react-avatar — already in package.json)
- src/components/layout/user-menu.tsx     (profile dropdown: name, email, role badge, Dashboard link, Become a seller link, Logout)
- src/app/dashboard/layout.tsx            (wraps all /dashboard/* pages with the Navbar — this is why you had no nav/logout button on the Seller Dashboard/Upload pages)

## Modified files
- src/components/layout/navbar.tsx        (fetches full_name/avatar_url/is_seller too, replaces the bare logout icon with <UserMenu />)
- src/app/dashboard/upload/page.tsx        (server-redirects to /dashboard/become-seller if profile.is_seller is false, instead of letting you reach the form and only failing on submit)

## Why the "no button to get back" bug happened
`src/app/layout.tsx` (root layout) never renders `<Navbar />` — it's only manually added inside src/app/page.tsx, src/app/search/page.tsx, and src/app/legal/layout.tsx. Every other route (/dashboard/*, /admin/*, /files/[id], /checkout/[fileId], (auth)/*) had ZERO navigation, which is why the Seller Dashboard screenshot had no way back and no logout option.

This patch fixes it for /dashboard/* via a dedicated layout. The same gap still exists on /admin, /files/[id], /checkout/[fileId] and the auth pages — say the word and I'll add layouts for those too.

## After copying
```
npm install pdf-lib   # also needed — see previous message, this package is in package.json but wasn't actually installed
npm run dev
```

## Note on pre-existing type errors
Running `tsc --noEmit` on the untouched project already shows ~70 errors like
`Property 'is_seller' does not exist on type 'never'` across admin/, files/, checkout/, dashboard/ etc.
This is a pre-existing issue with `src/types/database.types.ts` (the generic `Database` type's index
signature is fighting with the specific table types when chained through supabase-js). It predates
this patch and isn't something I introduced — happy to fix it separately if you want (it's usually a
one-line change to how the `Database` generic is declared/exported).
