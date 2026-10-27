-- Both versions of one document, oldest first.
-- Franklin's fiscal year ends Sept 30, so ordering must use period_end, never the label.

SELECT d.filer, d.form, v.version_label, v.period_end
FROM document_versions v
JOIN documents d ON d.id = v.document_id
WHERE d.cik = '0000038777' AND d.form = '10-K'
ORDER BY v.period_end ASC;

-- Every filing with its company and form, each company's filings together, oldest first.
SELECT v.id, d.filer, d.cik, d.form, v.period_end, v.source_url
FROM document_versions v
JOIN documents d ON d.id = v.document_id
ORDER BY d.filer, v.period_end;

-- How many versions each document has. A document needs at least 2 to be compared.
SELECT d.filer, d.form, COUNT(*) AS versions
FROM documents d
JOIN document_versions v ON v.document_id = d.id
GROUP BY d.id
ORDER BY d.filer, d.form;

-- How many chunks each version has, including versions with none yet.
SELECT d.filer, d.form, v.version_label, COUNT(c.id) AS chunks
FROM document_versions v
JOIN documents d ON d.id = v.document_id
LEFT JOIN chunks c ON c.version_id = v.id
GROUP BY v.id, d.id
ORDER BY d.filer, v.period_end;

-- Each version beside the version before it, within the same document.
-- Every row with a previous version is a pair the system can compare (base → target).
WITH pairs AS (
  SELECT d.filer, d.form,
         LAG(v.period_end) OVER (PARTITION BY v.document_id ORDER BY v.period_end) AS base_period_end,
         v.period_end AS target_period_end
  FROM document_versions v
  JOIN documents d ON d.id = v.document_id
)
SELECT filer, form, base_period_end, target_period_end
FROM pairs
WHERE base_period_end IS NOT NULL
ORDER BY filer, form;
