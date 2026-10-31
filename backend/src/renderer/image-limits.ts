/**
 * Largest image, in pixels, that HexaRot renders or parses: Sharp's own
 * default `limitInputPixels`. Rendering and parsing share it so that every
 * PNG POST /encode can produce can also be decoded, while still bounding
 * decompression amplification from caller-supplied PNGs.
 */
export const MAX_IMAGE_PIXELS = 268402689;
