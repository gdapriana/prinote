import { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";
import env from "../configs/env.js";

import { ApiError } from "../utils/api-error.js";
import { logger } from "../utils/logger.js";

export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (res.headersSent) {
    return next(err);
  }

  let statusCode = 500;
  let message = "Internal server error";
  let errors: unknown;

  if (err instanceof ZodError) {
    statusCode = 400;
    message = "Validation error";
    errors = err.issues.map(issue => ({
      path: issue.path.join("."),
      message: issue.message,
      code: issue.code
    }));
  } else if (err instanceof ApiError) {
    statusCode = err.statusCode;
    message = err.message;
    errors = err.errors;
  }

  if (
    err instanceof SyntaxError &&
    "type" in err &&
    err.type === "entity.parse.failed"
  ) {
    statusCode = 400;
    message = "Invalid JSON body";
  } else if ("type" in err && err.type === "entity.too.large") {
    statusCode = 413;
    message = "Request body is too large";
  }

  logger.error(
    err,
    `Error: ${message} | Status: ${statusCode} | Path: ${req.method} ${req.originalUrl}`
  );

  const response = {
    success: false,
    message,
    statusCode,
    ...(errors !== undefined && { errors }),
    ...(env.NODE_ENV === "development" && { stack: err.stack })
  };

  res.status(statusCode).json(response);
};
