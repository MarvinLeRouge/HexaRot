import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useDecodeStore } from './decode'
import { ApiError } from '../api/client'
import {
  MOCK_DECODE_RESPONSE,
  MOCK_PNG_FILE,
  MOCK_SVG_FILE,
  TINY_PNG_BASE64,
  SVG_CRYPTOGRAM_CONTENT,
} from '../__fixtures__/frontend.fixtures'

vi.mock('../api/client', async () => {
  const actual = await vi.importActual<typeof import('../api/client')>('../api/client')
  return { ...actual, postJson: vi.fn() }
})

import { postJson } from '../api/client'

describe('useDecodeStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.mocked(postJson).mockReset()
  })

  it('initialises with default field values and no result or error', () => {
    const store = useDecodeStore()

    expect(store.file).toBeNull()
    expect(store.keyInput).toBe('')
    expect(store.size).toBe('medium')
    expect(store.status).toBe('idle')
    expect(store.result).toBeNull()
    expect(store.errorMessage).toBeNull()
    expect(store.errorCode).toBeNull()
  })

  it('builds the PNG payload with a base64-encoded cryptogram when submitting', async () => {
    vi.mocked(postJson).mockResolvedValue(MOCK_DECODE_RESPONSE)
    const store = useDecodeStore()
    store.file = MOCK_PNG_FILE
    store.keyInput = 'HR1·a1b2'

    await store.submit()

    expect(postJson).toHaveBeenCalledWith('/decode', {
      cryptogram: TINY_PNG_BASE64,
      format: 'png',
      key: 'HR1·a1b2',
      size: 'medium',
    })
  })

  it('normalizes a near-miss key before sending it', async () => {
    vi.mocked(postJson).mockResolvedValue(MOCK_DECODE_RESPONSE)
    const store = useDecodeStore()
    store.file = MOCK_PNG_FILE
    store.keyInput = 'hr1.a1b2'

    await store.submit()

    expect(postJson).toHaveBeenCalledWith('/decode', expect.objectContaining({ key: 'HR1·a1b2' }))
  })

  it('builds the SVG payload with the raw text content when submitting', async () => {
    vi.mocked(postJson).mockResolvedValue(MOCK_DECODE_RESPONSE)
    const store = useDecodeStore()
    store.file = MOCK_SVG_FILE
    store.keyInput = 'HR1·a1b2'

    await store.submit()

    expect(postJson).toHaveBeenCalledWith('/decode', {
      cryptogram: SVG_CRYPTOGRAM_CONTENT,
      format: 'svg',
      key: 'HR1·a1b2',
      size: 'medium',
    })
  })

  it('sets status to loading while the request is in flight', () => {
    vi.mocked(postJson).mockReturnValue(new Promise(() => {}))
    const store = useDecodeStore()
    store.file = MOCK_PNG_FILE
    store.keyInput = 'HR1·a1b2'

    void store.submit()

    expect(store.status).toBe('loading')
  })

  it('stores the result and sets status to success on a successful submit', async () => {
    vi.mocked(postJson).mockResolvedValue(MOCK_DECODE_RESPONSE)
    const store = useDecodeStore()
    store.file = MOCK_PNG_FILE
    store.keyInput = 'HR1·a1b2'

    await store.submit()

    expect(store.result).toBe(MOCK_DECODE_RESPONSE.message)
    expect(store.status).toBe('success')
    expect(store.errorMessage).toBeNull()
  })

  it('stores the error message and sets status to error on a failed submit', async () => {
    vi.mocked(postJson).mockRejectedValue(new ApiError('invalid key', 'http', 400))
    const store = useDecodeStore()
    store.file = MOCK_PNG_FILE
    store.keyInput = 'HR1·a1b2'

    await store.submit()

    expect(store.status).toBe('error')
    expect(store.errorMessage).toBe('invalid key')
    expect(store.result).toBeNull()
  })

  it('sets errorCode to network and leaves errorMessage null on a network failure', async () => {
    vi.mocked(postJson).mockRejectedValue(new ApiError('Network error: unable to reach the server', 'network'))
    const store = useDecodeStore()
    store.file = MOCK_PNG_FILE
    store.keyInput = 'HR1·a1b2'

    await store.submit()

    expect(store.status).toBe('error')
    expect(store.errorCode).toBe('network')
    expect(store.errorMessage).toBeNull()
  })

  it('clears the previous result when a new submit is dispatched', async () => {
    vi.mocked(postJson).mockResolvedValue(MOCK_DECODE_RESPONSE)
    const store = useDecodeStore()
    store.file = MOCK_PNG_FILE
    store.keyInput = 'HR1·a1b2'
    await store.submit()
    expect(store.result).toBe(MOCK_DECODE_RESPONSE.message)

    vi.mocked(postJson).mockReturnValue(new Promise(() => {}))
    void store.submit()

    expect(store.result).toBeNull()
  })

  it('sets errorCode to unknown and status to error when the file cannot be read', async () => {
    const store = useDecodeStore()
    store.file = MOCK_PNG_FILE
    store.keyInput = 'HR1·a1b2'

    const OriginalFileReader = globalThis.FileReader
    class FailingFileReader {
      onload: (() => void) | null = null
      onerror: ((event: unknown) => void) | null = null
      error = new Error('read failed')
      readAsDataURL(): void {
        queueMicrotask(() => this.onerror?.(new Event('error')))
      }
      readAsText(): void {
        queueMicrotask(() => this.onerror?.(new Event('error')))
      }
    }
    // @ts-expect-error -- intentionally stubbing the global for this one test
    globalThis.FileReader = FailingFileReader

    try {
      await store.submit()
    } finally {
      globalThis.FileReader = OriginalFileReader
    }

    expect(store.status).toBe('error')
    expect(store.errorCode).toBe('unknown')
  })

  it('restores default state when reset is called', async () => {
    vi.mocked(postJson).mockResolvedValue(MOCK_DECODE_RESPONSE)
    const store = useDecodeStore()
    store.file = MOCK_PNG_FILE
    store.keyInput = 'HR1·a1b2'
    await store.submit()

    store.reset()

    expect(store.file).toBeNull()
    expect(store.keyInput).toBe('')
    expect(store.status).toBe('idle')
    expect(store.result).toBeNull()
  })

  describe('invalidateResult', () => {
    it('marks a successful result stale without clearing it', async () => {
      vi.mocked(postJson).mockResolvedValue(MOCK_DECODE_RESPONSE)
      const store = useDecodeStore()
      store.file = MOCK_PNG_FILE
      store.keyInput = 'HR1·a1b2'
      await store.submit()

      store.invalidateResult()

      expect(store.status).toBe('success')
      expect(store.result).toBe(MOCK_DECODE_RESPONSE.message)
      expect(store.resultStale).toBe(true)
    })

    it('does nothing when there is no successful result to invalidate', () => {
      const store = useDecodeStore()

      store.invalidateResult()

      expect(store.status).toBe('idle')
      expect(store.resultStale).toBe(false)
    })

    it('does not mark an in-flight request stale', () => {
      vi.mocked(postJson).mockReturnValue(new Promise(() => {}))
      const store = useDecodeStore()
      store.file = MOCK_PNG_FILE
      store.keyInput = 'HR1·a1b2'
      void store.submit()

      store.invalidateResult()

      expect(store.status).toBe('loading')
      expect(store.resultStale).toBe(false)
    })

    it('a new submit clears the stale flag', async () => {
      vi.mocked(postJson).mockResolvedValue(MOCK_DECODE_RESPONSE)
      const store = useDecodeStore()
      store.file = MOCK_PNG_FILE
      store.keyInput = 'HR1·a1b2'
      await store.submit()
      store.invalidateResult()
      expect(store.resultStale).toBe(true)

      await store.submit()

      expect(store.resultStale).toBe(false)
    })
  })
})
