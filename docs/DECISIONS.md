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
