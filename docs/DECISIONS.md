# Decisions

Design decisions and the reasoning behind them, written the day they are made.

Four fields each. The fourth is the point: if I cannot name what would change my mind, I adopted a
decision rather than made one.

---

## Eval scope: verified on one domain, general by design

**Chose:** a frozen ten-filing SEC corpus as the eval set, plus one document-agnostic check that runs
regardless of what a user uploads: does every cited passage actually resolve to text in the source.

**Alternative:** eval sets per document class, so contracts, FERC rules, and policy documents each get
their own scored fixtures before the system claims to handle them.

**Gave up:** any evidence that quality holds outside SEC filings. The system is domain agnostic by
construction, the pipeline has no knowledge of filers, form types, or fiscal years, but "it should
work" is not the same as "it was measured." Right now I can prove behavior on one document class.

**Would change my mind:** the first time someone points it at a real non-filing corpus. At that point
a second eval set is the price of claiming support for that domain. If citation resolution alone
turns out to catch most of the failures across document types, the per-domain sets matter less than
I currently think, and that itself is worth measuring.

**Note on why the corpus is frozen at all.** The system is non-deterministic, so if both the prompt
and the inputs can move, a dropped eval score is unattributable. Freezing the inputs makes every
change attributable to the code. The corpus is a test fixture, not a limit on what the service
accepts. Users bring their own documents.

---

## Delete behavior

**Chose:** return `204 No Content` when a document exists and is removed, and
return `404 Not Found` when the requested document does not exist at the time
of the request.

**Why:** the caller targeted a specific ID, so `404` makes a missing document
visible as a possible typo, stale reference, or earlier deletion. Returning
`204` for a missing document would also be defensible because the desired final
state, "the document does not exist," is already true and DELETE is idempotent.
However, silently returning success could make the caller believe it deleted an
existing document. The store represents absence as `undefined`, while the
route translates that result into the HTTP `404` response.

---

## Zod for API contracts

**Chose:** Zod schemas for request bodies and route parameters, with TypeScript
types inferred from those schemas.

**Why:** TypeScript checks code at compile time, but it cannot validate data
sent to a running API. Zod makes the boundary executable: incoming data can be
checked at runtime, invalid requests can be rejected consistently, and the
schema can generate the corresponding TypeScript type so the two contracts do
not drift apart. The create schema also excludes the server-owned `id`, so
clients cannot provide or overwrite it.

**Alternative:** hand-written TypeScript types alone are simpler, but they do
not protect the application from malformed or untrusted HTTP input.

**Would change my mind:** if the API became entirely internal with trusted,
compile-time-controlled callers, or if validation requirements grew beyond
what Zod expresses clearly, another runtime contract library could be better.

## Database unavailable at startup

**Chose:** start the API even when Postgres is unreachable. `/health` reports process
liveness only and never queries the database; requests that need the database fail
through the error handler when it is down.

**Why:** a missing environment variable is a configuration bug that never fixes itself,
so it fails at boot. An unreachable database is a runtime condition that often heals on
its own, through restarts, failover, or a network blip. Killing the process over it turns
a transient problem into an outage. On Lambda, a boot-time check would also add a round
trip to every cold start and fail cold starts during an RDS failover, and the Lambda Web
Adapter's readiness check needs `/health` to reflect the app, not its dependencies.
Database errors still surface as logged, shaped error responses.

**Alternative:** run a connectivity query before `listen()` and exit if it fails. That is
the better fit for a long-running server under an orchestrator with separate liveness and
readiness probes, where a crash loop is visible and traffic is held until the app is ready.

**Would change my mind:** moving off Lambda to ECS or Kubernetes, where I would add a
separate `/health/ready` that checks the database. Or a misconfigured credential
reaching production unnoticed, which would justify a database-touching post-deploy
smoke test as a hard gate.

---

## ORM: Drizzle over Prisma

**Chose:** Drizzle, because its queries read like SQL, so it reinforces the SQL I am
learning instead of hiding it.

**Why:** migrations stay plain SQL I write by hand, it runs on the existing `pg` pool so
only the store layer changes, and it has no separate engine to bloat the Lambda image.

**Alternative:** Prisma, more widely adopted with a friendlier API, but it abstracts SQL
away and manages its own connections.

**Would change my mind:** a team already standardized on Prisma.
