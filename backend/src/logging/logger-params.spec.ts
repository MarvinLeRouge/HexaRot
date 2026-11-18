import {
  buildLoggerParams,
  isHealthCheck,
  serializeRequest,
  serializeResponse,
} from './logger-params';

describe('logger params', () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  describe('serializeRequest', () => {
    it('keeps id, method and path, drops everything else', () => {
      const req = {
        id: 7,
        method: 'POST',
        url: '/api/auth/verify-email?token=secret-token#frag',
        headers: { authorization: 'Bearer secret-jwt', cookie: 'sid=secret' },
        remoteAddress: '203.0.113.9',
        query: { token: 'secret-token' },
      };

      const serialized = serializeRequest(req);

      expect(serialized).toEqual({
        id: 7,
        method: 'POST',
        url: '/api/auth/verify-email',
      });
      expect(JSON.stringify(serialized)).not.toContain('secret');
    });
  });

  describe('serializeResponse', () => {
    it('keeps the status code only', () => {
      expect(
        serializeResponse({
          statusCode: 201,
          headers: { 'set-cookie': 'x' },
        } as never),
      ).toEqual({ statusCode: 201 });
    });
  });

  describe('isHealthCheck', () => {
    it('matches the health route, with or without a query string', () => {
      expect(isHealthCheck({ originalUrl: '/api/health' })).toBe(true);
      expect(isHealthCheck({ originalUrl: '/api/health?x=1' })).toBe(true);
    });

    it('prefers originalUrl, falls back to url', () => {
      expect(
        isHealthCheck({ originalUrl: '/api/encode', url: '/api/health' }),
      ).toBe(false);
      expect(isHealthCheck({ url: '/api/health' })).toBe(true);
      expect(isHealthCheck({})).toBe(false);
    });

    it('does not match other routes', () => {
      expect(isHealthCheck({ originalUrl: '/api/healthy' })).toBe(false);
      expect(isHealthCheck({ originalUrl: '/api/encode' })).toBe(false);
    });
  });

  describe('buildLoggerParams', () => {
    type HttpOptions = Record<string, unknown>;
    const optionsOf = (params: ReturnType<typeof buildLoggerParams>) =>
      params.pinoHttp as HttpOptions;

    it('reads the level from LOG_LEVEL', () => {
      process.env.NODE_ENV = 'production';
      process.env.LOG_LEVEL = 'warn';

      expect(optionsOf(buildLoggerParams()).level).toBe('warn');
    });

    it('defaults to info, and to silent under test', () => {
      delete process.env.LOG_LEVEL;
      process.env.NODE_ENV = 'production';
      expect(optionsOf(buildLoggerParams()).level).toBe('info');

      process.env.NODE_ENV = 'test';
      expect(optionsOf(buildLoggerParams()).level).toBe('silent');
    });

    it('writes raw JSON in production and pretty-prints in development', () => {
      process.env.NODE_ENV = 'production';
      expect(optionsOf(buildLoggerParams())).not.toHaveProperty('transport');

      process.env.NODE_ENV = 'development';
      expect(optionsOf(buildLoggerParams()).transport).toMatchObject({
        target: 'pino-pretty',
      });
    });

    it('writes to the given stream, without transport', () => {
      process.env.NODE_ENV = 'development';
      const stream = { write: jest.fn() };

      const [options, destination] = buildLoggerParams(stream)
        .pinoHttp as unknown as [HttpOptions, unknown];

      expect(destination).toBe(stream);
      expect(options).not.toHaveProperty('transport');
      expect(options.serializers).toEqual({
        req: serializeRequest,
        res: serializeResponse,
      });
    });
  });
});
