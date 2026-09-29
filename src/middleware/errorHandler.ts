import type { ErrorRequestHandler, Response } from "express";
import { STATUS_CODES } from "node:http";

export class HttpError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
  }
}

const sendProblem = (
  res: Response,
  status: number,
  detail: string,
  errors?: unknown,
) => {
  res
    .status(status)
    .type("application/problem+json")
    .json({
      type: "about:blank",
      title: STATUS_CODES[status] ?? "Error",
      status,
      detail,
      ...(errors === undefined ? {} : { errors }),
    });
};

export const errorHandler: ErrorRequestHandler = (err, req, res, _next) => {
  if (err instanceof HttpError) {
    return sendProblem(res, err.status, err.message, err.details);
  }

  const status = typeof err?.status === "number" ? err.status : 500;
  if (status >= 400 && status < 500) {
    const detail =
      err.type === "entity.parse.failed"
        ? "Request body is not valid JSON"
        : "Invalid request";
    return sendProblem(res, status, detail);
  }

  console.error(err); // NEW: a real bug is now visible to you (Pino replaces this in Week 3)
  return sendProblem(res, 500, "An unexpected error occurred"); // CHANGED: same body as before, via the helper
};
