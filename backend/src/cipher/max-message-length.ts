/**
 * Longest message, in characters, that POST /encode accepts, whatever the
 * size. At this length every pivot block size still fits MAX_IMAGE_PIXELS
 * at size `medium` (and `small`); size `large` is checked per request by
 * assertImageFits, since it depends on the pivot block size. It also bounds
 * the largest decode request (an SVG of about 19 MB, see DECODE_BODY_LIMIT).
 */
export const MAX_ENCODE_MESSAGE_LENGTH = 29000;
