import { z } from "zod";

export const documentCreateSchema = z.object({
  filer: z.string().trim().min(1),
  cik: z.string().regex(/^\d{10}$/, "CIK must be 10 digits"),
  form: z.string().trim().min(1),
  periodEnd: z.iso.date(),
  sourceUrl: z.url({ protocol: /^https?$/ }),
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
