import type { RequestHandler } from "express";
import { z } from "zod";
import { HttpError } from "./errorHandler.js";

type RequestLocation = "body" | "params" | "query";

export const validateRequest = (
  schema: z.ZodTypeAny,
  location: RequestLocation,
): RequestHandler => {
  return (req, res, next) => {
    const input = req[location];
    const result = schema.safeParse(input);
    if (!result.success) {
      next(
        new HttpError(400, "Bad Request", "Invalid input", result.error.issues),
      );
      return;
    }
    next();
  };
};
