interface BackendFieldError {
  field: string;
  message: string;
}

/**
 * Extracts field-level validation errors from a backend error response.
 * Returns a Record<field, message> if structured errors are present, or null otherwise.
 *
 * Backend shape (from ZodValidationPipe + HttpExceptionFilter):
 *   { statusCode: 400, message: "Validation failed", errors: [{ field, message }] }
 */
export function mapBackendErrors(err: unknown): Record<string, string> | null {
  const data = (err as any)?.response?.data;
  if (!data || !Array.isArray(data.errors) || data.errors.length === 0) {
    return null;
  }

  const result: Record<string, string> = {};
  for (const item of data.errors as BackendFieldError[]) {
    if (item.field && item.message) {
      result[item.field] = item.message;
    }
  }

  return Object.keys(result).length > 0 ? result : null;
}
