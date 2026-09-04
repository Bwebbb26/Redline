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

## Pending, write these as they happen

These need entries before the build ends. Written the day decided, not reconstructed later.

- [ ] Store isolation: why routes never import a database client
- [ ] `period_end` ordering rather than sorting on the version label
- [ ] DELETE on a missing record: 404 or 204
- [ ] Prisma vs Drizzle
- [ ] Index choices, each justified against a specific query
- [ ] Sessions vs JWTs
- [ ] Fargate vs Lambda
- [ ] Embedding provider and dimension count
- [ ] Chunk strategy, **with the Week 6 measurement, not a rationale**
- [ ] Hybrid search vs pure vector
- [ ] Model tiering: what gets the small model and what escalates
- [ ] Workflow vs agent: the specific step that makes the path unknowable in advance
