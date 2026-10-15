# Redline

Feed it two versions of a long governing document and it reports **what changed, what was quietly softened or removed, and whether it matters**, citing the exact passage on both sides.

---

## The problem

Long governing documents get revised constantly: annual filings, regulatory rules, terms of service, insurance policies, vendor contracts. The revisions matter, and finding them is manual work.

Keyword search doesn't solve this. The changes that matter most are rewordings, softened hedges, and quietly dropped paragraphs, where the vocabulary barely moves but the meaning does. Someone ends up reading two hundred pages side by side to find the four sentences that changed.

Redline does that comparison and reports only what's material, with the source text from both versions attached, so the answer can be verified rather than trusted.

**The question it's built to answer:** what risk-factor language did a filer soften between its 2024 and 2025 10-K, and does it matter?

### Why this isn't another PDF chatbot

Comparing two versions of a long document is a harder retrieval problem than answering a question about one. You're aligning corresponding sections across two documents rather than fetching the best-matching passage, and sections that align to nothing are themselves a finding.

It also takes several steps rather than one model call: locate both versions, align sections, compare, judge materiality, summarize. That's what makes an agent the right shape here, instead of a single call wearing a costume.

---

## Demo corpus

Ten SEC 10-K filings from five issuers, each with both 2024 and 2025, in two sectors:

- **Energy:** Constellation and Exelon
- **Asset management:** Franklin Resources, T. Rowe Price, and BlackRock

One unpaired BlackRock 10-Q is included deliberately as a negative fixture. It tests form-type filtering and the no-counterpart path.

The corpus is **frozen on purpose**. Evaluation needs a fixed input set; otherwise a failing eval is ambiguous: did the prompt regress, or did the data change? The pipeline itself has no knowledge of filing types, filers, or years. SEC filings are the demo because they're public and free. The same system points at FERC and NERC rules, CMS and HIPAA guidance, contracts, or policy documents.

The manifest, with source URLs and cover-page dates, is in [`docs/corpus.json`](docs/corpus.json).

---

## Releases

Each release is tagged on GitHub. `0.x` means the interface may still change.

| Release    | What it delivers                                                                                                                                                                           |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **v0.1.0** | REST API in Node.js, TypeScript, and Express 5: the documents resource, Zod validation on body, params, and query, RFC 9457 problem-details errors, and configuration validated at startup |

### Roadmap

| Next        | Scope                                                                                                                                             |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| Persistence | PostgreSQL schema with versioned documents, hand-written migrations, indexes, seed from the manifest                                              |
| Cloud       | Container image on AWS Lambda behind API Gateway, RDS PostgreSQL, S3 for filings, infrastructure in AWS CDK, deployed by GitHub Actions over OIDC |
| Comparison  | Amazon Bedrock (Claude): diff before inference, model tiering, validated structured output, per-request cost logging                              |
| Retrieval   | Section-aware ingestion, pgvector embeddings, cross-version section alignment                                                                     |
| Evaluation  | Eval set scored in CI, deterministic citation checks, prompt-injection guardrails                                                                 |
| Agent       | Tool-using agent loop with traced runs, exposed as an MCP server                                                                                  |

---

## Running it

Requires Node 24 (pinned in `.nvmrc`) and Docker Desktop, running.

**1. Start Postgres.** Choose any local password and use it in both step 1 and step 2.

```bash
docker run -d --name redline-db \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=YOUR_PASSWORD \
  -e POSTGRES_DB=redline \
  -p 127.0.0.1:5432:5432 \
  -v redline-pgdata:/var/lib/postgresql \
  postgres:18
```

After the first run, `docker start redline-db` restarts it. Data persists in the
`redline-pgdata` volume.

**2. Install and configure.**

```bash
nvm use
npm install
cp .env.example .env
```

In `.env`, set `DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@localhost:5432/redline`
with the same password.

**3. Check the database, then start the API.**

```bash
npm run db:check   # prints the server time and Postgres version, then exits
npm run dev
```

```bash
curl -i localhost:3000/health
```

| Command             | What it does                  |
| ------------------- | ----------------------------- |
| `npm run dev`       | Start with hot reload         |
| `npm run build`     | Compile TypeScript to `dist/` |
| `npm run typecheck` | Type check without emitting   |
| `npm run db:check`  | Confirm Postgres is reachable |

### API

| Method   | Path             | Returns                         |
| -------- | ---------------- | ------------------------------- |
| `GET`    | `/health`        | Service status                  |
| `POST`   | `/documents`     | `201` with the created document |
| `GET`    | `/documents`     | `{ data: [...] }`               |
| `GET`    | `/documents/:id` | One document, or `404`          |
| `DELETE` | `/documents/:id` | `204`                           |

Errors are returned as `application/problem+json`: `400` for malformed requests, `422` for well-formed requests with invalid values, and `404` for missing resources.

---

## Architecture

```mermaid
flowchart LR
    A[Client / MCP host] --> B[API Gateway]
    B --> C[Lambda: REST API + MCP server]
    C --> D[(RDS PostgreSQL + pgvector)]
    C --> E[S3 document store]
    C --> F[Agent orchestration]
    F --> G[Amazon Bedrock]
    F --> H[Tools: search, compare, summarize]
    H --> D
```

Documents are ingested with their structure intact, so sections survive as first-class records rather than collapsing into undifferentiated text. Two versions of the same document are aligned section by section, matching on heading text first and falling back to embedding similarity when a section was renamed.

A cheap text diff finds candidate changes, and only those candidates are sent to a model for a materiality judgment. That ordering keeps cost proportional to what actually changed rather than to document length.

**Stack:** Node.js, TypeScript, ES modules, Express 5, Zod. Infrastructure and AI: AWS Lambda, API Gateway, RDS PostgreSQL with pgvector, S3, AWS CDK, Amazon Bedrock behind a provider-agnostic interface, Model Context Protocol, Jest and Supertest, evals in CI, GitHub Actions.

---

## Design notes

Decisions and the reasoning behind them. The full log is in [`DECISIONS.md`](DECISIONS.md).

**Sections are first-class.** Chunking a filing into fixed-size windows destroys the structure that makes cross-version alignment possible. Sections are extracted during ingestion, and chunks never span a section boundary.

**Diff before inference.** Text comparison is nearly free; model calls aren't. Candidates are found deterministically, and the model is asked only the question it's uniquely good at: does this change matter?

**Versions are ordered by date, not by label.** `document_versions` carries a real `period_end` alongside a human label, because not every filer runs on a calendar year. Franklin's fiscal year ends September 30 while the other four end December 31, so `BEN_10K_2024` and `CONSTELLATION_10K_2024` cover different twelve-month periods. Sorting on the label would be a silent bug.

**Nothing outside the store layer knows how data is stored.** Route files never import a database client, so changing persistence is a change to one file rather than a rewrite.

**Retrieved content is untrusted input.** Source documents are third-party text, which makes them a viable indirect prompt-injection vector. Retrieved passages are delimited and marked as data rather than instructions, and output shape is validated before anything is returned.

**Evals gate prompt changes.** The system is non-deterministic, so "it worked when I tried it" isn't evidence. Prompt and retrieval changes run against a scored eval set in CI, including citation accuracy checked deterministically, so a fabricated source fails the build.

---

## Notes

`NOTES.md` is a running log of what clicked and what didn't during the build, kept in the open on purpose.
