import {
  AdminaAuthenticationError,
  AdminaError,
  AdminaInvalidRequestError,
  AdminaNotFoundError,
  AdminaPermissionError,
  AdminaRequestTimeoutError,
  AdminaSystemError,
  AdminaTeapotError,
  AdminaTimeoutError,
  AdminaValidationError,
  createAdminaError,
  formatAdminaError,
  isAdminaError,
} from "../../common/errors.js";

describe("Admina Error Classes", () => {
  it("should create a base AdminaError with correct properties", () => {
    const error = new AdminaError("Test error", 400, { errorId: "test_error" });

    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe("AdminaError");
    expect(error.message).toBe("Test error");
    expect(error.status).toBe(400);
    expect(error.response).toEqual({ errorId: "test_error" });
  });

  it("should create specialized error instances with correct defaults", () => {
    const invalidRequestError = new AdminaInvalidRequestError();
    expect(invalidRequestError).toBeInstanceOf(AdminaError);
    expect(invalidRequestError.name).toBe("AdminaInvalidRequestError");
    expect(invalidRequestError.status).toBe(400);
    expect(invalidRequestError.message).toBe("Validation Exception");

    const authError = new AdminaAuthenticationError();
    expect(authError).toBeInstanceOf(AdminaError);
    expect(authError.name).toBe("AdminaAuthenticationError");
    expect(authError.status).toBe(401);

    const permissionError = new AdminaPermissionError();
    expect(permissionError).toBeInstanceOf(AdminaError);
    expect(permissionError.name).toBe("AdminaPermissionError");
    expect(permissionError.status).toBe(403);

    const notFoundError = new AdminaNotFoundError();
    expect(notFoundError).toBeInstanceOf(AdminaError);
    expect(notFoundError.name).toBe("AdminaNotFoundError");
    expect(notFoundError.status).toBe(404);
  });

  it("should create specialized errors with custom messages", () => {
    const error = new AdminaValidationError("Custom validation error");
    expect(error.message).toBe("Custom validation error");
    expect(error.status).toBe(422);
  });
});

describe("isAdminaError", () => {
  it("should return true for AdminaError instances", () => {
    const error = new AdminaError("Test error", 400, {});
    expect(isAdminaError(error)).toBe(true);

    const specializedError = new AdminaSystemError();
    expect(isAdminaError(specializedError)).toBe(true);
  });

  it("should return false for non-AdminaError instances", () => {
    const error = new Error("Regular error");
    expect(isAdminaError(error)).toBe(false);

    expect(isAdminaError(null)).toBe(false);
    expect(isAdminaError(undefined)).toBe(false);
    expect(isAdminaError("string error")).toBe(false);
  });
});

describe("formatAdminaError", () => {
  it("should format an error message correctly", () => {
    const error = new AdminaError("Test error", 400, {});
    const formatted = formatAdminaError(error);
    expect(formatted).toBe("Admina API error: Test error");
  });

  it("should include error details when available", () => {
    const error = new AdminaError("Test error", 400, {
      errorId: "test_id",
      errorDetails: { field: "username", message: "Too short" },
    });

    const formatted = formatAdminaError(error);
    expect(formatted).toContain("Admina API error: Test error");
    expect(formatted).toContain("Details:");
    expect(formatted).toContain('"field": "username"');
    expect(formatted).toContain('"message": "Too short"');
  });
});

describe("createAdminaError", () => {
  it("should create the correct error type based on status code", () => {
    expect(createAdminaError(400, {})).toBeInstanceOf(AdminaInvalidRequestError);
    expect(createAdminaError(401, {})).toBeInstanceOf(AdminaAuthenticationError);
    expect(createAdminaError(403, {})).toBeInstanceOf(AdminaPermissionError);
    expect(createAdminaError(404, {})).toBeInstanceOf(AdminaNotFoundError);
    expect(createAdminaError(408, {})).toBeInstanceOf(AdminaRequestTimeoutError);
    expect(createAdminaError(418, {})).toBeInstanceOf(AdminaTeapotError);
    expect(createAdminaError(422, {})).toBeInstanceOf(AdminaValidationError);
    expect(createAdminaError(500, {})).toBeInstanceOf(AdminaSystemError);
    expect(createAdminaError(504, {})).toBeInstanceOf(AdminaTimeoutError);

    // Default case for unknown status codes
    const unknownError = createAdminaError(499, {});
    expect(unknownError).toBeInstanceOf(AdminaError);
    expect(unknownError.status).toBe(499);
  });

  it("should pass response data to the error constructor", () => {
    const response = {
      errorId: "custom_error",
      errorDetails: { reason: "Something went wrong" },
    };

    const error = createAdminaError(500, response);
    expect(error.response).toBe(response);
  });
});
