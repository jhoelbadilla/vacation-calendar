import type { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";

export class HttpError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public fields?: Record<string, string>
  ) {
    super(message);
  }
}

export function notFound(message = "Resource not found.") {
  return new HttpError(404, "NOT_FOUND", message);
}

export function errorHandler(error: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (error instanceof ZodError) {
    const fields = Object.fromEntries(
      error.issues.map((issue) => [issue.path.join("."), issue.message])
    );
    return res.status(400).json({
      error: {
        code: "VALIDATION_ERROR",
        message: "One or more fields are invalid.",
        fields
      }
    });
  }

  if (error instanceof HttpError) {
    return res.status(error.status).json({
      error: {
        code: error.code,
        message: error.message,
        ...(error.fields ? { fields: error.fields } : {})
      }
    });
  }

  console.error(error);
  return res.status(500).json({
    error: {
      code: "INTERNAL_ERROR",
      message: "Something went wrong."
    }
  });
}
