## Demo questions

**Primary — the one I answer on stage.**
What risk-factor language did Constellation soften or remove between its FY2024
and FY2025 10-K, and which of those changes are material?

**Eval categories — narrower, mechanically checkable.**

1. Which of T. Rowe Price's stated obligations weakened between FY2024 and FY2025 —
   language that moved from "will" or "shall" to "may" or "expects to"?
2. Which risk factors present in Exelon's FY2024 10-K are absent entirely from FY2025?
3. What changed in Franklin Resources' risk factors between FY2024 and FY2025?
   (Franklin's fiscal year ends Sept 30 — this one exercises the non-calendar path.)

**Negative cases — the system should refuse these, not answer them.** 4. Compare BlackRock's Q2 2025 10-Q against its prior quarter.
→ no counterpart in the corpus; expect a clear 4xx, not an empty diff. 5. What changed between BlackRock's 10-Q and its FY2025 10-K?
→ form-type mismatch; refuse rather than align across incompatible documents. 6. What does Constellation's FY2026 10-K say about nuclear outages?
→ not in the corpus; expect "not in these documents," never a guess.

**Later, once peer comparison exists.** 7. How does Constellation's FY2025 risk-factor language on regulatory exposure
compare to Exelon's?## Express.js

Express is a lightweight web framework for Node.js that makes it easy to build APIs and backend services without a lot of boilerplate. Switching from a more manual HTML-style switch setup to Express statements cuts down on code and keeps the logic much cleaner and easier to follow.

It’s especially useful for REST APIs, internal tools, auth flows, and backend services that need to handle HTTP requests, validate data, and connect to databases or AI tools. It does well when you want to move fast, keep routes organized, and use middleware to handle repeated pieces of logic without overcomplicating the app.

## What Express takes off my hands

Express owns the HTTP plumbing and dispatch loop: it receives a request, walks through the registered middleware and routes in order, and sends the response or forwards an error. That means I do not have to build the server loop, manually inspect every URL and method, or repeat shared request handling. My code owns the route handlers, validation, database work, and document-comparison logic. In this project, that Express wiring is still to be implemented; `src/app.ts` and `src/index.ts` are currently empty.

## What is still fuzzy

The parts I would reread before an interview are the boundaries between the Express layer and the application layer, how a request moves through middleware into a handler, and how errors travel through that chain. The project also still has open implementation work around database persistence, document ingestion, version grouping, section alignment, retrieval, and the agent workflow. The intended flow is clear, but those pieces are not fully wired yet.

## Corpus shape

`docs/corpus.json` is a manifest of filing versions, not a list of logical documents. The top-level key is therefore `versions`. A seed script can group versions by a stable identity such as filer and document type, insert one row into `documents`, and then insert each manifest entry into `document_versions` linked to that document.

---

## Client-supplied vs server-generated fields

A resource's fields split into two groups, and the split is a design decision
with security consequences — not just bookkeeping.

**Client-supplied** — the client sends them, the server validates them:
`filer`, `cik`, `form`, `periodEnd`, `sourceUrl`.

**Server-generated** — the server owns them, the client can never set them:
`id`, `createdAt`, `updatedAt`. Later: `ownerId`, `role`, anything about
permissions or state the server is authoritative over.

**Why it matters.** If a client can set `id`, it can collide with an existing
record or overwrite one by guessing. Scale that up and the same flaw lets a
client set `ownerId` to someone else's account, or `role: "admin"` on itself.
The vulnerability class is called **mass assignment** (or over-posting) — it
happens when a handler spreads the whole request body into the stored object
and trusts whatever the client sent. It's in the OWASP API Security Top 10.

**The rule that prevents it:** the request schema and the response schema are
different types. Validate the incoming body against a schema that _does not
contain_ the server-owned fields, so an extra `id` in the payload is stripped
or rejected rather than silently honored. Never build the stored record by
spreading `req.body` — construct it explicitly from validated fields.

**Interview phrasing:** "My create endpoint validates against a schema that
excludes server-owned fields, so a client can't set its own id or ownership.
The response type is the request type plus what the server generates."

## Config loading and ES module import order

`config.ts` reads `process.env` at **import time**, so it fails fast — but that
creates an ordering dependency.

ES imports evaluate top to bottom. If I load env with `import 'dotenv/config'` in
`index.ts`, it must come _before_ the config import. Put it second and config runs
against an empty `process.env`, silently falls back to defaults, and the app starts
anyway — ignoring my `.env`. Nothing marks that line as order-sensitive, so an
organize-imports command breaks it without touching logic.

I used `node --env-file=.env` instead: the environment is populated before any of my
code evaluates, so the ordering problem can't exist.

**Lesson:** module-scope side effects create invisible ordering constraints between
files. Enforce them at the platform level, not with a comment asking people not to
reorder imports.

## Delete behavior

For `DELETE /documents/:id`, return `204 No Content` when the document exists
and is removed. Return `404 Not Found` when the requested document does not
exist at the time of the request.

I chose `404` for a missing document because the caller targeted a specific
ID. A missing document may indicate a mistyped ID, stale data, or an earlier
deletion. Returning `404` makes that situation visible so the caller can
double-check the ID or investigate why it is already gone. Returning `204`
would also be defensible because the desired final state, "the document does
not exist," is already true, and DELETE is idempotent. However, silently
returning success could make the caller believe it deleted an existing
document. The store should represent absence as `undefined`, while the route
translates that result into the HTTP `404` response.
