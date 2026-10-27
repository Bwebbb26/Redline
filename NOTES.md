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

**Negative cases — the system should refuse these, not answer them.**

4. Compare BlackRock's Q2 2025 10-Q against its prior quarter.
   → no counterpart in the corpus; expect a clear 4xx, not an empty diff.
5. What changed between BlackRock's 10-Q and its FY2025 10-K?
   → form-type mismatch; refuse rather than align across incompatible documents.
6. What does Constellation's FY2026 10-K say about nuclear outages?
   → not in the corpus; expect "not in these documents," never a guess.

**Later, once peer comparison exists.**

7. How does Constellation's FY2025 risk-factor language on regulatory exposure
   compare to Exelon's?

## What Express takes off my hands

Express owns the HTTP plumbing and dispatch loop: it receives a request, walks through the registered middleware and routes in order, and sends the response or forwards an error. That means I do not have to build the server loop, manually inspect every URL and method, or repeat shared request handling. My code owns the route handlers, validation, database work, and document-comparison logic.

## What is still fuzzy

The parts I want to revisit are the boundaries between the Express layer and the application layer, how a request moves through middleware into a handler, and how errors travel through that chain.

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

**In short:** the create endpoint validates against a schema that excludes
server-owned fields, so a client can't set its own id or ownership. The stored type
is the request type plus what the server generates.

## Config loading and ES module import order

`config.ts` reads `process.env` at **import time**, so it fails fast — but that
creates an ordering dependency.

ES imports evaluate top to bottom. The code uses `import "dotenv/config"` as the
first line of `config.ts`, in the same module that reads `process.env`. Keeping
the environment-loading import and the config read together keeps the ordering
hazard in one file.

**Lesson:** module-scope side effects create invisible ordering constraints between
files. Keep them inside one module where the order is visible, or remove them at
the platform level with `--env-file`; never rely on a comment asking people not to reorder
imports.

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

---

# SQL notes

Decisions and gotchas from designing the schema. For keyword reference, sqlbolt.com
covers it.

## Clause order is not written order

```
FROM / JOIN  →  WHERE  →  GROUP BY  →  HAVING  →  SELECT  →  ORDER BY  →  LIMIT
```

This explains most early confusion. A `SELECT` alias is unusable in `WHERE`, which
has already been evaluated, but is fine in `ORDER BY`. `WHERE` filters rows before
grouping and `HAVING` filters groups after, which is why a condition on `COUNT(*)`
can only go in `HAVING`.

## NULL is unknown, not empty

- `NULL = NULL` evaluates to `NULL`, not true. `IS NULL` is the only valid test.
- `COUNT(*)` counts rows; `COUNT(column)` counts non-NULL values. Different answers.
- `x NOT IN (1, NULL)` is never true. Use `NOT EXISTS`. This one fails silently
  rather than erroring, which makes it worth remembering.

## Two joins worth knowing by name

**Anti-join** — `LEFT JOIN ... WHERE right.id IS NULL` returns rows with no
counterpart. This is the shape of the whole project: risk factors present in
FY2024 and absent from FY2025, and the unpaired 10-Q with no sibling year.

**Semi-join** — `EXISTS`. Tests existence without multiplying rows the way a join
does.

A join returning more rows than the left table holds means the join key is not
unique on the right side. That is a modeling bug surfacing as a query result.

## Window functions solve the core problem

`LAG(...) OVER (PARTITION BY document_id ORDER BY period_end)` gives each version a
pointer to the previous version of the same document — the comparison this project
rests on, in one clause, without collapsing rows the way `GROUP BY` would. Not
covered by SQLBolt.

## Schema decisions

The unique constraint goes on `(document_id, period_end)`, not on `version_label`.
A document can only have one filing per period end, and labels are strings —
string-sorting them breaks the moment a filer has a non-calendar fiscal year, which
Franklin does at September 30.

`chunks` hangs off a `document_version`, never off a `document`. A chunk only means
something in the context of one specific filing.

Still open: the `ON DELETE` behavior when a `documents` row is removed — cascade,
restrict, or set null. This is the SQL-level counterpart to the 204-vs-404
reasoning above.

## An index is a bet on read volume

It costs storage and slows every write touching the column. Three facts decide
whether one is justified:

- Postgres auto-indexes primary keys and `UNIQUE` constraints, but **not** foreign
  keys, so join columns stay unindexed until declared. The most commonly missed index.
- Composite indexes are only usable left to right — the leftmost-prefix rule.
- Low-cardinality columns barely benefit. If the query an index serves cannot be
  named, the index should not exist.

## Parameterized queries, always

Placeholders (`$1`, `$2` in node-postgres) with values passed separately, so the
driver never parses them as SQL. Never template literals or concatenation. Zod
validates shape at the HTTP boundary and parameterization defends the SQL boundary —
different boundaries, neither substitutes for the other.

## Migrations

Forward-only: a migration that has run is never edited, and mistakes are corrected
by a new one. The test is that dropping the database and replaying every migration
reproduces the schema exactly, otherwise the schema only exists on one laptop. The
seed script needs to be re-runnable, which is what `ON CONFLICT DO NOTHING` is for.

## N+1

One query for a list, then one more per row. Turn on query logging, hit the list
endpoint, count the lines — if the count scales with the number of rows, fix it with
a join or an `IN`. `EXPLAIN ANALYZE` runs the query and reports real timings;
`EXPLAIN` alone only shows the intended plan.

## Socket vs TCP: why psql needed no password

`psql` run inside the container connected through a Unix socket, which the Postgres
image trusts without a password; the app connects over TCP from outside the container,
which requires one. Postgres chooses the authentication rule per connection in
`pg_hba.conf`, based on how the connection arrives and where it comes from. RDS only
offers the TCP route — password and SSL every time — so the app's path is the one
that matters.

## One pool per process

The pool is created once at module scope and shared, so connections are reused and
capped at the pool's `max` (10 by default). A new pool per request would open a fresh
connection — and a Postgres backend process — on every call, leak them if never ended,
and fail outright once `max_connections` (100 by default) is exhausted. On Lambda each
instance holds its own pool, so `max` has to be sized down before deploying there.

## Swapping the array for Postgres: what leaked out of the store

The store's contract (names, inputs, outputs) survived the move to Postgres unchanged,
but its timing did not. The array answered instantly; a database answers over the
network, so every store function became `async` and the routes had to `await` them.
That was the only change outside `src/store/`, and no SQL or database knowledge
leaked into the routes. The lesson: the in-memory store's contract hid an assumption
that answers arrive immediately, and designing the store as async from the start would
have kept the routes untouched.

One behavior change is intentional: posting a filing that already exists now returns
`409` instead of a second `201`, because the database enforces
`UNIQUE (document_id, period_end)` and the array never could. Deleting a version that a
comparison depends on also returns `409` (`ON DELETE RESTRICT`, SQLSTATE `23001`).

Gotcha: a missing `await` hands back a Promise. It serialized to `{}`, and in the
get-by-id route it is always truthy, so the 404 could never fire. Typecheck passed both
times.
