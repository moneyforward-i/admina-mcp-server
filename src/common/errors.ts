export class AdminaError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly response: {
      errorId?: string;
      errorDetails?: unknown;
    },
  ) {
    super(message);
    this.name = "AdminaError";
    this.response = response;
  }
}

// Error class for invalid request errors (HTTP 400).
export class AdminaInvalidRequestError extends AdminaError {
  constructor(message = "Validation Exception", response = { errorId: "validation_exception" }) {
    super(message, 400, response);
    this.name = "AdminaInvalidRequestError";
  }
}

// Error class for authentication errors (HTTP 401).
export class AdminaAuthenticationError extends AdminaError {
  constructor(message = "Unauthorized", response = { errorId: "unauthorized" }) {
    super(message, 401, response);
    this.name = "AdminaAuthenticationError";
  }
}

// Error class for permission errors (HTTP 403).
export class AdminaPermissionError extends AdminaError {
  constructor(message = "Forbidden", response = { errorId: "forbidden" }) {
    super(message, 403, response);
    this.name = "AdminaPermissionError";
  }
}

// Error class for request timeout errors (HTTP 408).
export class AdminaRequestTimeoutError extends AdminaError {
  constructor(message = "Request timeout", response = { errorId: "request_timeout" }) {
    super(message, 408, response);
    this.name = "AdminaRequestTimeoutError";
  }
}

// Error class for validation errors (HTTP 422).
export class AdminaValidationError extends AdminaError {
  constructor(message = "Invalid query", response = { errorId: "invalid_query" }) {
    super(message, 422, response);
    this.name = "AdminaValidationError";
  }
}

// Error class for system errors.
export class AdminaSystemError extends AdminaError {
  constructor(message = "Internal Server Error", response = { errorId: "internal_server_error" }) {
    super(message, 500, response);
    this.name = "AdminaSystemError";
  }
}

// Error class for timeout errors.
export class AdminaTimeoutError extends AdminaError {
  constructor(message = "Timeout error", response = { errorId: "timeout_error" }) {
    super(message, 504, response);
    this.name = "AdminaTimeoutError";
  }
}

// Error class for 'I'm a teapot' errors (HTTP 418).
export class AdminaTeapotError extends AdminaError {
  constructor(message = "Feature not available", response = { errorId: "feature_not_available" }) {
    super(message, 418, response);
    this.name = "AdminaTeapotError";
  }
}

// Error class for not found errors (HTTP 404).
export class AdminaNotFoundError extends AdminaError {
  constructor(message = "Not found", response = { errorId: "not_found" }) {
    super(message, 404, response);
    this.name = "AdminaNotFoundError";
  }
}

// Type guard to check if an error is an AdminaError.
export function isAdminaError(error: unknown): error is AdminaError {
  return error instanceof AdminaError;
}

export function formatAdminaError(error: AdminaError): string {
  let message = `Admina API error: ${error.message}`;
  // Add special formatting for Admina Errors if needed
  if (error.response?.errorDetails) {
    message += `\nDetails: ${JSON.stringify(error.response.errorDetails, null, 2)}`;
  }
  return message;
}

// Creates a specific AdminaError subclass based on the HTTP status code.
export function createAdminaError(status: number, response: any): AdminaError {
  switch (status) {
    case 400:
      return new AdminaInvalidRequestError(response?.errorId, response);
    case 401:
      return new AdminaAuthenticationError(response?.errorId, response);
    case 403:
      return new AdminaPermissionError(response?.errorId, response);
    case 404:
      return new AdminaNotFoundError(response?.errorId, response);
    case 408:
      return new AdminaRequestTimeoutError(response?.errorId, response);
    case 418:
      return new AdminaTeapotError(response?.errorId, response);
    case 422:
      return new AdminaValidationError(response?.errorId, response);
    case 500:
      return new AdminaSystemError(response?.errorId, response);
    case 504:
      return new AdminaTimeoutError(response?.errorId, response);
    default:
      return new AdminaError(response?.errorId || "admina_api_error", status, response);
  }
}
