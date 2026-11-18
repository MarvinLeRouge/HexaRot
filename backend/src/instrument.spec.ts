import * as Sentry from '@sentry/nestjs';
import type { ErrorEvent } from '@sentry/nestjs';
import {
  dropBreadcrumb,
  initErrorTracking,
  stripRequestData,
} from './instrument';

jest.mock('@sentry/nestjs', () => ({
  init: jest.fn(),
  serveTunnelIntegration: jest.fn((options: object) => ({
    name: 'ServeTunnel',
    options,
  })),
}));

const init = Sentry.init as jest.Mock;

describe('initErrorTracking', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    init.mockClear();
    process.env = { ...originalEnv };
    delete process.env.SENTRY_BACKEND_DSN;
    delete process.env.SENTRY_ENVIRONMENT;
    delete process.env.SENTRY_FRONTEND_DSN;
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it.each([
    ['unset', undefined],
    ['blank', '   '],
  ])(
    'does not initialise Sentry when SENTRY_BACKEND_DSN is %s',
    (_label, value) => {
      if (value !== undefined) process.env.SENTRY_BACKEND_DSN = value;

      initErrorTracking();

      expect(init).not.toHaveBeenCalled();
    },
  );

  it('initialises Sentry with the trimmed DSN, the environment and no collected data', () => {
    process.env.SENTRY_BACKEND_DSN = ' https://key@example.ingest.sentry.io/1 ';
    process.env.SENTRY_FRONTEND_DSN =
      'https://front@example.ingest.sentry.io/2';
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

  it('relays the frontend events under /api, for the frontend DSN only', () => {
    process.env.SENTRY_BACKEND_DSN = 'https://key@example.ingest.sentry.io/1';
    process.env.SENTRY_FRONTEND_DSN =
      ' https://front@example.ingest.sentry.io/2 ';

    initErrorTracking();

    expect(init).toHaveBeenCalledWith(
      expect.objectContaining({
        integrations: [
          {
            name: 'ServeTunnel',
            options: {
              basePath: '/api',
              allowedDsns: ['https://front@example.ingest.sentry.io/2'],
            },
          },
        ],
      }),
    );
  });

  it.each([
    [
      'the frontend DSN is set without a backend DSN',
      { SENTRY_FRONTEND_DSN: 'https://front@example.ingest.sentry.io/2' },
    ],
    [
      'the backend DSN is set without a frontend DSN',
      { SENTRY_BACKEND_DSN: 'https://key@example.ingest.sentry.io/1' },
    ],
  ])(
    'warns at startup that frontend events will be lost when %s',
    (_label, env: Record<string, string>) => {
      Object.assign(process.env, env);
      const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});

      initErrorTracking();

      expect(warn).toHaveBeenCalledWith(
        expect.stringContaining('frontend errors will not reach Sentry'),
      );
      warn.mockRestore();
    },
  );

  it('does not warn when both DSNs, or neither, are set', () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});

    initErrorTracking();
    process.env.SENTRY_BACKEND_DSN = 'https://key@example.ingest.sentry.io/1';
    process.env.SENTRY_FRONTEND_DSN =
      'https://front@example.ingest.sentry.io/2';
    initErrorTracking();

    expect(warn).not.toHaveBeenCalled();
    warn.mockRestore();
  });

  it('relays only the backend own DSN when SENTRY_FRONTEND_DSN is unset', () => {
    process.env.SENTRY_BACKEND_DSN = 'https://key@example.ingest.sentry.io/1';

    initErrorTracking();

    expect(init).toHaveBeenCalledWith(
      expect.objectContaining({
        integrations: [
          {
            name: 'ServeTunnel',
            options: { basePath: '/api', allowedDsns: [] },
          },
        ],
      }),
    );
  });

  it('defaults the environment to development', () => {
    process.env.SENTRY_BACKEND_DSN = 'https://key@example.ingest.sentry.io/1';
    process.env.SENTRY_FRONTEND_DSN =
      'https://front@example.ingest.sentry.io/2';

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
