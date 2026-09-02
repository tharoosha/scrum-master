/** Typed errors mapped to HTTP status codes by server/api/errorMiddleware.ts */

export class AppError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code: string,
    readonly details?: unknown,
  ) {
    super(message);
    this.name = new.target.name;
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: unknown) {
    super(message, 400, 'validation_error', details);
  }
}

export class NotFoundError extends AppError {
  constructor(what: string) {
    super(`${what} not found`, 404, 'not_found');
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(message, 409, 'conflict');
  }
}

/** Guard helper: throw ValidationError unless the condition holds. */
export function assert(condition: unknown, message: string, details?: unknown): asserts condition {
  if (!condition) throw new ValidationError(message, details);
}
