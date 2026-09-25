import { Router } from "express";
import { create, list, getById, remove } from "../store/documents.js";
const router = Router();

router.get("/", (req, res) => {
  const documentList = list();
  res.json({ data: documentList });
});

router.get("/:id", (req, res) => {
  const { id } = req.params;
  const document = getById(id);
  if (document) {
    res.json({ data: document });
  } else {
    res.status(404).json({ error: "Document not found" });
  }
});

router.post("/", (req, res) => {
  const { filer, cik, form, periodEnd, sourceUrl } = req.body;
  const storedDocument = create({ filer, cik, form, periodEnd, sourceUrl });
  res.status(201).json(storedDocument);
});

router.delete("/:id", (req, res) => {
  const { id } = req.params;
  const removedDocument = remove(id);
  if (!removedDocument) {
    res.status(404).json({ error: "Document not found" });
  } else {
    res.status(204).send();
  }
});
export default router;
