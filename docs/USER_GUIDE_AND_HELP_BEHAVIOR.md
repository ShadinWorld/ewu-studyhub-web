# User Guide & Help Behavior — Guest and Student Access

## Current behavior

- The User Guide is public-readable. A user does not need to log in just to understand EWU StudyHub.
- Anonymous visitors open the same general User Guide in `guest` mode. They can read public General/Student/Seller sections and the A–Z overview, but action buttons that require an account offer `Login করুন`.
- After Google login, any authenticated non-seller/non-admin account is treated as `Student` for the Guide. Student Guide actions are therefore not blocked by `student_id_verification_status`.
- Seller and Admin access in the Guide remains role-aware. Guide visibility/actions are educational only; actual server-side route/action authorization remains authoritative.

## Rationale

The database profile trigger already creates Google-authenticated users with `role = student`. A separate Student ID verification state is used for seller/verification workflows and should not make ordinary Student Guide navigation appear locked.

## UI

The `User Guide` trigger is available from the navbar for logged-in and logged-out users. On small screens it uses the compact book icon treatment; on larger screens it shows the `User Guide` label.

## Follow-up Fix 0064 — Guest viewport behavior
- User Guide is rendered through a React portal into `document.body` so the sticky/backdrop-blur Navbar cannot clip or reposition the viewport-level dialog.
- The dialog uses `96dvh` on mobile and locks background scrolling until closed.
- The same portal strategy is used for the guest/authentication locked-action dialog.

