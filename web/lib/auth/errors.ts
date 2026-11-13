import { ZodError } from "zod";

/**
 * Errors that route handlers turn into HTTP responses.
 * Messages are plain language because the assistant may read them aloud.
 */
export class HttpError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly headers: Record<string, string> = {},
  ) {
    super(message);
    this.name = new.target.name;
  }
}

export class UnauthorizedError extends HttpError {
  constructor(message = "Please sign in first.") {
    super(401, "unauthorized", message);
  }
}

export class ForbiddenError extends HttpError {
  constructor(message = "You do not have permission to do this.") {
    super(403, "forbidden", message);
  }
}

export class NotFoundError extends HttpError {
  constructor(message = "We could not find that.") {
    super(404, "not_found", message);
  }
}

export class ConflictError extends HttpError {
  constructor(message: string) {
    super(409, "conflict", message);
  }
}

export class BadRequestError extends HttpError {
  constructor(message = "Some details are missing or wrong. Please check and try again.") {
    super(400, "bad_request", message);
  }
}

export class RateLimitError extends HttpError {
  constructor(public readonly retryAfterSeconds: number) {
    super(429, "rate_limited", "Too many tries. Please wait a few minutes, then try again.", {
      "Retry-After": String(retryAfterSeconds),
    });
  }
}

/** Turn any thrown error into a JSON response. Unknown errors become 500 with no details. */
export function errorResponse(error: unknown): Response {
  if (error instanceof HttpError) {
    return Response.json(
      { error: { code: error.code, message: error.message } },
      { status: error.status, headers: error.headers },
    );
  }
  if (error instanceof ZodError) {
    return errorResponse(new BadRequestError());
  }
  console.error(error);
  return Response.json(
    { error: { code: "server_error", message: "Something went wrong. Please try again." } },
    { status: 500 },
  );
}

/** Wrap a route handler so thrown HttpErrors become proper responses. */
export function withErrors<Args extends unknown[]>(
  handler: (...args: Args) => Promise<Response>,
): (...args: Args) => Promise<Response> {
  return async (...args) => {
    try {
      return await handler(...args);
    } catch (error) {
      return errorResponse(error);
    }
  };
}
