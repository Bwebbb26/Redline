import { z } from "zod";

export const documentCreateSchema = z.object({
  filer: z.string(),
  cik: z.string(),
  form: z.string(),
  periodEnd: z.string(),
  sourceUrl: z.string(),
});

export const documentParamsSchema = z.object({
  id: z.uuid(),
});

export const documentListQuerySchema = z.object({});

export type DocumentInput = z.infer<typeof documentCreateSchema>;
export type DocumentParams = z.infer<typeof documentParamsSchema>;
export type StoredDocument = DocumentInput & {
  id: string;
};
