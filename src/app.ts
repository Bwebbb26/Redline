import express, { type Express, type Request, type Response } from "express";
import healthCheck from "./routes/healthCheck.js";
const app: Express = express();

app.use(express.json());
app.use("/health", healthCheck);

export default app;
