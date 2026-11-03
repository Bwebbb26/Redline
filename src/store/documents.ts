import type { DocumentInput, StoredDocument } from "../schemas/document.js";
import { db, pool } from "../db/pool.js";
import { HttpError } from "../middleware/errorHandler.js";
import pg from "pg";
import { documents, documentVersions } from "../db/schema.js";
import { eq } from "drizzle-orm";

// Columns every document response returns, in response order.
const documentFields = {
  filer: documents.filer,
  cik: documents.cik,
  form: documents.form,
  periodEnd: documentVersions.periodEnd,
  sourceUrl: documentVersions.sourceUrl,
  id: documentVersions.id,
};

const selectDocuments = () =>
  db
    .select(documentFields)
    .from(documentVersions)
    .innerJoin(documents, eq(documents.id, documentVersions.documentId));

export const create = async (
  document: DocumentInput,
): Promise<StoredDocument> => {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const docResult = await client.query<{ id: string }>(
      `INSERT INTO documents (cik, filer, form)
       VALUES ($1, $2, $3)
       ON CONFLICT (cik, form) DO UPDATE SET filer = EXCLUDED.filer
       RETURNING id`,
      [document.cik, document.filer, document.form],
    );
    const documentId = docResult.rows[0].id;

    const versionResult = await client.query<{ id: string }>(
      `INSERT INTO document_versions (document_id, version_label, period_end, source_url)
       VALUES ($1, $2, $3, $4)
       RETURNING id`,
      [
        documentId,
        `${document.form} ${document.periodEnd}`,
        document.periodEnd,
        document.sourceUrl,
      ],
    );

    await client.query("COMMIT");
    return { ...document, id: versionResult.rows[0].id };
  } catch (err) {
    await client.query("ROLLBACK");
    if (err instanceof pg.DatabaseError && err.code === "23505") {
      throw new HttpError(
        409,
        "A version of this document with that period end already exists",
      );
    }
    throw err;
  } finally {
    client.release();
  }
};

export const list = async (): Promise<StoredDocument[]> => {
  return selectDocuments().orderBy(documents.filer, documentVersions.periodEnd);
};

export const getById = async (
  id: string,
): Promise<StoredDocument | undefined> => {
  const [row] = await selectDocuments().where(eq(documentVersions.id, id));
  return row;
};

export const remove = async (
  id: string,
): Promise<StoredDocument | undefined> => {
  try {
    const { rows } = await pool.query<StoredDocument>(
      `WITH deleted AS (
         DELETE FROM document_versions WHERE id = $1
         RETURNING id, document_id, period_end, source_url
       )
       SELECT d.filer, d.cik, d.form,
              v.period_end::text AS "periodEnd",
              v.source_url AS "sourceUrl",
              v.id
       FROM deleted v
       JOIN documents d ON d.id = v.document_id`,
      [id],
    );
    return rows[0];
  } catch (err) {
    if (err instanceof pg.DatabaseError && err.code === "23001") {
      throw new HttpError(
        409,
        "This version is used by comparisons and cannot be deleted",
      );
    }
    throw err;
  }
};
