import type { DocumentInput, StoredDocument } from "../schemas/document.js";

const documents: StoredDocument[] = [];

export const create = (document: DocumentInput): StoredDocument => {
  const id = crypto.randomUUID();
  const storedDocument = { ...document, id };
  documents.push(storedDocument);
  return storedDocument;
};

export const list = (): StoredDocument[] => {
  return [...documents];
};

export const getById = (id: string): StoredDocument | undefined => {
  return documents.find((doc) => doc.id === id);
};

export const remove = (id: string): StoredDocument | undefined => {
  const index = documents.findIndex((doc) => doc.id === id);
  if (index !== -1) {
    return documents.splice(index, 1)[0];
  }
  return undefined;
};
