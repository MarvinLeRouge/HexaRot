import { defineStore } from 'pinia'
import { postJson, ApiError } from '../api/client'
import type { ReadingOrder } from '../constants/reading-orders'

export type EncodeMode = 'params' | 'key'
export type RotationDirection = 'cw' | 'ccw'
export type CryptogramSize = 'small' | 'medium' | 'large'
export type EncodeStatus = 'idle' | 'loading' | 'success' | 'error'

/** Mirrors backend/src/api/encode.service.ts's EncodeResult. */
export interface EncodeResult {
  png: string
  svg: string
  key: string
  warnings: string[]
  unknownChars: string[]
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
  errorMessage: string | null
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
    errorMessage: null,
  }
}

export const useEncodeStore = defineStore('encode', {
  state: initialState,
  actions: {
    async submit(): Promise<void> {
      this.status = 'loading'
      this.result = null
      this.errorMessage = null

      const payload =
        this.mode === 'key'
          ? {
              message: this.message,
              key: this.keyInput,
              size: this.size,
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
        this.status = 'success'
      } catch (err) {
        this.errorMessage = err instanceof ApiError ? err.message : 'Unknown error'
        this.status = 'error'
      }
    },
    reset(): void {
      Object.assign(this, initialState())
    },
  },
})
