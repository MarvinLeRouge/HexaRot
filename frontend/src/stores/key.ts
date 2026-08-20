import { defineStore } from 'pinia'
import { postJson, getJson, ApiError } from '../api/client'
import { normalizeKeyInput } from '../utils/key-format'
import type { ReadingOrder } from '../constants/reading-orders'

export type RotationDirection = 'cw' | 'ccw'
export type KeyStatus = 'idle' | 'loading' | 'success' | 'error'

/** Mirrors backend/src/api/key.service.ts's KeyParseResult. */
export interface KeyParseResult {
  pivotBlockSize: number
  rotationSequence: number[]
  rotationDirection: RotationDirection
  readingOrder: string
}

interface KeyState {
  pivotBlockSize: number
  rotationSequence: number[]
  rotationDirection: RotationDirection
  readingOrder: ReadingOrder
  generateStatus: KeyStatus
  generatedKey: string | null
  generatedKeyStale: boolean
  generateErrorMessage: string | null
  generateErrorCode: 'network' | 'unknown' | null

  keyInput: string
  parseStatus: KeyStatus
  parsedParams: KeyParseResult | null
  parseErrorMessage: string | null
  parseErrorCode: 'network' | 'unknown' | null
}

function initialState(): KeyState {
  return {
    pivotBlockSize: 5,
    rotationSequence: [0, 1, 2, 3],
    rotationDirection: 'cw',
    readingOrder: 'LR-TB',
    generateStatus: 'idle',
    generatedKey: null,
    generatedKeyStale: false,
    generateErrorMessage: null,
    generateErrorCode: null,

    keyInput: '',
    parseStatus: 'idle',
    parsedParams: null,
    parseErrorMessage: null,
    parseErrorCode: null,
  }
}

export const useKeyStore = defineStore('key', {
  state: initialState,
  actions: {
    async generate(): Promise<void> {
      this.generateStatus = 'loading'
      this.generatedKey = null
      this.generatedKeyStale = false
      this.generateErrorMessage = null
      this.generateErrorCode = null

      try {
        const response = await postJson<{ key: string }>('/key/generate', {
          pivotBlockSize: this.pivotBlockSize,
          rotationSequence: this.rotationSequence,
          rotationDirection: this.rotationDirection,
          readingOrder: this.readingOrder,
        })
        this.generatedKey = response.key
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
      this.parsedParams = null
      this.parseErrorMessage = null
      this.parseErrorCode = null

      try {
        this.parsedParams = await getJson<KeyParseResult>('/key/parse', { key: normalizeKeyInput(this.keyInput) })
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
  },
})
