import express, { type Express } from "express";
import healthCheck from "./routes/healthCheck.js";
import documents from "./routes/documents.js";

const app: Express = express();

app.use(express.json());
app.use("/health", healthCheck);
app.use("/documents", documents);

export default app;
