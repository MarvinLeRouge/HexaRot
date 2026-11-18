import * as Sentry from '@sentry/nestjs';
import type { ErrorEvent } from '@sentry/nestjs';

/**
 * Safety net on top of `dataCollection`: HexaRot request bodies carry
 * plaintext, keys and passwords, and headers carry JWTs, so none of them may
 * ever reach Sentry, whatever an SDK update collects by default. Breadcrumbs
 * are dropped for the same reason.
 */
export function stripRequestData(event: ErrorEvent): ErrorEvent {
  if (event.request) {
    delete event.request.data;
    delete event.request.headers;
    delete event.request.cookies;
    delete event.request.query_string;
  }
  delete event.breadcrumbs;
  return event;
}

/** Breadcrumbs record console output and HTTP calls, which can carry request data. */
export function dropBreadcrumb(): null {
  return null;
}

/**
 * Starts Sentry error reporting when SENTRY_DSN is set; does nothing
 * otherwise (local dev and CI). Only stack traces are sent: no request data,
 * user info, stack frame variables or source lines, and no tracing.
 */
export function initErrorTracking(): void {
  const dsn = process.env.SENTRY_DSN?.trim();
  if (!dsn) return;

  Sentry.init({
    dsn,
    environment: process.env.SENTRY_ENVIRONMENT || 'development',
    tracesSampleRate: 0,
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
  });
}

// Runs on import: main.ts imports this file first, so Sentry patches modules
// before Nest and Express load.
initErrorTracking();
