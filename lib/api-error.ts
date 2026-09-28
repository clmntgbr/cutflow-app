export class ApiError extends Error {
  readonly status: number
  readonly errors?: Record<string, string>

  constructor(
    message: string,
    status: number,
    errors?: Record<string, string>
  ) {
    super(message)
    this.name = "ApiError"
    this.status = status
    this.errors = errors
  }
}

export async function parseApiError(
  response: Response,
  fallbackMessage: string
): Promise<ApiError> {
  const body = await response.json().catch(() => null)
  const record =
    body && typeof body === "object" ? (body as Record<string, unknown>) : null

  const message =
    record && typeof record.message === "string" && record.message
      ? record.message
      : fallbackMessage

  const errors = parseFieldErrors(record?.errors)

  return new ApiError(message, response.status, errors)
}

function parseFieldErrors(value: unknown): Record<string, string> | undefined {
  if (!value || typeof value !== "object") return undefined

  const errors: Record<string, string> = {}
  for (const [key, message] of Object.entries(value)) {
    if (typeof message === "string" && message) {
      errors[key] = message
    }
  }

  return Object.keys(errors).length > 0 ? errors : undefined
}
