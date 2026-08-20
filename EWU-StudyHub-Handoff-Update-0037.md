# EWU StudyHub Handoff Update 0037 — AI Continuity / Confirmation Rules

## Completed in this update
- Added root-level `00_AI_START_HERE.md` as the first-read continuity instruction for new AI sessions.
- Documented the mandatory rule: analyze/inspect first, **wait for explicit user confirmation**, then implement.
- Documented the mandatory rule: **update the handoff after every approved implementation**.
- Added source-of-truth priority and preservation rules for future sessions.
- Added a README pointer so the rule is visible even when the AI opens the normal project documentation first.

## No product/code feature change
This update does not intentionally change StudyHub product behavior, UI, database schema, or security logic. It only improves AI-session continuity inside the project ZIP.

## Required future workflow
`00_AI_START_HERE.md` → latest handoff/context → inspect code/schema → propose → explicit confirmation → implement → validate → update handoff → package ZIP.

## Note
The user may move between ChatGPT accounts because of usage/free-plan limits. The ZIP is therefore intended to carry the project's working rules and state so the user does not have to repeat these instructions manually.
