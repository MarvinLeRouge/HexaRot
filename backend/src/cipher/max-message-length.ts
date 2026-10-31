/**
 * Longest message, in characters, that POST /encode accepts.
 *
 * Chosen so that every pivot block size still renders at size `large`
 * within MAX_IMAGE_PIXELS: above roughly 29400 characters, large pivot
 * sizes pad the grid past it and PNG rendering fails. It also bounds the largest decode request (an SVG of
 * about 19 MB, see DECODE_BODY_LIMIT).
 */
export const MAX_ENCODE_MESSAGE_LENGTH = 29000;
