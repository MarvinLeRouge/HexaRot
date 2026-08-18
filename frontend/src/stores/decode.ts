import { defineStore } from 'pinia'
import { postJson, ApiError } from '../api/client'

export type DecodeStatus = 'idle' | 'loading' | 'success' | 'error'
export type CryptogramSize = 'small' | 'medium' | 'large'

interface DecodeState {
  file: File | null
  keyInput: string
  size: CryptogramSize
  status: DecodeStatus
  result: string | null
  errorMessage: string | null
  errorCode: 'network' | 'unknown' | null
}

function initialState(): DecodeState {
  return {
    file: null,
    keyInput: '',
    size: 'medium',
    status: 'idle',
    result: null,
    errorMessage: null,
    errorCode: null,
  }
}

function detectFormat(file: File): 'png' | 'svg' {
  return /\.svg$/i.test(file.name) ? 'svg' : 'png'
}

function readFileAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const dataUrl = reader.result as string
      resolve(dataUrl.slice(dataUrl.indexOf(',') + 1))
    }
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })
}

function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(reader.error)
    reader.readAsText(file)
  })
}

export const useDecodeStore = defineStore('decode', {
  state: initialState,
  actions: {
    async submit(): Promise<void> {
      const file = this.file
      if (!file) return

      this.status = 'loading'
      this.result = null
      this.errorMessage = null
      this.errorCode = null

      try {
        const format = detectFormat(file)
        const cryptogram = format === 'png' ? await readFileAsBase64(file) : await readFileAsText(file)

        const response = await postJson<{ message: string }>('/decode', {
          cryptogram,
          format,
          key: this.keyInput,
          size: this.size,
        })
        this.result = response.message
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
  },
})
