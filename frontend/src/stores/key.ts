import { defineStore } from 'pinia'
import { postJson, ApiError } from '../api/client'
import { normalizeKeyInput } from '../utils/key-format'
import { generateRandomRotationSequence } from '../utils/random-rotation-sequence'
import type { ReadingOrder } from '../constants/reading-orders'

export type RotationDirection = 'cw' | 'ccw'
export type KeyStatus = 'idle' | 'loading' | 'success' | 'error'

/** Mirrors backend/src/api/key.service.ts's KeyParseResult. */
export interface KeyParseResult {
  pivotBlockSize: number
  rotationSequence: number[]
  /** Always `cw` for a V2 key, whose angles already carry the direction. */
  rotationDirection: RotationDirection
  readingOrder: string
}

interface KeyState {
  pivotBlockSize: number
  rotationSequence: number[]
  readingOrder: ReadingOrder
  generateStatus: KeyStatus
  generatedKey: string | null
  generatedKeyStale: boolean
  generateErrorMessage: string | null
  generateErrorCode: 'network' | 'unknown' | null

  keyInput: string
  parseStatus: KeyStatus
  parsedParams: KeyParseResult | null
  /** The normalized key `parsedParams` came from, to tell V1 keys apart. */
  parsedKey: string | null
  parsedParamsStale: boolean
  parseErrorMessage: string | null
  parseErrorCode: 'network' | 'unknown' | null
}

function initialState(): KeyState {
  return {
    pivotBlockSize: 5,
    rotationSequence: generateRandomRotationSequence(),
    readingOrder: 'LR-TB',
    generateStatus: 'idle',
    generatedKey: null,
    generatedKeyStale: false,
    generateErrorMessage: null,
    generateErrorCode: null,

    keyInput: '',
    parseStatus: 'idle',
    parsedParams: null,
    parsedKey: null,
    parsedParamsStale: false,
    parseErrorMessage: null,
    parseErrorCode: null,
  }
}

export const useKeyStore = defineStore('key', {
  state: initialState,
  actions: {
    async generate(): Promise<void> {
      this.generateStatus = 'loading'
      this.generateErrorMessage = null
      this.generateErrorCode = null
      // `generatedKey` and `generatedKeyStale` are deliberately left
      // untouched here: a failed generate should not destroy a previous
      // successful, unrecoverable key. Only a successful response replaces
      // it, below.

      try {
        const response = await postJson<{ key: string }>('/key/generate', {
          pivotBlockSize: this.pivotBlockSize,
          rotationSequence: this.rotationSequence,
          // V2 keys hold no direction (angles carry it); the API still requires the field.
          rotationDirection: 'cw',
          readingOrder: this.readingOrder,
        })
        this.generatedKey = response.key
        this.generatedKeyStale = false
        this.generateStatus = 'success'
      } catch (err) {
        if (err instanceof ApiError && err.code === 'http') {
          this.generateErrorMessage = err.message
        } else if (err instanceof ApiError && err.code === 'network') {
          this.generateErrorMessage = null
          this.generateErrorCode = 'network'
        } else {
          this.generateErrorMessage = null
          this.generateErrorCode = 'unknown'
        }
        this.generateStatus = 'error'
      }
    },
    async parse(): Promise<void> {
      this.parseStatus = 'loading'
      this.parseErrorMessage = null
      this.parseErrorCode = null
      // `parsedParams` and `parsedParamsStale` are deliberately left
      // untouched here: a failed parse should not destroy a previous
      // successful result. Only a successful response replaces it, below.

      try {
        const key = normalizeKeyInput(this.keyInput)
        this.parsedParams = await postJson<KeyParseResult>('/key/parse', { key })
        this.parsedKey = key
        this.parsedParamsStale = false
        this.parseStatus = 'success'
      } catch (err) {
        if (err instanceof ApiError && err.code === 'http') {
          this.parseErrorMessage = err.message
        } else if (err instanceof ApiError && err.code === 'network') {
          this.parseErrorMessage = null
          this.parseErrorCode = 'network'
        } else {
          this.parseErrorMessage = null
          this.parseErrorCode = 'unknown'
        }
        this.parseStatus = 'error'
      }
    },
    reset(): void {
      Object.assign(this, initialState())
    },
    /** Marks the generated key stale once the parameters that produced it have changed. */
    invalidateGenerated(): void {
      if (this.generateStatus !== 'success') return
      this.generatedKeyStale = true
    },
    /** Marks the parsed parameters stale once the key that produced them has changed. */
    invalidateParsed(): void {
      if (this.parseStatus !== 'success') return
      this.parsedParamsStale = true
    },
  },
})
