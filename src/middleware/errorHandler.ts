import type { ErrorRequestHandler } from "express";

export class HttpError extends Error {
  constructor(
    public readonly status: number,
    public readonly title: string,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
  }
}

export const errorHandler: ErrorRequestHandler = (err, req, res, next) => {
  res.type("application/problem+json");

  if (err instanceof HttpError) {
    res.status(err.status).json({
      type: "about:blank",
      title: err.title,
      status: err.status,
      detail: err.message,
      ...(err.details === undefined ? {} : { errors: err.details }),
    });
    return;
  }

  res.status(500).json({
    type: "about:blank",
    title: "Internal Server Error",
    status: 500,
    detail: "An unexpected error occurred",
  });
};
