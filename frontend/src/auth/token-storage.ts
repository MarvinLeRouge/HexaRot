import { ref } from 'vue'

const STORAGE_KEY = 'hexarot_access_token'

/** Reactive access token, backed by localStorage. Read by api/client.ts to
 * attach Authorization headers and by stores/auth.ts to expose accessToken
 * without either module importing the other. */
export const accessToken = ref<string | null>(localStorage.getItem(STORAGE_KEY))

export function setAccessToken(token: string): void {
  accessToken.value = token
  localStorage.setItem(STORAGE_KEY, token)
}

export function clearAccessToken(): void {
  accessToken.value = null
  localStorage.removeItem(STORAGE_KEY)
}
