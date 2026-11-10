# Schema

A document is one company's recurring filing. Each filing for one
reporting period is a version of it, each version is split into chunks of text, and a comparison
runs between two versions of the same document.

```mermaid
erDiagram
    documents ||--o{ document_versions : "has"
    document_versions ||--o{ chunks : "split into"
    document_versions ||--o{ comparisons : "base of"
    document_versions ||--o{ comparisons : "target of"

    documents {
        uuid id PK
        text cik "10 digits, unique with form"
        text filer
        text form
        timestamptz created_at
    }
    document_versions {
        uuid id PK
        uuid document_id FK
        text version_label "display only"
        date period_end "unique with document_id; sort by this"
        text source_url
        timestamptz created_at
    }
    chunks {
        uuid id PK
        uuid version_id FK
        text section "unique with version_id and position"
        integer position "starts at 1"
        text content
        timestamptz created_at
    }
    comparisons {
        uuid id PK
        uuid base_version_id FK
        uuid target_version_id FK "must differ from base"
        text status "pending, running, completed, failed"
        timestamptz created_at
        timestamptz completed_at "empty until the run finishes"
    }
```

## Delete rules

Cascade what can be regenerated, restrict what represents work.

- `chunks.version_id` → `document_versions`: **CASCADE**. Re-ingesting a filing rebuilds its chunks.
- `document_versions.document_id` → `documents`: **RESTRICT**. A document cannot be deleted while it
  has versions.
- `comparisons.base_version_id` and `target_version_id` → `document_versions`: **RESTRICT**. A
  comparison's result cost model calls, so a version in use cannot be deleted; the API returns 409.

"Same document" for a comparison spans two rows, so no constraint can enforce it; the API does.
