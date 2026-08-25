# EWU StudyHub AI V2 QA

## Scope
Conversational StudyHub resource search with Bangla/Banglish intent parsing, follow-up search state, hybrid exact/semantic ranking, course discovery, popularity sorting and no-result fallback.

## Pre-requisites
- Apply `0042_ai_resource_intelligence.sql`.
- Apply `0043_ai_conversational_search_v2.sql`.
- Set `GEMINI_API_KEY` server-side.
- On Admin → Resources, click **Index AI Search** repeatedly until the index reports up to date.

## Manual matrix

| Test | Input | Expected |
|---|---|---|
| Course discovery | `CSE303 ki ki ache` | Resources restricted to CSE303; active course state shown |
| Follow-up popularity | `konta beshi popular` | Same CSE303 context preserved; results sorted by popularity metrics |
| Topic → course discovery | `php ache kon course a` | Course cards showing only courses with matching published resources |
| Price refinement | `free only` | Same search state with free resources only |
| Semester refinement | `Spring 2026` | Same state refined to Spring 2026 |
| Rating refinement | `rating 4+` | Minimum rating filter applied |
| Cheapest sort | `cheap notes` | Results sorted by price |
| Newest sort | `notun gula dekhaw` | Results sorted by publish date |
| No exact result | rare topic/course | Closest/fallback behavior or Resource Request link |
| Hallucination guard | invented course/resource | No fabricated resource IDs or links |
| Visibility guard | draft/rejected resource | Never returned |
| Legacy V1 data | old AI analyses | Admin reindex fills embeddings |

## Regression checks
- Exact course-code queries should not be polluted by generic keyword matches.
- Follow-up queries should preserve prior filters.
- Course-discovery questions should not return resource cards as the primary answer.
- Popularity uses actual platform counters, not model guesses.
- Search results are always fetched from server-side published resources.
- AI search must still work with semantic indexing temporarily unavailable; lexical/structured fallback is expected.
