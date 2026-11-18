import type { App } from 'vue'
import * as Sentry from '@sentry/vue'
import type { ErrorEvent } from '@sentry/vue'

/**
 * Safety net on top of `dataCollection`: page URLs can carry tokens
 * (/verify-email?token=...), so only the path is kept, and request data and
 * breadcrumbs are dropped.
 */
export function stripRequestData(event: ErrorEvent): ErrorEvent {
  if (event.request) {
    const url = event.request.url?.split(/[?#]/)[0]
    event.request = url ? { url } : {}
  }
  delete event.breadcrumbs
  return event
}

/** Breadcrumbs record navigations, clicks and console output, which can carry tokens or plaintext. */
export function dropBreadcrumb(): null {
  return null
}

/**
 * Starts Sentry error reporting when VITE_SENTRY_DSN is set at build time;
 * does nothing otherwise. Only stack traces are sent: no user info, request
 * data, component props, breadcrumbs, stack frame variables or source
 * lines, and no tracing or replay.
 */
export function initErrorTracking(app: App): void {
  const sentryDsn = import.meta.env.VITE_SENTRY_DSN?.trim()

  if (!sentryDsn) {
    return
  }

  Sentry.init({
    app,
    dsn: sentryDsn,
    environment: import.meta.env.VITE_SENTRY_ENVIRONMENT || 'development',
    // attachProps: false keeps component props (such as the generated key) out of events
    integrations: [Sentry.vueIntegration({ attachProps: false })],
    tracesSampleRate: 0,
    // Sends events to /api/<DSN hash> on this origin, relayed by the backend,
    // so ad-blockers and browser tracking protection cannot drop them
    tunnel: { basePath: '/api' },
    beforeSend: stripRequestData,
    beforeBreadcrumb: dropBreadcrumb,
    dataCollection: {
      userInfo: false,
      cookies: false,
      httpHeaders: {
        request: false,
        response: false,
      },
      httpBodies: [],
      urlQueryParams: false,
      graphQL: {
        document: false,
        variables: false,
      },
      genAI: {
        inputs: false,
        outputs: false,
      },
      mcp: {
        inputs: false,
        outputs: false,
      },
      databaseQueryData: false,
      queues: false,
      stackFrameVariables: false,
      frameContextLines: 0,
    },
  })
}
