import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useKeyStore } from './key'
import { ApiError } from '../api/client'
import { MOCK_KEY_GENERATE_RESPONSE, MOCK_KEY_PARSE_RESPONSE } from '../__fixtures__/frontend.fixtures'

vi.mock('../api/client', async () => {
  const actual = await vi.importActual<typeof import('../api/client')>('../api/client')
  return { ...actual, postJson: vi.fn(), getJson: vi.fn() }
})

import { postJson, getJson } from '../api/client'

describe('useKeyStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.mocked(postJson).mockReset()
    vi.mocked(getJson).mockReset()
  })

  it('initialises with default parameter values and no result or error on either side', () => {
    const store = useKeyStore()

    expect(store.pivotBlockSize).toBe(5)
    expect(store.rotationSequence).toEqual([0, 1, 2, 3])
    expect(store.rotationDirection).toBe('cw')
    expect(store.readingOrder).toBe('LR-TB')
    expect(store.generateStatus).toBe('idle')
    expect(store.generatedKey).toBeNull()
    expect(store.generateErrorMessage).toBeNull()
    expect(store.generateErrorCode).toBeNull()

    expect(store.keyInput).toBe('')
    expect(store.parseStatus).toBe('idle')
    expect(store.parsedParams).toBeNull()
    expect(store.parseErrorMessage).toBeNull()
    expect(store.parseErrorCode).toBeNull()
  })

  it('calls postJson with the current generator parameters when generate is dispatched', async () => {
    vi.mocked(postJson).mockResolvedValue(MOCK_KEY_GENERATE_RESPONSE)
    const store = useKeyStore()
    store.pivotBlockSize = 7
    store.rotationDirection = 'ccw'
    store.readingOrder = 'RL-TB'

    await store.generate()

    expect(postJson).toHaveBeenCalledWith('/key/generate', {
      pivotBlockSize: 7,
      rotationSequence: [0, 1, 2, 3],
      rotationDirection: 'ccw',
      readingOrder: 'RL-TB',
    })
  })

  it('sets generateStatus to loading while the generate request is in flight', () => {
    vi.mocked(postJson).mockReturnValue(new Promise(() => {}))
    const store = useKeyStore()

    void store.generate()

    expect(store.generateStatus).toBe('loading')
  })

  it('stores the generated key and sets generateStatus to success on a successful generate', async () => {
    vi.mocked(postJson).mockResolvedValue(MOCK_KEY_GENERATE_RESPONSE)
    const store = useKeyStore()

    await store.generate()

    expect(store.generatedKey).toBe(MOCK_KEY_GENERATE_RESPONSE.key)
    expect(store.generateStatus).toBe('success')
    expect(store.generateErrorMessage).toBeNull()
  })

  it('stores the error message and sets generateStatus to error on a failed generate', async () => {
    vi.mocked(postJson).mockRejectedValue(new ApiError('invalid parameters', 'http', 400))
    const store = useKeyStore()

    await store.generate()

    expect(store.generateStatus).toBe('error')
    expect(store.generateErrorMessage).toBe('invalid parameters')
    expect(store.generatedKey).toBeNull()
  })

  it('sets generateErrorCode to network and leaves generateErrorMessage null on a network failure', async () => {
    vi.mocked(postJson).mockRejectedValue(new ApiError('Network error: unable to reach the server', 'network'))
    const store = useKeyStore()

    await store.generate()

    expect(store.generateStatus).toBe('error')
    expect(store.generateErrorCode).toBe('network')
    expect(store.generateErrorMessage).toBeNull()
  })

  it('sets generateErrorCode to unknown and leaves generateErrorMessage null on a non-ApiError failure', async () => {
    vi.mocked(postJson).mockRejectedValue(new Error('unexpected'))
    const store = useKeyStore()

    await store.generate()

    expect(store.generateStatus).toBe('error')
    expect(store.generateErrorCode).toBe('unknown')
    expect(store.generateErrorMessage).toBeNull()
  })

  it('clears the previous generated key when a new generate is dispatched, without touching parse state', async () => {
    vi.mocked(postJson).mockResolvedValue(MOCK_KEY_GENERATE_RESPONSE)
    vi.mocked(getJson).mockResolvedValue(MOCK_KEY_PARSE_RESPONSE)
    const store = useKeyStore()
    await store.generate()
    store.keyInput = 'HR1·a1b2'
    await store.parse()
    expect(store.parsedParams).toEqual(MOCK_KEY_PARSE_RESPONSE)

    vi.mocked(postJson).mockReturnValue(new Promise(() => {}))
    void store.generate()

    expect(store.generatedKey).toBeNull()
    expect(store.parsedParams).toEqual(MOCK_KEY_PARSE_RESPONSE)
  })

  it('calls getJson with the entered key when parse is dispatched', async () => {
    vi.mocked(getJson).mockResolvedValue(MOCK_KEY_PARSE_RESPONSE)
    const store = useKeyStore()
    store.keyInput = 'HR1·a1b2'

    await store.parse()

    expect(getJson).toHaveBeenCalledWith('/key/parse', { key: 'HR1·a1b2' })
  })

  it('sets parseStatus to loading while the parse request is in flight', () => {
    vi.mocked(getJson).mockReturnValue(new Promise(() => {}))
    const store = useKeyStore()
    store.keyInput = 'HR1·a1b2'

    void store.parse()

    expect(store.parseStatus).toBe('loading')
  })

  it('stores the parsed params and sets parseStatus to success on a successful parse', async () => {
    vi.mocked(getJson).mockResolvedValue(MOCK_KEY_PARSE_RESPONSE)
    const store = useKeyStore()
    store.keyInput = 'HR1·a1b2'

    await store.parse()

    expect(store.parsedParams).toEqual(MOCK_KEY_PARSE_RESPONSE)
    expect(store.parseStatus).toBe('success')
    expect(store.parseErrorMessage).toBeNull()
  })

  it('stores the error message and sets parseStatus to error on a failed parse', async () => {
    vi.mocked(getJson).mockRejectedValue(new ApiError('unsupported key version', 'http', 400))
    const store = useKeyStore()
    store.keyInput = 'HR9·zzzz'

    await store.parse()

    expect(store.parseStatus).toBe('error')
    expect(store.parseErrorMessage).toBe('unsupported key version')
    expect(store.parsedParams).toBeNull()
  })

  it('sets parseErrorCode to network and leaves parseErrorMessage null on a network failure', async () => {
    vi.mocked(getJson).mockRejectedValue(new ApiError('Network error: unable to reach the server', 'network'))
    const store = useKeyStore()
    store.keyInput = 'HR1·a1b2'

    await store.parse()

    expect(store.parseStatus).toBe('error')
    expect(store.parseErrorCode).toBe('network')
    expect(store.parseErrorMessage).toBeNull()
  })

  it('sets parseErrorCode to unknown and leaves parseErrorMessage null on a non-ApiError failure', async () => {
    vi.mocked(getJson).mockRejectedValue(new Error('unexpected'))
    const store = useKeyStore()
    store.keyInput = 'HR1·a1b2'

    await store.parse()

    expect(store.parseStatus).toBe('error')
    expect(store.parseErrorCode).toBe('unknown')
    expect(store.parseErrorMessage).toBeNull()
  })

  it('clears the previous parsed params when a new parse is dispatched, without touching generate state', async () => {
    vi.mocked(getJson).mockResolvedValue(MOCK_KEY_PARSE_RESPONSE)
    vi.mocked(postJson).mockResolvedValue(MOCK_KEY_GENERATE_RESPONSE)
    const store = useKeyStore()
    store.keyInput = 'HR1·a1b2'
    await store.parse()
    await store.generate()
    expect(store.generatedKey).toBe(MOCK_KEY_GENERATE_RESPONSE.key)

    vi.mocked(getJson).mockReturnValue(new Promise(() => {}))
    void store.parse()

    expect(store.parsedParams).toBeNull()
    expect(store.generatedKey).toBe(MOCK_KEY_GENERATE_RESPONSE.key)
  })

  it('restores default state when reset is called', async () => {
    vi.mocked(postJson).mockResolvedValue(MOCK_KEY_GENERATE_RESPONSE)
    vi.mocked(getJson).mockResolvedValue(MOCK_KEY_PARSE_RESPONSE)
    const store = useKeyStore()
    await store.generate()
    store.keyInput = 'HR1·a1b2'
    await store.parse()

    store.reset()

    expect(store.generatedKey).toBeNull()
    expect(store.generateStatus).toBe('idle')
    expect(store.keyInput).toBe('')
    expect(store.parsedParams).toBeNull()
    expect(store.parseStatus).toBe('idle')
  })
})
