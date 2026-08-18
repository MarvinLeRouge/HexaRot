# FEAT-015 Decode View Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the frontend's second view (`/decode`): the user uploads a PNG or SVG cryptogram file (click-to-browse or drag-and-drop), enters the HR key and the cryptogram's size, and sees the decoded plaintext message.

**Architecture:** Reuses all of FEAT-014's shared infrastructure unchanged (`vue-router`'s existing `/decode` route, `src/api/client.ts`, the Pinia-store-per-view pattern, `isValidKeyFormat`). Adds one new Pinia store (`useDecodeStore`), a file-upload component (`DecodeUploadArea.vue`, native HTML5 drag-and-drop, no library), a params form (`DecodeParamsForm.vue`), and the routed view (`DecodeView.vue`) - no new shared infrastructure.

**Tech Stack:** Vue 3.5, TypeScript strict, Pinia 3, `vue-i18n` 9, Vitest 3 + `@vue/test-utils` 2.4 + jsdom (all already configured by FEAT-014).

**Spec:** `docs/superpowers/specs/2026-08-18-feat-015-decode-view-design.md`

**Test contract:** `docs/tests/frontend.md` section 3 ("Decode view") and section 4 ("Decode store") - Task 4's integration spec must cover every bullet listed there.

## Global Constraints

- Every user-visible string goes through a `vue-i18n` key in `src/locales/en.json`, under a `decode.*` namespace (`decode.upload.*`, `decode.form.*`, `decode.result.*`) - no hardcoded literal text in any template.
- No CSS framework. Plain scoped `<style>` blocks, functional and minimal.
- Test bodies never contain a bare `for`/`while`/`if`. Use `it.each` for parameterized cases.
- `src/api/client.ts` is the only module allowed to call `fetch` directly. `useDecodeStore` calls `postJson`; its own tests mock `'../api/client'`, not `fetch`.
- File format is detected by extension (`.png`/`.svg`, case-insensitive), never by MIME type.
- `size` is a manual `small`/`medium`/`large` selector defaulting to `'medium'` - no auto-detection.
- Drag-and-drop uses native HTML5 events (`dragover`/`dragleave`/`drop`) - no new dependency.
- Backend request/response shapes are copied verbatim from `backend/src/api/dto/decode-request.dto.ts` (`cryptogram: string`, `format: 'png'|'svg'`, `key: string`, `size: 'small'|'medium'|'large'`, all required) and `backend/src/api/decode.service.ts`'s `DecodeResult` (`{ message: string }`).

---

### Task 1: Decode Pinia store and shared fixtures

**Files:**
- Modify: `frontend/src/__fixtures__/frontend.fixtures.ts`
- Create: `frontend/src/stores/decode.ts`
- Create: `frontend/src/stores/decode.spec.ts`

