import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useEncodeStore } from './encode'
import { ApiError } from '../api/client'
import { MOCK_ENCODE_RESPONSE } from '../__fixtures__/frontend.fixtures'

vi.mock('../api/client', async () => {
  const actual = await vi.importActual<typeof import('../api/client')>('../api/client')
  return { ...actual, postJson: vi.fn() }
})

import { postJson } from '../api/client'

describe('useEncodeStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.mocked(postJson).mockReset()
  })

  it('initialises with default field values and no result or error', () => {
    const store = useEncodeStore()

    expect(store.mode).toBe('params')
    expect(store.message).toBe('')
    expect(store.pivotBlockSize).toBe(5)
    expect(store.rotationSequence).toEqual([0, 1, 2, 3])
    expect(store.rotationDirection).toBe('cw')
    expect(store.readingOrder).toBe('LR-TB')
    expect(store.size).toBe('medium')
    expect(store.overrideWeaknessWarning).toBe(false)
    expect(store.status).toBe('idle')
    expect(store.result).toBeNull()
    expect(store.errorMessage).toBeNull()
    expect(store.errorCode).toBeNull()
  })

  it.each([
    ['params', { message: 'hi', pivotBlockSize: 5, rotationSequence: [0, 1, 2, 3], rotationDirection: 'cw', readingOrder: 'LR-TB', size: 'medium', overrideWeaknessWarning: false }],
    ['key', { message: 'hi', key: 'HR1·a1b2', size: 'medium', overrideWeaknessWarning: false }],
  ])('builds the %s-mode payload correctly when submitting', async (mode, expectedPayload) => {
    vi.mocked(postJson).mockResolvedValue(MOCK_ENCODE_RESPONSE)
    const store = useEncodeStore()
    store.mode = mode as 'params' | 'key'
    store.message = 'hi'
    store.keyInput = 'HR1·a1b2'

    await store.submit()

    expect(postJson).toHaveBeenCalledWith('/encode', expectedPayload)
  })

  it('normalizes a near-miss key (wrong separator, wrong case) before sending it in key mode', async () => {
    vi.mocked(postJson).mockResolvedValue(MOCK_ENCODE_RESPONSE)
    const store = useEncodeStore()
    store.mode = 'key'
    store.message = 'hi'
    store.keyInput = 'hr1.a1b2'

    await store.submit()

    expect(postJson).toHaveBeenCalledWith('/encode', expect.objectContaining({ key: 'HR1·a1b2' }))
  })

  it('sets status to loading while the request is in flight', () => {
    vi.mocked(postJson).mockReturnValue(new Promise(() => {}))
    const store = useEncodeStore()

    void store.submit()

    expect(store.status).toBe('loading')
  })

  it('stores the result and sets status to success on a successful submit', async () => {
    vi.mocked(postJson).mockResolvedValue(MOCK_ENCODE_RESPONSE)
    const store = useEncodeStore()

    await store.submit()

    expect(store.result).toEqual(MOCK_ENCODE_RESPONSE)
    expect(store.status).toBe('success')
    expect(store.errorMessage).toBeNull()
  })

  it('stores the error message and sets status to error on a failed submit', async () => {
    vi.mocked(postJson).mockRejectedValue(new ApiError('message must not be empty', 'http', 400))
    const store = useEncodeStore()

    await store.submit()

    expect(store.status).toBe('error')
    expect(store.errorMessage).toBe('message must not be empty')
    expect(store.result).toBeNull()
  })

  it('sets errorCode to network and leaves errorMessage null on a network failure', async () => {
    vi.mocked(postJson).mockRejectedValue(new ApiError('Network error: unable to reach the server', 'network'))
    const store = useEncodeStore()

    await store.submit()

    expect(store.status).toBe('error')
    expect(store.errorCode).toBe('network')
    expect(store.errorMessage).toBeNull()
  })

  it('clears the previous result when a new submit is dispatched', async () => {
    vi.mocked(postJson).mockResolvedValue(MOCK_ENCODE_RESPONSE)
    const store = useEncodeStore()
    await store.submit()
    expect(store.result).toEqual(MOCK_ENCODE_RESPONSE)

    vi.mocked(postJson).mockReturnValue(new Promise(() => {}))
    void store.submit()

    expect(store.result).toBeNull()
  })

  it('restores default state when reset is called', async () => {
    vi.mocked(postJson).mockResolvedValue(MOCK_ENCODE_RESPONSE)
    const store = useEncodeStore()
    store.message = 'changed'
    await store.submit()

    store.reset()

    expect(store.message).toBe('')
    expect(store.status).toBe('idle')
    expect(store.result).toBeNull()
  })

  describe('invalidateResult', () => {
    it('marks a successful result stale without clearing it', async () => {
      vi.mocked(postJson).mockResolvedValue(MOCK_ENCODE_RESPONSE)
      const store = useEncodeStore()
      await store.submit()

      store.invalidateResult()

      expect(store.status).toBe('success')
      expect(store.result).toEqual(MOCK_ENCODE_RESPONSE)
      expect(store.resultStale).toBe(true)
    })

    it('does nothing when there is no successful result to invalidate', () => {
      const store = useEncodeStore()

      store.invalidateResult()

      expect(store.status).toBe('idle')
      expect(store.resultStale).toBe(false)
    })

    it('does not mark an in-flight request stale', () => {
      vi.mocked(postJson).mockReturnValue(new Promise(() => {}))
      const store = useEncodeStore()
      void store.submit()

      store.invalidateResult()

      expect(store.status).toBe('loading')
      expect(store.resultStale).toBe(false)
    })

    it('a new submit clears the stale flag', async () => {
      vi.mocked(postJson).mockResolvedValue(MOCK_ENCODE_RESPONSE)
      const store = useEncodeStore()
      await store.submit()
      store.invalidateResult()
      expect(store.resultStale).toBe(true)

      await store.submit()

      expect(store.resultStale).toBe(false)
    })
  })
})
