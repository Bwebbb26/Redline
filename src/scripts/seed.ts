import { readFile } from "node:fs/promises";
import { z } from "zod";
import { documentCreateSchema } from "../schemas/document.js";
import { pool } from "../db/pool.js";

const manifestSchema = z.object({
  versions: z.array(documentCreateSchema),
});

const text = await readFile("./docs/corpus.json", "utf-8");
const manifest = manifestSchema.parse(JSON.parse(text));

const documentKeys = new Set(
  manifest.versions.map((v) => `${v.cik}|${v.form}`),
);

const client = await pool.connect();
try {
  await client.query("BEGIN");

  for (const v of manifest.versions) {
    const { rows } = await client.query<{ id: string }>(
      `INSERT INTO documents(cik, filer, form)
        VALUES ($1, $2, $3)
        ON CONFLICT (cik, form) DO UPDATE SET filer = EXCLUDED.filer
        RETURNING id`,
      [v.cik, v.filer, v.form],
    );
    const documentId = rows[0].id;

    await client.query(
      `INSERT INTO document_versions(document_id, version_label, period_end, source_url)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT( document_id, period_end) DO UPDATE SET 
        version_label = EXCLUDED.version_label,
        source_url = EXCLUDED.source_url`,
      [documentId, `${v.form} ${v.periodEnd}`, v.periodEnd, v.sourceUrl],
    );
  }

  await client.query("COMMIT");
  console.log(
    `Seeded ${manifest.versions.length} versions across ${documentKeys.size} documents`,
  );
} catch (err) {
  await client.query("ROLLBACK");
  throw err;
} finally {
  client.release();
  await pool.end();
}
