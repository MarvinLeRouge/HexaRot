import * as Sentry from '@sentry/nestjs';
import type { ErrorEvent } from '@sentry/nestjs';
import {
  dropBreadcrumb,
  initErrorTracking,
  stripRequestData,
} from './instrument';

jest.mock('@sentry/nestjs', () => ({ init: jest.fn() }));

const init = Sentry.init as jest.Mock;

describe('initErrorTracking', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    init.mockClear();
    process.env = { ...originalEnv };
    delete process.env.SENTRY_DSN;
    delete process.env.SENTRY_ENVIRONMENT;
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it.each([
    ['unset', undefined],
    ['blank', '   '],
  ])('does not initialise Sentry when SENTRY_DSN is %s', (_label, value) => {
    if (value !== undefined) process.env.SENTRY_DSN = value;

    initErrorTracking();

    expect(init).not.toHaveBeenCalled();
  });

  it('initialises Sentry with the trimmed DSN, the environment and no collected data', () => {
    process.env.SENTRY_DSN = ' https://key@example.ingest.sentry.io/1 ';
    process.env.SENTRY_ENVIRONMENT = 'production';

    initErrorTracking();

    expect(init).toHaveBeenCalledWith(
      expect.objectContaining({
        dsn: 'https://key@example.ingest.sentry.io/1',
        environment: 'production',
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
      }),
    );
  });

  it('defaults the environment to development', () => {
    process.env.SENTRY_DSN = 'https://key@example.ingest.sentry.io/1';

    initErrorTracking();

    expect(init).toHaveBeenCalledWith(
      expect.objectContaining({ environment: 'development' }),
    );
  });
});

describe('stripRequestData', () => {
  it('removes the request body, headers, cookies and query string, and keeps the rest', () => {
    const event = {
      message: 'boom',
      request: {
        url: 'https://hexarot.example/api/encode',
        method: 'POST',
        data: { message: 'SECRET PLAINTEXT' },
        headers: { authorization: 'Bearer token' },
        cookies: { session: 'abc' },
        query_string: 'key=HR1',
      },
      breadcrumbs: [{ message: 'console.log(SECRET PLAINTEXT)' }],
    } as unknown as ErrorEvent;

    const result = stripRequestData(event);

    expect(result.request).toEqual({
      url: 'https://hexarot.example/api/encode',
      method: 'POST',
    });
    expect(result.message).toBe('boom');
    expect(result.breadcrumbs).toBeUndefined();
  });

  it('leaves an event without request data untouched', () => {
    const event = { message: 'boom' } as ErrorEvent;

    expect(stripRequestData(event)).toEqual({ message: 'boom' });
  });
});

describe('dropBreadcrumb', () => {
  it('drops every breadcrumb, which can hold logged request data', () => {
    expect(dropBreadcrumb()).toBeNull();
  });
});
