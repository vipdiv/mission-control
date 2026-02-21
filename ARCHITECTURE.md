\# System Architecture



This system consists of two independent local services:



1\) VinderPrime (Python Discord Bot)

2\) Mission Control (Next.js Dashboard)



They communicate via HTTP.



---



\# High-Level Flow



User → Discord → VinderPrime Bot → POST /api/tasks/bulk → Mission Control → Dashboard UI



---



\# Component Breakdown



\## VinderPrime (Python)



Purpose:

\- Ingest signals (RSS)

\- Generate task ideas

\- Send structured tasks to Mission Control



Key files:

\- main.py

\- mission\_control.py

\- discord\_setup.py

\- agents/

\- sources/



Output:

POST http://localhost:3000/api/tasks/bulk



Payload fields:

\- title

\- notes

\- createdAt (UTC)

\- createdAtLocal

\- vpDate (America/Chicago YYYY-MM-DD)

\- source="vinderprime"



---



\## Mission Control (Next.js)



Purpose:

\- Display tasks

\- Provide lane management

\- Provide metrics



Folder structure:

\- app/ → UI and API routes

\- app/api/tasks/route.ts → CRUD

\- app/api/tasks/bulk/route.ts → Bulk insert

\- lib/ → Shared store logic

\- data/ → Optional storage



Tasks must contain:

\- createdAt (UTC ISO)

\- vpDate (business-day key)



All "Today" and "This week" logic MUST use vpDate.



---



\# Timezone Model



Canonical timestamp:

createdAt (UTC)



Business-day key:

vpDate (YYYY-MM-DD, America/Chicago)



Rule:

Never derive business-day from UTC timestamp.



---



\# Current State



\- Local-only

\- In-memory storage

\- No persistent DB

\- No auth

\- Single-user system

