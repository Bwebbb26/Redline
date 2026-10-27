import type { DocumentInput, StoredDocument } from "../schemas/document.js";
import { pool } from "../db/pool.js";
import { HttpError } from "../middleware/errorHandler.js";
import pg from "pg";

const SELECT_DOCUMENT = `
  SELECT d.filer, d.cik, d.form, 
          v.period_end::text AS "periodEnd", 
          v.source_url AS "sourceUrl",v.id
  FROM document_versions v
  JOIN documents d ON d.id = v.document_id
  `;

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
  const { rows } = await pool.query<StoredDocument>(
    `${SELECT_DOCUMENT} ORDER BY d.filer, v.period_end`,
  );
  return rows;
};

export const getById = async (
  id: string,
): Promise<StoredDocument | undefined> => {
  const { rows } = await pool.query<StoredDocument>(
    `${SELECT_DOCUMENT} WHERE v.id = $1`,
    [id],
  );
  return rows[0];
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
