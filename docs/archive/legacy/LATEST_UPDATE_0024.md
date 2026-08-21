# EWU StudyHub — Latest Update 0024

Implemented requested UX, access-control, admin, academic tools, seller and mobile/performance improvements.

## Access and authentication
- Google OAuth now derives the callback origin from forwarded request headers with `NEXT_PUBLIC_SITE_URL` override.
- OAuth callback safely honors a validated `next` route.
- Missing WhatsApp number gates protected areas while keeping Home and course browsing available.
- Protected navigation redirects to a profile-completion modal on `/account`.
- Login now shows a slow-connection message when Google OAuth takes unusually long.
- Facebook/Instagram-style in-app browser detection shows an "Open in browser" prompt.

## Seller flow
- Seller payout field is explicitly bKash-only.
- Seller approval uses a dedicated `seller_approved` notification type.
- Seller congratulations banner appears on the homepage until the notification is read.
- Sellers see a dedicated "Your latest uploads" section before recently-added resources.
- Seller-owned resources show `YOUR RESOURCE` and View/Manage actions instead of Buy.
- Database trigger prevents a seller from purchasing their own resource even if the client is bypassed.

## Admin
- Resource management now shows file size.
- Admin can remove a resource and its stored original/preview files.
- Users page now has role, seller-state, account-status and join-date filters and uses responsive cards instead of a horizontally scrolling table.
- Global admin success/error toast support is included for admin page redirects.
- Academic tools upload now supports PDF and image documents.

## Academic tools
- Academic Calendar: PDF or image.
- Final Exam Schedule: PDF or image.
- Student pages show the correct document type and open the uploaded asset.

## Performance
- Added global and major-route loading skeletons.
- Public course browsing avoids the profile database lookup in middleware for faster navigation.
- Navbar profile and unread-notification queries run in parallel.
- Homepage/resource sections use vertical responsive grids instead of horizontal scrollers.
- Added database indexes for common resource/user queries.

## Removed
- Prerequisite Checker.
- Grade Calculator.
- Historical prerequisite extraction/Blue Book prerequisite code is not part of the current application.