**Interfaces:**
- Consumes: `postJson`/`ApiError` from `src/api/client.ts` (unchanged from FEAT-014 - `postJson<TResponse>(path, body): Promise<TResponse>`, `ApiError` with `message: string`, `code: 'http' | 'network'`, `status?: number`).
- Produces: `useDecodeStore` Pinia store - state fields `file: File | null`, `keyInput: string`, `size: 'small' | 'medium' | 'large'`, `status: 'idle' | 'loading' | 'success' | 'error'`, `result: string | null`, `errorMessage: string | null`, `errorCode: 'network' | 'unknown' | null`; actions `submit(): Promise<void>` and `reset(): void`. Tasks 2-4 consume this store via `useDecodeStore()`. `MOCK_DECODE_RESPONSE`, `MOCK_PNG_FILE`, `MOCK_SVG_FILE` exported from `src/__fixtures__/frontend.fixtures.ts` (Task 2's and Task 4's tests consume these); `TINY_PNG_BASE64` and `SVG_CRYPTOGRAM_CONTENT` also exported from the same file (this task's own test consumes them, to assert the exact base64/text round-trip without duplicating the literal).

- [ ] **Step 1: Extend the shared fixtures file**

`frontend/src/__fixtures__/frontend.fixtures.ts` currently has a private (non-exported) `const TINY_PNG_BASE64 = '...'` used only by `MOCK_ENCODE_RESPONSE`. Change its declaration from `const TINY_PNG_BASE64 =` to `export const TINY_PNG_BASE64 =` (widen visibility only - the value and every existing use stay exactly as they are).

Then append these new exports at the end of the file:

```typescript
function base64ToBytes(base64: string): Uint8Array {
  return Uint8Array.from(atob(base64), (char) => char.charCodeAt(0))
}

export const MOCK_PNG_FILE = new File([base64ToBytes(TINY_PNG_BASE64)], 'cryptogram.png', {
  type: 'image/png',
})

export const SVG_CRYPTOGRAM_CONTENT =
  '<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"><rect width="10" height="10" fill="#000"/></svg>'

export const MOCK_SVG_FILE = new File([SVG_CRYPTOGRAM_CONTENT], 'cryptogram.svg', {
  type: 'image/svg+xml',
})

export const MOCK_DECODE_RESPONSE = {
  message: 'HELLO WORLD',
}
```

The full file's exports after this step: `TINY_PNG_BASE64`, `MOCK_ENCODE_RESPONSE`, `MOCK_ENCODE_RESPONSE_WITH_WARNINGS`, `MALFORMED_KEY` (all pre-existing, `TINY_PNG_BASE64` newly exported), plus the five new ones above.

- [ ] **Step 2: Write the failing store tests**

Create `frontend/src/stores/decode.spec.ts`:

```typescript
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
})
```

- [ ] **Step 3: Run the tests and confirm they fail**

Run: `npm test -- src/stores/decode.spec.ts`
Expected: FAIL - `./decode` does not exist yet.

- [ ] **Step 4: Implement the store**

Create `frontend/src/stores/decode.ts`:

```typescript
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

      const format = detectFormat(file)
      const cryptogram = format === 'png' ? await readFileAsBase64(file) : await readFileAsText(file)

      try {
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
```

- [ ] **Step 5: Run the tests and confirm they pass**

Run: `npm test -- src/stores/decode.spec.ts`
Expected: PASS, all 8 tests green.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/__fixtures__/frontend.fixtures.ts frontend/src/stores/decode.ts frontend/src/stores/decode.spec.ts
git commit -m "feat(frontend): add decode Pinia store and decode-related test fixtures"
```

---

### Task 2: File upload area (drag-and-drop + click-to-browse)

**Files:**
- Create: `frontend/src/components/DecodeUploadArea.vue`
- Create: `frontend/src/components/DecodeUploadArea.spec.ts`
- Modify: `frontend/src/locales/en.json`

**Interfaces:**
- Consumes: nothing from earlier tasks (a leaf component - only reads the fixtures in its own test).
- Produces: `DecodeUploadArea.vue`, a `v-model`-compatible component: prop `modelValue: File | null`, event `update:modelValue` with the selected `File`. Task 3's `DecodeParamsForm.vue` consumes this as `<DecodeUploadArea v-model="store.file" />`.

- [ ] **Step 1: Add the component's i18n keys**

Add a `decode` top-level key to `frontend/src/locales/en.json`, as a sibling of the existing `nav`/`encode`/`errors` keys:

```json
"decode": {
  "upload": {
    "browse": "Choose a file",
    "dropHint": "or drag and drop a PNG or SVG file here",
    "invalidExtension": "Only .png and .svg files are supported."
  }
}
```

Do not touch `nav`, `encode`, or `errors` - only add this new `decode` key alongside them.

- [ ] **Step 2: Write the failing tests**

Create `frontend/src/components/DecodeUploadArea.spec.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { createI18n } from 'vue-i18n'
import DecodeUploadArea from './DecodeUploadArea.vue'
import en from '../locales/en.json'
import { MOCK_PNG_FILE, MOCK_SVG_FILE } from '../__fixtures__/frontend.fixtures'

const i18n = createI18n({ legacy: false, locale: 'en', messages: { en } })

function mountArea(modelValue: File | null = null) {
  return mount(DecodeUploadArea, {
    props: { modelValue },
    global: { plugins: [i18n] },
  })
}

describe('DecodeUploadArea', () => {
  it.each([
    ['PNG', MOCK_PNG_FILE],
    ['SVG', MOCK_SVG_FILE],
  ])('emits the selected %s file when chosen via the file input', async (_label, file) => {
    const wrapper = mountArea()
    const input = wrapper.find('input[type="file"]')
    Object.defineProperty(input.element, 'files', { value: [file], writable: false })

    await input.trigger('change')

    expect(wrapper.emitted('update:modelValue')).toEqual([[file]])
  })

  it('shows an inline error and does not emit for an unsupported extension', async () => {
    const invalidFile = new File(['not a cryptogram'], 'notes.txt', { type: 'text/plain' })
    const wrapper = mountArea()
    const input = wrapper.find('input[type="file"]')
    Object.defineProperty(input.element, 'files', { value: [invalidFile], writable: false })

    await input.trigger('change')

    expect(wrapper.emitted('update:modelValue')).toBeUndefined()
    expect(wrapper.find('.decode-upload-area__error').exists()).toBe(true)
  })

  it('emits the dropped file when a valid file is dropped', async () => {
    const wrapper = mountArea()

    await wrapper.find('.decode-upload-area').trigger('drop', {
      dataTransfer: { files: [MOCK_PNG_FILE] },
    })

    expect(wrapper.emitted('update:modelValue')).toEqual([[MOCK_PNG_FILE]])
  })

  it('displays the filename once a file is selected', () => {
    const wrapper = mountArea(MOCK_PNG_FILE)
    expect(wrapper.text()).toContain(MOCK_PNG_FILE.name)
  })

  it('does not display a filename when no file is selected', () => {
    const wrapper = mountArea(null)
    expect(wrapper.text()).not.toContain(MOCK_PNG_FILE.name)
  })
})
```

- [ ] **Step 3: Run the tests and confirm they fail**

Run: `npm test -- src/components/DecodeUploadArea.spec.ts`
Expected: FAIL - `DecodeUploadArea.vue` does not exist yet.

- [ ] **Step 4: Implement the component**

Create `frontend/src/components/DecodeUploadArea.vue`:

```vue
<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'

const props = defineProps<{
  modelValue: File | null
}>()

const emit = defineEmits<{
  'update:modelValue': [value: File]
}>()

const { t } = useI18n()

const isDragging = ref(false)
const formatError = ref<string | null>(null)
const fileInput = ref<HTMLInputElement | null>(null)

function isValidExtension(file: File): boolean {
  return /\.(png|svg)$/i.test(file.name)
}

function selectFile(file: File): void {
  if (!isValidExtension(file)) {
    formatError.value = t('decode.upload.invalidExtension')
    return
  }
  formatError.value = null
  emit('update:modelValue', file)
}

function handleInputChange(event: Event): void {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  if (file) selectFile(file)
}

function handleDrop(event: DragEvent): void {
  isDragging.value = false
  const file = event.dataTransfer?.files?.[0]
  if (file) selectFile(file)
}

function handleDragOver(): void {
  isDragging.value = true
}

function handleDragLeave(): void {
  isDragging.value = false
}

function triggerBrowse(): void {
  fileInput.value?.click()
}
</script>

<template>
  <div
    class="decode-upload-area"
    :class="{ 'decode-upload-area--dragging': isDragging }"
    @dragover.prevent="handleDragOver"
    @dragleave.prevent="handleDragLeave"
    @drop.prevent="handleDrop"
  >
    <input
      ref="fileInput"
      type="file"
      accept=".png,.svg"
      class="decode-upload-area__input"
      @change="handleInputChange"
    >
    <button type="button" @click="triggerBrowse">{{ t('decode.upload.browse') }}</button>
    <p>{{ t('decode.upload.dropHint') }}</p>
    <p v-if="modelValue" class="decode-upload-area__filename">{{ modelValue.name }}</p>
    <p v-if="formatError" class="decode-upload-area__error" role="alert">{{ formatError }}</p>
  </div>
</template>

<style scoped>
.decode-upload-area {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 16px;
  border: 2px dashed var(--border);
  border-radius: 4px;
}

.decode-upload-area--dragging {
  border-color: var(--accent);
}

.decode-upload-area__input {
  display: none;
}

.decode-upload-area__error {
  color: #c0392b;
}
</style>
```

- [ ] **Step 5: Run the tests and confirm they pass**

Run: `npm test -- src/components/DecodeUploadArea.spec.ts`
Expected: PASS, all 6 test cases green.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/components/DecodeUploadArea.vue frontend/src/components/DecodeUploadArea.spec.ts frontend/src/locales/en.json
git commit -m "feat(frontend): add file upload area with drag-and-drop for the decode view"
```

---

### Task 3: Decode parameters form

**Files:**
- Create: `frontend/src/components/DecodeParamsForm.vue`
- Modify: `frontend/src/locales/en.json`

**Interfaces:**
- Consumes: `useDecodeStore` (Task 1), `DecodeUploadArea.vue` (Task 2), `isValidKeyFormat` from `src/utils/key-format.ts` (unchanged from FEAT-014 - `(key: string): boolean`).
- Produces: `DecodeParamsForm.vue`, a component with no props (reads/writes `useDecodeStore()` directly). Task 4's `DecodeView.vue` renders it as `<DecodeParamsForm />`. No dedicated spec file - its behavior is verified by Task 4's `DecodeView.spec.ts` integration test, same reasoning as FEAT-014's `EncodeParamsForm`.

- [ ] **Step 1: Add the form's i18n keys**

Extend the `decode` key in `frontend/src/locales/en.json` (added in Task 2) to its full shape - add `form` as a sibling of the existing `upload` key:

```json
"decode": {
  "upload": {
    "browse": "Choose a file",
    "dropHint": "or drag and drop a PNG or SVG file here",
    "invalidExtension": "Only .png and .svg files are supported."
  },
  "form": {
    "upload": {
      "label": "Cryptogram file"
    },
    "key": {
      "label": "HexaRot key",
      "placeholder": "HR1·xxxx",
      "formatError": "This does not look like a valid HexaRot key."
    },
    "size": {
      "label": "Cryptogram size",
      "small": "Small",
      "medium": "Medium",
      "large": "Large"
    },
    "submit": {
      "label": "Decode",
      "loading": "Decoding..."
    }
  }
}
```

(`upload` at the top of `decode` stays as Task 2 added it - only `form` is new here.)

- [ ] **Step 2: Implement the component**

Create `frontend/src/components/DecodeParamsForm.vue`:

```vue
<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useDecodeStore } from '../stores/decode'
import { isValidKeyFormat } from '../utils/key-format'
import DecodeUploadArea from './DecodeUploadArea.vue'

const store = useDecodeStore()
const { t } = useI18n()

const keyFormatError = computed(() => {
  if (store.keyInput.length === 0) return null
  return isValidKeyFormat(store.keyInput) ? null : t('decode.form.key.formatError')
})

const canSubmit = computed(() => {
  if (store.status === 'loading') return false
  if (store.file === null) return false
  return store.keyInput.length > 0 && keyFormatError.value === null
})

function handleSubmit(): void {
  if (!canSubmit.value) return
  void store.submit()
}
</script>

<template>
  <form class="decode-params-form" @submit.prevent="handleSubmit">
    <div class="decode-params-form__field">
      {{ t('decode.form.upload.label') }}
      <DecodeUploadArea v-model="store.file" />
    </div>

    <label class="decode-params-form__field">
      {{ t('decode.form.key.label') }}
      <input v-model="store.keyInput" type="text" :placeholder="t('decode.form.key.placeholder')">
    </label>
    <p v-if="keyFormatError" class="decode-params-form__error" role="alert">{{ keyFormatError }}</p>

    <label class="decode-params-form__field">
      {{ t('decode.form.size.label') }}
      <select v-model="store.size" name="size">
        <option value="small">{{ t('decode.form.size.small') }}</option>
        <option value="medium">{{ t('decode.form.size.medium') }}</option>
        <option value="large">{{ t('decode.form.size.large') }}</option>
      </select>
    </label>

    <button type="submit" :disabled="!canSubmit">
      {{ store.status === 'loading' ? t('decode.form.submit.loading') : t('decode.form.submit.label') }}
    </button>
  </form>
</template>

<style scoped>
.decode-params-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
  max-width: 480px;
}

.decode-params-form__field {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.decode-params-form__error {
  color: #c0392b;
}
</style>
```

- [ ] **Step 3: Verify the build is clean**

Run from `frontend/`: `npm run build`
Expected: exits 0. (No dedicated spec for this task - behavioral verification happens in Task 4.)

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/DecodeParamsForm.vue frontend/src/locales/en.json
git commit -m "feat(frontend): add decode parameters form"
```

---

### Task 4: Decode view assembly, integration tests, and roadmap update

**Files:**
- Create: `frontend/src/views/DecodeView.vue` (overwrites the 3-line stub)
- Create: `frontend/src/views/DecodeView.spec.ts`
- Modify: `frontend/src/locales/en.json`
- Modify: `README.md`
- Modify: `README.fr.md`

**Interfaces:**
- Consumes: `useDecodeStore` (Task 1), `DecodeParamsForm.vue` (Task 3), `MOCK_DECODE_RESPONSE`/`MOCK_PNG_FILE`/`MOCK_SVG_FILE` (Task 1), `postJson`/`ApiError` (mocked in tests, from `src/api/client.ts`).
- Produces: the routed `/decode` page. Nothing downstream in this plan consumes this task's output - it is the plan's final deliverable.

- [ ] **Step 1: Add the view's remaining i18n keys**

Add `title` and `result` as siblings of `upload`/`form` inside the existing `decode` object in `frontend/src/locales/en.json`:

```json
"decode": {
  "title": "Decode a cryptogram",
  "upload": { ... },
  "form": { ... },
  "result": {
    "label": "Decoded message"
  }
}
```

(Keep the existing `upload` and `form` objects from Tasks 2/3 unchanged - only add `title` and `result` at the same nesting level.)

- [ ] **Step 2: Write the failing integration tests**

Create `frontend/src/views/DecodeView.spec.ts`. This covers every bullet in `docs/tests/frontend.md` section 3 (`DecodeView`) and section 4 (`useDecodeStore`, already covered by Task 1's own store spec but exercised again here end-to-end):

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createI18n } from 'vue-i18n'
import DecodeView from './DecodeView.vue'
import en from '../locales/en.json'
import {
  MOCK_DECODE_RESPONSE,
  MOCK_PNG_FILE,
  MOCK_SVG_FILE,
  MALFORMED_KEY,
} from '../__fixtures__/frontend.fixtures'
import { ApiError } from '../api/client'

vi.mock('../api/client', async () => {
  const actual = await vi.importActual<typeof import('../api/client')>('../api/client')
  return { ...actual, postJson: vi.fn() }
})

import { postJson } from '../api/client'

function mountView() {
  const i18n = createI18n({ legacy: false, locale: 'en', messages: { en } })
  return mount(DecodeView, {
    global: { plugins: [createPinia(), i18n] },
  })
}

async function selectFile(wrapper: ReturnType<typeof mountView>, file: File) {
  const input = wrapper.find('input[type="file"]')
  Object.defineProperty(input.element, 'files', { value: [file], writable: false })
  await input.trigger('change')
}

describe('DecodeView', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.mocked(postJson).mockReset()
  })

  describe('initial state', () => {
    it('renders the file upload area', () => {
      const wrapper = mountView()
      expect(wrapper.find('input[type="file"]').exists()).toBe(true)
    })

    it('renders the HR key input field', () => {
      const wrapper = mountView()
      expect(wrapper.find('input[type="text"]').exists()).toBe(true)
    })

    it('renders the submit button', () => {
      const wrapper = mountView()
      expect(wrapper.find('button[type="submit"]').exists()).toBe(true)
    })

    it('does not display a decoded message on initial render', () => {
      const wrapper = mountView()
      expect(wrapper.find('.decode-view__result').exists()).toBe(false)
    })
  })

  describe('file upload', () => {
    it('accepts a PNG file via the file input', async () => {
      const wrapper = mountView()
      await selectFile(wrapper, MOCK_PNG_FILE)
      expect(wrapper.text()).toContain(MOCK_PNG_FILE.name)
    })

    it('accepts an SVG file via the file input', async () => {
      const wrapper = mountView()
      await selectFile(wrapper, MOCK_SVG_FILE)
      expect(wrapper.text()).toContain(MOCK_SVG_FILE.name)
    })

    it('rejects files with unsupported extensions and shows an error', async () => {
      const wrapper = mountView()
      const invalidFile = new File(['x'], 'notes.txt', { type: 'text/plain' })
      await selectFile(wrapper, invalidFile)
      expect(wrapper.find('.decode-upload-area__error').exists()).toBe(true)
    })

    it('displays the uploaded filename after selection', async () => {
      const wrapper = mountView()
      await selectFile(wrapper, MOCK_PNG_FILE)
      expect(wrapper.text()).toContain('cryptogram.png')
    })

    it('supports drag-and-drop (dragover and drop events are handled)', async () => {
      const wrapper = mountView()
      const dropZone = wrapper.find('.decode-upload-area')
      await dropZone.trigger('dragover')
      await dropZone.trigger('drop', { dataTransfer: { files: [MOCK_PNG_FILE] } })
      expect(wrapper.text()).toContain(MOCK_PNG_FILE.name)
    })
  })

  describe('form submission', () => {
    it('calls the decode API with the file content and key when submitted', async () => {
      vi.mocked(postJson).mockResolvedValue(MOCK_DECODE_RESPONSE)
      const wrapper = mountView()
      await selectFile(wrapper, MOCK_PNG_FILE)
      await wrapper.find('input[type="text"]').setValue('HR1·a1b2')

      await wrapper.find('form').trigger('submit')
      await flushPromises()

      expect(postJson).toHaveBeenCalledWith(
        '/decode',
        expect.objectContaining({ format: 'png', key: 'HR1·a1b2', size: 'medium' }),
      )
    })

    it('shows a loading indicator while the API call is in progress', async () => {
      vi.mocked(postJson).mockReturnValue(new Promise(() => {}))
      const wrapper = mountView()
      await selectFile(wrapper, MOCK_PNG_FILE)
      await wrapper.find('input[type="text"]').setValue('HR1·a1b2')

      await wrapper.find('form').trigger('submit')
      await flushPromises()

      expect(wrapper.find('button[type="submit"]').text()).toBe('Decoding...')
    })
  })

  describe('successful response', () => {
    it('displays the decoded message after a successful decode response', async () => {
      vi.mocked(postJson).mockResolvedValue(MOCK_DECODE_RESPONSE)
      const wrapper = mountView()
      await selectFile(wrapper, MOCK_PNG_FILE)
      await wrapper.find('input[type="text"]').setValue('HR1·a1b2')

      await wrapper.find('form').trigger('submit')
      await flushPromises()

      expect(wrapper.find('.decode-view__result').text()).toContain(MOCK_DECODE_RESPONSE.message)
    })
  })

  describe('error handling', () => {
    it('displays an error when the key format is invalid (client-side, before the API call)', async () => {
      const wrapper = mountView()
      await selectFile(wrapper, MOCK_PNG_FILE)
      await wrapper.find('input[type="text"]').setValue(MALFORMED_KEY)

      expect(wrapper.find('.decode-params-form__error').exists()).toBe(true)
      expect(wrapper.find('button[type="submit"]').attributes('disabled')).toBeDefined()
      expect(postJson).not.toHaveBeenCalled()
    })

    it('displays an error when the API call fails', async () => {
      vi.mocked(postJson).mockRejectedValue(new ApiError('invalid key', 'http', 400))
      const wrapper = mountView()
      await selectFile(wrapper, MOCK_PNG_FILE)
      await wrapper.find('input[type="text"]').setValue('HR1·a1b2')

      await wrapper.find('form').trigger('submit')
      await flushPromises()

      expect(wrapper.text()).toContain('invalid key')
    })

    it('does not display a decoded message after an API error', async () => {
      vi.mocked(postJson).mockRejectedValue(new ApiError('invalid key', 'http', 400))
      const wrapper = mountView()
      await selectFile(wrapper, MOCK_PNG_FILE)
      await wrapper.find('input[type="text"]').setValue('HR1·a1b2')

      await wrapper.find('form').trigger('submit')
      await flushPromises()

      expect(wrapper.find('.decode-view__result').exists()).toBe(false)
    })
  })

  describe('i18n', () => {
    it('renders no raw string literals - the submit button text comes from the locale file', () => {
      const wrapper = mountView()
      expect(wrapper.find('button[type="submit"]').text()).toBe(en.decode.form.submit.label)
    })
  })
})
```

- [ ] **Step 3: Run the tests and confirm they fail**

Run: `npm test -- src/views/DecodeView.spec.ts`
Expected: FAIL - `DecodeView.vue` is still the 3-line stub (`<div>DecodeView</div>`), none of the selectors exist.

- [ ] **Step 4: Implement the view**

Replace the full contents of `frontend/src/views/DecodeView.vue`:

```vue
<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { useDecodeStore } from '../stores/decode'
import DecodeParamsForm from '../components/DecodeParamsForm.vue'

const store = useDecodeStore()
const { t } = useI18n()
</script>

<template>
  <div class="decode-view">
    <h1>{{ t('decode.title') }}</h1>
    <DecodeParamsForm />
    <p v-if="store.status === 'error'" class="decode-view__error" role="alert">
      {{ store.errorMessage ?? t(`errors.${store.errorCode}`) }}
    </p>
    <p v-if="store.status === 'success' && store.result" class="decode-view__result">
      <strong>{{ t('decode.result.label') }}:</strong> {{ store.result }}
    </p>
  </div>
</template>

<style scoped>
.decode-view {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.decode-view__error {
  color: #c0392b;
}
</style>
```

- [ ] **Step 5: Run the tests and confirm they pass**

Run: `npm test -- src/views/DecodeView.spec.ts`
Expected: PASS, all tests green.

Then run the full frontend suite: `npm test`
Expected: PASS - every spec file from Tasks 1-4 green together with FEAT-014's existing suite (no cross-test pollution from shared mocks/fixtures).

- [ ] **Step 6: Update the README roadmap**

In `README.md`, replace the line:

```markdown
- 🔄 Frontend (encode view done; decode view, key view still open)
```

with:

```markdown
- 🔄 Frontend (encode view, decode view done; key view still open)
```

In `README.fr.md`, replace the line:

```markdown
- 🔄 Frontend (vue encodage terminée ; vue décodage, vue clé restantes)
```

with:

```markdown
- 🔄 Frontend (vue encodage, vue décodage terminées ; vue clé restante)
```

- [ ] **Step 7: Commit**

```bash
git add frontend/src/views/DecodeView.vue frontend/src/views/DecodeView.spec.ts frontend/src/locales/en.json README.md README.fr.md
git commit -m "feat(frontend): assemble the decode view and wire it into the router"
```

- [ ] **Step 8: Real functional check (not just the automated suite)**

Per the project's standing rule that every feature producing a user-facing result gets a real, manual check in addition to its automated tests:

1. Start the backend for real against a real database (a throwaway Postgres container, `prisma migrate deploy`, `prisma db seed`, then boot the backend - reuse the exact setup from FEAT-014's own verification).
2. Start the frontend for real. Per FEAT-014's final review finding, prefer `docker-compose up` over a bare `npm run dev` if practical, since that is the project's documented deployment path and the one that actually exercises the Vite dev-proxy → backend-container route end to end.
3. First, encode a real message via the `/encode` view (already shipped) to get a real PNG (or SVG) cryptogram, its key, and note the `size` used.
4. Navigate to `/decode`. Upload the PNG (or SVG) via click-to-browse, enter the key from step 3, select the matching `size`, and submit. Confirm the real decoded message matches the original.
5. Try dropping a file via drag-and-drop instead of click-to-browse, and confirm it works identically.
6. Try an intentionally wrong key or wrong `size` and confirm a real error renders.
7. Stop the frontend/backend/database when done, and clean up any container-written root-owned files per `project-docker-functional-test-root-files` if you ran Prisma commands inside a container.

This step has no code artifact - it is a verification gate before considering FEAT-015 done, not a task with a commit.

---

## Post-plan notes (not tasks — for the controller running this plan)

- The approved spec (`docs/superpowers/specs/2026-08-18-feat-015-decode-view-design.md`) currently sits as an untracked file in the main checkout. Per the established pattern (FEAT-012, FEAT-014), copy it into the FEAT-015 worktree and commit it there as the worktree's first commit, before dispatching Task 1 - then delete the stray copy from the main checkout. Fold this plan file into that same first commit.
- `KeyView.vue` is untouched by this plan beyond nothing - it isn't referenced at all here. FEAT-016 is its own scope.
