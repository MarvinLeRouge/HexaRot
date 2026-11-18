import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createApp } from 'vue'
import * as Sentry from '@sentry/vue'
import type { ErrorEvent } from '@sentry/vue'
import { dropBreadcrumb, initErrorTracking, stripRequestData } from './observability'

vi.mock('@sentry/vue', () => ({
  init: vi.fn(),
  vueIntegration: vi.fn((options: object) => ({ name: 'Vue', options })),
}))

describe('initErrorTracking', () => {
  beforeEach(() => {
    vi.mocked(Sentry.init).mockClear()
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it.each([
    ['unset', ''],
    ['blank', '   '],
  ])('does not initialise Sentry when VITE_SENTRY_DSN is %s', (_label, value) => {
    vi.stubEnv('VITE_SENTRY_DSN', value)

    initErrorTracking(createApp({}))

    expect(Sentry.init).not.toHaveBeenCalled()
  })

  it('initialises Sentry with the app, the trimmed DSN, the environment and no collected data', () => {
    vi.stubEnv('VITE_SENTRY_DSN', ' https://key@example.ingest.sentry.io/2 ')
    vi.stubEnv('VITE_SENTRY_ENVIRONMENT', 'production')
    const app = createApp({})

    initErrorTracking(app)

    expect(Sentry.init).toHaveBeenCalledWith(
      expect.objectContaining({
        app,
        dsn: 'https://key@example.ingest.sentry.io/2',
        environment: 'production',
        tracesSampleRate: 0,
        integrations: [{ name: 'Vue', options: { attachProps: false } }],
        beforeSend: stripRequestData,
        beforeBreadcrumb: dropBreadcrumb,
        dataCollection: {
          userInfo: false,
          cookies: false,
          httpHeaders: { request: false, response: false },
          httpBodies: [],
          urlQueryParams: false,
          graphQL: { document: false, variables: false },
          genAI: { inputs: false, outputs: false },
          mcp: { inputs: false, outputs: false },
          databaseQueryData: false,
          queues: false,
          stackFrameVariables: false,
          frameContextLines: 0,
        },
      }),
    )
  })

  it('defaults the environment to development', () => {
    vi.stubEnv('VITE_SENTRY_DSN', 'https://key@example.ingest.sentry.io/2')
    vi.stubEnv('VITE_SENTRY_ENVIRONMENT', '')

    initErrorTracking(createApp({}))

    expect(Sentry.init).toHaveBeenCalledWith(expect.objectContaining({ environment: 'development' }))
  })
})

describe('stripRequestData', () => {
  it('keeps the page URL without its query string or fragment, and drops request data and breadcrumbs', () => {
    const event = {
      message: 'boom',
      request: {
        url: 'https://hexarot.example/verify-email?token=SECRET#section',
        headers: { 'User-Agent': 'test' },
        query_string: 'token=SECRET',
      },
      breadcrumbs: [{ category: 'navigation', data: { to: '/verify-email?token=SECRET' } }],
    } as unknown as ErrorEvent

    expect(stripRequestData(event)).toEqual({
      message: 'boom',
      request: { url: 'https://hexarot.example/verify-email' },
    })
  })

  it('leaves an event without request data untouched', () => {
    expect(stripRequestData({ message: 'boom' } as ErrorEvent)).toEqual({ message: 'boom' })
  })
})

describe('dropBreadcrumb', () => {
  it('drops every breadcrumb, which can hold URLs with tokens', () => {
    expect(dropBreadcrumb()).toBeNull()
  })
})
