import type { DestinationStream } from 'pino';
import type { Params } from 'nestjs-pino';

/** The fields pino-http hands to the `req` serializer. */
interface SerializedRequest {
  id: unknown;
  method: string;
  url: string;
}

/** The fields pino-http hands to the `res` serializer. */
interface SerializedResponse {
  statusCode: number;
}

const HEALTH_PATH = '/api/health';

/**
 * Keeps the method, the path without its query string, and the request id.
 * Headers (the JWT), cookies, bodies, query strings and the client address
 * never reach the logs: query strings can carry the email verification token.
 */
export function serializeRequest(req: SerializedRequest): SerializedRequest {
  return { id: req.id, method: req.method, url: req.url.split(/[?#]/)[0] };
}

/** Keeps the status code only, no response headers. */
export function serializeResponse(res: SerializedResponse): SerializedResponse {
  return { statusCode: res.statusCode };
}

/** The container healthcheck polls every 30 seconds: not worth a log line. */
export function isHealthCheck(req: {
  originalUrl?: string;
  url?: string;
}): boolean {
  // Express strips the mount path from req.url, not from req.originalUrl
  const url = req.originalUrl ?? req.url ?? '';
  return url.split(/[?#]/)[0] === HEALTH_PATH;
}

/**
 * Options for `LoggerModule.forRoot()`: one JSON line per log entry on stdout,
 * plus one access line per request. Pretty-printed in local development.
 *
 * @param stream Destination override, used by tests to capture the output.
 */
export function buildLoggerParams(stream?: DestinationStream): Params {
  const env = process.env.NODE_ENV;
  const options = {
    level: process.env.LOG_LEVEL || (env === 'test' ? 'silent' : 'info'),
    serializers: { req: serializeRequest, res: serializeResponse },
    autoLogging: { ignore: isHealthCheck },
    ...(env === 'development' && !stream
      ? { transport: { target: 'pino-pretty', options: { singleLine: true } } }
      : {}),
  };
  return { pinoHttp: stream ? [options, stream] : options };
}
