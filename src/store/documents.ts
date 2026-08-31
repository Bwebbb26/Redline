import { Router } from "express";

const router = Router();
const create = async (input: {
  filer: string;
  cik: string;
  form: string;
  periodEnd: string;
  sourceUrl: string;
}) => {
  const id = crypto.randomUUID();
  const newDocument = { id, ...input };

  return newDocument;
};
router.post("/", async (req, res) => {
  const { filer, cik, form, periodEnd, sourceUrl } = req.body;
  try {
    const newDocument = await create({
      filer,
      cik,
      form,
      periodEnd,
      sourceUrl,
    });
    res.status(201).json(newDocument);
  } catch (error) {
    console.error("Error creating document:", error);
    res.status(500).json({ error: "Failed to create document" });
  }
});

export default router;
