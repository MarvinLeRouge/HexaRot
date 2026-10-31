import { defineStore } from 'pinia'
import { postJson, ApiError } from '../api/client'
import { normalizeKeyInput } from '../utils/key-format'
import type { ReadingOrder } from '../constants/reading-orders'

export type EncodeMode = 'params' | 'key'
export type RotationDirection = 'cw' | 'ccw'
export type CryptogramSize = 'small' | 'medium' | 'large'
export type EncodeStatus = 'idle' | 'loading' | 'success' | 'error'

/**
 * Mirrors backend/src/api/encode.service.ts's EncodeResult - the raw API
 * response shape. `size` is the size the server actually rendered at (the
 * key's own size in key mode), so it always matches the key and the image,
 * whatever the form says or later changes to.
 */
export interface EncodeResult {
  png: string
  svg: string
  key: string
  warnings: string[]
  unknownChars: string[]
  size: CryptogramSize
}

interface EncodeState {
  mode: EncodeMode
  message: string
  pivotBlockSize: number
  rotationSequence: number[]
  rotationDirection: RotationDirection
  readingOrder: ReadingOrder
  size: CryptogramSize
  keyInput: string
  overrideWeaknessWarning: boolean
  status: EncodeStatus
  result: EncodeResult | null
  resultStale: boolean
  errorMessage: string | null
  errorCode: 'network' | 'unknown' | null
}

function initialState(): EncodeState {
  return {
    mode: 'params',
    message: '',
    pivotBlockSize: 5,
    rotationSequence: [0, 1, 2, 3],
    rotationDirection: 'cw',
    readingOrder: 'LR-TB',
    size: 'medium',
    keyInput: '',
    overrideWeaknessWarning: false,
    status: 'idle',
    result: null,
    resultStale: false,
    errorMessage: null,
    errorCode: null,
  }
}

export const useEncodeStore = defineStore('encode', {
  state: initialState,
  actions: {
    async submit(): Promise<void> {
      this.status = 'loading'
      this.errorMessage = null
      this.errorCode = null
      // `result` and `resultStale` are deliberately left untouched here: a
      // failed submit should not destroy a previous successful, unrecoverable
      // result. Only a successful response replaces it, below.

      const payload =
        this.mode === 'key'
          ? {
              message: this.message,
              key: normalizeKeyInput(this.keyInput),
              overrideWeaknessWarning: this.overrideWeaknessWarning,
            }
          : {
              message: this.message,
              pivotBlockSize: this.pivotBlockSize,
              rotationSequence: this.rotationSequence,
              rotationDirection: this.rotationDirection,
              readingOrder: this.readingOrder,
              size: this.size,
              overrideWeaknessWarning: this.overrideWeaknessWarning,
            }

      try {
        this.result = await postJson<EncodeResult>('/encode', payload)
        this.resultStale = false
        this.status = 'success'
      } catch (err) {
        if (err instanceof ApiError && err.code === 'http') {
          this.errorMessage = err.message
        } else if (err instanceof ApiError && err.code === 'network') {
          this.errorMessage = null
          this.errorCode = 'network'
        } else {
          this.errorMessage = null
          this.errorCode = 'unknown'
        }
        this.status = 'error'
      }
    },
    reset(): void {
      Object.assign(this, initialState())
    },
    /** Marks a previous result stale once the parameters that produced it have changed. */
    invalidateResult(): void {
      if (this.status !== 'success') return
      this.resultStale = true
    },
  },
})
