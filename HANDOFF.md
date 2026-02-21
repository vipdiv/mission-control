\# Mission Control — HANDOFF



\## What this is

A local Next.js dashboard that shows tasks (Backlog / In Progress / Review).

Tasks are created by a Discord bot (VinderPrime) via API calls.



\## How to run

1\) Install deps:

&nbsp;  npm install

2\) Run:

&nbsp;  npm run dev

3\) Open:

&nbsp;  http://localhost:3000



\## API endpoints used

\- GET  /api/tasks

\- POST /api/tasks

\- PATCH /api/tasks

\- DELETE /api/tasks

\- POST /api/tasks/bulk  (bot uses this)



\## The bug / failure

Timezone/date logic is wrong.

Tasks created late night Chicago time get stored with UTC timestamps and appear as “tomorrow”.

Example: 10:33 PM Chicago on Feb 20 becomes 04:33Z on Feb 21.



Current UI logic uses createdAt (UTC) for date grouping, which breaks "Today".



\## Required fix

Introduce a business-day key:

\- vpDate = YYYY-MM-DD in America/Chicago



Rules:

\- Every task MUST have vpDate.

\- UI “Today” and “This Week” MUST use vpDate (not createdAt).

\- /api/tasks/bulk MUST accept vpDate.

\- Manual tasks created from the UI must also get vpDate.



\## Acceptance criteria

\- A task created at 10:30 PM CT on 2026-02-20 must show vpDate=2026-02-20.

\- Mission Control should show “Today (Chicago)” correctly even after UTC rollover.

