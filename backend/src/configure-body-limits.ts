import { INestApplication } from '@nestjs/common';
import { json } from 'express';

/**
 * Request body limit for POST /api/decode. The largest cryptogram
 * POST /encode can produce (MAX_ENCODE_MESSAGE_LENGTH characters at pivot
 * 255, 510 x 510 cases) makes an SVG decode request of about 19 MB.
 */
export const DECODE_BODY_LIMIT = '24mb';

/**
 * Body limit for every other route. Enough for any message the encode DTO
 * accepts, even if JSON escapes each character to 6 bytes (\u0001), while
 * keeping public endpoints such as /auth/login away from huge bodies.
 */
export const DEFAULT_BODY_LIMIT = '256kb';

/**
 * Registers the app's JSON body parsers: a large limit for the decode route,
 * a small one everywhere else. The app must be created with
 * `bodyParser: false` so Nest adds no parser of its own. A request parsed by
 * the decode parser is already consumed, so the default parser after it
 * passes it through untouched. The API takes JSON only.
 */
export function configureBodyLimits(app: INestApplication): void {
  app.use('/api/decode', json({ limit: DECODE_BODY_LIMIT }));
  app.use(json({ limit: DEFAULT_BODY_LIMIT }));
}
