# HexaRot — Test Spec: Frontend Domain

Covers: FEAT-014 (encode view), FEAT-015 (decode view), FEAT-016 (key view),
their associated Pinia stores, FEAT-020 (French interface) and FEAT-025 (help page).

All tests in this document are **unit tests** using Vitest and Vue Test Utils.
API calls are mocked with `vi.mock` — no real HTTP requests are made.

---

## 1. Encode view (FEAT-014)

```
describe('EncodeView')
```

**Initial state**
- it renders the message input field
- it renders all parameter controls (pivotBlockSize, rotationDirection, readingOrder,
  size, rotationSequence)
- it renders the submit button
- it does not display a cryptogram preview on initial render
- it does not display warnings or unknown chars on initial render

**Form submission**
- it calls the encode API with the correct payload when the form is submitted
- it passes the message value from the input field in the API call
- it passes the selected size option in the API call
- it warns and disables submit when the message length, pivot block size and
  size would make an image over the pixel budget, and clears the warning once
  the combination fits
- it says the size and pivot block size cannot be combined, instead of blaming
  the message, when even an empty message would be over the budget
- it hides the size selector in "Existing key" mode, since the key carries its own size
- it takes the displayed size from the API response, so key mode shows the key's size
- it shows a loading indicator while the API call is in progress
- it hides the loading indicator after the API call resolves

**Successful response**
- it displays the PNG preview after a successful encode response
- it displays the SVG preview after a successful encode response
- it displays the HR key returned by the API
- it makes the HR key copyable (copy button present); the copied text is the key alone
- it shows a PNG download link/button
- it shows an SVG download link/button

**Warnings and unknown chars**
- it displays weakness warnings when the API response includes them
- it displays the list of unknown characters when the API response includes them
- it does not display warning or unknown char sections when arrays are empty

**Error handling**
- it displays an error message when the API call returns a 4xx or 5xx response
- it does not display a cryptogram preview after an API error
- it clears the previous result when a new submission is made

**i18n**
- it renders no raw string literals — all visible text comes from i18n keys
  (verified by checking that no hardcoded English strings appear outside the locale file)

---

## 2. Encode store (Pinia)

```
describe('useEncodeStore')
```

- it initialises with null result and no errors
- it sets loading=true when encode action is dispatched
- it sets loading=false after encode action resolves (success or error)
- it stores the PNG, SVG, key, warnings, and unknownChars from a successful response
- it stores the error message from a failed response
- it clears the previous result when a new encode action is dispatched

---

## 3. Decode view (FEAT-015)

```
describe('DecodeView')
```

**Initial state**
- it renders the file upload area
- it renders the HR key input field
- it does not ask for the cryptogram size, since the key carries it
- it renders the submit button
- it does not display a decoded message on initial render

**File upload**
- it accepts a PNG file via the file input
- it accepts an SVG file via the file input
- it rejects files with unsupported extensions and shows an error
- it displays the uploaded filename after selection
- it supports drag-and-drop (dragover and drop events are handled)

**Form submission**
- it calls the decode API with the file content (base64 for PNG, string for SVG)
  and the key when submitted
- it shows a loading indicator while the API call is in progress

**Successful response**
- it displays the decoded message after a successful decode response

**Error handling**
- it displays an error when the key format is invalid (client-side, before API call)
- it displays an error when the API call fails
- it shows a translated "file too large" message when the server answers 413
- it does not display a decoded message after an API error

**i18n**
- it renders no raw string literals outside the locale file

---

## 4. Decode store (Pinia)

```
describe('useDecodeStore')
```

- it initialises with null result and no errors
- it sets loading=true when decode action is dispatched
- it sets loading=false after decode action resolves
- it stores the decoded message from a successful response
- it stores the error from a failed response
- it clears the previous result when a new decode action is dispatched

---

## 5. Key view (FEAT-016)

```
describe('KeyView')
```

**Key generator section**
- it renders all parameter controls
- it renders the generate button
- it calls the key generate API when the generate button is clicked
- it displays the returned HR key after a successful generate response
- it renders a copy-to-clipboard button next to the key
- it provides visual feedback after clipboard copy (button state change or toast)

**Key parser section**
- it renders the key input field
- it renders the parse button
- it calls the key parse API when the parse button is clicked
- it displays all decoded parameters after a successful parse response
- it displays a clear error message for a malformed key (client-side validation)
- it displays a clear error message when the API returns 400

**i18n**
- it renders no raw string literals outside the locale file

---

## 6. Key store (Pinia)

```
describe('useKeyStore')
```

- it initialises with null generated key and null parsed params
- it stores the generated key from a successful generate response
- it stores the parsed params from a successful parse response
- it stores the error from a failed generate response
- it stores the error from a failed parse response
- it clears the previous generated key when a new generate action is dispatched
- it clears the previous parsed params when a new parse action is dispatched

---

## 7. Locale selection and switching (FEAT-020)

```
describe('resolveInitialLocale')
```

- it returns the stored locale when it is supported
- it ignores a stored value that is not a supported locale
- it falls back to the first browser language whose primary subtag is supported
  (`fr-FR`, `fr-CA` resolve to `fr`)
- it returns `en` when neither the stored value nor any browser language is supported

```
describe('saveLocale')
```

- it writes the locale to localStorage
- it sets `document.documentElement.lang` to the locale

```
describe('locale files')
```

- every locale file has exactly the same keys as `en.json`
- every translation uses exactly the same named parameters as its `en.json` counterpart

```
describe('LanguageSwitcher')
```

- it shows the other language's name, written in that language, with a matching `lang` attribute
- it switches the active locale when clicked, without any route navigation
- it persists the chosen locale
- it has an accessible name written in the target language

```
describe('AdminUsersView') - localized values
```

- it renders the role, the verified and active flags through i18n, not raw values
- it formats the creation date for the active locale instead of showing the raw ISO string

---

## 8. Help page (FEAT-025)

```
describe('help files')
```

- every supported locale has a help file
- every help file defines exactly the anchors listed in `HELP_SECTIONS`, so
  contextual links work in every language

```
describe('HelpView')
```

- it renders the help content of the active locale
- it switches to the other locale's content when the language changes, without reloading
- it scrolls to the section named in the URL hash once the content is rendered
- it keeps the hash target in view after a language switch

```
describe('router guards') - help page
```

- it does not gate `/help`

---

## Fixtures

The following shared fixtures must be defined in `src/__fixtures__/frontend.fixtures.ts`:

- `MOCK_ENCODE_RESPONSE` — a realistic successful encode API response object
- `MOCK_ENCODE_RESPONSE_WITH_WARNINGS` — encode response including warnings and unknownChars
- `MOCK_DECODE_RESPONSE` — a successful decode API response object
- `MOCK_KEY_GENERATE_RESPONSE` — a successful key generate response
- `MOCK_KEY_PARSE_RESPONSE` — a successful key parse response with all fields populated
- `MOCK_PNG_FILE` — a minimal File object with type 'image/png'
- `MOCK_SVG_FILE` — a minimal File object with type 'image/svg+xml'
- `MALFORMED_KEY` — a string that fails HR key client-side validation
