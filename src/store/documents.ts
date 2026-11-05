import type { DocumentInput, StoredDocument } from "../schemas/document.js";
import { db } from "../db/pool.js";
import { HttpError } from "../middleware/errorHandler.js";
import pg from "pg";
import { documents, documentVersions } from "../db/schema.js";
import { eq, sql } from "drizzle-orm";

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

// Drizzle wraps driver errors; the Postgres error with its SQLSTATE code is the cause.
const pgErrorCode = (err: unknown): string | undefined => {
  const cause = err instanceof Error ? err.cause : undefined;
  return cause instanceof pg.DatabaseError ? cause.code : undefined;
};

export const create = async (
  document: DocumentInput,
): Promise<StoredDocument> => {
  try {
    return await db.transaction(async (tx) => {
      const [doc] = await tx
        .insert(documents)
        .values({
          cik: document.cik,
          filer: document.filer,
          form: document.form,
        })
        .onConflictDoUpdate({
          target: [documents.cik, documents.form],
          set: { filer: sql`excluded.filer` },
        })
        .returning({
          id: documents.id,
        });
      // No conflict handling: a duplicate filing must fail, and becomes a 409 below
      const [version] = await tx
        .insert(documentVersions)
        .values({
          documentId: doc.id,
          versionLabel: `${document.form} ${document.periodEnd}`,
          periodEnd: document.periodEnd,
          sourceUrl: document.sourceUrl,
        })
        .returning({
          id: documentVersions.id,
        });
      return { ...document, id: version.id };
    });
  } catch (err) {
    if (pgErrorCode(err) === "23505") {
      throw new HttpError(
        409,
        "A version of this document with that period end already exists",
      );
    }
    throw err;
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
    return await db.transaction(async (tx) => {
      const [deleted] = await tx
        .delete(documentVersions)
        .where(eq(documentVersions.id, id))
        .returning();
      if (!deleted) return undefined;

      const [doc] = await tx
        .select({
          filer: documents.filer,
          cik: documents.cik,
          form: documents.form,
        })
        .from(documents)
        .where(eq(documents.id, deleted.documentId));

      return {
        ...doc,
        periodEnd: deleted.periodEnd,
        sourceUrl: deleted.sourceUrl,
        id: deleted.id,
      };
    });
  } catch (err) {
    if (pgErrorCode(err) === "23001") {
      throw new HttpError(
        409,
        "This version is used by comparisons and cannot be deleted",
      );
    }
    throw err;
  }
};
