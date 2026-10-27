import { Router } from "express";
import { create, list, getById, remove } from "../store/documents.js";
import { validateRequest } from "../middleware/validateRequest.js";
import {
  documentCreateSchema,
  documentListQuerySchema,
  documentParamsSchema,
} from "../schemas/document.js";
import type { DocumentParams } from "../schemas/document.js";
import { HttpError } from "../middleware/errorHandler.js";
const router = Router();

router.get(
  "/",
  validateRequest(documentListQuerySchema, "query"),
  async (req, res) => {
    const documentList = await list();
    res.json({ data: documentList });
  },
);

router.get(
  "/:id",
  validateRequest(documentParamsSchema, "params"),
  async (req, res, next) => {
    const { id } = req.params as DocumentParams;
    const document = await getById(id);
    if (!document) {
      return next(new HttpError(404, "Document not found"));
    } else {
      res.json({ data: document });
    }
  },
);

router.post(
  "/",
  validateRequest(documentCreateSchema, "body"),
  async (req, res) => {
    const { filer, cik, form, periodEnd, sourceUrl } = req.body;
    const storedDocument = await create({
      filer,
      cik,
      form,
      periodEnd,
      sourceUrl,
    });
    res.status(201).json({ data: storedDocument });
  },
);

router.delete(
  "/:id",
  validateRequest(documentParamsSchema, "params"),
  async (req, res, next) => {
    const { id } = req.params as DocumentParams;
    const removedDocument = await remove(id);
    if (!removedDocument) {
      return next(new HttpError(404, "Document not found"));
    } else {
      res.status(204).send();
    }
  },
);
export default router;
