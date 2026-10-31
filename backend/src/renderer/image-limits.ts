/**
 * Largest image, in pixels, that HexaRot renders or parses: a 200 MB memory
 * budget per request at 3 bytes per pixel (raw RGB, which is how both
 * PngRenderer and parsePng hold the whole image in memory). Rendering and
 * parsing share it so that every PNG POST /encode produces can be decoded,
 * and it bounds decompression amplification from caller-supplied PNGs.
 */
export const MAX_IMAGE_PIXELS = Math.floor(200_000_000 / 3);
