import type { RequestHandler } from "express";
import { z } from "zod";
import { HttpError } from "./errorHandler.js";

type RequestLocation = "body" | "params" | "query";
const STRUCTURAL = new Set(["invalid_type", "unrecognized_keys"]);

export const validateRequest = (
  schema: z.ZodTypeAny,
  location: RequestLocation,
): RequestHandler => {
  return (req, res, next) => {
    const result = schema.safeParse(req[location]);
    if (!result.success) {
      const structural = result.error.issues.some((issue) =>
        STRUCTURAL.has(issue.code),
      );
      //422 only for a well-shaped body with bad values; everything else 400.
      const status = location === "body" && !structural ? 422 : 400;
      return next(new HttpError(status, "Invalid input", result.error.issues));
    }
    if (location === "body") req.body = result.data;
    next();
  };
};
