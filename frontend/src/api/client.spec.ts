import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { postJson, getJson, ApiError } from './client'

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
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('appends query parameters to the URL', async () => {
    vi.mocked(fetch).mockResolvedValue(jsonResponse({ ok: true }))

    await getJson('/key/parse', { key: 'HR1·a1b2' })

    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('/key/parse?key=HR1%C2%B7a1b2'),
      expect.objectContaining({ method: 'GET' }),
    )
  })

  it('returns the parsed JSON body on a successful response', async () => {
    vi.mocked(fetch).mockResolvedValue(jsonResponse({ pivotBlockSize: 5 }))

    const result = await getJson<{ pivotBlockSize: number }>('/key/parse', { key: 'HR1·a1b2' })

    expect(result).toEqual({ pivotBlockSize: 5 })
  })
})
