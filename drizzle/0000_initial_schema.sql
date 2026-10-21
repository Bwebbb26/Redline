-- Redline schema: documents, their versions, text chunks, and comparison runs.

-- One row is one company's recurring filing
CREATE TABLE documents (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  cik         text        NOT NULL,  -- CIKs keep their leading zeros with TEXT
  filer       text        NOT NULL,
  form        text        NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (cik, form),
  CHECK (cik ~ '^[0-9]{10}$')
);

-- One row is one specific filing of a document, for one reporting period.
CREATE TABLE document_versions (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id    uuid        NOT NULL REFERENCES documents (id) ON DELETE RESTRICT,
  version_label  text        NOT NULL,  -- display only, dont use for sorting
  period_end     date        NOT NULL,  -- order by this: fiscal years end on different dates
  source_url     text        NOT NULL,
  created_at     timestamptz NOT NULL DEFAULT now(),
  UNIQUE (document_id, period_end)
);

-- One row is one piece of a filing's text, in order within its section.
CREATE TABLE chunks (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  version_id  uuid        NOT NULL REFERENCES document_versions (id) ON DELETE CASCADE,
  section     text        NOT NULL,  -- heading as filed, e.g. 'Item 1A. Risk Factors'
  position    integer     NOT NULL,  -- order within the section, starting at 1
  content     text        NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (version_id, section, position),
  CHECK (position > 0)
);

-- One row is one run comparing two versions of the same document.
-- "Same document" spans two rows, so a CHECK cannot enforce it; the API does.
CREATE TABLE comparisons (
  id                 uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  base_version_id    uuid        NOT NULL REFERENCES document_versions (id) ON DELETE RESTRICT,
  target_version_id  uuid        NOT NULL REFERENCES document_versions (id) ON DELETE RESTRICT,
  status             text        NOT NULL DEFAULT 'pending',
  created_at         timestamptz NOT NULL DEFAULT now(),
  completed_at       timestamptz,  -- empty until the run finishes
  CONSTRAINT comparisons_distinct_versions CHECK (base_version_id <> target_version_id),
  CHECK (status IN ('pending', 'running', 'completed', 'failed'))
);
