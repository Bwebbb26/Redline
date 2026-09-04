# Redline

Feed it two versions of a long governing document and it reports **what changed, what was quietly softened or removed, and whether it matters**, citing the exact passage on both sides.

> **Build status: week 2 of an 8-week build.** Running today: an Express and TypeScript API with config, a health endpoint, and the demo corpus committed. Persistence, retrieval, the diff engine, evals, and the agent are scheduled below and get documented as they land. Everything in this README marked "planned" is not written yet.

---

## The problem

Long governing documents get revised constantly. Annual filings, regulatory rules, terms of service, insurance policies, vendor contracts. The revisions matter and finding them is manual work.

Keyword search does not solve this. The changes that matter most are rewordings, softened hedges, and quietly dropped paragraphs, cases where the vocabulary barely moves but the meaning does. Someone ends up reading two hundred pages side by side to find the four sentences that changed.

This service does that comparison and reports only what is material, with the source text from both versions attached so the answer can be verified rather than trusted.

**The demo question it has to answer:** what risk-factor language did a filer soften between its 2024 and 2025 10-K, and does it matter?

### Why this is not another PDF chatbot

Comparing two versions of a long document is a harder retrieval problem than answering a question about one. You are aligning corresponding sections across two documents rather than fetching the best-matching passage, and sections that align to nothing are themselves a finding.

It also takes several steps rather than one model call: locate both versions, align sections, compare, judge materiality, summarize. That is what makes an agent the right shape here instead of a single call wearing a costume.

---

## Demo corpus

Ten SEC 10-K filings from five issuers, each with both 2024 and 2025, in two sectors: Constellation and Exelon in energy, Franklin Resources, T. Rowe Price, and BlackRock in asset management. One unpaired BlackRock 10-Q is included deliberately as a negative fixture, to test form-type filtering and the no-counterpart path.

The corpus is **frozen on purpose**. Evaluation needs a fixed input set, otherwise a failing eval is ambiguous: did the prompt regress, or did the data change? The pipeline itself has no knowledge of filing types, filers, or years. SEC filings are the demo because they are public and free. The same system points at FERC and NERC rules, CMS and HIPAA guidance, contracts, or policy documents.

Manifest with source URLs and cover-page dates: [`docs/corpus.json`](docs/corpus.json).

---

## Where the build is

| Phase | Scope                                                          | Status      |
| ----- | -------------------------------------------------------------- | ----------- |
| Setup | Repo, TypeScript, Express, corpus, manifest                    | Done        |
| 1     | REST API: documents resource, Zod validation, error handling   | In progress |
| 2     | PostgreSQL, schema with document versions, migrations, seed    | Planned     |
| 3     | Auth, pagination, Jest and Supertest suite, structured logging | Planned     |
| 4     | Docker, AWS deploy, GitHub Actions CI/CD                       | Planned     |
| 5     | Claude API, streaming, versioned prompts, cost logging         | Planned     |
| 6     | Ingestion, pgvector embeddings, section alignment, diff engine | Planned     |
| 7     | Eval set scored in CI, citation checking, injection guardrails | Planned     |
| 8     | Agent loop, MCP server, demo                                   | Planned     |

Releases are tagged weekly. `0.x` means the interface may still change.

---

## Running it today

```bash
nvm use
npm install
cp .env.example .env
npm run dev
```

```bash
curl -i localhost:3000/health
```

No database or API key is needed yet. Both arrive in phases 2 and 5, and this section gets updated when they do.

| Command             | What it does                  |
| ------------------- | ----------------------------- |
| `npm run dev`       | Start with hot reload         |
| `npm run build`     | Compile TypeScript to `dist/` |
| `npm run typecheck` | Type check without emitting   |

### API

| Method   | Path             | Status  |
| -------- | ---------------- | ------- |
| `GET`    | `/health`        | Live    |
| `POST`   | `/documents`     | Phase 1 |
| `GET`    | `/documents`     | Phase 1 |
| `GET`    | `/documents/:id` | Phase 1 |
| `DELETE` | `/documents/:id` | Phase 1 |

---

## Intended architecture

This is the design the build is working toward, not what runs today.

```mermaid
flowchart LR
    A[Client / MCP host] --> B[REST API + MCP server]
    B --> C[(PostgreSQL + pgvector)]
    B --> D[S3 document store]
    B --> E[Agent orchestration]
    E --> F[Model provider]
    E --> G[Tools: search, compare, summarize]
    G --> C
```

Documents are ingested with their structure intact, so sections survive as first-class records rather than collapsing into undifferentiated text. Two versions of the same document are aligned section by section, matching on heading text first and falling back to embedding similarity when a section was renamed.

A cheap text diff finds candidate changes, and only those candidates are sent to a model for a materiality judgment. That ordering keeps cost proportional to what actually changed rather than to document length.

**Planned stack:** PostgreSQL with pgvector, S3, Claude API behind a provider-agnostic interface, Model Context Protocol server, Jest and Supertest, promptfoo evals in CI, Docker, AWS, GitHub Actions, Pino.
**In use today:** Node.js (see `.nvmrc`), TypeScript, ES modules, Express 5, Zod.

---

## Design notes

Decisions and the reasoning behind them, recorded as they are made.

**Sections are first-class.** Chunking a filing into fixed-size windows destroys the structure that makes cross-version alignment possible. Sections get extracted during ingestion and chunks never span a section boundary.

**Diff before inference.** Text comparison is nearly free and model calls are not. Candidates get found deterministically, and the model is only asked the question it is uniquely good at: does this change matter.

**Versions are ordered by date, not by label.** `document_versions` carries a real `period_end` alongside a human label, because not every filer runs on a calendar year. Franklin's fiscal year ends September 30 while the other four end December 31, so `BEN_10K_2024` and `CONSTELLATION_10K_2024` cover different twelve months. Sorting on the label would be a silent bug.

**Nothing outside the store layer knows how data is stored.** Route files never import a database client. That is what makes the phase 2 swap from an in-memory array to PostgreSQL a change to one file rather than a rewrite.

**Retrieved content is untrusted input.** Source documents are third-party text, which makes them a viable indirect prompt injection vector. The plan is to delimit retrieved passages and mark them as data rather than instructions, then validate output shape before returning. Written up in `SAFETY.md` in phase 7.

**Evals gate prompt changes.** The system is non-deterministic, so "it worked when I tried it" is not evidence. Prompt and retrieval changes run against a scored eval set in CI, including citation accuracy checked deterministically so a fabricated source fails the build.

---

## Notes

`NOTES.md` is a running log of what clicked and what confused me during the build. It is kept in the open on purpose.
