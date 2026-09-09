import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { getJson, postJson, patchJson, deleteJson, ApiError } from './client'
import { accessToken, setAccessToken, clearAccessToken } from '../auth/token-storage'

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

describe('postJson', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('returns the parsed JSON body on a successful response', async () => {
    vi.mocked(fetch).mockResolvedValue(jsonResponse({ ok: true }))

    const result = await postJson<{ ok: boolean }>('/encode', { message: 'hi' })

    expect(result).toEqual({ ok: true })
  })

  it('sends the body as JSON with a JSON content-type header', async () => {
    vi.mocked(fetch).mockResolvedValue(jsonResponse({ ok: true }))

    await postJson('/encode', { message: 'hi' })

    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('/encode'),
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ message: 'hi' }),
      }),
    )
  })

  it.each([
    ['a single string message', { statusCode: 400, message: 'message must not be empty', error: 'Bad Request' }, 'message must not be empty'],
    ['an array of validation messages', { statusCode: 400, message: ['message must not be empty', 'size must be one of the following values: small, medium, large'], error: 'Bad Request' }, 'message must not be empty, size must be one of the following values: small, medium, large'],
  ])('maps a 400 response with %s to an ApiError with the joined message', async (_label, errorBody, expectedMessage) => {
    vi.mocked(fetch).mockResolvedValue(jsonResponse(errorBody, 400))

    await expect(postJson('/encode', {})).rejects.toMatchObject({
      message: expectedMessage,
      status: 400,
    })
  })

  it('maps a network failure to an ApiError', async () => {
    vi.mocked(fetch).mockRejectedValue(new TypeError('Failed to fetch'))

    await expect(postJson('/encode', {})).rejects.toBeInstanceOf(ApiError)
  })
})

describe('getJson', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
    clearAccessToken()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    clearAccessToken()
  })

  it('sends a GET request and returns the parsed JSON body', async () => {
    vi.mocked(fetch).mockResolvedValue(jsonResponse({ id: 'user-1' }))

    const result = await getJson<{ id: string }>('/auth/me')

    expect(result).toEqual({ id: 'user-1' })
    expect(fetch).toHaveBeenCalledWith(expect.stringContaining('/auth/me'), expect.objectContaining({ method: 'GET' }))
  })
})

describe('patchJson', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
    clearAccessToken()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    clearAccessToken()
  })

  it('sends a PATCH request with a JSON body and returns the parsed response', async () => {
    vi.mocked(fetch).mockResolvedValue(jsonResponse({ id: 'user-1', active: false }))

    const result = await patchJson('/admin/users/user-1', { active: false })

    expect(result).toEqual({ id: 'user-1', active: false })
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('/admin/users/user-1'),
      expect.objectContaining({
        method: 'PATCH',
        headers: expect.objectContaining({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ active: false }),
      }),
    )
  })
})

describe('deleteJson', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
    clearAccessToken()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    clearAccessToken()
  })

  it('sends a DELETE request and resolves with no value on a 204 response', async () => {
    vi.mocked(fetch).mockResolvedValue(new Response(null, { status: 204 }))

    const result = await deleteJson('/admin/users/user-1')

    expect(result).toBeUndefined()
    expect(fetch).toHaveBeenCalledWith(expect.stringContaining('/admin/users/user-1'), expect.objectContaining({ method: 'DELETE' }))
  })
})

describe('token attachment and session clearing', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
    clearAccessToken()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    clearAccessToken()
  })

  it('attaches an Authorization header when a token is present', async () => {
    setAccessToken('jwt-token')
    vi.mocked(fetch).mockResolvedValue(jsonResponse({ ok: true }))

    await getJson('/auth/me')

    expect(fetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ headers: expect.objectContaining({ Authorization: 'Bearer jwt-token' }) }),
    )
  })

  it('sends no Authorization header when there is no token', async () => {
    vi.mocked(fetch).mockResolvedValue(jsonResponse({ ok: true }))

    await getJson('/auth/me')

    const [, init] = vi.mocked(fetch).mock.calls[0]
    expect((init?.headers as Record<string, string>).Authorization).toBeUndefined()
  })

  it('clears the stored token on a 401 response when a token was sent', async () => {
    setAccessToken('jwt-token')
    vi.mocked(fetch).mockResolvedValue(jsonResponse({ statusCode: 401, message: 'Invalid or expired token' }, 401))

    await expect(getJson('/auth/me')).rejects.toBeInstanceOf(ApiError)

    expect(accessToken.value).toBeNull()
  })

  it('does not clear anything on a 401 response when no token was sent', async () => {
    vi.mocked(fetch).mockResolvedValue(jsonResponse({ statusCode: 401, message: 'Invalid credentials' }, 401))

    await expect(postJson('/auth/login', { email: 'a@b.com', password: 'wrong' })).rejects.toBeInstanceOf(ApiError)

    expect(accessToken.value).toBeNull()
  })
})
