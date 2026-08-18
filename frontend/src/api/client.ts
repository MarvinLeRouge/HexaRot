const DEFAULT_BASE_URL = '/api'

interface ApiErrorBody {
  statusCode?: number
  message?: string | string[]
  error?: string
}

export class ApiError extends Error {
  readonly status?: number
  readonly code: 'http' | 'network'

  constructor(message: string, code: 'http' | 'network', status?: number) {
    super(message)
    this.name = 'ApiError'
    this.code = code
    this.status = status
  }
}

function resolveBaseUrl(): string {
  const configured = import.meta.env.VITE_API_BASE_URL as string | undefined
  return configured && configured.length > 0 ? configured : DEFAULT_BASE_URL
}

async function parseErrorBody(response: Response): Promise<ApiErrorBody> {
  try {
    return (await response.json()) as ApiErrorBody
  } catch {
    return {}
  }
}

async function handleResponse<TResponse>(response: Response): Promise<TResponse> {
  if (response.ok) {
    if (response.status === 204) {
      return undefined as TResponse
    }
    return (await response.json()) as TResponse
  }

  const body = await parseErrorBody(response)
  const message = Array.isArray(body.message)
    ? body.message.join(', ')
    : (body.message ?? response.statusText);

  throw new ApiError(message, 'http', response.status)
}

async function doFetch(url: string, init: RequestInit): Promise<Response> {
  try {
    return await fetch(url, init)
  } catch {
    throw new ApiError('Network error: unable to reach the server', 'network')
  }
}

export async function postJson<TResponse>(path: string, body: unknown): Promise<TResponse> {
  const response = await doFetch(`${resolveBaseUrl()}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  return handleResponse<TResponse>(response)
}

export async function getJson<TResponse>(
  path: string,
  query?: Record<string, string>,
): Promise<TResponse> {
  const search = query ? `?${new URLSearchParams(query).toString()}` : ''
  const response = await doFetch(`${resolveBaseUrl()}${path}${search}`, {
    method: 'GET',
  })
  return handleResponse<TResponse>(response)
}
