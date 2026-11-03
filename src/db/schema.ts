import { sql } from "drizzle-orm";
import {
  check,
  date,
  foreignKey,
  integer,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";

// One row is one company's recurring filing.
export const documents = pgTable(
  "documents",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    cik: text("cik").notNull(),
    filer: text("filer").notNull(),
    form: text("form").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [
    unique("documents_cik_form_key").on(t.cik, t.form),
    check("documents_cik_check", sql`${t.cik} ~ '^[0-9]{10}$'`),
  ],
);

// One row is one specific filing of a document, for one reporting period.
export const documentVersions = pgTable(
  "document_versions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    documentId: uuid("document_id").notNull(),
    versionLabel: text("version_label").notNull(),
    periodEnd: date("period_end", { mode: "string" }).notNull(),
    sourceUrl: text("source_url").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [
    foreignKey({
      name: "document_versions_document_id_fkey",
      columns: [t.documentId],
      foreignColumns: [documents.id],
    }).onDelete("restrict"),
    unique("document_versions_document_id_period_end_key").on(
      t.documentId,
      t.periodEnd,
    ),
  ],
);

// One row is one piece of a filing's text, in order within its section.
export const chunks = pgTable(
  "chunks",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    versionId: uuid("version_id").notNull(),
    section: text("section").notNull(),
    position: integer("position").notNull(),
    content: text("content").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [
    foreignKey({
      name: "chunks_version_id_fkey",
      columns: [t.versionId],
      foreignColumns: [documentVersions.id],
    }).onDelete("cascade"),
    unique("chunks_version_id_section_position_key").on(
      t.versionId,
      t.section,
      t.position,
    ),
    check("chunks_position_check", sql`${t.position} > 0`),
  ],
);

// One row is one run comparing two versions of the same documents.
export const comparisons = pgTable(
  "comparisons",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    baseVersionId: uuid("base_version_id").notNull(),
    targetVersionId: uuid("target_version_id").notNull(),
    status: text("status").notNull().default("pending"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
  },
  (t) => [
    foreignKey({
      name: "comparisons_base_version_id_fkey",
      columns: [t.baseVersionId],
      foreignColumns: [documentVersions.id],
    }).onDelete("restrict"),
    foreignKey({
      name: "comparisons_target_version_id_fkey",
      columns: [t.targetVersionId],
      foreignColumns: [documentVersions.id],
    }).onDelete("restrict"),
    check(
      "comparisons_distinct_versions",
      sql`${t.baseVersionId} <> ${t.targetVersionId}`,
    ),
    check(
      "comparisons_status_check",
      sql`${t.status} IN ('pending', 'running', 'completed', 'failed')`,
    ),
  ],
);
