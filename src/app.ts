import express, { type Express } from "express";
import healthCheck from "./routes/healthCheck.js";
import documents from "./routes/documents.js";
import { errorHandler, HttpError } from "./middleware/errorHandler.js";

const app: Express = express();

app.use(express.json());
app.use("/health", healthCheck);
app.use("/documents", documents);
app.use((req, res, next) => {
  next(new HttpError(404, `No route for ${req.method} ${req.path}`));
});
app.use(errorHandler);
export default app;
