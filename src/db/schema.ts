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

// One row is documment metadata for a single filing.
export const documents = pgTable(
  "documents",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    cik: text("cik").notNull(),
    filer: text("filer").notNull(),
    form: text("form").notNull(),
    createdAt: timestamp("createdAt", { withTimezone: true })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
  },
  (t) => [
    unique("documents_cik_form_key").on(t.cik, t.form),
    check("documents_cik_check", sql`${t.cik} ~ '^[0-9]{10}$'`),
  ],
);

export const documentVersions = pgTable(
  "document_versions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    documentId: uuid("documentId").notNull(),

    versionLabel: text("version_label").notNull(),
    periodEnd: date("period_end").notNull(),
    sourceUrl: text("source_url").notNull(),
    createdAt: timestamp("createdAt", { withTimezone: true })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
  },
  (t) => [
    foreignKey({
      columns: [t.documentId],
      foreignColumns: [documents.id],
    }).onDelete("restrict"),
    unique("documents_cik_form_key").on(t.documentId, t.periodEnd),
  ],
);

export const chunks = pgTable("chunks", {
  id: uuid("id").defaultRandom().primaryKey(),
  documentId: uuid("documentId").notNull(),

  versionLabel: text("version_label").notNull(),
  periodEnd: date("period_end").notNull(),
  sourceUrl: text("source_url").notNull(),
  createdAt: timestamp("createdAt", { withTimezone: true })
    .default(sql`CURRENT_TIMESTAMP`)
    .notNull(),
});
